import React, { useState, useRef, useEffect } from 'react';
import { getCoachingResponse, analyzeInteractionForScores } from '../services/geminiService';
import { cloudService } from '../services/cloudService';
import type { ChatMessage } from '../types';
import Markdown from 'react-markdown';

const AICoach: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { 
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); 
  }, [messages, isLoading]);

  useEffect(() => {
    const saved = localStorage.getItem('kindred_user_data');
    if (saved) {
      const parsed = JSON.parse(saved);
      setUserData(parsed);
      
      // Load history from persistence
      cloudService.getChatHistory(parsed.partnerCode || 'default').then(history => {
        if (history.length === 0) {
          const initialMsg: ChatMessage = { 
            role: 'model', 
            text: "Hello. I'm listening. What's unfolding in your relationship today?", 
            timestamp: Date.now() 
          };
          setMessages([initialMsg]);
          cloudService.saveChatMessage(parsed.partnerCode || 'default', initialMsg);
        } else {
          setMessages(history);
        }
      });
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isLoading || !userData) return;
    
    const userMsg: ChatMessage = { role: 'user', text: userInput, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    await cloudService.saveChatMessage(userData.partnerCode || 'default', userMsg);

    const currentInput = userInput;
    setUserInput('');
    setIsLoading(true);

    try {
      const res = await getCoachingResponse(currentInput, messages);
      const modelMsg: ChatMessage = { role: 'model', text: res, timestamp: Date.now() };
      setMessages(prev => [...prev, modelMsg]);
      await cloudService.saveChatMessage(userData.partnerCode || 'default', modelMsg);
      
      // Analyze conversation for score updates
      const recentContext = messages.slice(-2).map(m => m.text).join(' ') + ' ' + currentInput + ' ' + res;
      const updates = await analyzeInteractionForScores(recentContext);
      if (updates.length > 0) {
          await cloudService.batchUpdateScores(userData.partnerCode || 'default', updates);
      }
    } catch (err) {
      const errorMsg: ChatMessage = { 
        role: 'model', 
        text: "Something missed a beat. Try sharing again.", 
        timestamp: Date.now() 
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimestamp = (ts: number) => {
      const date = new Date(ts);
      const now = new Date();
      if (date.toDateString() === now.toDateString()) return 'Today';
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="py-20 border-t border-[#262626]/10">
        <div className="flex justify-between items-center mb-12">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#262626]/70 heading-font">AI Oracle</h2>
            <button 
                onClick={() => {
                  if(confirm("Clear history?")) {
                    cloudService.clearChatHistory(userData?.partnerCode || 'default');
                    setMessages([{ role: 'model', text: 'History cleared.', timestamp: Date.now() }]);
                  }
                }}
                className="text-[8px] font-bold uppercase tracking-widest text-[#262626]/30 hover:text-[#262626] transition-all"
            >
              Reset Memory
            </button>
        </div>

        <div className="space-y-12 mb-12 max-h-[500px] overflow-y-auto no-scrollbar pr-2">
            {messages.map((msg, i) => {
                const showTime = i === 0 || formatTimestamp(messages[i-1].timestamp) !== formatTimestamp(msg.timestamp);
                return (
                    <React.Fragment key={i}>
                        {showTime && (
                            <div className="flex justify-center my-6">
                                <span className="text-[7px] font-bold uppercase tracking-[0.3em] text-[#262626]/20 bg-white/40 px-3 py-1 rounded-full">{formatTimestamp(msg.timestamp)}</span>
                            </div>
                        )}
                        <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-fade-in`}>
                          <span className="text-[8px] font-bold uppercase tracking-widest text-[#262626]/60 mb-2 heading-font">
                            {msg.role === 'model' ? 'Oracle' : 'You'}
                          </span>
                          <div className={`text-xl leading-relaxed ${msg.role === 'user' ? 'text-right italic text-[#262626]/90 bg-[#262626]/5 p-4 rounded-2xl' : 'text-left font-light text-[#262626] p-4'}`}>
                              <Markdown>{msg.text}</Markdown>
                          </div>
                        </div>
                    </React.Fragment>
                );
            })}
            {isLoading && (
                <div className="text-[8px] font-bold uppercase tracking-widest text-[#262626]/40 animate-pulse flex items-center gap-2">
                    <span className="w-1 h-1 bg-black/20 rounded-full animate-bounce" />
                    <span className="w-1 h-1 bg-black/20 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1 h-1 bg-black/20 rounded-full animate-bounce [animation-delay:0.4s]" />
                    Architecting wisdom...
                </div>
            )}
            <div ref={chatEndRef} />
        </div>

        <form onSubmit={handleSubmit} className="relative mt-8 group">
            <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Share a thought..."
                className="w-full py-6 bg-transparent border-b border-[#262626]/20 focus:border-[#262626] outline-none text-2xl font-light italic transition-all placeholder-[#262626]/40 pr-24"
            />
            <button 
                type="submit" 
                disabled={!userInput.trim() || isLoading}
                className="absolute right-0 bottom-6 text-[10px] font-bold uppercase tracking-widest text-[#262626]/60 hover:text-[#262626] transition-colors disabled:opacity-0 heading-font"
            >
                Speak
            </button>
        </form>
    </div>
  );
};

export default AICoach;