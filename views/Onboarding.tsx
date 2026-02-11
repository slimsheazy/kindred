
import React, { useState } from 'react';
import { UserData } from '../types';
import { supabase, isSupabaseConfigured } from '../services/supabase';

interface OnboardingProps {
  onComplete: (data: UserData) => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState<'welcome' | 'auth' | 'profile' | 'intentions'>('welcome');
  const [isLogin, setIsLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [data, setData] = useState<UserData>({
    id: '',
    userName: '',
    partnerName: '',
    yearsTogether: '',
    focusAreas: [],
    partnerCode: '',
    syncStatus: 'offline'
  });

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured) {
      setError("Cloud not configured. Please add Supabase keys in Profile later.");
      setStep('profile');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) throw authError;
        // If login successful, App.tsx will handle session redirection
      } else {
        const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
        if (authError) throw authError;
        if (authData.user) {
          setData(prev => ({ ...prev, id: authData.user!.id }));
          setStep('profile');
        }
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    setStep('intentions');
  };

  const handleComplete = async () => {
    const finalData = { ...data, syncStatus: 'synced' as const };
    onComplete(finalData);
  };

  const focusOptions = ["Intimacy", "Communication", "Conflict", "Adventure", "Trust", "Growth"];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 text-[#000000] relative bg-[#FDFCF0]">
      <div className="w-full max-w-md animate-fade-in-up">
        
        {step === 'welcome' && (
          <div className="text-center">
            <h1 className="text-7xl font-light tracking-tight leading-tight mb-8">Kindred.</h1>
            <p className="text-xl text-[#000000]/70 font-light mb-12 leading-relaxed italic">Architecting shared depth through intentional space and AI insight.</p>
            <button 
              onClick={() => setStep('auth')} 
              className="w-full border border-[#000000] py-5 rounded-full font-bold text-xs uppercase tracking-[0.3em] hover:bg-[#000000] hover:text-white transition-all heading-font"
            >
              Initiate
            </button>
          </div>
        )}

        {step === 'auth' && (
          <div className="space-y-10">
             <div className="text-center mb-8">
                <h2 className="text-5xl font-light mb-2">{isLogin ? 'Welcome back.' : 'Create Space.'}</h2>
                <p className="text-sm text-black/40 italic">Secure your shared anthology.</p>
             </div>
             
             <form onSubmit={handleAuth} className="space-y-6">
                {error && <p className="text-red-500 text-xs font-bold uppercase tracking-widest text-center">{error}</p>}
                
                <div className="border-b border-black/10 py-2">
                  <input 
                    type="email" 
                    placeholder="Email Address" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-transparent text-xl font-light outline-none"
                    required
                  />
                </div>
                <div className="border-b border-black/10 py-2">
                  <input 
                    type="password" 
                    placeholder="Password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-transparent text-xl font-light outline-none"
                    required
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-black text-white py-5 rounded-full font-bold text-xs uppercase tracking-[0.2em] shadow-xl hover:opacity-90 transition-all heading-font"
                >
                  {loading ? 'Processing...' : (isLogin ? 'Enter Space' : 'Register Account')}
                </button>
             </form>

             <button 
               onClick={() => setIsLogin(!isLogin)} 
               className="w-full text-[10px] font-bold uppercase tracking-widest text-black/40 hover:text-black transition-colors"
             >
               {isLogin ? "Need an account? Sign Up" : "Already registered? Sign In"}
             </button>
          </div>
        )}

        {step === 'profile' && (
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
                onClick={saveProfile} 
                disabled={!data.userName || !data.partnerName} 
                className="w-full bg-[#000000] text-white py-5 rounded-full font-bold text-xs uppercase tracking-[0.2em] disabled:opacity-30 transition-all heading-font"
             >
                Next
             </button>
           </div>
        )}

        {step === 'intentions' && (
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
                onClick={handleComplete} 
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
