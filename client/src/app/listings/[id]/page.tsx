'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Listing } from '../../../types';
import { fetchApi } from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import {
  Tv,
  ArrowLeft,
  ShieldCheck,
  MessageSquare,
  Clock,
  CheckCircle2,
  Calendar,
  Lock,
  AlertCircle,
} from 'lucide-react';

export default function ListingDetailsPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  const [listing, setListing] = useState<Listing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStartingChat, setIsStartingChat] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadListing() {
      setIsLoading(true);
      try {
        const res = await fetchApi<Listing>(`/listings/${id}`, {
          requiresAuth: false,
        });

        if (res.success && res.data) {
          setListing(res.data);
        } else {
          setError(res.error || 'Failed to load listing.');
        }
      } catch (e) {
        setError('Network error while retrieving listing details.');
      } finally {
        setIsLoading(false);
      }
    }

    if (id) loadListing();
  }, [id]);

  const handleStartChat = async () => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=/listings/${id}`);
      return;
    }

    if (user?.id === listing?.ownerId) {
      alert('You cannot initiate a chat on your own listing.');
      return;
    }

    setIsStartingChat(true);
    try {
      const res = await fetchApi<any>('/chat/conversations', {
        method: 'POST',
        body: JSON.stringify({ listingId: listing?.id }),
      });

      if (res.success && res.data) {
        router.push(`/chat?conversationId=${res.data.id}`);
      } else {
        alert(res.error || 'Could not start conversation with seller.');
      }
    } catch (e) {
      alert('Network error connecting to chat.');
    } finally {
      setIsStartingChat(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-20 flex justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="py-16 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-white">Listing Unavailable</h2>
        <p className="text-sm text-slate-400 mt-1">{error || 'This listing does not exist.'}</p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold hover:bg-slate-700"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Feed
        </Link>
      </div>
    );
  }

  const isOwner = user?.id === listing.ownerId;
  const isAvailable = listing.status === 'ACTIVE';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back button */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Classifieds
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Listing Details */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-surface border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
            {/* Platform Header */}
            <div>
              <div className="flex items-center justify-between gap-3 mb-2">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-brand-500/10 border border-brand-500/30 text-brand-400">
                  <Tv className="w-4 h-4" />
                  {listing.platformName}
                </span>

                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    isAvailable
                      ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {listing.status}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {listing.platformName} Subscription Slot
              </h1>

              <div className="mt-2 flex items-center gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  Listed {new Date(listing.createdAt).toLocaleDateString()}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {listing.slotsAvailable} {listing.slotsAvailable === 1 ? 'Slot' : 'Slots'} Open
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="border-t border-slate-800/80 pt-6">
              <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-slate-400 mb-2">
                Subscription Description
              </h3>
              <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                {listing.description}
              </p>
            </div>

            {/* Terms and Safety Guidelines */}
            <div className="border-t border-slate-800/80 pt-6">
              <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-slate-400 mb-2">
                Owner Terms & Profile Protocol
              </h3>
              <div className="p-4 rounded-2xl bg-surfaceLight/50 border border-slate-800 text-xs text-slate-300 leading-relaxed space-y-2">
                <p>{listing.terms || 'Respect assigned profile name and PIN. Do not modify account email or passwords.'}</p>
                <div className="flex items-center gap-1.5 text-brand-400 font-medium pt-1">
                  <Lock className="w-3.5 h-3.5" />
                  Direct peer payment terms to be agreed in secure chat.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Pricing & Action Card */}
        <div className="space-y-6">
          <div className="bg-surface border border-slate-800 rounded-3xl p-6 space-y-6 sticky top-24">
            <div>
              <span className="text-xs font-mono text-slate-400 uppercase">Subscription Cost</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-4xl font-black text-white tracking-tight">
                  ${listing.price.toFixed(2)}
                </span>
                <span className="text-sm text-slate-400 lowercase">
                  /{listing.billingCycle.toLowerCase()}
                </span>
              </div>
            </div>

            {/* Seller profile snippet */}
            <div className="p-4 rounded-2xl bg-surfaceLight/40 border border-slate-800/80">
              <span className="text-[10px] font-mono uppercase text-slate-500">Verified Seller</span>
              <div className="flex items-center gap-3 mt-2">
                <div className="w-10 h-10 rounded-xl bg-brand-600/30 border border-brand-500/40 flex items-center justify-center font-bold text-brand-300 uppercase">
                  {listing.owner?.username?.substring(0, 2) || 'S'}
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{listing.owner?.username}</p>
                  <p className="text-xs text-slate-400">
                    Member since {listing.owner?.createdAt ? new Date(listing.owner.createdAt).getFullYear() : '2026'}
                  </p>
                </div>
              </div>
            </div>

            {/* Direct Message Action */}
            {isOwner ? (
              <div className="p-3 text-center bg-slate-800/60 rounded-xl text-xs text-slate-300">
                You are the owner of this listing
              </div>
            ) : (
              <button
                onClick={handleStartChat}
                disabled={!isAvailable || isStartingChat}
                className="w-full py-3.5 px-4 rounded-2xl font-bold text-sm bg-brand-600 hover:bg-brand-500 text-white shadow-glow flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <MessageSquare className="w-4 h-4" />
                {isStartingChat ? 'Connecting to Chat...' : 'Message Seller Directly'}
              </button>
            )}

            {/* Security Guarantee */}
            <div className="pt-2 border-t border-slate-800 flex items-start gap-2.5 text-xs text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                Monitored by StreamShare central safety rules. All communications are logged in PostgreSQL.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

