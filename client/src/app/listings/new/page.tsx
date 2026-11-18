'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { fetchApi } from '../../../lib/api';
import { Listing, Category, BillingCycle } from '../../../types';
import {
  Tv,
  PlusCircle,
  AlertCircle,
  CheckCircle,
  DollarSign,
  Shield,
  Layers,
} from 'lucide-react';

const COMMON_PLATFORMS = [
  'Netflix Premium 4K UHD',
  'Disney+ Trio Bundle (Disney+, Hulu, ESPN+)',
  'Amazon Prime Video & Gaming',
  'Spotify Premium Family',
  'YouTube Premium Family Slot',
  'HBO Max Ad-Free',
  'Apple One Premier (Apple Music, TV+, Arcade)',
  'Crunchyroll Mega Fan',
];

export default function CreateListingPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [platformName, setPlatformName] = useState('');
  const [category, setCategory] = useState<Category>('VIDEO');
  const [price, setPrice] = useState('4.99');
  const [currency, setCurrency] = useState('USD');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('MONTHLY');
  const [slotsAvailable, setSlotsAvailable] = useState('1');
  const [description, setDescription] = useState('');
  const [terms, setTerms] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/listings/new');
    }
  }, [authLoading, isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!platformName || !description || !price) {
      setError('Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetchApi<Listing>('/listings', {
        method: 'POST',
        body: JSON.stringify({
          platformName,
          category,
          price: parseFloat(price),
          currency,
          billingCycle,
          slotsAvailable: parseInt(slotsAvailable, 10),
          description,
          terms,
        }),
      });

      if (res.success && res.data) {
        router.push(`/listings/${res.data.id}`);
      } else {
        setError(res.error || 'Failed to publish listing.');
      }
    } catch (err: any) {
      setError('Network communication failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="py-20 flex justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-400 text-xs font-semibold">
          <PlusCircle className="w-3.5 h-3.5" />
          Verified OTT Classifieds Creator
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          List Your Subscription Slot
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Share your family profile slot with trusted peers while keeping your master account safe.
        </p>
      </div>

      <div className="bg-surface border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Platform Quick Selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 font-mono mb-2">
              Common OTT Services (Quick Select)
            </label>
            <div className="flex flex-wrap gap-2">
              {COMMON_PLATFORMS.map((plat) => (
                <button
                  type="button"
                  key={plat}
                  onClick={() => {
                    setPlatformName(plat);
                    if (plat.includes('Spotify')) setCategory('MUSIC');
                    else setCategory('VIDEO');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                    platformName === plat
                      ? 'bg-brand-600/30 border-brand-500 text-white'
                      : 'bg-surfaceLight/50 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {plat.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Platform Name Input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 font-mono mb-1.5">
              Platform / Service Name *
            </label>
            <input
              type="text"
              value={platformName}
              onChange={(e) => setPlatformName(e.target.value)}
              placeholder="e.g. Netflix Premium 4K UHD Profile"
              required
              className="w-full bg-surfaceLight border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          {/* Category & Billing Cycle Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 font-mono mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className="w-full bg-surfaceLight border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
              >
                <option value="VIDEO">Video Streaming</option>
                <option value="MUSIC">Music & Audio</option>
                <option value="GAMING">Cloud Gaming</option>
                <option value="PRODUCTIVITY">Productivity & Security</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 font-mono mb-1.5">
                Billing Cadence
              </label>
              <select
                value={billingCycle}
                onChange={(e) => setBillingCycle(e.target.value as BillingCycle)}
                className="w-full bg-surfaceLight border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
              >
                <option value="MONTHLY">Monthly</option>
                <option value="QUARTERLY">Quarterly (3 Months)</option>
                <option value="BIANNUAL">Biannual (6 Months)</option>
                <option value="YEARLY">Yearly (12 Months)</option>
              </select>
            </div>
          </div>

          {/* Price & Slots Available */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 font-mono mb-1.5">
                Price per Cycle (USD) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.50"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="4.99"
                  required
                  className="w-full bg-surfaceLight border border-slate-700/80 rounded-xl pl-8 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 font-mono mb-1.5">
                Available Slots *
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={slotsAvailable}
                onChange={(e) => setSlotsAvailable(e.target.value)}
                required
                className="w-full bg-surfaceLight border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 font-mono mb-1.5">
              Description & Specifications *
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detail the plan type (e.g., 4K HDR screen, dedicated PIN, invite link delivery, renewal schedules)..."
              required
              className="w-full bg-surfaceLight border border-slate-700/80 rounded-xl p-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          {/* Terms & Conditions */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 font-mono mb-1.5">
              Terms & Sharing Protocol
            </label>
            <textarea
              rows={2}
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              placeholder="e.g. Profile PIN locked to 1 device. No changing account email. Direct peer payment on the 1st."
              className="w-full bg-surfaceLight border border-slate-700/80 rounded-xl p-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 rounded-xl font-bold text-sm bg-brand-600 hover:bg-brand-500 text-white shadow-glow disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            {isSubmitting ? 'Publishing Listing...' : 'Publish OTT Subscription'}
          </button>
        </form>
      </div>
    </div>
  );
}

