
import React, { useState, useEffect } from 'react';
import { UserData } from '../types';
import { cloudService } from '../services/cloudService';

interface OnboardingProps {
  onComplete: (data: UserData) => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [linkMode, setLinkMode] = useState<'join' | 'share'>('join');
  
  const [data, setData] = useState<UserData>({
    id: `user_${Math.random().toString(36).substr(2, 9)}`,
    userName: '',
    partnerName: '',
    yearsTogether: '',
    focusAreas: [],
    partnerCode: '',
    syncStatus: 'offline'
  });

  useEffect(() => {
    setGeneratedCode(`BOND-${Math.floor(1000 + Math.random() * 9000)}`);
  }, []);

  const handleNext = async () => {
    if (step < 4) {
        setStep(step + 1);
    } else {
        // Register in our "Cloud"
        const finalData = { ...data, syncStatus: data.partnerCode ? 'synced' : 'offline' as any };
        await cloudService.signUp(finalData);
        onComplete(finalData);
    }
  };

  const updateData = (key: keyof UserData, value: any) => {
    setData(prev => ({ ...prev, [key]: value }));
  };

  const toggleFocus = (opt: string) => {
    setData(prev => {
        const current = prev.focusAreas || [];
        if (current.includes(opt)) {
            return { ...prev, focusAreas: current.filter(i => i !== opt) };
        } else {
            return { ...prev, focusAreas: [...current, opt] };
        }
    });
  };

