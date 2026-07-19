"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const router = useRouter();
  
  // Tab states: 'signin' or 'signup'
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  
  // Form values
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // UI states
  const [error, setError] = useState<string | string[] | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Check if user is already logged in
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      router.push("/dashboard");
    } else {
      setTimeout(() => {
        setCheckingAuth(false);
      }, 0);
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (mode === "signup") {
        // Sign Up request
        const res = await fetch("http://localhost:3000/auth/sign-up", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ username, email, password }),
        });

        const data = await res.json().catch(() => ({}));
        
        if (!res.ok) {
          throw new Error(
            Array.isArray(data.message) 
              ? data.message.join(", ") 
              : data.message || "Failed to sign up. Please try again."
          );
        }

        setSuccess("Account created successfully! Please sign in with your credentials.");
        setMode("signin");
        setPassword(""); // Clear password for security
      } else {
        // Sign In request
        const res = await fetch("http://localhost:3000/auth/sign-in", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ username, password }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(
            Array.isArray(data.message) 
              ? data.message.join(", ") 
              : data.message || "Invalid username or password."
          );
        }

        if (data.accessToken) {
          localStorage.setItem("accessToken", data.accessToken);
          localStorage.setItem("username", username);
          router.push("/dashboard");
        } else {
          throw new Error("Authentication response was missing token.");
        }
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950 text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
          <p className="text-zinc-400 font-mono text-sm tracking-wider animate-pulse">VERIFYING SESSION...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-zinc-950 text-white overflow-hidden font-sans">
      {/* Dynamic Background Gradients */}
      <div className="absolute top-0 -left-4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse duration-[6000ms]"></div>
      <div className="absolute bottom-0 -right-4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl animate-pulse duration-[8000ms]"></div>

      <div className="w-full max-w-md px-6 py-12 relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 mb-4 rounded-2xl bg-white/5 border border-white/10 shadow-inner">
            <svg
              className="w-8 h-8 text-emerald-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              ></path>
            </svg>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 to-violet-400 bg-clip-text text-transparent">
            TaskFlow
          </h1>
          <p className="mt-2 text-zinc-400 text-sm">
            Organize your daily tasks beautifully and securely.
          </p>
        </div>

        {/* Auth Glass Card */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl relative">
          {/* Header Switcher */}
          <div className="flex bg-black/40 p-1.5 rounded-xl border border-white/5 mb-6">
            <button
              onClick={() => {
                setMode("signin");
                setError(null);
                setSuccess(null);
              }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-300 ${
                mode === "signin"
                  ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setMode("signup");
                setError(null);
                setSuccess(null);
              }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-300 ${
                mode === "signup"
                  ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Form Actions */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Success Alert */}
            {success && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs rounded-xl flex items-start gap-2.5 animate-fadeIn">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{success}</span>
              </div>
            )}

            {/* Error Alert */}
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-300 text-xs rounded-xl flex items-start gap-2.5 animate-fadeIn">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Form Fields */}
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Username
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. johndoe"
                className="w-full bg-black/30 border border-white/10 hover:border-white/20 focus:border-emerald-500 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
              />
            </div>

            {mode === "signup" && (
              <div className="animate-fadeIn">
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. john@example.com"
                  className="w-full bg-black/30 border border-white/10 hover:border-white/20 focus:border-emerald-500 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-black/30 border border-white/10 hover:border-white/20 focus:border-emerald-500 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
              />
              {mode === "signup" && (
                <p className="mt-2 text-[10px] text-zinc-500 leading-normal">
                  Must be at least 8 chars with 1 uppercase, 1 lowercase, and 1 number/special char.
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full relative mt-4 inline-flex items-center justify-center p-0.5 mb-2 mr-2 overflow-hidden text-sm font-semibold rounded-xl group bg-gradient-to-br from-emerald-400 to-violet-600 hover:text-white dark:text-white focus:ring-4 focus:outline-none focus:ring-emerald-800 disabled:opacity-50 transition-all duration-300"
            >
              <span className="w-full relative px-5 py-3 transition-all ease-in duration-75 bg-zinc-950 rounded-xl group-hover:bg-opacity-0">
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    <span>Processing...</span>
                  </div>
                ) : mode === "signin" ? (
                  "Sign In"
                ) : (
                  "Create Account"
                )}
              </span>
            </button>
          </form>
        </div>

        {/* Footer info */}
        <p className="text-center mt-6 text-xs text-zinc-600 dark:text-zinc-500">
          Secure, authenticated JWT tokens are used to isolate your workspace data.
        </p>
      </div>
    </div>
  );
}
