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
  const [email, setEmail] = useState('');
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
      const { error: authError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        }
      });
      if (authError) throw authError;
      setError("Check your email for the magic link!");
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
    <div className="w-full max-w-md mx-auto p-8">
      {step === 'welcome' && (
        <div className="space-y-12">
          <h1 className="text-[72px] font-light leading-none heading-font">Kindred.</h1>
          <p className="text-sm text-black/50 leading-relaxed tracking-wide">
            Architecting shared depth through intentional space and AI insight.
          </p>
          <button onClick={() => setStep('auth')} className="w-full border border-[#000000] py-5 rounded-full font-bold text-xs uppercase tracking-[0.3em] hover:bg-[#000000] hover:text-white transition-all heading-font">Initiate</button>
        </div>
      )}

      {step === 'auth' && (
        <div className="space-y-8">
          <h2 className="text-[36px] font-light">Send Magic Link</h2>
          {error && <div className="my-4 text-red-600 text-sm">{error}</div>}
          <form onSubmit={handleAuth} className="space-y-8 my-12">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-transparent border-b border-black/10 py-4 outline-none text-xl"
              required
            />
            <button type="submit" disabled={loading} className="w-full bg-[#000000] text-white py-5 rounded-full font-bold text-xs uppercase tracking-[0.2em]">
              {loading ? '...' : 'Send Magic Link'}
            </button>
          </form>
        </div>
      )}

      {step === 'profile' && (
        <div className="space-y-8">
          <h2 className="text-[36px] font-light">The basics.</h2>
          <input
            type="text"
            value={data.userName}
            onChange={(e) => setData({...data, userName: e.target.value})}
            className="w-full bg-transparent border-b border-black/10 text-3xl font-light py-4"
            placeholder="Your Name"
          />
          <input
            type="text"
            value={data.partnerName}
            onChange={(e) => setData({...data, partnerName: e.target.value})}
            className="w-full bg-transparent border-b border-black/10 text-3xl font-light py-4"
            placeholder="Partner Name"
          />
          <button onClick={() => setStep('assessment')} disabled={!data.userName || !data.partnerName} className="w-full bg-[#000000] text-white py-5 rounded-full font-bold text-xs uppercase tracking-[0.2em]">Next</button>
        </div>
      )}

      {step === 'assessment' && (
        <div className="space-y-12">
          <h2 className="text-[36px] font-light">The Pulse.</h2>
          <p className="text-xs uppercase tracking-widest text-black/40 font-bold">Determine your starting equilibrium.</p>
          <CalibrationMap assessment={assessment} />
          {assessmentQuestions.map(({cat, q}) => (
            <div key={cat} className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold uppercase tracking-widest">{cat}</label>
                <span className="text-xs text-black/40">{assessment[cat]}/10</span>
              </div>
              <p className="text-sm text-black/50">{q}</p>
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
          <button onClick={() => setStep('intentions')} className="w-full bg-[#000000] text-white py-5 rounded-full font-bold text-xs uppercase tracking-[0.2em]">Set Baseline</button>
        </div>
      )}

      {step === 'intentions' && (
        <div className="space-y-12">
          <h2 className="text-[36px] font-light">Intentions.</h2>
          <div className="grid grid-cols-2 gap-4">
            {["Intimacy", "Communication", "Conflict", "Adventure", "Trust", "Growth"].map(opt => (
              <button
                key={opt}
                onClick={() => setData({...data, focusAreas: data.focusAreas.includes(opt) ? data.focusAreas.filter(f => f !== opt) : [...data.focusAreas, opt]})}
                className={`py-6 border rounded-3xl text-xs font-bold uppercase tracking-widest transition-all ${data.focusAreas.includes(opt) ? 'bg-black text-white' : 'text-black/40 border-black/10'}`}>{opt}</button>
            ))}
          </div>
          <button onClick={handleComplete} className="w-full bg-[#000000] text-white py-5 rounded-full font-bold text-xs uppercase tracking-[0.2em]">Complete</button>
        </div>
      )}
    </div>
  );
};

export default Onboarding;
