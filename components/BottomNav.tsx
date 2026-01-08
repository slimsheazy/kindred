
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
      className={`flex flex-col items-center justify-center py-2 px-2 transition-all duration-300 relative group`}
    >
      <span className={`text-[9px] font-bold uppercase tracking-[0.1em] heading-font ${isActive ? 'text-[#000000]' : 'text-[#000000]/60'}`}>
        {label}
      </span>
      {isActive && (
        <div className="absolute -bottom-1 w-1 h-1 bg-[#000000] rounded-full animate-fade-in"></div>
      )}
    </button>
  );
};

const BottomNav: React.FC<BottomNavProps> = ({ currentView, setCurrentView }) => {
  const navItems = [
    { view: View.Dashboard, label: 'Home' },
    { view: View.Journal, label: 'Echoes' },
    { view: View.Quiz, label: 'Quiz' },
    { view: View.Activities, label: 'Actions' },
    { view: View.Goals, label: 'Intent' },
    { view: View.Profile, label: 'Space' },
  ];

  return (
    <div className="fixed bottom-8 left-0 right-0 z-50 flex justify-center px-4">
      <nav className="flex justify-around items-center w-full max-w-md bg-white/40 backdrop-blur-xl border border-[#000000]/10 rounded-full px-2 h-14 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
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
