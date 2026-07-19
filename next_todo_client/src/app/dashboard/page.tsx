"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Task {
  id: string;
  title: string;
  description: string;
  status: "OPEN" | "IN_PROGRESS" | "DONE";
}

export default function Dashboard() {
  const router = useRouter();
  
  // Auth state
  const [username, setUsername] = useState("");
  const [token, setToken] = useState<string | null>(null);

  // Task lists
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allTasksForMetrics, setAllTasksForMetrics] = useState<Task[]>([]);
  
  // Loading & Error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState<"ALL" | "OPEN" | "IN_PROGRESS" | "DONE">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Check auth and set states
  useEffect(() => {
    const savedToken = localStorage.getItem("accessToken");
    const savedUsername = localStorage.getItem("username");
    
    if (!savedToken) {
      router.push("/");
    } else {
      setTimeout(() => {
        setToken(savedToken);
        setUsername(savedUsername || "User");
      }, 0);
    }
  }, [router]);

  // Load all tasks to compute metrics
  const fetchMetrics = useCallback(async (authToken: string) => {
    try {
      const res = await fetch("http://localhost:3000/tasks", {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setAllTasksForMetrics(data);
      }
    } catch (err) {
      console.error("Failed to load metrics", err);
    }
  }, []);

  // Load filtered tasks for display
  const fetchTasks = useCallback(async (authToken: string, status: string, search: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (status !== "ALL") {
        params.append("status", status);
      }
      if (search) {
        params.append("search", search);
      }

      const res = await fetch(`http://localhost:3000/tasks?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!res.ok) {
        if (res.status === 401) {
          // Token expired or invalid
          localStorage.removeItem("accessToken");
          localStorage.removeItem("username");
          router.push("/");
          return;
        }
        throw new Error("Failed to load tasks.");
      }

      const data = await res.json();
      setTasks(data);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "An error occurred while loading tasks.";
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Fetch tasks on parameters change
  useEffect(() => {
    if (token) {
      setTimeout(() => {
        fetchTasks(token, statusFilter, searchQuery);
        fetchMetrics(token);
      }, 0);
    }
  }, [token, statusFilter, searchQuery, fetchTasks, fetchMetrics]);

  // Handle Create Task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      setModalError("Title is required.");
      return;
    }
    
    setModalError(null);
    setModalLoading(true);

    try {
      const res = await fetch("http://localhost:3000/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: newTitle,
          description: newDescription,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          Array.isArray(data.message)
            ? data.message.join(", ")
            : data.message || "Failed to create task."
        );
      }

      // Refresh list & metrics
      if (token) {
        fetchTasks(token, statusFilter, searchQuery);
        fetchMetrics(token);
      }

      // Close modal and reset fields
      setIsModalOpen(false);
      setNewTitle("");
      setNewDescription("");
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "An error occurred.";
      setModalError(errMsg);
    } finally {
      setModalLoading(false);
    }
  };

  // Handle Update Status
  const handleUpdateStatus = async (taskId: string, newStatus: Task["status"]) => {
    try {
      const res = await fetch(`http://localhost:3000/tasks/${taskId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        throw new Error("Failed to update status.");
      }

      // Refresh list & metrics
      if (token) {
        fetchTasks(token, statusFilter, searchQuery);
        fetchMetrics(token);
      }
    } catch {
      alert("Error updating status. Please try again.");
    }
  };

  // Handle Delete Task
  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task?")) {
      return;
    }

    try {
      const res = await fetch(`http://localhost:3000/tasks/${taskId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to delete task.");
      }

      // Refresh list & metrics
      if (token) {
        fetchTasks(token, statusFilter, searchQuery);
        fetchMetrics(token);
      }
    } catch {
      alert("Error deleting task.");
    }
  };

  // Handle Logout
  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("username");
    router.push("/");
  };

  // Metrics calculations
  const totalCount = allTasksForMetrics.length;
  const openCount = allTasksForMetrics.filter((t) => t.status === "OPEN").length;
  const inProgressCount = allTasksForMetrics.filter((t) => t.status === "IN_PROGRESS").length;
  const doneCount = allTasksForMetrics.filter((t) => t.status === "DONE").length;

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans overflow-x-hidden pb-12 relative">
      {/* Background Glows */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl animate-pulse duration-[8000ms]"></div>
      <div className="absolute bottom-12 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse duration-[10000ms]"></div>

      {/* Header NavBar */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-zinc-950/70 border-b border-white/5 py-4 px-6 md:px-12 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-400 to-violet-500 shadow-lg">
            <svg className="w-5 h-5 text-zinc-950 font-bold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-emerald-400 to-violet-400 bg-clip-text text-transparent">
            TaskFlow
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col items-end text-right">
            <span className="text-sm font-semibold text-zinc-200">{username}</span>
            <span className="text-[10px] text-zinc-500 font-mono tracking-wider">WORKSPACE MEMBER</span>
          </div>
          <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center border border-white/10 font-bold text-sm text-emerald-400 shadow-inner">
            {username.charAt(0).toUpperCase()}
          </div>
          <button
            onClick={handleLogout}
            className="text-xs bg-zinc-900 border border-white/5 hover:border-red-500/30 hover:bg-red-500/10 text-zinc-400 hover:text-red-400 rounded-xl px-3 py-2 transition-all flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-6 md:px-12 mt-8 z-10 relative">
        {/* Page Hero Welcome */}
        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-white">Your Workspace</h2>
            <p className="text-zinc-400 text-sm mt-1">Manage and track your private tasks.</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-400 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 text-zinc-950 font-bold text-sm px-5 py-3 rounded-2xl transition-all duration-300 shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 active:scale-95"
          >
            <svg className="w-4 h-4 stroke-[3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Create Task
          </button>
        </div>

        {/* Counter Summary Widgets */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="backdrop-blur-xl bg-white/5 border border-white/5 rounded-2xl p-5 shadow-xl flex items-center gap-4 hover:border-white/10 transition-all duration-300">
            <div className="p-3 rounded-xl bg-zinc-900 border border-white/5 text-zinc-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-zinc-500 font-mono tracking-wider">Total Tasks</p>
              <h3 className="text-2xl font-black mt-0.5">{totalCount}</h3>
            </div>
          </div>

          <div className="backdrop-blur-xl bg-white/5 border border-white/5 rounded-2xl p-5 shadow-xl flex items-center gap-4 hover:border-white/10 transition-all duration-300">
            <div className="p-3 rounded-xl bg-zinc-900 border border-white/5 text-sky-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-zinc-500 font-mono tracking-wider">Open</p>
              <h3 className="text-2xl font-black mt-0.5 text-sky-400">{openCount}</h3>
            </div>
          </div>

          <div className="backdrop-blur-xl bg-white/5 border border-white/5 rounded-2xl p-5 shadow-xl flex items-center gap-4 hover:border-white/10 transition-all duration-300">
            <div className="p-3 rounded-xl bg-zinc-900 border border-white/5 text-amber-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H18.2" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-zinc-500 font-mono tracking-wider">In Progress</p>
              <h3 className="text-2xl font-black mt-0.5 text-amber-400">{inProgressCount}</h3>
            </div>
          </div>

          <div className="backdrop-blur-xl bg-white/5 border border-white/5 rounded-2xl p-5 shadow-xl flex items-center gap-4 hover:border-white/10 transition-all duration-300">
            <div className="p-3 rounded-xl bg-zinc-900 border border-white/5 text-emerald-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-zinc-500 font-mono tracking-wider">Completed</p>
              <h3 className="text-2xl font-black mt-0.5 text-emerald-400">{doneCount}</h3>
            </div>
          </div>
        </section>

        {/* Filter Toolbar */}
        <section className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between mb-6">
          {/* Tab Filter switcher */}
          <div className="flex bg-black/40 border border-white/5 rounded-xl p-1 md:self-start">
            {(["ALL", "OPEN", "IN_PROGRESS", "DONE"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
                  statusFilter === status
                    ? "bg-zinc-800 text-white border border-white/5 shadow-md"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {status === "ALL" ? "All" : status === "IN_PROGRESS" ? "In Progress" : status.charAt(0) + status.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {/* Search box */}
          <div className="relative flex-1 md:max-w-xs">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-zinc-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              className="w-full bg-black/30 border border-white/10 hover:border-white/20 focus:border-emerald-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-500 hover:text-white"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </section>

        {/* Task Grid / Content */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-zinc-500">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent mb-4"></div>
            <p className="text-xs font-mono tracking-wider animate-pulse uppercase">Syncing tasks...</p>
          </div>
        ) : error ? (
          <div className="py-12 text-center border border-red-500/20 bg-red-500/5 rounded-2xl">
            <p className="text-sm text-red-300">{error}</p>
            <button
              onClick={() => token && fetchTasks(token, statusFilter, searchQuery)}
              className="mt-4 text-xs bg-zinc-900 border border-white/10 hover:bg-zinc-800 px-4 py-2 rounded-xl"
            >
              Retry
            </button>
          </div>
        ) : tasks.length === 0 ? (
          <div className="py-24 text-center border border-dashed border-white/10 rounded-3xl backdrop-blur-sm bg-white/[0.01]">
            <svg className="w-12 h-12 mx-auto text-zinc-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h4 className="text-base font-bold text-zinc-300">No tasks found</h4>
            <p className="text-xs text-zinc-500 mt-1 max-w-xs mx-auto">
              {searchQuery || statusFilter !== "ALL"
                ? "No tasks match your active filters or query."
                : "Your workspace is empty! Click 'Create Task' to add your first objective."}
            </p>
          </div>
        ) : (
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="group relative flex flex-col justify-between backdrop-blur-xl bg-white/5 border border-white/5 hover:border-white/10 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-0.5"
              >
                <div>
                  {/* Card Header (Title & Delete) */}
                  <div className="flex justify-between items-start gap-4 mb-2">
                    <h3 className="font-extrabold text-lg text-zinc-100 group-hover:text-white leading-snug break-words pr-2">
                      {task.title}
                    </h3>
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/10 border border-transparent hover:border-red-500/20 text-zinc-500 hover:text-red-400 transition-all"
                      title="Delete task"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>

                  {/* Card Body (Description) */}
                  <p className="text-zinc-400 text-xs leading-relaxed mb-6 whitespace-pre-wrap break-words">
                    {task.description || "No description provided."}
                  </p>
                </div>

                {/* Card Footer (Status Controls) */}
                <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-auto">
                  {/* Status Indicator Pill */}
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      task.status === "DONE"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : task.status === "IN_PROGRESS"
                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        : "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        task.status === "DONE"
                          ? "bg-emerald-400"
                          : task.status === "IN_PROGRESS"
                          ? "bg-amber-400"
                          : "bg-sky-400"
                      }`}
                    ></span>
                    {task.status === "IN_PROGRESS" ? "In Progress" : task.status}
                  </span>

                  {/* Quick update select */}
                  <select
                    value={task.status}
                    onChange={(e) => handleUpdateStatus(task.id, e.target.value as Task["status"])}
                    className="bg-zinc-900 hover:bg-zinc-800 border border-white/5 text-[10px] font-bold rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-zinc-300"
                  >
                    <option value="OPEN">Open</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="DONE">Done</option>
                  </select>
                </div>
              </div>
            ))}
          </section>
        )}
      </main>

      {/* CREATE TASK ACTION MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop overlay */}
          <div
            onClick={() => setIsModalOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          ></div>

          {/* Modal Container */}
          <div className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-2xl p-6 shadow-2xl animate-scaleUp z-10 text-white">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black">Create Task</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              {modalError && (
                <div className="p-3.5 bg-red-500/10 border border-red-500/20 text-red-300 text-xs rounded-xl flex items-start gap-2.5">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>{modalError}</span>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                  Task Title
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Design app components"
                  className="w-full bg-black/40 border border-white/10 hover:border-white/20 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                  Description
                </label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={4}
                  placeholder="Write details about this objective..."
                  className="w-full bg-black/40 border border-white/10 hover:border-white/20 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs py-3 rounded-xl border border-white/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="flex-1 bg-gradient-to-r from-emerald-400 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 text-zinc-950 font-bold text-xs py-3 rounded-xl transition-all shadow-md disabled:opacity-50"
                >
                  {modalLoading ? "Creating..." : "Save Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
