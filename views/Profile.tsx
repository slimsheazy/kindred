
import React, { useState, useEffect } from 'react';
import { UserData } from '../types';

interface ProfileProps {
  onReset: () => void;
}

const Profile: React.FC<ProfileProps> = ({ onReset }) => {
  const [userData, setUserData] = useState<UserData | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('bonds_user_data');
    if (saved) setUserData(JSON.parse(saved));
  }, []);

  const getInitials = () => {
      if (!userData) return 'BC';
      return `${userData.userName[0] || 'U'}${userData.partnerName[0] || 'P'}`.toUpperCase();
  };

  return (
    <div className="p-2 md:p-4 pb-24">
       <header className="mb-8 mt-4">
        <h1 className="text-4xl font-light text-white tracking-tight">Profile</h1>
        <p className="text-white/70 mt-1">Manage your shared space.</p>
      </header>
      <div className="glass-panel rounded-3xl p-8 text-center shadow-xl">
        <div className="relative inline-block mb-6">
            <div className="w-28 h-28 rounded-full mx-auto bg-gradient-to-tr from-rose-200 to-teal-100 flex items-center justify-center border-4 border-white shadow-lg">
                <span className="text-3xl font-bold text-slate-700 tracking-tighter">{getInitials()}</span>
            </div>
            <div className="absolute bottom-2 right-1 w-6 h-6 bg-teal-400 border-2 border-white rounded-full shadow-sm"></div>
        </div>
        
        <h2 className="text-2xl font-bold text-slate-800">
            {userData ? `${userData.userName} & ${userData.partnerName}` : 'Your Connection'}
        </h2>
        
        {userData?.partnerCode && (
            <div className="mt-2 flex items-center justify-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Shared Code</span>
                <span className="text-xs font-mono font-bold text-slate-600 bg-white/50 px-2 py-0.5 rounded border border-white/40">{userData.partnerCode}</span>
            </div>
        )}

        <div className="mt-8 space-y-3">
            {['Relationship Settings', 'Privacy & Sync', 'App Appearance', 'Support'].map(item => (
                <button key={item} className="w-full flex justify-between items-center p-4 bg-white/40 rounded-xl hover:bg-white/60 transition-colors text-slate-700 font-medium border border-white/40 text-sm">
                    {item}
                    <span className="text-slate-400 text-lg">›</span>
                </button>
            ))}
        </div>
        
        <div className="pt-10 space-y-4">
            <button 
                onClick={onReset}
                className="w-full bg-slate-900 text-white font-bold py-4 px-4 rounded-xl hover:bg-slate-800 transition-all shadow-lg text-sm"
            >
                Reset Account
            </button>
            <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                Resetting will clear all local data, including your journal, goals, and learning path.
            </p>
        </div>
      </div>
    </div>
  );
};

export default Profile;
