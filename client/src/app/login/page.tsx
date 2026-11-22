'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../context/AuthContext';
import { Lock, Mail, Film, AlertCircle, ArrowRight, ShieldCheck, KeyRound } from 'lucide-react';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';

  const { login, loginWithGoogle, isAuthenticated } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isAuthenticated) {
    router.push(redirect);
    return null;
  }

  const handleGoogleSuccess = async (credentialResponse: any) => {
    if (credentialResponse.credential) {
      setIsLoading(true);
      setError(null);
      try {
        const res = await loginWithGoogle(credentialResponse.credential);
        if (res.success) {
          router.push(redirect);
        } else {
          setError(res.error || 'Google login failed.');
        }
      } catch (err: any) {
        setError('Network communication failed during Google login.');
      } finally {
        setIsLoading(false);
      }
    }
  };

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

        {/* Google Authentication */}
        <div className="space-y-3">
          <div className="flex justify-center w-full [&>div]:w-full">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError('Google sign-in was cancelled or failed.')}
              theme="outline"
              size="large"
              width="100%"
              text="signin_with"
              shape="rectangular"
            />
          </div>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-700/80"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-surface px-3 text-slate-400 font-mono font-bold tracking-wider">
                OR
              </span>
            </div>
          </div>
        </div>

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

