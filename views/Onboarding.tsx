
import React, { useState } from 'react';
import { UserData } from '../types';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { cloudService } from '../services/cloudService';

interface OnboardingProps {
  onComplete: (data: UserData) => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState<'welcome' | 'auth' | 'profile' | 'assessment' | 'intentions'>('welcome');
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

  const [assessment, setAssessment] = useState<Record<string, number>>({
    'Communication': 5,
    'Intimacy': 5,
    'Trust': 5,
    'Conflict': 5,
    'Shared Vision': 5
  });

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured) {
      setError("Cloud not configured. Proceeding in local-only mode.");
      setStep('profile');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) throw authError;
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

  const handleComplete = async () => {
    const finalData = { ...data, syncStatus: 'synced' as const };
    
    // Save initial baseline scores
    if (finalData.id) {
        const scores = Object.entries(assessment).map(([category, score]) => ({
            category,
            score,
            delta: 0
        }));
        // We use user ID as a temporary partner code if they haven't linked yet
        const code = finalData.partnerCode || finalData.id;
        for (const s of scores) {
            // Fix: Explicitly cast score to number to ensure numeric types for arithmetic operation
            await cloudService.updateBondScore(code, s.category, (s.score as number) - 3.5); // Adjust from baseline
        }
    }
    
    onComplete(finalData);
  };

  const assessmentQuestions = [
    { cat: 'Communication', q: 'How easily do "hard conversations" happen?' },
    { cat: 'Intimacy', q: 'How connected do you feel emotionally right now?' },
    { cat: 'Trust', q: 'How secure is the foundation beneath you?' },
    { cat: 'Conflict', q: 'How healthy is the way you navigate friction?' },
    { cat: 'Shared Vision', q: 'How clear is the path you are building together?' }
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 text-[#000000] relative bg-[#FDFCF0]">
      <div className="w-full max-w-md animate-fade-in-up">
        
        {step === 'welcome' && (
          <div className="text-center">
            <h1 className="text-7xl font-light tracking-tight leading-tight mb-8">Kindred.</h1>
            <p className="text-xl text-[#000000]/70 font-light mb-12 leading-relaxed italic">Architecting shared depth through intentional space and AI insight.</p>
            <button onClick={() => setStep('auth')} className="w-full border border-[#000000] py-5 rounded-full font-bold text-xs uppercase tracking-[0.3em] hover:bg-[#000000] hover:text-white transition-all heading-font">Initiate</button>
          </div>
        )}

        {step === 'auth' && (
          <div className="space-y-10">
             <h2 className="text-5xl font-light text-center">{isLogin ? 'Welcome back.' : 'Create Space.'}</h2>
             <form onSubmit={handleAuth} className="space-y-6">
                {error && <p className="text-red-500 text-[10px] font-bold uppercase text-center">{error}</p>}
                <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-transparent border-b border-black/10 py-4 outline-none text-xl" required />
                <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-transparent border-b border-black/10 py-4 outline-none text-xl" required />
                <button type="submit" disabled={loading} className="w-full bg-black text-white py-5 rounded-full font-bold text-xs uppercase tracking-[0.2em]">{loading ? '...' : (isLogin ? 'Enter' : 'Join')}</button>
             </form>
             <button onClick={() => setIsLogin(!isLogin)} className="w-full text-[10px] font-bold uppercase tracking-widest text-black/40">{isLogin ? "Need an account?" : "Already registered?"}</button>
          </div>
        )}

        {step === 'profile' && (
           <div className="space-y-12">
             <h2 className="text-5xl font-light">The basics.</h2>
             <div className="space-y-8">
               <input type="text" value={data.userName} onChange={(e) => setData({...data, userName: e.target.value})} className="w-full bg-transparent border-b border-black/10 text-3xl font-light py-4" placeholder="Your Name" />
               <input type="text" value={data.partnerName} onChange={(e) => setData({...data, partnerName: e.target.value})} className="w-full bg-transparent border-b border-black/10 text-3xl font-light py-4" placeholder="Partner Name" />
             </div>
             <button onClick={() => setStep('assessment')} disabled={!data.userName || !data.partnerName} className="w-full bg-[#000000] text-white py-5 rounded-full font-bold text-xs uppercase tracking-[0.2em]">Next</button>
           </div>
        )}

        {step === 'assessment' && (
           <div className="space-y-10">
             <h2 className="text-5xl font-light">The Pulse.</h2>
             <p className="text-sm italic text-black/40">Determine your starting equilibrium.</p>
             <div className="space-y-10">
               {assessmentQuestions.map(({cat, q}) => (
                 <div key={cat} className="space-y-4">
                    <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-black/60">{cat}</label>
                        <span className="text-[10px] font-mono text-black/30">{assessment[cat]}/10</span>
                    </div>
                    <p className="text-xs italic text-black/80">{q}</p>
                    <input type="range" min="1" max="10" step="1" value={assessment[cat]} onChange={(e) => setAssessment({...assessment, [cat]: parseInt(e.target.value)})} className="w-full h-1 bg-black/10 rounded-full appearance-none cursor-pointer" />
                 </div>
               ))}
             </div>
             <button onClick={() => setStep('intentions')} className="w-full bg-[#000000] text-white py-5 rounded-full font-bold text-xs uppercase tracking-[0.2em]">Set Baseline</button>
           </div>
        )}

        {step === 'intentions' && (
           <div className="space-y-12">
             <h2 className="text-5xl font-light">Intentions.</h2>
             <div className="grid grid-cols-2 gap-4">
               {["Intimacy", "Communication", "Conflict", "Adventure", "Trust", "Growth"].map(opt => (
                 <button key={opt} onClick={() => setData({...data, focusAreas: data.focusAreas.includes(opt) ? data.focusAreas.filter(f => f !== opt) : [...data.focusAreas, opt]})} className={`py-6 border rounded-3xl text-xs font-bold uppercase tracking-widest transition-all ${data.focusAreas.includes(opt) ? 'bg-black text-white' : 'text-black/40 border-black/10'}`}>{opt}</button>
               ))}
             </div>
             <button onClick={handleComplete} disabled={data.focusAreas.length === 0} className="w-full bg-[#000000] text-white py-5 rounded-full font-bold text-xs uppercase tracking-[0.2em]">Complete</button>
           </div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
