'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { Lock, Mail, Film, AlertCircle, ArrowRight, ShieldCheck, KeyRound } from 'lucide-react';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';

  const { login, isAuthenticated } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isAuthenticated) {
    router.push(redirect);
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await login(email, password);
      if (res.success) {
        router.push(redirect);
      } else {
        setError(res.error || 'Invalid credentials or account suspended.');
      }
    } catch (err: any) {
      setError('Network communication failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // Demo accounts helper for immediate testing
  const selectDemoAccount = (accEmail: string, accPass: string) => {
    setEmail(accEmail);
    setPassword(accPass);
  };

  return (
    <div className="max-w-md mx-auto my-12 space-y-6">
      {/* Brand Header */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 via-indigo-600 to-accent-disney flex items-center justify-center text-white mx-auto shadow-glow">
          <Film className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-black text-white tracking-tight">
          Welcome back to StreamShare
        </h1>
        <p className="text-xs text-slate-400">
          Sign in to negotiate subscriptions and message verified peers.
        </p>
      </div>

      {/* Login Card */}
      <div className="bg-surface border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
        {error && (
          <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 font-mono mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@streamshare.io"
                className="w-full bg-surfaceLight border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 font-mono mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-surfaceLight border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl font-bold text-sm bg-brand-600 hover:bg-brand-500 text-white shadow-glow disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? 'Authenticating...' : 'Sign In'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Demo Credentials */}
        <div className="pt-4 border-t border-slate-800 space-y-2">
          <span className="text-[11px] font-mono uppercase text-slate-400 block font-semibold">
            One-Click Test Accounts:
          </span>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => selectDemoAccount('admin@streamshare.io', 'AdminSecurePass2026!')}
              className="p-2 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 hover:bg-red-900/40 text-left transition-colors"
            >
              <div className="font-bold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-red-400" /> Admin
              </div>
              <div className="text-[10px] text-slate-400">admin@streamshare.io</div>
            </button>

            <button
              type="button"
              onClick={() => selectDemoAccount('alice@streamshare.io', 'UserSecurePass2026!')}
              className="p-2 rounded-xl bg-surfaceLight border border-slate-700 text-slate-200 hover:bg-slate-800 text-left transition-colors"
            >
              <div className="font-bold">Alice (Seller)</div>
              <div className="text-[10px] text-slate-400">alice@streamshare.io</div>
            </button>

            <button
              type="button"
              onClick={() => selectDemoAccount('bob@streamshare.io', 'UserSecurePass2026!')}
              className="p-2 rounded-xl bg-surfaceLight border border-slate-700 text-slate-200 hover:bg-slate-800 text-left transition-colors"
            >
              <div className="font-bold">Bob (Seller)</div>
              <div className="text-[10px] text-slate-400">bob@streamshare.io</div>
            </button>

            <button
              type="button"
              onClick={() => selectDemoAccount('charlie@streamshare.io', 'UserSecurePass2026!')}
              className="p-2 rounded-xl bg-surfaceLight border border-slate-700 text-slate-200 hover:bg-slate-800 text-left transition-colors"
            >
              <div className="font-bold">Charlie (Buyer)</div>
              <div className="text-[10px] text-slate-400">charlie@streamshare.io</div>
            </button>
          </div>
        </div>
      </div>

      <div className="text-center text-xs text-slate-400">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="text-brand-400 font-semibold hover:underline">
          Create an account
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 flex justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}

