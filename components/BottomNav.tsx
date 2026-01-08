
import React from 'react';
import { View } from '../types';
import { HomeIcon, BookOpenIcon, SparklesIcon, FlagIcon, UserCircleIcon } from './Icons';

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
  // Active state is now dark text/teal, inactive is muted slate
  const activeClass = isActive ? 'text-slate-900 bg-white/40' : 'text-slate-600 hover:text-slate-900';
  
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center w-full h-full py-1 transition-all duration-300 rounded-xl mx-1 ${activeClass}`}
    >
      <div className="transform scale-90">{icon}</div>
      <span className="text-[10px] font-medium mt-0.5">{label}</span>
    </button>
  );
};

const BottomNav: React.FC<BottomNavProps> = ({ currentView, setCurrentView }) => {
  const navItems = [
    { view: View.Dashboard, label: 'Home', icon: <HomeIcon className="w-6 h-6" /> },
    { view: View.Journal, label: 'Journal', icon: <BookOpenIcon className="w-6 h-6" /> },
    { view: View.Activities, label: 'Activities', icon: <SparklesIcon className="w-6 h-6" /> },
    { view: View.Goals, label: 'Goals', icon: <FlagIcon className="w-6 h-6" /> },
    { view: View.Profile, label: 'Profile', icon: <UserCircleIcon className="w-6 h-6" /> },
  ];

  return (
    <div className="fixed bottom-4 left-4 right-4 max-w-[calc(32rem-2rem)] mx-auto z-50">
      <nav className="h-16 glass-panel rounded-2xl shadow-2xl flex justify-around items-center px-2">
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
