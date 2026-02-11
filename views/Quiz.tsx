
import React, { useState, useEffect, useMemo } from 'react';
import { QuizQuestion, UserData } from '../types';
import { generateQuizQuestions, interpretQuizResults, analyzeInteractionForScores } from '../services/geminiService';
import { cloudService } from '../services/cloudService';
import Markdown from 'markdown-to-jsx';

type TopicStatus = 'new' | 'waiting' | 'ready' | 'completed';

const Quiz: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentStep, setCurrentStep] = useState<'topic' | 'quiz' | 'waiting' | 'results'>('topic');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [partnerAnswers, setPartnerAnswers] = useState<any>(null);
  const [interpretation, setInterpretation] = useState('');
  const [userData, setUserData] = useState<UserData | null>(null);
  const [topicStatuses, setTopicStatuses] = useState<Record<string, TopicStatus>>({});

  const topics = ['Love Languages', 'Our Future', 'Memories', 'Daily Rhythms', 'Deep Desires'];

  useEffect(() => {
    const saved = localStorage.getItem('kindred_user_data');
    if (saved) {
        const parsed = JSON.parse(saved);
        setUserData(parsed);
        fetchTopicStatuses(parsed);
    }
  }, []);

  const fetchTopicStatuses = async (user: UserData) => {
    const code = user.partnerCode || user.id || 'default';
    const statuses: Record<string, TopicStatus> = {};
    
    for (const t of topics) {
        const ans = await cloudService.getQuizAnswers(code, t);
        const myAns = ans.find((a: any) => a.userId === user.id);
        const partnerAns = ans.find((a: any) => a.userId !== user.id);
        const synthesis = localStorage.getItem(`kindred_synthesis_${code}_${t}`);

        if (synthesis) statuses[t] = 'completed';
        else if (myAns && partnerAns) statuses[t] = 'ready';
        else if (myAns) statuses[t] = 'waiting';
        else statuses[t] = 'new';
    }
    setTopicStatuses(statuses);
  };

  // Poll for partner answers while waiting
  useEffect(() => {
    let interval: any;
    if (currentStep === 'waiting') {
      interval = setInterval(() => {
        checkPartnerStatus();
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [currentStep, topic]);

  const startQuiz = async (selectedTopic: string) => {
    const status = topicStatuses[selectedTopic];
    setTopic(selectedTopic);

    if (status === 'completed' || status === 'ready') {
        resumeQuiz(selectedTopic);
        return;
    }

    if (status === 'waiting') {
        setCurrentStep('waiting');
        return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const generated = await generateQuizQuestions(selectedTopic);
      if (generated && generated.length > 0) {
        setQuestions(generated);
        setCurrentQuestionIndex(0);
        setAnswers({});
        setCurrentStep('quiz');
      } else {
        setError("The Oracle is momentarily quiet. Please check your API key and try initiating again.");
      }
    } catch (err) {
      setError("An unexpected error occurred while architecting your quiz.");
    } finally {
      setIsLoading(false);
    }
  };

  const resumeQuiz = async (selectedTopic: string) => {
    if (!userData) return;
    const code = userData.partnerCode || userData.id;
    const synthesis = localStorage.getItem(`kindred_synthesis_${code}_${selectedTopic}`);
    
    if (synthesis) {
        setInterpretation(synthesis);
        setCurrentStep('results');
    } else {
        // Must be ready
        setIsLoading(true);
        const ans = await cloudService.getQuizAnswers(code, selectedTopic);
        const myAns = ans.find((a: any) => a.userId === userData.id)?.answers;
        const partnerAns = ans.find((a: any) => a.userId !== userData.id)?.answers;
        
        if (myAns && partnerAns) {
            setAnswers(myAns);
            setPartnerAnswers(partnerAns);
            generateInsights(selectedTopic, myAns, partnerAns);
        } else {
            setCurrentStep('topic');
        }
    }
  };

  const handleAnswer = (questionId: string, answer: string) => {
    if (!answer.trim()) return;
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      submitQuiz({ ...answers, [questionId]: answer });
    }
  };

  const submitQuiz = async (finalAnswers: Record<string, string>) => {
    if (!userData) return;
    setCurrentStep('waiting');
    await cloudService.saveQuizAnswer(userData.partnerCode || 'default', userData.id, topic, finalAnswers);
    if (userData) fetchTopicStatuses(userData);
    checkPartnerStatus();
  };

  const checkPartnerStatus = async () => {
    if (!userData || !topic) return;
    const allAnswers = await cloudService.getQuizAnswers(userData.partnerCode || 'default', topic);
    const partner = allAnswers.find((a: any) => a.userId !== userData.id);
    if (partner) {
      setPartnerAnswers(partner.answers);
      generateInsights(topic, answers, partner.answers);
    }
  };

  const generateInsights = async (quizTopic: string, myAns: any, pAns: any) => {
    if (interpretation || isLoading || !userData) return; 
    setIsLoading(true);
    try {
      const res = await interpretQuizResults(quizTopic, Object.values(myAns), Object.values(pAns));
      setInterpretation(res);
      setCurrentStep('results');
      
      const code = userData.partnerCode || userData.id;
      localStorage.setItem(`kindred_synthesis_${code}_${quizTopic}`, res);
      
      // Update Bond Map Equilibrium based on quiz synthesis
      const updates = await analyzeInteractionForScores(res);
      if (updates.length > 0) {
          await cloudService.batchUpdateScores(code, updates);
      }
      fetchTopicStatuses(userData);
    } catch (err) {
      console.error("Interpretation failed", err);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusLabel = (t: string) => {
    const status = topicStatuses[t];
    switch (status) {
        case 'waiting': return 'Awaiting Partner';
        case 'ready': return 'Alchemy Ready';
        case 'completed': return 'Synthesis Complete';
        default: return 'Initiate';
    }
  };

  if (currentStep === 'topic') {
    return (
      <div className="px-6 py-12 max-w-xl mx-auto animate-fade-in">
        <header className="mb-16">
          <h1 className="text-6xl font-light mb-2 text-[#000000]">Quiz.</h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#000000]/70 heading-font">Discover each other again</p>
        </header>

        <p className="text-xl text-[#000000]/70 mb-12 italic font-light">Select a theme for your journey into each other's worlds.</p>

        {error && (
          <div className="mb-12 p-8 bg-red-50 border border-red-100 rounded-[2rem] text-red-600">
            <p className="text-sm italic mb-6 leading-relaxed">{error}</p>
            <button 
              onClick={() => startQuiz(topic)}
              className="text-[10px] font-bold uppercase tracking-widest border-b border-red-600 pb-1"
            >
              Retry Connection
            </button>
          </div>
        )}

        <div className="space-y-4">
          {topics.map(t => (
            <button
              key={t}
              disabled={isLoading}
              onClick={() => startQuiz(t)}
              className="w-full text-left py-10 border-b border-[#000000]/10 hover:opacity-70 transition-all flex justify-between items-center group disabled:opacity-50"
            >
              <div>
                <span className="text-4xl font-light text-[#000000]">{t}</span>
                {topicStatuses[t] === 'completed' && (
                    <div className="mt-1 flex items-center gap-1">
                        <span className="text-[8px] font-bold text-[#00FF41] uppercase tracking-widest">Achieved Equilibrium</span>
                    </div>
                )}
              </div>
              <span className={`text-[9px] font-bold uppercase heading-font transition-all ${topicStatuses[t] === 'ready' ? 'text-[#00FF41] animate-pulse' : 'text-[#000000]/20'}`}>
                {isLoading && topic === t ? 'Designing...' : getStatusLabel(t)}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (currentStep === 'quiz') {
    const q = questions[currentQuestionIndex];
    if (!q) return null;

    return (
      <div className="px-6 py-12 max-w-xl mx-auto animate-fade-in">
        <button onClick={() => setCurrentStep('topic')} className="text-[#000000]/70 text-[10px] font-bold uppercase tracking-widest mb-12 heading-font">← Exit</button>
        <div className="mb-12">
            <span className="text-[8px] font-bold uppercase tracking-widest text-[#000000]/40 block mb-2 heading-font">Step {currentQuestionIndex + 1} of {questions.length}</span>
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
                onKeyDown={(e) => { 
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAnswer(q.id, (e.target as any).value);
                  }
                }}
              />
              <button 
                onClick={(e) => {
                  const val = (e.currentTarget.previousElementSibling as HTMLTextAreaElement).value;
                  handleAnswer(q.id, val);
                }}
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
        <h2 className="text-4xl font-light mb-6 text-[#000000]">Waiting.</h2>
        <p className="text-xl text-[#000000]/70 italic mb-12">Your reflections are archived. We're waiting for {userData?.partnerName || 'your partner'} to complete their cycle.</p>
        <div className="flex flex-col items-center gap-12">
          <div className="w-16 h-16 border-2 border-black/5 border-t-black rounded-full animate-spin"></div>
          
          <div className="flex flex-col items-center gap-4">
              <button onClick={() => setCurrentStep('topic')} className="w-64 py-5 bg-[#000000] text-white font-bold rounded-full uppercase text-[10px] tracking-widest shadow-xl">Return to Space</button>
              <button onClick={checkPartnerStatus} className="text-[10px] font-bold uppercase tracking-widest text-[#000000]/40 hover:text-black border-b border-transparent hover:border-[#000000] pb-1 heading-font">Force Sync</button>
          </div>
        </div>
        <p className="mt-24 text-[9px] font-bold uppercase tracking-widest text-black/20 px-8">You can leave this screen. Kindred will notify you when the alchemy is ready.</p>
      </div>
    );
  }

  if (currentStep === 'results') {
    return (
      <div className="px-6 py-12 max-w-xl mx-auto animate-fade-in">
        <header className="mb-16">
          <h1 className="text-6xl font-light mb-2 text-[#000000]">Synthesis.</h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#000000]/70 heading-font">The Alchemy of Connection</p>
        </header>

        <div className="lesson-content mb-16 prose prose-xl prose-stone">
          <Markdown>{interpretation}</Markdown>
        </div>

        <button onClick={() => setCurrentStep('topic')} className="w-full py-5 bg-[#000000] text-white font-bold rounded-full uppercase text-xs tracking-widest">Return Home</button>
      </div>
    );
  }

  return null;
};

export default Quiz;
