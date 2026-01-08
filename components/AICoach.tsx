
import React, { useState, useRef, useEffect } from 'react';
import { getCoachingResponse } from '../services/geminiService';
import type { ChatMessage } from '../types';
import { PaperAirplaneIcon, SparklesIcon } from './Icons';
import Markdown from 'react-markdown';

const AICoach: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: "Hello! I'm here to support your relationship. What's on your mind today?" },
  ]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isLoading) return;

    const newUserMessage: ChatMessage = { role: 'user', text: userInput };
    setMessages(prev => [...prev, newUserMessage]);
    setUserInput('');
    setIsLoading(true);

    try {
      const responseText = await getCoachingResponse(userInput);
      const newAiMessage: ChatMessage = { role: 'model', text: responseText };
      setMessages(prev => [...prev, newAiMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = { role: 'model', text: "Sorry, I couldn't get a response. Please try again." };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="glass-panel rounded-[2rem] mt-8 shadow-xl overflow-hidden flex flex-col h-[550px] bg-white/5 border-white/5">
        <div className="flex items-center text-rose-300 p-6 border-b border-white/5 bg-white/5">
            <SparklesIcon className="w-5 h-5 mr-3" />
            <h2 className="text-sm font-bold uppercase tracking-widest heading-font">Relationship Coach</h2>
        </div>
        
        <div className="flex-grow p-6 overflow-y-auto space-y-6">
            {messages.map((msg, index) => (
                <div key={index} className={`flex items-end gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'model' && (
                      <div className="w-8 h-8 rounded-full bg-rose-500/20 border border-rose-500/20 flex items-center justify-center text-[10px] font-bold text-rose-300 shadow-sm">AI</div>
                  )}
                  <div className={`max-w-[85%] p-4 rounded-2xl text-base leading-relaxed shadow-sm ${
                      msg.role === 'user' 
                      ? 'bg-white/10 text-white border border-white/10 rounded-br-none' 
                      : 'bg-white/5 backdrop-blur-sm text-white/90 border border-white/5 rounded-bl-none'
                  }`}>
                      <div className="prose prose-sm prose-invert max-w-none prose-p:my-0 prose-ul:my-0 prose-ol:my-0 text-inherit">
                        <Markdown>{msg.text}</Markdown>
                      </div>
                  </div>
                </div>
            ))}
            {isLoading && (
                <div className="flex items-end gap-3 justify-start">
                    <div className="w-8 h-8 rounded-full bg-rose-500/20 flex items-center justify-center text-[10px] font-bold text-rose-300 shadow-sm">AI</div>
                    <div className="p-5 rounded-2xl bg-white/5 backdrop-blur-sm rounded-bl-none border border-white/5">
                       <div className="flex items-center space-x-2">
                          <div className="w-1.5 h-1.5 bg-white/30 rounded-full animate-bounce" style={{animationDelay: '0s'}}></div>
                          <div className="w-1.5 h-1.5 bg-white/30 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                          <div className="w-1.5 h-1.5 bg-white/30 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                       </div>
                    </div>
                </div>
            )}
            <div ref={chatEndRef} />
        </div>

        <form onSubmit={handleSubmit} className="p-5 bg-white/5 border-t border-white/5 flex items-center gap-3">
            <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Ask for perspective..."
                className="flex-grow py-4 px-6 bg-white/5 rounded-full border border-white/10 focus:bg-white/10 focus:ring-1 focus:ring-white/20 focus:outline-none transition text-sm text-white placeholder-white/20"
            />
            <button 
                type="submit" 
                disabled={!userInput.trim() || isLoading}
                className="bg-white text-slate-900 rounded-full p-4 hover:bg-slate-100 transition-all disabled:opacity-20 shadow-md active:scale-90"
            >
                <PaperAirplaneIcon className="w-5 h-5" />
            </button>
        </form>
    </div>
  );
};

export default AICoach;
