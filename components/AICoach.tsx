
import React, { useState, useRef, useEffect } from 'react';
import { getCoachingResponse } from '../services/geminiService';
import type { ChatMessage } from '../types';
import Markdown from 'react-markdown';

const AICoach: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: "Hello. I'm listening. What's unfolding in your relationship today?" },
  ]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isLoading) return;
    const userMsg: ChatMessage = { role: 'user', text: userInput };
    setMessages(prev => [...prev, userMsg]);
    setUserInput('');
    setIsLoading(true);
    try {
      const res = await getCoachingResponse(userInput);
      setMessages(prev => [...prev, { role: 'model', text: res }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'model', text: "Something missed a beat. Try sharing again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="py-20 border-t border-[#262626]/10">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#262626]/70 mb-12 heading-font">AI Oracle</h2>
        <div className="space-y-12 mb-12">
            {messages.map((msg, i) => (
                <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <span className="text-[8px] font-bold uppercase tracking-widest text-[#262626]/60 mb-2 heading-font">
                    {msg.role === 'model' ? 'Oracle' : 'You'}
                  </span>
                  <div className={`text-xl leading-relaxed ${msg.role === 'user' ? 'text-right italic text-[#262626]/90' : 'text-left font-light text-[#262626]'}`}>
                      <Markdown>{msg.text}</Markdown>
                  </div>
                </div>
            ))}
            {isLoading && (
                <div className="text-[8px] font-bold uppercase tracking-widest text-[#262626]/40 animate-pulse">Syncing thoughts...</div>
            )}
            <div ref={chatEndRef} />
        </div>

        <form onSubmit={handleSubmit} className="relative mt-8">
            <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Share a thought..."
                className="w-full py-6 bg-transparent border-b border-[#262626]/20 focus:border-[#262626] outline-none text-2xl font-light italic transition-all placeholder-[#262626]/40"
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
