
import React, { useState, useMemo, useEffect } from 'react';
import { UserData, BondScore } from '../types';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { cloudService } from '../services/cloudService';

interface OnboardingProps {
  onComplete: (data: UserData) => void;
}

// Reusable BondMap preview for onboarding
const CalibrationMap: React.FC<{ assessment: Record<string, number> }> = ({ assessment }) => {
    const categories = ['Communication', 'Intimacy', 'Trust', 'Conflict', 'Shared Vision'];
    const size = 200;
    const center = size / 2;
    const radius = size * 0.35;
    
    const points = categories.map((cat, i) => {
        const val = assessment[cat] || 5;
        const angle = (i * 2 * Math.PI) / categories.length - Math.PI / 2;
        const r = (val / 10) * radius;
        return { 
            x: center + r * Math.cos(angle), 
            y: center + r * Math.sin(angle)
        };
    });

    const polygonPath = points.map(p => `${p.x},${p.y}`).join(' ');

    return (
        <div className="flex flex-col items-center justify-center py-6 mb-8 animate-fade-in">
            <svg width={size} height={size} className="overflow-visible drop-shadow-sm">
                {/* Background Grid */}
                {[0.2, 0.4, 0.6, 0.8, 1].map((scale, i) => (
                    <circle key={i} cx={center} cy={center} r={radius * scale} fill="none" stroke="black" strokeWidth="0.5" strokeOpacity="0.05" />
                ))}
                {/* Axis lines */}
                {categories.map((_, i) => {
                    const angle = (i * 2 * Math.PI) / categories.length - Math.PI / 2;
                    return <line key={i} x1={center} y1={center} x2={center + radius * Math.cos(angle)} y2={center + radius * Math.sin(angle)} stroke="black" strokeWidth="0.5" strokeOpacity="0.1" />;
                })}
                {/* The Map */}
                <polygon 
                    points={polygonPath} 
                    fill="#00FF41" 
                    fillOpacity="0.1" 
                    stroke="#00FF41" 
                    strokeWidth="2" 
                    className="transition-all duration-700 ease-out"
                />
                {points.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r="3" fill="#00FF41" className="transition-all duration-700 ease-out" />
                ))}
            </svg>
            <span className="text-[8px] font-bold uppercase tracking-[0.3em] text-black/30 mt-2 heading-font">Live Baseline</span>
        </div>
    );
};

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

    // Handle OAuth callback
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && session.user) {
        setData(prev => ({ ...prev, id: session.user.id }));
        setStep('profile');
      }
    };
    checkAuth();
  }, []);

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

    const handleGoogleAuth = async () => {
    if (!isSupabaseConfigured) {
      setError("Cloud not configured. Google sign-in unavailable.");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
      });
      if (authError) throw authError;
    } catch (err: any) {
      setError(err.message || "Google sign-in failed.");
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    const finalData = { ...data, syncStatus: 'synced' as const };
    
    // Save initial baseline scores
    if (finalData.id) {
        // We use user ID as a temporary partner code if they haven't linked yet
        const code = finalData.partnerCode || finalData.id;
        // The Map starts at 3.5. We adjust it to the selected score.
        for (const [cat, score] of Object.entries(assessment)) {
            const currentScore = (score as number);
            await cloudService.updateBondScore(code, cat, currentScore - 3.5);
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
                        <div className="relative flex items-center justify-center my-6">
              <div className="border-t border-black/10 w-full absolute"></div>
              <span className="bg-[#FDFCF0] px-4 relative text-[10px] uppercase tracking-widest text-black/40">or</span>
            </div>
            <button 
              type="button"
              onClick={handleGoogleAuth} 
              disabled={loading}
              className="w-full border border-black/10 py-5 rounded-full font-bold text-xs uppercase tracking-[0.2em] hover:bg-black/5 transition-all flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign in with Google
            </button>
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
             <div className="text-center">
                <h2 className="text-5xl font-light mb-2">The Pulse.</h2>
                <p className="text-sm italic text-black/40">Determine your starting equilibrium.</p>
             </div>

             <CalibrationMap assessment={assessment} />

             <div className="space-y-10 max-h-[40vh] overflow-y-auto pr-2 no-scrollbar">
               {assessmentQuestions.map(({cat, q}) => (
                 <div key={cat} className="space-y-4">
                    <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-black/60">{cat}</label>
                        <span className="text-[10px] font-mono text-black/30">{assessment[cat]}/10</span>
                    </div>
                    <p className="text-xs italic text-black/80">{q}</p>
                    <input 
                        type="range" 
                        min="1" 
                        max="10" 
                        step="1" 
                        value={assessment[cat]} 
                        onChange={(e) => setAssessment({...assessment, [cat]: parseInt(e.target.value)})} 
                        className="w-full h-1 bg-black/10 rounded-full appearance-none cursor-pointer accent-black" 
                    />
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
