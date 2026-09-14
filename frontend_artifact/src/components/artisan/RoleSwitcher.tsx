import React from 'react';
import { User, Users } from 'lucide-react';
import type { ArtisanRole } from '../../types';

interface RoleSwitcherProps {
  currentRole: ArtisanRole;
  onRoleChange: (role: ArtisanRole) => void;
}

export const RoleSwitcher: React.FC<RoleSwitcherProps> = ({ currentRole, onRoleChange }) => {
  return (
    <div className="bg-cream-200/70 p-1.5 rounded-2xl border border-terracotta-200/60 inline-flex items-center gap-1 shadow-inner-warm">
      <button
        onClick={() => onRoleChange('solo')}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ${
          currentRole === 'solo'
            ? 'bg-terracotta-500 text-white shadow-md shadow-terracotta-500/30'
            : 'text-charcoal-700 hover:text-terracotta-600 hover:bg-cream-100/50'
        }`}
      >
        <User className="w-4 h-4" />
        <span>Solo Artisan</span>
      </button>

      <button
        onClick={() => onRoleChange('shg_leader')}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ${
          currentRole === 'shg_leader'
            ? 'heritage-gold-gradient text-charcoal-900 shadow-md'
            : 'text-charcoal-700 hover:text-terracotta-600 hover:bg-cream-100/50'
        }`}
      >
        <Users className="w-4 h-4" />
        <span>50-Artisan SHG Hub</span>
        <span className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] bg-charcoal-800/10 rounded-full font-bold">
          LEADER
        </span>
      </button>
    </div>
  );
};