  const focusOptions = [
    "Deepening Intimacy",
    "Better Communication",
    "Conflict Resolution",
    "More Fun & Adventure",
    "Building Trust",
    "Life Transitions"
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-white relative overflow-hidden font-sans">
      
      {/* Background Ambience similar to reference image */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
          <div className="absolute top-[-20%] left-[-20%] w-[70%] h-[70%] bg-amber-200/20 rounded-full blur-[120px] animate-blob"></div>
          <div className="absolute bottom-[-20%] right-[-20%] w-[70%] h-[70%] bg-purple-900/20 rounded-full blur-[120px] animate-blob" style={{animationDelay: '2s'}}></div>
      </div>

      {/* How it Works Overlay */}
      {showHowItWorks && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
            <div className="glass-panel w-full max-w-lg rounded-3xl p-6 md:p-8 relative border border-white/60 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)]">
                <button 
                    onClick={() => setShowHowItWorks(false)} 
                    className="absolute top-4 right-4 text-slate-500 hover:text-slate-800 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
                
                <h2 className="text-2xl font-light text-slate-800 mb-8">How Bonds Connect Works</h2>
                
                <div className="space-y-6">
                    <div className="flex gap-5 items-start">
                        <div className="w-12 h-12 rounded-2xl bg-white/50 flex-shrink-0 flex items-center justify-center text-xl shadow-sm border border-white/60 text-slate-700">🧠</div>
                        <div>
                            <h3 className="text-slate-800 font-medium text-lg">AI-Powered Insight</h3>
                            <p className="text-slate-800 text-sm leading-relaxed mt-1">We learn from your interactions to provide tailored advice and activities that actually fit your relationship dynamics.</p>
                        </div>
                    </div>
                    
                    <div className="flex gap-5 items-start">
                        <div className="w-12 h-12 rounded-2xl bg-white/50 flex-shrink-0 flex items-center justify-center text-xl shadow-sm border border-white/60 text-slate-700">✨</div>
                        <div>
                            <h3 className="text-slate-800 font-medium text-lg">Daily Sparks</h3>
                            <p className="text-slate-800 text-sm leading-relaxed mt-1">Receive one meaningful question or challenge daily to keep the connection alive without the overwhelm.</p>
                        </div>
                    </div>
                    
                    <div className="flex gap-5 items-start">
                        <div className="w-12 h-12 rounded-2xl bg-white/50 flex-shrink-0 flex items-center justify-center text-xl shadow-sm border border-white/60 text-slate-700">🌱</div>
                        <div>
                            <h3 className="text-slate-800 font-medium text-lg">Shared Growth</h3>
                            <p className="text-slate-800 text-sm leading-relaxed mt-1">Track shared goals and memories in a private, collaborative space designed just for the two of you.</p>
                        </div>
                    </div>
                </div>

                <button 
                    onClick={() => setShowHowItWorks(false)}
                    className="w-full mt-10 bg-slate-800 text-white py-4 rounded-2xl font-medium hover:bg-slate-900 transition-colors shadow-lg"
                >
                    Got it
                </button>
            </div>
        </div>
      )}

      <div className={`w-full max-w-xl z-10 transition-all duration-700 ease-in-out flex flex-col items-center ${showHowItWorks ? 'blur-sm scale-95 opacity-50' : ''}`}>
        {step === 0 && (
          <div className="text-center w-full animate-fade-in-up">
            {/* Pill Badge */}
            <div className="inline-block px-4 py-1.5 rounded-full border border-white/20 bg-white/10 backdrop-blur-md text-[10px] uppercase tracking-widest font-medium mb-8">
              AI Powered Connection
            </div>
            
            {/* Large Typography Title */}
            <h1 className="text-6xl md:text-7xl font-light tracking-tight leading-[1.05] mb-8 text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70">
              Love,<br/>
              Intention,<br/>
              Growth.
            </h1>
            
            {/* Subtext */}
            <p className="text-lg text-white/70 font-light max-w-md mx-auto leading-relaxed mb-12">
              Transform your relationship with personalized insights and fluid, shared experiences that bring you closer.
            </p>
            
            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center w-full">
              <button 
                onClick={handleNext}
                className="bg-white text-[#8c6a65] px-10 py-4 rounded-full font-medium text-sm tracking-wide hover:bg-slate-50 transition-all shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 w-full sm:w-auto"
              >
                Begin Journey
              </button>
              <button 
                onClick={() => setShowHowItWorks(true)}
                className="px-10 py-4 rounded-full font-medium text-sm tracking-wide border border-white/20 bg-white/5 hover:bg-white/10 transition-colors backdrop-blur-sm text-white w-full sm:w-auto"
              >
                How it works
              </button>
            </div>
          </div>
        )}

        {step === 1 && (
           <div className="w-full max-w-md space-y-8 animate-fade-in-up">
             <div className="space-y-2">
               <h2 className="text-3xl font-light tracking-tight">First, the basics.</h2>
               <p className="text-white/60 text-lg font-light">Who is embarking on this journey?</p>
             </div>
             
             <div className="space-y-5">
               <div className="group">
                 <label className="block text-xs font-medium uppercase tracking-wider mb-2 ml-1 text-white/50 group-focus-within:text-white/90 transition-colors">Your Name</label>
                 <input 
                    type="text" 
                    value={data.userName}
                    onChange={(e) => updateData('userName', e.target.value)}
                    className="w-full px-6 py-5 rounded-3xl glass-input text-xl text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-white/30 transition-all"
                    placeholder="You"
                    autoFocus
                 />
               </div>
               <div className="group">
                 <label className="block text-xs font-medium uppercase tracking-wider mb-2 ml-1 text-white/50 group-focus-within:text-white/90 transition-colors">Partner's Name</label>
                 <input 
                    type="text" 
                    value={data.partnerName}
                    onChange={(e) => updateData('partnerName', e.target.value)}
                    className="w-full px-6 py-5 rounded-3xl glass-input text-xl text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-white/30 transition-all"
                    placeholder="Them"
                 />
               </div>
             </div>

             <div className="pt-4 flex gap-3">
                <button 
                  onClick={() => setStep(step - 1)}
                  className="px-6 py-5 rounded-full font-medium border border-white/20 text-white/60 hover:bg-white/10 hover:text-white transition-all"
                >
                  Back
                </button>
                <button 
                    onClick={handleNext}
                    disabled={!data.userName || !data.partnerName}
                    className="flex-grow bg-white text-[#8c6a65] py-5 rounded-full font-medium text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:scale-[1.02] transition-all"
                >
                    Continue
                </button>
             </div>
           </div>
        )}

        {step === 2 && (
          <div className="w-full max-w-md space-y-8 animate-fade-in-up">
            <div className="space-y-2">
              <h2 className="text-3xl font-light tracking-tight">Link Partner.</h2>
              <p className="text-white/60 text-lg font-light">Optional: Sync your experience.</p>
            </div>

            {/* Tabs */}
            <div className="flex p-1 bg-white/10 rounded-2xl backdrop-blur-md">
              <button
                onClick={() => setLinkMode('join')}
                className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${linkMode === 'join' ? 'bg-white text-[#8c6a65] shadow-sm' : 'text-white/60 hover:text-white'}`}
              >
                I have a code
              </button>
              <button
                onClick={() => {
                  setLinkMode('share');
                  if (!generatedCode) setGeneratedCode(`BOND-${Math.floor(1000 + Math.random() * 9000)}`);
                  updateData('partnerCode', generatedCode);
                }}
                className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${linkMode === 'share' ? 'bg-white text-[#8c6a65] shadow-sm' : 'text-white/60 hover:text-white'}`}
              >
                Share Invite
              </button>
            </div>

            <div className="min-h-[160px] flex flex-col justify-center">
              {linkMode === 'join' ? (
                <div className="space-y-4 animate-fade-in">
                  <div className="group">
                    <label className="block text-xs font-medium uppercase tracking-wider mb-2 ml-1 text-white/50 group-focus-within:text-white/90 transition-colors">Enter Partner Code</label>
                    <input
                      type="text"
                      value={data.partnerCode || ''}
                      onChange={(e) => updateData('partnerCode', e.target.value.toUpperCase())}
                      className="w-full px-6 py-5 rounded-3xl glass-input text-2xl text-center tracking-widest text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-white/30 transition-all uppercase"
                      placeholder="XXXX-0000"
                    />
                  </div>
                  <p className="text-center text-xs text-white/40">Ask your partner for their code to link accounts.</p>
                </div>
              ) : (
                <div className="text-center space-y-4 animate-fade-in">
                  <p className="text-sm text-white/60">Share this code with your partner:</p>
                  <div className="bg-white/20 border border-white/30 rounded-3xl py-6 px-4 backdrop-blur-sm">
                    <span className="text-4xl font-mono tracking-widest text-white font-bold select-all">{generatedCode}</span>
                  </div>
                  <p className="text-center text-xs text-white/40">They can enter this code on their device.</p>
                </div>
              )}
            </div>

            <div className="pt-4 flex flex-col gap-3">
              <button
                onClick={handleNext}
                className="w-full bg-white text-[#8c6a65] py-5 rounded-full font-medium text-lg hover:shadow-lg hover:scale-[1.02] transition-all"
              >
                {data.partnerCode ? (linkMode === 'join' ? 'Link Accounts' : 'I Shared It') : 'Skip for Now'}
              </button>
              <button
                onClick={() => setStep(step - 1)}
                className="text-white/40 text-sm hover:text-white transition-colors py-2"
              >
                Back
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
           <div className="w-full max-w-md space-y-8 animate-fade-in-up">
             <div className="space-y-2">
               <h2 className="text-3xl font-light tracking-tight">Your History.</h2>
               <p className="text-white/60 text-lg font-light">How long have you been writing your story?</p>
             </div>
             
             <div className="space-y-3">
               {['Less than a year', '1 - 3 years', '3 - 7 years', '7+ years', 'Married'].map((opt, idx) => (
                 <button
                   key={opt}
                   style={{ animationDelay: `${idx * 0.05}s` }}
                   onClick={() => { updateData('yearsTogether', opt); setTimeout(handleNext, 250); }}
                   className={`w-full text-left px-8 py-5 rounded-3xl transition-all duration-200 border border-transparent ${
                       data.yearsTogether === opt 
                       ? 'bg-white text-[#8c6a65] font-medium shadow-lg scale-[1.02]' 
                       : 'glass-input text-white hover:bg-white/20 hover:border-white/30 animate-fade-in-up'
                    }`}
                 >
                   {opt}
                 </button>
               ))}
             </div>
             
             <button 
                onClick={() => setStep(step - 1)}
                className="text-white/40 text-sm hover:text-white transition-colors py-2"
             >
                Back
             </button>
           </div>
        )}

