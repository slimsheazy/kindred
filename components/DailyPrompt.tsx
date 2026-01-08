
import React, { useState, useEffect } from 'react';
import { getDailyPrompt } from '../services/geminiService';
import { cloudService } from '../services/cloudService';
import { ChatBubbleLeftRightIcon } from './Icons';
import { UserData } from '../types';

const DailyPrompt: React.FC = () => {
  const [prompt, setPrompt] = useState<string>('');
  const [myAnswer, setMyAnswer] = useState('');
  const [partnerAnswer, setPartnerAnswer] = useState('');
  const [myAnswerSubmitted, setMyAnswerSubmitted] = useState(false);
  const [partnerAnswerSubmitted, setPartnerAnswerSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('bonds_user_data');
    if (savedUser) {
        const parsed = JSON.parse(savedUser);
        setUserData(parsed);
        
        const subscription = cloudService.subscribeToPartner(
            parsed.partnerCode || 'default', 
            parsed.id, 
            (answer) => {
                setPartnerAnswer(answer);
                setPartnerAnswerSubmitted(true);
            }
        );

        return () => { 
            if (subscription && typeof subscription.unsubscribe === 'function') {
                subscription.unsubscribe(); 
            }
        };
    }
  }, []);

  useEffect(() => {
    const fetchPrompt = async () => {
      setIsLoading(true);
      const newPrompt = await getDailyPrompt();
      setPrompt(newPrompt);
      setIsLoading(false);
    };
    fetchPrompt();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (myAnswer.trim() && userData) {
      setMyAnswerSubmitted(true);
      await cloudService.submitPromptAnswer(userData.partnerCode || 'default', userData.id, myAnswer);
    }
  };
  
  const showBothAnswers = myAnswerSubmitted && partnerAnswerSubmitted;

  return (
    <div className="glass-panel rounded-[2rem] p-8 shadow-xl border-white/5 bg-white/5">
      <div className="flex items-center text-teal-300 mb-6 justify-between">
        <div className="flex items-center">
            <ChatBubbleLeftRightIcon className="w-5 h-5 mr-3" />
            <h2 className="text-sm font-semibold tracking-wide heading-font">Daily Connection</h2>
        </div>
        {myAnswerSubmitted && !partnerAnswerSubmitted && (
            <span className="text-[9px] font-bold bg-teal-400/10 text-teal-300 px-3 py-1 rounded-full animate-pulse border border-teal-400/20">
                SYNCING...
            </span>
        )}
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-3">
            <div className="h-5 bg-white/10 rounded-full w-full"></div>
            <div className="h-5 bg-white/10 rounded-full w-4/5"></div>
        </div>
      ) : (
        <p className="text-white font-medium text-2xl leading-relaxed mb-8 text-center italic">"{prompt}"</p>
      )}

      {showBothAnswers ? (
        <div className="space-y-6 animate-fade-in">
          <div>
            <p className="font-semibold text-white/40 text-[10px] tracking-widest mb-3 heading-font uppercase">Your Reflection</p>
            <p className="bg-white/5 p-6 rounded-3xl text-white border border-white/10 shadow-sm leading-relaxed">{myAnswer}</p>
          </div>
          <div className="animate-fade-in" style={{animationDelay: '0.3s'}}>
            <p className="font-semibold text-teal-400/60 text-[10px] tracking-widest mb-3 heading-font uppercase">{userData?.partnerName || 'Partner'}'s Reflection</p>
            <p className="bg-teal-400/5 p-6 rounded-3xl text-white border border-teal-400/20 shadow-sm leading-relaxed">{partnerAnswer}</p>
          </div>
           <button onClick={() => window.location.reload()} className="w-full mt-6 bg-white text-slate-900 font-bold py-5 px-4 rounded-3xl hover:bg-slate-100 transition-all shadow-lg active:scale-95 tracking-wide heading-font">
            Continue Journey
          </button>
        </div>
      ) : myAnswerSubmitted ? (
        <div className="text-center py-12 bg-white/5 rounded-3xl border border-white/10 shadow-inner">
          <p className="text-white/50 text-sm mb-4">Your spark has been shared.</p>
          <div className="flex items-center justify-center gap-3">
             <div className="flex gap-1.5">
                <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
             </div>
             <p className="font-medium text-white/90 tracking-tight">Waiting for {userData?.partnerName || 'partner'}</p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <textarea
            value={myAnswer}
            onChange={(e) => setMyAnswer(e.target.value)}
            placeholder="What's in your heart?"
            className="w-full h-36 p-6 bg-white/5 rounded-3xl border border-white/10 focus:bg-white/10 focus:border-white/20 focus:ring-0 focus:outline-none transition resize-none placeholder-white/20 text-white font-medium leading-relaxed"
            disabled={isLoading}
          />
          <button
            type="submit"
            className="w-full mt-6 bg-white text-slate-900 font-bold py-5 px-4 rounded-3xl hover:bg-slate-100 transition-all disabled:opacity-30 shadow-xl active:scale-95 tracking-wide heading-font"
            disabled={!myAnswer.trim() || isLoading}
          >
            Share with {userData?.partnerName || 'Partner'}
          </button>
        </form>
      )}
    </div>
  );
};

export default DailyPrompt;
