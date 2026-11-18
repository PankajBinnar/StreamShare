import React from 'react';
import Link from 'next/link';
import { Listing } from '../types';
import { Tv, MessageCircle, Clock, Shield, CheckCircle2 } from 'lucide-react';

interface ListingCardProps {
  listing: Listing;
  onQuickChat?: (listing: Listing) => void;
}

export function ListingCard({ listing, onQuickChat }: ListingCardProps) {
  // Determine platform styling
  const name = listing.platformName.toLowerCase();
  let badgeColor = 'bg-brand-500/10 text-brand-400 border-brand-500/20';
  let accentBorder = 'hover:border-brand-500/50';

  if (name.includes('netflix')) {
    badgeColor = 'bg-red-950/40 text-red-400 border-red-500/30';
    accentBorder = 'hover:border-red-500/60 hover:shadow-glow-netflix';
  } else if (name.includes('disney')) {
    badgeColor = 'bg-blue-950/40 text-blue-400 border-blue-500/30';
    accentBorder = 'hover:border-blue-500/60 hover:shadow-glow-disney';
  } else if (name.includes('spotify')) {
    badgeColor = 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30';
    accentBorder = 'hover:border-emerald-500/60 hover:shadow-glow-spotify';
  } else if (name.includes('prime')) {
    badgeColor = 'bg-cyan-950/40 text-cyan-400 border-cyan-500/30';
    accentBorder = 'hover:border-cyan-500/60';
  } else if (name.includes('hbo') || name.includes('max')) {
    badgeColor = 'bg-purple-950/40 text-purple-400 border-purple-500/30';
    accentBorder = 'hover:border-purple-500/60';
  } else if (name.includes('youtube')) {
    badgeColor = 'bg-rose-950/40 text-rose-400 border-rose-500/30';
    accentBorder = 'hover:border-rose-500/60';
  }

  const isSold = listing.status === 'SOLD';
  const isSuspended = listing.status === 'SUSPENDED';

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div
      className={`relative group bg-surface border border-slate-800 rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 ${accentBorder} ${
        isSold || isSuspended ? 'opacity-60 grayscale-[40%]' : ''
      }`}
    >
      <div>
        {/* Top Header: Platform Badge & Status */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${badgeColor}`}
          >
            <Tv className="w-3.5 h-3.5" />
            {listing.platformName}
          </span>

          {listing.status === 'ACTIVE' ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {listing.slotsAvailable} {listing.slotsAvailable === 1 ? 'Slot' : 'Slots'} Open
            </span>
          ) : (
            <span className="text-[11px] font-medium text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
              {listing.status}
            </span>
          )}
        </div>

        {/* Description */}
        <p className="text-sm text-slate-300 line-clamp-2 mb-4 leading-relaxed font-normal">
          {listing.description}
        </p>

        {/* Seller Info */}
        <div className="flex items-center gap-2 mb-4 text-xs text-slate-400">
          <div className="w-6 h-6 rounded-full bg-brand-700/40 border border-brand-500/30 flex items-center justify-center text-[10px] text-brand-300 font-bold uppercase">
            {listing.owner?.username?.substring(0, 2) || 'S'}
          </div>
          <span className="font-medium text-slate-300">{listing.owner?.username || 'Seller'}</span>
          <span className="text-slate-600">•</span>
          <span className="flex items-center gap-1 text-slate-400">
            <Clock className="w-3 h-3" />
            {timeAgo(listing.createdAt)}
          </span>
        </div>
      </div>

      {/* Card Footer: Price & Direct Message button */}
      <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between gap-2">
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-white tracking-tight">
              ${listing.price.toFixed(2)}
            </span>
            <span className="text-xs text-slate-400 lowercase">
              /{listing.billingCycle.toLowerCase()}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/listings/${listing.id}`}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            Details
          </Link>

          {!isSold && !isSuspended && (
            <button
              onClick={() => (onQuickChat ? onQuickChat(listing) : null)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white shadow-glow transition-all"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Chat
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

