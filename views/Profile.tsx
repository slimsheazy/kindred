
import React from 'react';

interface ProfileProps {
  onReset: () => void;
}

const Profile: React.FC<ProfileProps> = ({ onReset }) => {
  return (
    <div className="p-2 md:p-4 pb-24">
       <header className="mb-8 mt-4">
        <h1 className="text-4xl font-light text-white tracking-tight">Profile</h1>
        <p className="text-white/70 mt-1">Manage your shared space.</p>
      </header>
      <div className="glass-panel rounded-3xl p-8 text-center shadow-xl">
        <div className="relative inline-block">
            <img src="https://picsum.photos/seed/couple/150/150" alt="Couple" className="w-28 h-28 rounded-full mx-auto mb-4 border-4 border-white shadow-lg" />
            <div className="absolute bottom-4 right-0 w-6 h-6 bg-green-500 border-2 border-white rounded-full"></div>
        </div>
        <h2 className="text-2xl font-bold text-slate-800">You & Partner</h2>
        <p className="text-slate-500 font-medium">Connected since Jan 2022</p>
        
        <div className="mt-8 space-y-3">
            {['Account Settings', 'Notifications', 'Privacy & Security', 'Help & Support'].map(item => (
                <button key={item} className="w-full flex justify-between items-center p-4 bg-white/40 rounded-xl hover:bg-white/60 transition-colors text-slate-700 font-medium border border-white/40">
                    {item}
                    <span className="text-slate-400">›</span>
                </button>
            ))}
        </div>
        
        <div className="pt-8 space-y-4">
            <button 
                onClick={onReset}
                className="w-full bg-slate-900 text-white font-bold py-4 px-4 rounded-xl hover:bg-slate-800 transition-all shadow-lg"
            >
                Reset App (Dev Tool)
            </button>
            <button className="w-full bg-rose-500/10 text-rose-700 font-bold py-4 px-4 rounded-xl hover:bg-rose-500 hover:text-white transition-all border border-rose-200">
                Log Out
            </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
