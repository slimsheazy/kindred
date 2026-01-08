
import React, { useState, useEffect } from 'react';
import { QuizQuestion, UserData } from '../types';
import { generateQuizQuestions, interpretQuizResults } from '../services/geminiService';
import { cloudService } from '../services/cloudService';
import Markdown from 'react-markdown';

const Quiz: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentStep, setCurrentStep] = useState<'topic' | 'quiz' | 'waiting' | 'results'>('topic');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [partnerAnswers, setPartnerAnswers] = useState<any>(null);
  const [interpretation, setInterpretation] = useState('');
  const [userData, setUserData] = useState<UserData | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('bonds_user_data');
    if (saved) setUserData(JSON.parse(saved));
  }, []);

  const topics = ['Love Languages', 'Our Future', 'Memories', 'Daily Rhythms', 'Deep Desires'];

  const startQuiz = async (selectedTopic: string) => {
    setIsLoading(true);
    setTopic(selectedTopic);
    const generated = await generateQuizQuestions(selectedTopic);
    setQuestions(generated);
    setCurrentStep('quiz');
    setIsLoading(false);
  };

  const handleAnswer = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      submitQuiz();
    }
  };

  const submitQuiz = async () => {
    if (!userData) return;
    setCurrentStep('waiting');
    await cloudService.saveQuizAnswer(userData.partnerCode || 'default', userData.id, topic, answers);
    checkPartnerStatus();
  };

  const checkPartnerStatus = async () => {
    if (!userData) return;
    const allAnswers = await cloudService.getQuizAnswers(userData.partnerCode || 'default', topic);
    const partner = allAnswers.find((a: any) => a.userId !== userData.id || a.user_id !== userData.id);
    if (partner) {
      setPartnerAnswers(partner.answers);
      generateInsights(partner.answers);
    }
  };

  const generateInsights = async (pAnswers: any) => {
    setIsLoading(true);
    const res = await interpretQuizResults(topic, Object.values(answers), Object.values(pAnswers));
    setInterpretation(res);
    setCurrentStep('results');
    setIsLoading(false);
  };

  if (currentStep === 'topic') {
    return (
      <div className="px-6 py-12 max-w-xl mx-auto animate-fade-in">
        <header className="mb-16">
          <h1 className="text-6xl font-light mb-2 text-[#000000]">Quiz.</h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#000000]/70 heading-font">Discover each other again</p>
        </header>

        <p className="text-xl text-[#000000]/70 mb-12 italic font-light">Select a theme for your journey into each other's worlds.</p>

        <div className="space-y-4">
          {topics.map(t => (
            <button
              key={t}
              onClick={() => startQuiz(t)}
              className="w-full text-left py-10 border-b border-[#000000]/10 hover:opacity-70 transition-all flex justify-between items-center group"
            >
              <span className="text-4xl font-light text-[#000000]">{t}</span>
              <span className="text-xs font-bold text-[#000000]/20 heading-font">Initiate</span>
            </button>
          ))}
        </div>
        {isLoading && <div className="mt-8 text-[10px] font-bold uppercase tracking-widest text-[#000000]/50 animate-pulse">Designing questions...</div>}
      </div>
    );
  }

  if (currentStep === 'quiz') {
    const q = questions[currentQuestionIndex];
    return (
      <div className="px-6 py-12 max-w-xl mx-auto animate-fade-in">
        <button onClick={() => setCurrentStep('topic')} className="text-[#000000]/70 text-[10px] font-bold uppercase tracking-widest mb-12 heading-font">← Exit</button>
        <div className="mb-12">
            <span className="text-[8px] font-bold uppercase tracking-widest text-[#000000]/40 block mb-2 heading-font">Question {currentQuestionIndex + 1} of {questions.length}</span>
            <h2 className="text-4xl font-light text-[#000000] leading-tight">{q.question}</h2>
        </div>

        <div className="space-y-4">
          {q.type === 'multiple_choice' && q.options ? (
            q.options.map(opt => (
              <button
                key={opt}
                onClick={() => handleAnswer(q.id, opt)}
                className="w-full text-left p-6 border border-[#000000]/10 rounded-full hover:bg-[#000000] hover:text-white transition-all text-xl font-light"
              >
                {opt}
              </button>
            ))
          ) : (
            <div className="space-y-6">
              <textarea
                autoFocus
                className="w-full bg-transparent border-b border-[#000000]/20 focus:border-[#000000] outline-none text-2xl font-light italic p-4 resize-none h-40"
                placeholder="Write from the heart..."
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) handleAnswer(q.id, (e.target as any).value); }}
              />
              <button 
                onClick={(e) => handleAnswer(q.id, (e.currentTarget.previousElementSibling as HTMLTextAreaElement).value)}
                className="w-full py-5 border border-[#000000] text-[#000000] font-bold rounded-full uppercase text-xs tracking-widest"
              >
                Submit Answer
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (currentStep === 'waiting') {
    return (
      <div className="px-6 py-12 max-w-xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-in">
        <h2 className="text-4xl font-light mb-6 text-[#000000]">Patience.</h2>
        <p className="text-xl text-[#000000]/70 italic mb-12">Your reflections are saved. We're waiting for {userData?.partnerName} to complete their part.</p>
        <button onClick={checkPartnerStatus} className="text-[10px] font-bold uppercase tracking-widest text-[#000000] border-b border-[#000000] pb-1 heading-font animate-pulse">Sync Status</button>
      </div>
    );
  }

  if (currentStep === 'results') {
    return (
      <div className="px-6 py-12 max-w-xl mx-auto animate-fade-in">
        <header className="mb-16">
          <h1 className="text-6xl font-light mb-2 text-[#000000]">Insights.</h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#000000]/70 heading-font">The alchemy of your answers</p>
        </header>

        <div className="lesson-content mb-16">
          <Markdown>{interpretation}</Markdown>
        </div>

        <button onClick={() => setCurrentStep('topic')} className="w-full py-5 bg-[#000000] text-white font-bold rounded-full uppercase text-xs tracking-widest">Done</button>
      </div>
    );
  }

  return null;
};

export default Quiz;
