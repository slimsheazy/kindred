
import React, { useState } from 'react';
import { UserData } from '../types';
import { cloudService } from '../services/cloudService';

interface OnboardingProps {
  onComplete: (data: UserData) => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<UserData>({
    id: `user_${Math.random().toString(36).substr(2, 9)}`,
    userName: '',
    partnerName: '',
    yearsTogether: '',
    focusAreas: [],
    partnerCode: '',
    syncStatus: 'offline'
  });

  const handleNext = async () => {
    if (step < 2) {
      setStep(step + 1);
    } else {
      const finalData = { ...data, syncStatus: (data.partnerCode ? 'synced' : 'offline') as any };
      await cloudService.signUp(finalData);
      onComplete(finalData);
    }
  };

  const focusOptions = ["Intimacy", "Communication", "Conflict", "Adventure", "Trust", "Growth"];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 text-[#000000] relative">
      <div className="w-full max-w-md animate-fade-in-up">
        {step === 0 && (
          <div className="text-center">
            <h1 className="text-7xl font-light tracking-tight leading-tight mb-8">Bonds.</h1>
            <p className="text-xl text-[#000000]/70 font-light mb-12 leading-relaxed italic">Architecting shared depth through intentional space and AI insight.</p>
            <button onClick={handleNext} className="w-full border border-[#000000] py-5 rounded-full font-bold text-xs uppercase tracking-[0.3em] hover:bg-[#000000] hover:text-white transition-all heading-font">Initiate</button>
          </div>
        )}

        {step === 1 && (
           <div className="space-y-12">
             <h2 className="text-5xl font-light">The basics.</h2>
             <div className="space-y-8">
               <div className="border-b border-[#000000]/30 py-4">
                 <label className="text-[10px] font-bold uppercase tracking-widest text-[#000000]/50 mb-1 block">Your Name</label>
                 <input 
                    type="text" 
                    value={data.userName} 
                    onChange={(e) => setData({...data, userName: e.target.value})} 
                    className="w-full bg-transparent text-3xl font-light outline-none focus:border-[#000000] transition-all placeholder-[#000000]/20" 
                    placeholder="..." 
                 />
               </div>
               <div className="border-b border-[#000000]/30 py-4">
                 <label className="text-[10px] font-bold uppercase tracking-widest text-[#000000]/50 mb-1 block">Partner's Name</label>
                 <input 
                    type="text" 
                    value={data.partnerName} 
                    onChange={(e) => setData({...data, partnerName: e.target.value})} 
                    className="w-full bg-transparent text-3xl font-light outline-none focus:border-[#000000] transition-all placeholder-[#000000]/20" 
                    placeholder="..." 
                 />
               </div>
             </div>
             <button 
                onClick={handleNext} 
                disabled={!data.userName || !data.partnerName} 
                className="w-full bg-[#000000] text-white py-5 rounded-full font-bold text-xs uppercase tracking-[0.2em] disabled:opacity-30 transition-all heading-font"
             >
                Next
             </button>
           </div>
        )}

        {step === 2 && (
           <div className="space-y-12">
             <h2 className="text-5xl font-light">Intentions.</h2>
             <div className="grid grid-cols-2 gap-4">
               {focusOptions.map(opt => (
                 <button 
                    key={opt} 
                    onClick={() => setData({...data, focusAreas: data.focusAreas.includes(opt) ? data.focusAreas.filter(f => f !== opt) : [...data.focusAreas, opt]})} 
                    className={`py-6 border rounded-3xl text-sm font-bold uppercase tracking-widest heading-font transition-all ${data.focusAreas.includes(opt) ? 'bg-[#000000] text-white border-[#000000]' : 'border-[#000000]/20 text-[#000000]/50 hover:border-[#000000]'}`}
                 >
                    {opt}
                 </button>
               ))}
             </div>
             <button 
                onClick={handleNext} 
                disabled={data.focusAreas.length === 0} 
                className="w-full bg-[#000000] text-white py-5 rounded-full font-bold text-xs uppercase tracking-[0.2em] disabled:opacity-30 transition-all heading-font"
             >
                Complete
             </button>
           </div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
