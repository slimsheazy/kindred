
import React, { useState, useEffect } from 'react';
import { getDailyPrompt } from '../services/geminiService';
import { cloudService } from '../services/cloudService';
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
    const savedUser = localStorage.getItem('kindred_user_data');
    if (savedUser) {
        const parsed = JSON.parse(savedUser);
        setUserData(parsed);
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
  
  return (
    <div className="py-12 animate-fade-in">
      <div className="flex items-center text-[#262626]/70 mb-10 justify-between px-2">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] heading-font">Daily Reflection</h2>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-4 px-2">
            <div className="h-4 bg-[#262626]/10 rounded-full w-full"></div>
            <div className="h-4 bg-[#262626]/10 rounded-full w-4/5"></div>
        </div>
      ) : (
        <p className="text-[#262626] font-medium text-3xl leading-snug mb-12 italic text-center px-4">"{prompt}"</p>
      )}

      {myAnswerSubmitted ? (
        <div className="text-center py-20 px-2">
          <p className="text-[#262626]/60 text-sm italic tracking-wide">Shared with {userData?.partnerName || 'Partner'}.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="px-2">
          <textarea
            value={myAnswer}
            onChange={(e) => setMyAnswer(e.target.value)}
            placeholder="Type your heart here..."
            className="w-full h-40 bg-transparent border-b border-[#262626]/20 focus:border-[#262626] focus:outline-none transition-all resize-none placeholder-[#262626]/40 text-2xl font-light italic leading-relaxed mb-6"
            disabled={isLoading}
          />
          <button
            type="submit"
            className="w-full border border-[#262626] text-[#262626] font-bold py-5 rounded-full hover:bg-[#262626] hover:text-white transition-all disabled:opacity-20 text-xs tracking-[0.2em] uppercase heading-font"
            disabled={!myAnswer.trim() || isLoading}
          >
            Send Reflection
          </button>
        </form>
      )}
    </div>
  );
};

export default DailyPrompt;
