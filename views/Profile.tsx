
import React, { useState, useEffect } from 'react';
import { UserData } from '../types';

interface ProfileProps {
  onReset: () => void;
}

const Profile: React.FC<ProfileProps> = ({ onReset }) => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [activeMessage, setActiveMessage] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('bonds_user_data');
    if (saved) setUserData(JSON.parse(saved));
  }, []);

  const getInitials = () => {
      if (!userData) return 'BC';
      return `${userData.userName[0] || 'U'}${userData.partnerName[0] || 'P'}`.toUpperCase();
  };

  const handleAction = (label: string) => {
    setActiveMessage(`"${label}" will be available in the next version.`);
    setTimeout(() => setActiveMessage(null), 3000);
  };

  const copyCode = () => {
    if (userData?.partnerCode) {
      navigator.clipboard.writeText(userData.partnerCode);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  return (
    <div className="px-6 py-12 max-w-xl mx-auto animate-fade-in">
       <header className="mb-16">
        <h1 className="text-6xl font-light mb-2 text-[#000000]">Profile.</h1>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#000000]/70 heading-font">Manage your shared space</p>
      </header>
      
      <div className="flex flex-col items-center mb-16">
        <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-[#FF007F]/10 to-[#00FF41]/10 flex items-center justify-center border border-[#000000]/10 shadow-sm mb-6">
            <span className="text-4xl font-light text-[#000000] tracking-tighter">{getInitials()}</span>
        </div>
        
        <h2 className="text-3xl font-light text-[#000000]">
            {userData ? `${userData.userName} & ${userData.partnerName}` : 'Your Connection'}
        </h2>
        
        {userData?.partnerCode && (
            <button 
                onClick={copyCode}
                className="mt-4 flex flex-col items-center gap-1 group"
            >
                <span className="text-[10px] font-bold text-[#000000]/40 uppercase tracking-widest group-hover:text-[#000000]/60 transition-colors">
                  {copySuccess ? 'Copied!' : 'Shared Code'}
                </span>
                <span className="text-sm font-mono font-bold text-[#000000] tracking-widest bg-black/5 px-3 py-1 rounded-full">{userData.partnerCode}</span>
            </button>
        )}
      </div>

      {activeMessage && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 bg-black text-white px-6 py-3 rounded-full text-xs font-bold uppercase tracking-widest z-[200] animate-fade-in shadow-xl">
            {activeMessage}
        </div>
      )}

      <div className="space-y-2 mb-24">
          {['Relationship Settings', 'Privacy & Sync', 'App Appearance', 'Support'].map(item => (
              <button 
                key={item} 
                onClick={() => handleAction(item)}
                className="w-full text-left py-8 border-b border-[#000000]/10 flex justify-between items-center group hover:bg-black/[0.02] transition-colors"
              >
                  <span className="text-2xl font-light text-[#000000] group-hover:pl-4 transition-all">{item}</span>
                  <span className="text-xs font-bold text-[#000000]/20">Explore</span>
              </button>
          ))}
      </div>
      
      <div className="space-y-6">
          <button 
              onClick={onReset}
              className="w-full border border-[#000000] text-[#000000] font-bold py-6 rounded-full hover:bg-[#000000] hover:text-white transition-all text-xs tracking-[0.2em] uppercase heading-font"
          >
              Reset Account
          </button>
          <p className="text-[10px] text-[#000000]/40 font-bold uppercase tracking-widest text-center leading-relaxed heading-font">
              Resetting will clear all local data, including your journal, goals, and learning path.
          </p>
      </div>
    </div>
  );
};

export default Profile;
