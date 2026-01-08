
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
    <div className="glass-panel rounded-3xl mt-6 shadow-xl overflow-hidden flex flex-col h-[500px]">
        <div className="flex items-center text-rose-700 p-5 border-b border-rose-100/50 bg-white/20">
            <SparklesIcon className="w-5 h-5 mr-2" />
            <h2 className="text-lg font-bold">Relationship Coach</h2>
        </div>
        
        <div className="flex-grow p-5 overflow-y-auto space-y-4">
            {messages.map((msg, index) => (
                <div key={index} className={`flex items-end gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'model' && (
                      <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-xs shadow-sm">AI</div>
                  )}
                  <div className={`max-w-[85%] p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                      msg.role === 'user' 
                      ? 'bg-slate-800 text-white rounded-br-none' 
                      : 'bg-white/60 backdrop-blur-sm text-slate-800 border border-white/50 rounded-bl-none'
                  }`}>
                      <Markdown className="prose prose-sm max-w-none prose-p:my-0 prose-ul:my-0 prose-ol:my-0 text-inherit">{msg.text}</Markdown>
                  </div>
                </div>
            ))}
            {isLoading && (
                <div className="flex items-end gap-3 justify-start">
                    <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-xs shadow-sm">AI</div>
                    <div className="p-4 rounded-2xl bg-white/60 backdrop-blur-sm rounded-bl-none border border-white/50">
                       <div className="flex items-center space-x-1.5">
                          <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0s'}}></div>
                          <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                          <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                       </div>
                    </div>
                </div>
            )}
            <div ref={chatEndRef} />
        </div>

        <form onSubmit={handleSubmit} className="p-4 bg-white/30 border-t border-white/40 flex items-center gap-2">
            <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Ask for advice..."
                className="flex-grow py-3 px-4 bg-white/60 rounded-full border border-white/40 focus:bg-white focus:ring-2 focus:ring-rose-200/50 focus:outline-none transition text-sm placeholder-slate-500"
            />
            <button 
                type="submit" 
                disabled={!userInput.trim() || isLoading}
                className="bg-slate-900 text-white rounded-full p-3 hover:bg-slate-800 transition-colors disabled:opacity-50 shadow-md"
            >
                <PaperAirplaneIcon className="w-5 h-5" />
            </button>
        </form>
    </div>
  );
};

export default AICoach;
