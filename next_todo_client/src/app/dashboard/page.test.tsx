import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Dashboard from './page';
import { useRouter } from 'next/navigation';

// Mock useRouter
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: mockPush,
    };
  },
}));

describe('Dashboard Page', () => {
  const mockTasks = [
    { id: '1', title: 'Task One', description: 'Desc One', status: 'OPEN' },
    { id: '2', title: 'Task Two', description: 'Desc Two', status: 'IN_PROGRESS' },
    { id: '3', title: 'Task Three', description: 'Desc Three', status: 'DONE' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    global.fetch = jest.fn();
  });

  it('redirects to landing page if token is missing', async () => {
    render(<Dashboard />);
    
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  it('renders tasks and summary metrics successfully if authenticated', async () => {
    localStorage.setItem('accessToken', 'validToken');
    localStorage.setItem('username', 'Alice');

    const mockFetch = global.fetch as jest.Mock;
    // Mock the initial two fetch calls (one for metrics and one for tasks)
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockTasks),
    });

    render(<Dashboard />);

    // Verify loading state is shown initially
    expect(screen.getByText(/Syncing tasks.../i)).toBeInTheDocument();

    // Wait for the tasks and metrics to load
    await waitFor(() => {
      expect(screen.getByText('Task One')).toBeInTheDocument();
      expect(screen.getByText('Task Two')).toBeInTheDocument();
      expect(screen.getByText('Task Three')).toBeInTheDocument();
    });

    // Check header info
    expect(screen.getByText('Alice')).toBeInTheDocument();
    
    // Check metric widgets (Total: 3, Open: 1, In Progress: 1, Completed: 1)
    expect(screen.getByText('3')).toBeInTheDocument(); // total
  });

  it('triggers delete task API when delete is clicked and confirmed', async () => {
    localStorage.setItem('accessToken', 'validToken');
    window.confirm = jest.fn().mockReturnValue(true);

    const mockFetch = global.fetch as jest.Mock;
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockTasks),
    });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Task One')).toBeInTheDocument();
    });

    // Mock successful delete API call
    mockFetch.mockResolvedValueOnce({
      ok: true,
    });

    // Click delete on first task
    const deleteButtons = screen.getAllByTitle('Delete task');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/tasks/1',
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  it('updates task status on dropdown select change', async () => {
    localStorage.setItem('accessToken', 'validToken');

    const mockFetch = global.fetch as jest.Mock;
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockTasks),
    });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Task One')).toBeInTheDocument();
    });

    // Mock successful PATCH API call
    mockFetch.mockResolvedValueOnce({
      ok: true,
    });

    // Find dropdown for Task One
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'DONE' } });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/tasks/1/status',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ status: 'DONE' }),
        })
      );
    });
  });

  it('opens modal and submits new task successfully', async () => {
    localStorage.setItem('accessToken', 'validToken');

    const mockFetch = global.fetch as jest.Mock;
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockTasks),
    });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Task One')).toBeInTheDocument();
    });

    // Click Create Task to open modal
    fireEvent.click(screen.getByRole('button', { name: /Create Task/i }));

    // Verify modal is open
    expect(screen.getByText('Task Title')).toBeInTheDocument();

    // Input new task details
    fireEvent.change(screen.getByPlaceholderText('e.g. Design app components'), {
      target: { value: 'New Test Task' },
    });
    fireEvent.change(screen.getByPlaceholderText('Write details about this objective...'), {
      target: { value: 'New Description' },
    });

    // Mock successful create task response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: '4', title: 'New Test Task', description: 'New Description', status: 'OPEN' }),
    });

    // Click Submit/Save Task inside modal
    fireEvent.click(screen.getByRole('button', { name: /Save Task/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/tasks',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ title: 'New Test Task', description: 'New Description' }),
        })
      );
    });
  });

  it('clears credentials and redirects on logout click', async () => {
    localStorage.setItem('accessToken', 'validToken');
    localStorage.setItem('username', 'Alice');

    const mockFetch = global.fetch as jest.Mock;
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockTasks),
    });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    // Click logout
    fireEvent.click(screen.getByRole('button', { name: /Logout/i }));

    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('username')).toBeNull();
    expect(mockPush).toHaveBeenCalledWith('/');
  });
});
