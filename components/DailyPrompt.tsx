
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
        
        // Setup real-time listener with a safety check for the subscription object
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
    <div className="glass-panel rounded-3xl p-6 shadow-xl border-white">
      <div className="flex items-center text-teal-700 mb-4 justify-between">
        <div className="flex items-center">
            <ChatBubbleLeftRightIcon className="w-6 h-6 mr-2" />
            <h2 className="text-lg font-bold">Daily Connection</h2>
        </div>
        {myAnswerSubmitted && !partnerAnswerSubmitted && (
            <span className="text-[10px] font-bold bg-teal-500/10 text-teal-600 px-2 py-1 rounded-full animate-pulse">
                WAITING FOR SYNC...
            </span>
        )}
      </div>

      {isLoading ? (
        <div className="animate-pulse">
            <div className="h-4 bg-slate-400/20 rounded w-full mb-4"></div>
            <div className="h-4 bg-slate-400/20 rounded w-3/4"></div>
        </div>
      ) : (
        <p className="text-slate-700 font-medium text-lg leading-relaxed mb-6 text-center italic">"{prompt}"</p>
      )}

      {showBothAnswers ? (
        <div className="space-y-4 animate-fade-in">
          <div>
            <p className="font-bold text-slate-500 text-[10px] uppercase tracking-wider mb-2">Your answer:</p>
            <p className="bg-white/60 p-4 rounded-2xl text-slate-800 border border-white/80 shadow-sm">{myAnswer}</p>
          </div>
          <div className="animate-fade-in" style={{animationDelay: '0.3s'}}>
            <p className="font-bold text-teal-600 text-[10px] uppercase tracking-wider mb-2">{userData?.partnerName || 'Partner'}'s answer:</p>
            <p className="bg-teal-500/10 p-4 rounded-2xl text-slate-800 border border-teal-500/20 shadow-sm">{partnerAnswer}</p>
          </div>
           <button onClick={() => window.location.reload()} className="w-full mt-4 bg-slate-900 text-white font-bold py-4 px-4 rounded-2xl hover:bg-slate-800 transition-all shadow-lg">
            Complete Day
          </button>
        </div>
      ) : myAnswerSubmitted ? (
        <div className="text-center py-10 bg-white/30 rounded-3xl border border-white/40 shadow-inner">
          <p className="text-slate-500 text-sm">Insight recorded.</p>
          <div className="flex items-center justify-center gap-3 mt-4">
             <div className="flex gap-1">
                <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
             </div>
             <p className="font-bold text-lg text-slate-800 tracking-tight">Waiting for {userData?.partnerName || 'partner'}...</p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <textarea
            value={myAnswer}
            onChange={(e) => setMyAnswer(e.target.value)}
            placeholder="Write your honest thoughts..."
            className="w-full h-32 p-5 bg-white/40 rounded-3xl border border-white/60 focus:bg-white/60 focus:ring-0 focus:outline-none transition resize-none placeholder-slate-400 text-slate-800 font-medium"
            disabled={isLoading}
          />
          <button
            type="submit"
            className="w-full mt-6 bg-slate-900 text-white font-bold py-4 px-4 rounded-2xl hover:bg-slate-800 transition-all disabled:opacity-50 shadow-xl active:scale-95"
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
