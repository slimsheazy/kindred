
import React from 'react';
import { View } from '../types';
import { AbstractHomeIcon, AbstractJournalIcon, AbstractActivitiesIcon, AbstractGoalsIcon, AbstractProfileIcon } from './Icons';

interface BottomNavProps {
  currentView: View;
  setCurrentView: (view: View) => void;
}

const NavItem: React.FC<{
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
}> = ({ label, icon, isActive, onClick }) => {
  const activeClass = isActive ? 'text-white bg-white/10' : 'text-white/40 hover:text-white hover:bg-white/5';
  
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center w-full h-full py-1 transition-all duration-300 rounded-xl mx-1 ${activeClass}`}
    >
      <div className="transform scale-90 mb-0.5">{icon}</div>
      <span className="text-[9px] font-bold uppercase tracking-widest">{label}</span>
    </button>
  );
};

const BottomNav: React.FC<BottomNavProps> = ({ currentView, setCurrentView }) => {
  const navItems = [
    { view: View.Dashboard, label: 'Home', icon: <AbstractHomeIcon className="w-5 h-5" /> },
    { view: View.Journal, label: 'Journal', icon: <AbstractJournalIcon className="w-5 h-5" /> },
    { view: View.Activities, label: 'Activities', icon: <AbstractActivitiesIcon className="w-5 h-5" /> },
    { view: View.Goals, label: 'Goals', icon: <AbstractGoalsIcon className="w-5 h-5" /> },
    { view: View.Profile, label: 'Profile', icon: <AbstractProfileIcon className="w-5 h-5" /> },
  ];

  return (
    <div className="fixed bottom-4 left-4 right-4 max-w-[calc(32rem-2rem)] mx-auto z-50">
      <nav className="h-16 glass-panel rounded-2xl shadow-2xl flex justify-around items-center px-2 border-white/5 bg-[#1a1618]/60 backdrop-blur-2xl">
        {navItems.map((item) => (
          <NavItem
            key={item.view}
            label={item.label}
            icon={item.icon}
            isActive={currentView === item.view}
            onClick={() => setCurrentView(item.view)}
          />
        ))}
      </nav>
    </div>
  );
};

export default BottomNav;
