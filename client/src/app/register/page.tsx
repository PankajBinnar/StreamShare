'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../context/AuthContext';
import { Lock, Mail, User as UserIcon, Film, AlertCircle, ArrowRight, Shield } from 'lucide-react';
import { Role } from '../../types';

export default function RegisterPage() {
  const router = useRouter();
  const { register, loginWithGoogle, isAuthenticated } = useAuth();

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isAuthenticated) {
    router.push('/');
    return null;
  }

  const handleGoogleSuccess = async (credentialResponse: any) => {
    if (credentialResponse.credential) {
      setIsLoading(true);
      setError(null);
      try {
        const res = await loginWithGoogle(credentialResponse.credential);
        if (res.success) {
          router.push('/');
        } else {
          setError(res.error || 'Google sign-up failed.');
        }
      } catch (err: any) {
        setError('Network communication failed during Google sign-up.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      setError('Password must be at least 8 characters and include at least 1 uppercase letter and 1 number.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await register(email, username, password, 'USER');
      if (res.success) {
        router.push('/');
      } else {
        setError(res.error || 'Failed to create account.');
      }
    } catch (err: any) {
      setError('Network communication failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-10 space-y-6">
      {/* Brand Header */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 via-indigo-600 to-accent-disney flex items-center justify-center text-white mx-auto shadow-glow">
          <Film className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-black text-white tracking-tight">
          Create StreamShare Account
        </h1>
        <p className="text-xs text-slate-400">
          Join the verified marketplace for safe OTT profile sharing.
        </p>
      </div>

      {/* Register Card */}
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
              onError={() => setError('Google sign-up was cancelled or failed.')}
              theme="outline"
              size="large"
              text="signup_with"
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
                placeholder="you@domain.com"
                className="w-full bg-surfaceLight border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 font-mono mb-1.5">
              Username
            </label>
            <div className="relative">
              <UserIcon className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="CinemaLover99"
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
                placeholder="At least 8 chars (1 uppercase, 1 number)"
                className="w-full bg-surfaceLight border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              Minimum 8 characters with at least one uppercase letter and one numeric character.
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl font-bold text-sm bg-brand-600 hover:bg-brand-500 text-white shadow-glow disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? 'Creating Account...' : 'Complete Registration'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-emerald-400" />
          Passwords hashed with bcrypt (cost factor 12)
        </div>
      </div>

      <div className="text-center text-xs text-slate-400">
        Already have an account?{' '}
        <Link href="/login" className="text-brand-400 font-semibold hover:underline">
          Sign In
        </Link>
      </div>
    </div>
  );
}