        {step === 4 && (
           <div className="w-full max-w-md space-y-8 animate-fade-in-up">
             <div className="space-y-2">
               <h2 className="text-3xl font-light tracking-tight">Your Intentions.</h2>
               <p className="text-white/60 text-lg font-light">Select all areas you want to grow in.</p>
             </div>
             
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
               {focusOptions.map((opt, idx) => {
                 const isSelected = data.focusAreas.includes(opt);
                 return (
                    <button
                        key={opt}
                        style={{ animationDelay: `${idx * 0.05}s` }}
                        onClick={() => toggleFocus(opt)}
                        className={`text-left px-6 py-5 rounded-3xl text-sm transition-all duration-200 border border-transparent flex items-center h-full animate-fade-in-up relative overflow-hidden ${
                            isSelected 
                            ? 'bg-white text-[#8c6a65] font-medium shadow-lg transform scale-[1.02]' 
                            : 'glass-input text-white hover:bg-white/20 hover:border-white/30'
                        }`}
                    >
                        {opt}
                        {isSelected && (
                             <div className="absolute top-2 right-2 text-teal-500">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                    <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                                </svg>
                             </div>
                        )}
                    </button>
                 );
               })}
             </div>

             <div className="pt-4">
                 <button 
                    onClick={handleNext}
                    disabled={data.focusAreas.length === 0}
                    className="w-full bg-white text-[#8c6a65] py-5 rounded-full font-medium text-lg disabled:opacity-50 disabled:cursor-not-allowed mt-4 hover:shadow-xl hover:scale-[1.02] transition-all"
                  >
                    Complete Setup
                  </button>
                  <button 
                    onClick={() => setStep(step - 1)}
                    className="w-full text-center text-white/40 text-sm hover:text-white transition-colors py-4"
                  >
                    Back
                 </button>
             </div>
           </div>
        )}
        
        {step > 0 && !showHowItWorks && (
            <div className="absolute bottom-8 flex justify-center gap-3">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ease-out ${i <= step ? 'w-8 bg-white shadow-glow' : 'w-2 bg-white/20'}`} />
                ))}
            </div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
