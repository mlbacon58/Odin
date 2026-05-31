"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function signIn() {
    setLoading(true);
    setStatus("Signing in...");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setStatus(error.message);
      setLoading(false);
      return;
    }

    router.push("/");
  }

  async function signUp() {
    setLoading(true);
    setStatus("Creating account...");

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setStatus(error.message);
      setLoading(false);
      return;
    }

    setStatus("Account created. Check your email if confirmation is enabled.");
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-8">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-xl p-6">
        <h1 className="text-2xl font-bold mb-4">Nuclear AI Platform</h1>

        <p className="text-slate-300 mb-6">
          Sign in or create an account.
        </p>

        <input
          className="w-full p-3 rounded bg-slate-950 border border-slate-700 mb-3"
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="w-full p-3 rounded bg-slate-950 border border-slate-700 mb-4"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={signIn}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 p-3 rounded mb-3"
        >
          Sign In
        </button>

        <button
          onClick={signUp}
          disabled={loading}
          className="w-full bg-slate-700 hover:bg-slate-600 disabled:bg-slate-600 p-3 rounded"
        >
          Create Account
        </button>

        {status && <p className="text-slate-300 mt-4">{status}</p>}
      </div>
    </main>
  );
}