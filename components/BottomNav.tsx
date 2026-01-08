
import React from 'react';
import { View } from '../types';

interface BottomNavProps {
  currentView: View;
  setCurrentView: (view: View) => void;
}

const NavItem: React.FC<{
  label: string;
  isActive: boolean;
  onClick: () => void;
}> = ({ label, isActive, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center py-2 px-3 transition-all duration-300 relative group`}
    >
      <span className={`text-[10px] font-bold uppercase tracking-[0.15em] heading-font ${isActive ? 'text-[#262626]' : 'text-[#262626]/60'}`}>
        {label}
      </span>
      {isActive && (
        <div className="absolute -bottom-1 w-1 h-1 bg-[#262626] rounded-full animate-fade-in"></div>
      )}
    </button>
  );
};

const BottomNav: React.FC<BottomNavProps> = ({ currentView, setCurrentView }) => {
  const navItems = [
    { view: View.Dashboard, label: 'Home' },
    { view: View.Journal, label: 'Journal' },
    { view: View.Activities, label: 'Actions' },
    { view: View.Goals, label: 'Intent' },
    { view: View.Profile, label: 'Profile' },
  ];

  return (
    <div className="fixed bottom-8 left-0 right-0 z-50 flex justify-center px-6">
      <nav className="flex justify-around items-center w-full max-w-sm bg-white/40 backdrop-blur-xl border border-[#262626]/10 rounded-full px-4 h-14 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        {navItems.map((item) => (
          <NavItem
            key={item.view}
            label={item.label}
            isActive={currentView === item.view}
            onClick={() => setCurrentView(item.view)}
          />
        ))}
      </nav>
    </div>
  );
};

export default BottomNav;
