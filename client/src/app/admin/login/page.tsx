'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { Shield, ShieldAlert, Lock, Mail, ArrowRight, AlertTriangle } from 'lucide-react';

function AdminLoginContent() {
  const router = useRouter();
  const { login, logout, user, isAuthenticated, isAdmin } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already authenticated as admin, jump to dashboard
  if (isAuthenticated && isAdmin) {
    router.push('/admin/dashboard');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await login(email, password);
      if (res.success) {
        // Double-check admin clearance
        router.push('/admin/dashboard');
      } else {
        setError(res.error || 'Authentication rejected. Verify administrative credentials.');
      }
    } catch (err: any) {
      setError('Communication with security gateway failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-14 space-y-6">
      {/* Brand & Security Header */}
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-red-600 via-rose-700 to-amber-600 flex items-center justify-center text-white mx-auto shadow-2xl border border-red-500/40">
          <ShieldAlert className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center justify-center gap-2">
          Admin Control Center
        </h1>
        <p className="text-xs text-red-400/90 font-mono">
          [RESTRICTED AREA] Authorized Personnel Only
        </p>
      </div>

      {/* Security Login Card */}
      <div className="bg-surface border-2 border-red-900/40 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
        <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span className="leading-relaxed text-[11px]">
            Access to this console is audited. Every inspection of user accounts, postings, and DMs is logged with administrative timestamp and IP.
          </span>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-950/70 border border-red-500/50 text-red-200 text-xs flex items-center gap-2">
            <Shield className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 font-mono mb-1.5">
              Admin Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@streamshare.io"
                className="w-full bg-surfaceLight border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 font-mono mb-1.5">
              Admin Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-surfaceLight border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2 border border-red-500/30"
          >
            {isLoading ? 'Verifying Clearance...' : 'Authenticate & Enter Console'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-2 text-center">
          <Link
            href="/login"
            className="text-xs text-slate-400 hover:text-slate-300 hover:underline transition-colors"
          >
            ← Return to Standard Marketplace Login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 flex justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-red-500 border-t-transparent animate-spin" />
        </div>
      }
    >
      <AdminLoginContent />
    </Suspense>
  );
}
