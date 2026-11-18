import React from 'react';
import { Category } from '../types';
import { Film, Music, Gamepad2, Briefcase, Grid } from 'lucide-react';

interface CategoryFilterProps {
  selectedCategory: Category | 'ALL';
  onSelectCategory: (category: Category | 'ALL') => void;
}

export function CategoryFilter({
  selectedCategory,
  onSelectCategory,
}: CategoryFilterProps) {
  const categories: { id: Category | 'ALL'; label: string; icon: React.ReactNode }[] = [
    { id: 'ALL', label: 'All Categories', icon: <Grid className="w-4 h-4" /> },
    { id: 'VIDEO', label: 'Video Streaming', icon: <Film className="w-4 h-4" /> },
    { id: 'MUSIC', label: 'Music & Audio', icon: <Music className="w-4 h-4" /> },
    { id: 'GAMING', label: 'Cloud Gaming', icon: <Gamepad2 className="w-4 h-4" /> },
    { id: 'PRODUCTIVITY', label: 'Productivity & VPN', icon: <Briefcase className="w-4 h-4" /> },
  ];

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
      {categories.map((cat) => {
        const isSelected = selectedCategory === cat.id;
        return (
          <button
            key={cat.id}
            onClick={() => onSelectCategory(cat.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              isSelected
                ? 'bg-brand-600 text-white shadow-glow border border-brand-400/40'
                : 'bg-surface border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            {cat.icon}
            {cat.label}
          </button>
        );
      })}
    </div>
  );
}

