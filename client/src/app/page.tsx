'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Listing, Category } from '../types';
import { fetchApi } from '../lib/api';
import { ListingCard } from '../components/ListingCard';
import { CategoryFilter } from '../components/CategoryFilter';
import { SecurityBanner } from '../components/SecurityBadge';
import { useAuth } from '../context/AuthContext';
import {
  Search,
  Filter,
  SlidersHorizontal,
  Plus,
  Tv,
  ArrowUpDown,
  Sparkles,
} from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<Category | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [platformFilter, setPlatformFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc'>('newest');
  const [maxPrice, setMaxPrice] = useState<string>('');

  const loadListings = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== 'ALL') params.append('category', selectedCategory);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      if (platformFilter) params.append('platform', platformFilter);
      if (maxPrice) params.append('maxPrice', maxPrice);
      params.append('sortBy', sortBy);

      const res = await fetchApi<Listing[]>(`/listings?${params.toString()}`, {
        requiresAuth: false,
      });

      if (res.success && res.data) {
        setListings(res.data);
      }
    } catch (err) {
      console.error('Failed to load listings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadListings();
  }, [selectedCategory, platformFilter, sortBy]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadListings();
  };

  const handleQuickChat = async (listing: Listing) => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=/listings/${listing.id}`);
      return;
    }

    try {
      const res = await fetchApi<any>('/chat/conversations', {
        method: 'POST',
        body: JSON.stringify({ listingId: listing.id }),
      });

      if (res.success && res.data) {
        router.push(`/chat?conversationId=${res.data.id}`);
      } else {
        alert(res.error || 'Failed to start chat with seller.');
      }
    } catch (err) {
      alert('Network error when initializing chat channel.');
    }
  };

  const quickPlatforms = ['Netflix', 'Disney+', 'Prime Video', 'Spotify', 'YouTube Premium'];

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-surface via-surface/60 to-background border border-slate-800 p-8 sm:p-12 text-center">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-brand-600/10 via-transparent to-transparent pointer-events-none" />

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-semibold mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          Decentralized P2P OTT Subscription Exchange
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight max-w-3xl mx-auto leading-tight">
          Share Premium OTT Subscriptions with{' '}
          <span className="bg-gradient-to-r from-brand-400 to-accent-disney bg-clip-text text-transparent">
            Total Peace of Mind
          </span>
        </h1>

        <p className="mt-4 text-sm sm:text-base text-slate-400 max-w-2xl mx-auto">
          Split official family profiles for Netflix, Disney+, Prime, and Spotify. Direct peer messaging backed by centralized moderation surveillance and TLS 1.3 encryption.
        </p>

        {/* Global Search Bar */}
        <form onSubmit={handleSearchSubmit} className="mt-8 max-w-2xl mx-auto">
          <div className="relative flex items-center">
            <Search className="absolute left-4 w-5 h-5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by OTT platform (e.g. Netflix 4K, Disney+, Spotify Family)..."
              className="w-full bg-surfaceLight/80 border border-slate-700/80 rounded-2xl py-3.5 pl-12 pr-28 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 shadow-xl transition-all"
            />
            <button
              type="submit"
              className="absolute right-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-glow transition-all"
            >
              Search
            </button>
          </div>
        </form>

        {/* Quick Platform Filter Pills */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <span className="text-xs text-slate-500 font-mono">Popular Platforms:</span>
          {quickPlatforms.map((plat) => (
            <button
              key={plat}
              onClick={() => {
                setPlatformFilter(platformFilter === plat ? '' : plat);
              }}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                platformFilter === plat
                  ? 'bg-brand-500/20 border-brand-400 text-brand-300'
                  : 'bg-surface border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {plat}
            </button>
          ))}
        </div>
      </div>

      {/* Security Architecture Component */}
      <SecurityBanner />

      {/* Classifieds Feed Controls */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Tv className="w-5 h-5 text-brand-400" />
              Active Classifieds Feed
            </h2>
            <p className="text-xs text-slate-400">
              Verified peer listings available for immediate profile allocation
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 bg-surface border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                aria-label="Sort listings by"
                className="bg-transparent focus:outline-none cursor-pointer"
              >
                <option value="newest" className="bg-surface">Newest First</option>
                <option value="price_asc" className="bg-surface">Price: Low to High</option>
                <option value="price_desc" className="bg-surface">Price: High to Low</option>
              </select>
            </div>

            {/* Post Listing CTA */}
            {isAuthenticated && (
              <button
                onClick={() => router.push('/listings/new')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-glow transition-all"
              >
                <Plus className="w-4 h-4" />
                Post Listing
              </button>
            )}
          </div>
        </div>

        {/* Category Filter Pills */}
        <CategoryFilter
          selectedCategory={selectedCategory}
          onSelectCategory={(cat) => setSelectedCategory(cat)}
        />
      </div>

      {/* Listings Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-64 rounded-2xl bg-surface/50 border border-slate-800/60 animate-pulse"
            />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-16 bg-surface/30 border border-slate-800 rounded-3xl p-8">
          <Tv className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white">No active listings match your criteria</h3>
          <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
            Try adjusting your search terms, clearing platform filters, or be the first peer to list a subscription slot!
          </p>
          {isAuthenticated && (
            <button
              onClick={() => router.push('/listings/new')}
              className="mt-4 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-glow transition-all"
            >
              Post a Subscription Listing
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              onQuickChat={handleQuickChat}
            />
          ))}
        </div>
      )}
    </div>
  );
}

