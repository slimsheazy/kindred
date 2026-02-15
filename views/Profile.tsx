
import React, { useState, useEffect } from 'react';
import { UserData } from '../types';
import { initializeGeminiContext } from '../services/geminiService';
import { cloudService } from '../services/cloudService';
import { isSupabaseConfigured, updateSupabaseConfig, clearSupabaseConfig } from '../services/supabase';

interface ProfileProps {
  onReset: () => void;
  onThemeChange?: (theme: 'light' | 'midnight') => void;
}

const Profile: React.FC<ProfileProps> = ({ onReset, onThemeChange }) => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [activeMessage, setActiveMessage] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [isConfiguringCloud, setIsConfiguringCloud] = useState(false);
  const [foundPartner, setFoundPartner] = useState<{ id: string, userName: string } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  
  const [partnerCodeInput, setPartnerCodeInput] = useState('');
  const [syncTimestamp, setSyncTimestamp] = useState<number>(Date.now());
  
  // Cloud Config State
  const [dbUrl, setDbUrl] = useState(localStorage.getItem('kindred_supabase_url') || '');
  const [dbKey, setDbKey] = useState(localStorage.getItem('kindred_supabase_key') || '');

  const vibes = [
    { label: 'Neutral', emoji: '⚪' },
    { label: 'Thinking of You', emoji: '💭' },
    { label: 'Deep Work', emoji: '🕯' },
    { label: 'Missing You', emoji: '🌊' },
    { label: 'Reflecting', emoji: '✨' },
    { label: 'Open to talk', emoji: '🌿' }
  ];

  useEffect(() => {
    const saved = localStorage.getItem('kindred_user_data');
    if (saved) {
        const parsed = JSON.parse(saved);
        setUserData(parsed);
    }
    
    const interval = setInterval(() => setSyncTimestamp(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  const getInitials = () => {
      if (!userData) return 'K';
      return `${userData.userName[0] || 'U'}${userData.partnerName[0] || 'P'}`.toUpperCase();
  };

  const showMessage = (msg: string) => {
    setActiveMessage(msg);
    setTimeout(() => setActiveMessage(null), 3000);
  };

  const toggleTheme = () => {
    if (!userData) return;
    const newTheme: 'light' | 'midnight' = userData.theme === 'midnight' ? 'light' : 'midnight';
    const updated: UserData = { ...userData, theme: newTheme };
    setUserData(updated);
    localStorage.setItem('kindred_user_data', JSON.stringify(updated));
    if (onThemeChange) onThemeChange(newTheme);
    showMessage(`Resonance shifted to ${newTheme === 'midnight' ? 'Midnight' : 'Light'}`);
  };

  const copyCode = () => {
    if (userData?.id) {
      navigator.clipboard.writeText(userData.id);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
      showMessage("Invite code copied to clipboard.");
    }
  };

  const setVibe = async (vibeLabel: string) => {
    if (!userData) return;
    await cloudService.updateVibe(userData.id, vibeLabel);
    const updated = { ...userData, vibe: vibeLabel };
    setUserData(updated);
    localStorage.setItem('kindred_user_data', JSON.stringify(updated));
    showMessage(`Vibe set to ${vibeLabel}`);
  };

  const linkPartner = async () => {
    if (foundPartner && userData) {
        await cloudService.linkPartner(userData.id, foundPartner.id);
        const isMutual = await cloudService.checkMutualLink(userData.id, foundPartner.id);
        
        const updated: UserData = { ...userData, partnerCode: foundPartner.id };
        setUserData(updated);
        localStorage.setItem('kindred_user_data', JSON.stringify(updated));
        
        if (isMutual) {
            localStorage.setItem('kindred_fusion_pending', 'true');
        }

        initializeGeminiContext(updated);
        setIsLinking(false);
        showMessage("Handshake initiated.");
        window.location.reload();
    }
  };

  const handleCodeChange = async (val: string) => {
    setPartnerCodeInput(val);
    if (val.length > 5) {
        setIsSearching(true);
        const p = await cloudService.getPartnerByCode(val);
        setFoundPartner(p);
        setIsSearching(false);
    } else {
        setFoundPartner(null);
    }
  };

  const handleSaveCloudConfig = () => {
    if (dbUrl.trim() && dbKey.trim()) {
      updateSupabaseConfig(dbUrl.trim(), dbKey.trim());
    }
  };

  const handleDisconnectCloud = () => {
    if (window.confirm("Switch back to local-only mode?")) {
      clearSupabaseConfig();
    }
  };

  const handleLogout = () => {
    if (window.confirm("Disconnecting will clear the local session. Proceed?")) {
        onReset();
    }
  };

  return (
    <div className="px-6 py-12 max-w-xl mx-auto animate-fade-in relative transition-colors duration-700">
       <header className="mb-16">
        <h1 className="text-clamp-6xl font-light mb-2">Space.</h1>
        <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-40 heading-font">Global Synchronization</p>
      </header>
      
      <div className="flex flex-col items-center mb-16">
        <div className="w-40 h-40 rounded-full bg-gradient-to-tr from-[#D44D85]/10 to-[#3D8C50]/10 flex items-center justify-center border border-black/5 dark:border-white/5 shadow-sm mb-8 relative group">
            <span className="text-5xl font-light tracking-tighter">{getInitials()}</span>
            <div className={`absolute -bottom-1 -right-1 w-8 h-8 rounded-full border-4 border-current ${isSupabaseConfigured ? 'bg-[#3D8C50] animate-pulse' : 'bg-black/10'}`} title={isSupabaseConfigured ? "Cloud Active" : "Local Only"} />
        </div>
        
        <h2 className="text-clamp-4xl font-light">
            {userData ? `${userData.userName} & ${userData.partnerName}` : 'Your Connection'}
        </h2>
        
        <div className="mt-8 flex flex-col items-center gap-6 w-full">
            <div className="text-center">
              <span className="text-[8px] font-bold text-[#000000]/40 uppercase tracking-[0.3em] block mb-2 heading-font">Synchronized Under</span>
              <span className="text-sm font-mono font-bold text-[#000000] tracking-widest bg-black/5 px-6 py-3 rounded-full border border-black/5">
                  {userData?.partnerCode || 'Individual Space'}
              </span>
            </div>

            <div className="flex gap-6">
              <button 
                  onClick={() => setIsLinking(true)}
                  className="text-xs font-bold text-[#3D8C50] dark:text-[#A8FFB5] uppercase tracking-[0.2em] border-b border-current pb-2 heading-font"
              >
                Merge with Partner
              </button>
              <button 
                  onClick={toggleTheme}
                  className="text-xs font-bold opacity-40 uppercase tracking-[0.2em] border-b border-current pb-2 heading-font"
              >
                {userData?.theme === 'midnight' ? 'Shift to Light' : 'Shift to Midnight'}
              </button>
            </div>
        </div>
      </div>

      <div className="mb-16">
          <span className="text-[8px] font-bold uppercase tracking-widest text-[#000000]/40 mb-6 block heading-font text-center">Set Your Vibe</span>
          <div className="grid grid-cols-3 gap-3">
              {vibes.map(v => (
                  <button 
                    key={v.label}
                    onClick={() => setVibe(v.label)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-3xl border transition-all ${userData?.vibe === v.label ? 'border-[#00FF41] bg-[#00FF41]/5' : 'border-black/5 hover:border-black/10'}`}
                  >
                      <span className="text-xl">{v.emoji}</span>
                      <span className="text-[7px] font-bold uppercase tracking-widest text-black/50 text-center">{v.label}</span>
                  </button>
              ))}
          </div>
      </div>

      <div className="mb-24 space-y-8 p-10 bg-white/40 border border-[#000000]/5 rounded-[3rem]">
          <div>
            <span className="text-[8px] font-bold uppercase tracking-widest text-[#000000]/40 mb-3 block heading-font">Your Invite Code</span>
            <button onClick={copyCode} className="w-full flex justify-between items-center py-4 px-6 bg-black/5 rounded-2xl hover:bg-black/10 transition-all">
                <span className="font-mono text-xs font-bold">{userData?.id}</span>
                <span className="text-[10px] font-bold uppercase text-[#000000]/40">{copySuccess ? 'Copied' : 'Copy'}</span>
            </button>
            <p className="text-[10px] text-[#000000]/40 mt-4 leading-relaxed">Give this code to your partner. When they enter it in their "Merge" settings, your spaces will synchronize in real-time.</p>
          </div>
      </div>

      {activeMessage && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 bg-black text-white px-6 py-3 rounded-full text-xs font-bold uppercase tracking-widest z-[200] animate-fade-in shadow-xl text-center">
            {activeMessage}
        </div>
      )}

      {/* Merge Modal */}
      {isLinking && (
          <div className="fixed inset-0 z-[150] bg-black/40 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
              <div className="bg-[#FDFCF0] w-full max-w-sm rounded-[3.5rem] p-12 shadow-2xl border border-black/10">
                  <h3 className="text-4xl font-light mb-4 text-black">Merge Spaces.</h3>
                  <p className="text-sm text-black/50 italic mb-10">Enter your partner's invite code to inhabit their architectural space.</p>
                  <input 
                    autoFocus
                    type="text" 
                    value={partnerCodeInput}
                    onChange={(e) => setPartnerCodeInput(e.target.value)}
                    placeholder="Enter Invite Code..."
                    className="w-full bg-transparent border-b border-black/20 focus:border-black outline-none text-xl p-4 mb-12 transition-all font-mono"
                  />
                  <div className="space-y-4">
                      <button onClick={linkPartner} className="w-full bg-black text-white py-6 rounded-full font-bold uppercase text-[10px] tracking-widest heading-font shadow-lg">Unify Connection</button>
                      <button onClick={() => setIsLinking(false)} className="w-full py-4 text-black/40 font-bold uppercase text-[10px] tracking-widest heading-font">Cancel</button>
                  </div>
              </div>
          </div>
      )}

      {/* Cloud Config Modal */}
      {isConfiguringCloud && (
          <div className="fixed inset-0 z-[150] bg-black/40 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
              <div className="bg-[#FDFCF0] w-full max-w-md rounded-[3.5rem] p-12 shadow-2xl border border-black/10 overflow-y-auto max-h-[90vh]">
                  <h3 className="text-4xl font-light mb-4 text-black">Cloud Sync.</h3>
                  <p className="text-sm text-black/50 italic mb-10">Connect your own Supabase project to enable real-time cross-device synchronization.</p>
                  
                  <div className="space-y-8 mb-12">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-black/40 heading-font">Supabase URL</label>
                        <input 
                          type="text" 
                          value={dbUrl}
                          onChange={(e) => setDbUrl(e.target.value)}
                          placeholder="https://xyz.supabase.co"
                          className="w-full bg-transparent border-b border-black/20 focus:border-black outline-none text-sm p-3 transition-all font-mono"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-black/40 heading-font">Anon Key</label>
                        <textarea 
                          value={dbKey}
                          onChange={(e) => setDbKey(e.target.value)}
                          placeholder="eyJhbGciOiJIUzI1..."
                          className="w-full bg-transparent border-b border-black/20 focus:border-black outline-none text-[10px] p-3 transition-all font-mono h-24 resize-none"
                        />
                      </div>
                  </div>

                  <div className="space-y-4">
                      <button onClick={handleSaveCloudConfig} className="w-full bg-[#00FF41] text-black py-6 rounded-full font-bold uppercase text-[10px] tracking-widest heading-font shadow-lg">Link Database</button>
                      {isSupabaseConfigured && (
                          <button onClick={handleDisconnectCloud} className="w-full py-4 text-red-500 font-bold uppercase text-[10px] tracking-widest heading-font">Disconnect Cloud</button>
                      )}
                      <button onClick={() => setIsConfiguringCloud(false)} className="w-full py-4 text-black/40 font-bold uppercase text-[10px] tracking-widest heading-font">Cancel</button>
                  </div>
                  
                  <div className="mt-8 pt-8 border-t border-black/5">
                      <p className="text-[10px] text-black/40 leading-relaxed italic">
                        * Kindred is a client-side app. Your database keys never leave your browser. To collaborate, both partners must connect to the same Supabase project.
                      </p>
                  </div>
              </div>
          </div>
      )}

      <div className="space-y-6 pt-12 border-t border-black/5">
          <button 
              onClick={handleLogout}
              className="w-full border border-[#000000] text-[#000000] font-bold py-6 rounded-full hover:bg-[#000000] hover:text-white transition-all text-xs tracking-[0.2em] uppercase heading-font"
          >
              Disconnect Local Session
          </button>
          <div className="flex justify-center items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${isSupabaseConfigured ? 'bg-[#00FF41] animate-pulse' : 'bg-gray-400'}`} />
            <span className="text-[8px] text-[#000000]/30 font-bold uppercase tracking-widest heading-font">
                {isSupabaseConfigured ? `Engine Active — Heartbeat ${new Date(syncTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Local Engine Only'}
            </span>
          </div>
      </div>
    </div>
  );
};

export default Profile;
