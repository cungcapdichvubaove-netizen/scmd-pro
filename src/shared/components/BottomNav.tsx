import React from 'react';
import { Shield, AlertTriangle, User, MapPin } from 'lucide-react';
import { cn } from '../../lib/utils';

interface BottomNavProps {
  activeTab: 'patrol' | 'incident' | 'attendance' | 'profile';
  onTabChange: (tab: any) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'patrol', label: 'Tuần tra', icon: MapPin },
    { id: 'incident', label: 'Sự cố', icon: AlertTriangle },
    { id: 'attendance', label: 'Chấm công', icon: Shield },
    { id: 'profile', label: 'Cá nhân', icon: User },
  ];

  return (
    <nav className="btm-nav bg-navy-900 border-t border-navy-700 h-20 pb-safe">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "flex flex-col items-center justify-center transition-all duration-200",
              isActive ? "text-accent-blue" : "text-slate-400"
            )}
          >
            <Icon size={24} className={cn(isActive && "scale-110")} />
            <span className="text-[10px] mt-1 font-medium">{tab.label}</span>
            {isActive && (
              <div className="absolute top-0 w-8 h-1 bg-accent-blue rounded-full" />
            )}
          </button>
        );
      })}
    </nav>
  );
};
