import React from 'react';
import { ShieldCheck, Lock, Eye, Key } from 'lucide-react';

export function SecurityBanner() {
  return (
    <div className="bg-surface/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-500">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Military-Grade P2P Security Architecture</h3>
            <p className="text-sm text-slate-400">Peer verified, centrally moderated, zero plaintext leaks</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          TLS 1.3 / WSS Enforced
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-800/60">
        <div className="flex items-start gap-3">
          <Lock className="w-4 h-4 text-brand-400 mt-1 shrink-0" />
          <div>
            <span className="text-sm font-medium text-slate-200">Rest & Transit Encryption</span>
            <p className="text-xs text-slate-400 mt-0.5">Database TDE, parameterized queries, and strict TLS 1.3 encryption.</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Key className="w-4 h-4 text-purple-400 mt-1 shrink-0" />
          <div>
            <span className="text-sm font-medium text-slate-200">Short-Lived JWT & HttpOnly</span>
            <p className="text-xs text-slate-400 mt-0.5">15-minute access tokens with rotating SameSite HttpOnly refresh cookies.</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Eye className="w-4 h-4 text-sky-400 mt-1 shrink-0" />
          <div>
            <span className="text-sm font-medium text-slate-200">Admin Central Oversight</span>
            <p className="text-xs text-slate-400 mt-0.5">Real-time WebSocket surveillance & automated policy flag scanners.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

