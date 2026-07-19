import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AuthPage from './page';

// Mock useRouter
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: mockPush,
    };
  },
}));

describe('AuthPage (Landing component)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    // Mock global fetch
    global.fetch = jest.fn();
  });

  it('renders sign-in form by default', async () => {
    render(<AuthPage />);

    // Wait for auth verification to complete
    const usernameInput = await screen.findByPlaceholderText('e.g. johndoe');
    expect(usernameInput).toBeInTheDocument();

    // Check title
    expect(screen.getByText('TaskFlow')).toBeInTheDocument();
    
    // Check fields
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('e.g. john@example.com')).not.toBeInTheDocument();
    
    // Verify two Sign In buttons exist (tab switcher + submit button)
    expect(screen.getAllByRole('button', { name: /Sign In/i }).length).toBe(2);
  });

  it('redirects to dashboard if accessToken is present in localStorage', async () => {
    localStorage.setItem('accessToken', 'mockToken');
    render(<AuthPage />);
    
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('toggles between sign-in and sign-up modes', async () => {
    render(<AuthPage />);
    
    // Wait for auth verification to complete
    await screen.findByPlaceholderText('e.g. johndoe');

    // Switch to Sign Up tab
    const signUpTab = screen.getByRole('button', { name: /Sign Up/i });
    fireEvent.click(signUpTab);
    
    // Check fields
    expect(screen.getByPlaceholderText('e.g. johndoe')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. john@example.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Account/i })).toBeInTheDocument();

    // Switch back to Sign In tab
    // The tab switcher is the button that is NOT the submit button
    const signInTab = screen.getAllByRole('button', { name: /Sign In/i }).find(b => b.getAttribute('type') !== 'submit');
    fireEvent.click(signInTab!);

    expect(screen.queryByPlaceholderText('e.g. john@example.com')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Sign In/i }).length).toBe(2);
  });

  it('handles validation error response from sign-in API', async () => {
    const mockFetch = global.fetch as jest.Mock;
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ message: 'Invalid username or password.' }),
    });

    render(<AuthPage />);
    
    // Wait for auth verification to complete
    const usernameInput = await screen.findByPlaceholderText('e.g. johndoe');
    
    fireEvent.change(usernameInput, { target: { value: 'user' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'pass' } });
    
    // Click the submit button
    const submitButton = screen.getAllByRole('button').find(b => b.getAttribute('type') === 'submit');
    fireEvent.click(submitButton!);
    
    await waitFor(() => {
      expect(screen.getByText('Invalid username or password.')).toBeInTheDocument();
    });
  });

  it('signs in successfully and saves token on valid inputs', async () => {
    const mockFetch = global.fetch as jest.Mock;
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ accessToken: 'test-token' }),
    });

    render(<AuthPage />);
    
    // Wait for auth verification to complete
    const usernameInput = await screen.findByPlaceholderText('e.g. johndoe');
    
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'Password123!' } });
    
    // Click the submit button
    const submitButton = screen.getAllByRole('button').find(b => b.getAttribute('type') === 'submit');
    fireEvent.click(submitButton!);
    
    await waitFor(() => {
      expect(localStorage.getItem('accessToken')).toBe('test-token');
      expect(localStorage.getItem('username')).toBe('testuser');
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });
});
