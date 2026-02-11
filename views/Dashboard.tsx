
import React, { useEffect, useState, useMemo } from 'react';
import DailyPrompt from '../components/DailyPrompt';
import AICoach from '../components/AICoach';
import { UserData, CourseModule, BondScore, View, Lesson, Activity } from '../types';
import { generateLearningPath } from '../services/geminiService';
import { cloudService } from '../services/cloudService';
import Markdown from 'react-markdown';

interface DashboardProps {
  userData: UserData | null;
  onNavigate?: (view: View) => void;
}

const BondMap: React.FC<{ scores: BondScore[] }> = ({ scores }) => {
    const categories = ['Communication', 'Intimacy', 'Trust', 'Conflict', 'Shared Vision'];
    const chartData = useMemo(() => categories.map(cat => {
        const catScore = scores.find(s => s.category === cat);
        return catScore ? catScore.score : 3.5;
    }), [scores]);

    const size = 240;
    const center = size / 2;
    const radius = size * 0.35;
    const points = chartData.map((val, i) => {
        const angle = (i * 2 * Math.PI) / categories.length - Math.PI / 2;
        const r = (val / 10) * radius;
        return { x: center + r * Math.cos(angle), y: center + r * Math.sin(angle), labelX: center + (radius + 40) * Math.cos(angle), labelY: center + (radius + 40) * Math.sin(angle) };
    });

    const polygonPath = points.map(p => `${p.x},${p.y}`).join(' ');

    return (
        <div className="py-12 border-y border-[#262626]/10 flex flex-col items-center">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#262626]/70 mb-12 heading-font">Kindred Equilibrium</h3>
            <svg width={size} height={size} className="overflow-visible">
                {categories.map((_, i) => {
                    const angle = (i * 2 * Math.PI) / categories.length - Math.PI / 2;
                    return <line key={i} x1={center} y1={center} x2={center + radius * Math.cos(angle)} y2={center + radius * Math.sin(angle)} stroke="#262626" strokeWidth="0.5" strokeOpacity="0.1" />;
                })}
                <polygon points={polygonPath} fill="#00FF41" fillOpacity="0.1" stroke="#00FF41" strokeWidth="1.5" style={{ transition: 'all 2s cubic-bezier(0.2, 0.8, 0.2, 1)' }} />
                {points.map((p, i) => (
                    <text key={i} x={p.labelX} y={p.labelY} fontSize="7" fontWeight="700" textAnchor="middle" className="fill-[#262626]/50 uppercase tracking-[0.2em] heading-font">{categories[i]}</text>
                ))}
            </svg>
        </div>
    );
};

const Dashboard: React.FC<DashboardProps> = ({ userData, onNavigate }) => {
  const [courseModules, setCourseModules] = useState<CourseModule[]>([]);
  const [bondScores, setBondScores] = useState<BondScore[]>([]);
  const [isLoadingPath, setIsLoadingPath] = useState(false);
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([]);
  const [activeActivity, setActiveActivity] = useState<Activity | null>(null);
  const [partnerPresence, setPartnerPresence] = useState<Partial<UserData> | null>(null);
  const [showPulseAnimation, setShowPulseAnimation] = useState(false);
  const [lastPulseLocal, setLastPulseLocal] = useState<number>(0);
  const [partnerReflection, setPartnerReflection] = useState<string | null>(null);
  const [readyQuiz, setReadyQuiz] = useState<string | null>(null);
  
  // Selected content states
  const [selectedModule, setSelectedModule] = useState<CourseModule | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  useEffect(() => {
    const initializeDashboard = async () => {
      const code = userData?.partnerCode || userData?.id || 'default';
      
      const savedPath = localStorage.getItem('kindred_learning_path');
      if (savedPath) setCourseModules(JSON.parse(savedPath));
      else {
        setIsLoadingPath(true);
        const path = await generateLearningPath();
        setCourseModules(path);
        localStorage.setItem('kindred_learning_path', JSON.stringify(path));
        setIsLoadingPath(false);
      }
      
      const scores = await cloudService.getBondScores(code);
      setBondScores(scores);
      setCompletedLessonIds(cloudService.getCompletedLessons());
      setActiveActivity(cloudService.getActiveActivity());
      
      if (userData) {
        const presence = await cloudService.getPartnerPresence(code, userData.id);
        setPartnerPresence(presence);
        if (presence?.lastPulseReceived) {
            setLastPulseLocal(presence.lastPulseReceived);
        }
        
        const reflection = await cloudService.getPartnerPromptAnswer(code, userData.id);
        setPartnerReflection(reflection);

        // Check for ready quizzes
        const topics = ['Love Languages', 'Our Future', 'Memories', 'Daily Rhythms', 'Deep Desires'];
        for (const topic of topics) {
            const ans = await cloudService.getQuizAnswers(code, topic);
            if (ans.length === 2) {
                const synthesis = localStorage.getItem(`kindred_synthesis_${code}_${topic}`);
                if (!synthesis) {
                    setReadyQuiz(topic);
                    break;
                }
            }
        }
      }
    };

    initializeDashboard();
    
    const interval = setInterval(async () => {
        if (!userData) return;
        const code = userData.partnerCode || userData.id;
        const presence = await cloudService.getPartnerPresence(code, userData.id);
        
        if (presence?.lastPulseReceived && presence.lastPulseReceived > lastPulseLocal) {
            if ('vibrate' in navigator) {
                navigator.vibrate([100, 50, 100]);
            }
            setShowPulseAnimation(true);
            setLastPulseLocal(presence.lastPulseReceived);
            setTimeout(() => setShowPulseAnimation(false), 3000);
        }
        
        const reflection = await cloudService.getPartnerPromptAnswer(code, userData.id);
        setPartnerReflection(reflection);
        
        setPartnerPresence(presence);
        cloudService.updateLastActive(userData.id);
    }, 10000);

    return () => clearInterval(interval);
  }, [userData, lastPulseLocal]);

  const sendPulse = async () => {
    if (!userData) return;
    if ('vibrate' in navigator) {
        navigator.vibrate(50);
    }
    await cloudService.sendPulse(userData.partnerCode || userData.id);
    setShowPulseAnimation(true);
    setTimeout(() => setShowPulseAnimation(false), 1500);
  };

  const isPartnerActive = useMemo(() => {
    if (!partnerPresence?.lastActive) return false;
    return (Date.now() - partnerPresence.lastActive) < 60000;
  }, [partnerPresence]);

  const enrichedModules = useMemo(() => {
    return courseModules.map((m, index) => {
      const moduleLessons = m.content || [];
      const completedInModule = moduleLessons.filter(l => completedLessonIds.includes(l.id));
      const isCompleted = moduleLessons.length > 0 && completedInModule.length === moduleLessons.length;
      let status: 'active' | 'locked' | 'completed' = index === 0 ? (isCompleted ? 'completed' : 'active') : 'locked';
      if (index > 0) {
        const prev = courseModules[index - 1];
        const prevDone = (prev?.content || []).every(l => completedLessonIds.includes(l.id));
        if (prevDone) status = isCompleted ? 'completed' : 'active';
      }
      return { ...m, status, progress: moduleLessons.length > 0 ? (completedInModule.length / moduleLessons.length) * 100 : 0, completedCount: completedInModule.length, totalCount: moduleLessons.length };
    });
  }, [courseModules, completedLessonIds]);

  const completeLesson = async (lessonId: string) => {
    await cloudService.markLessonComplete(lessonId);
    setCompletedLessonIds(prev => [...prev, lessonId]);
    setSelectedLesson(null);
  };

  return (
    <div className="px-6 py-12 max-w-xl mx-auto relative">
        <div className={`fixed inset-0 pointer-events-none z-[100] transition-opacity duration-1000 ${showPulseAnimation ? 'opacity-100' : 'opacity-0'}`}>
            <div className="absolute inset-0 border-[8px] border-[#00FF41]/10 animate-pulse" />
            <div className="absolute inset-0 shadow-[inset_0_0_60px_rgba(0,255,65,0.05)]" />
        </div>

        <header className="mb-12 flex justify-between items-start">
            <div className="relative">
              <h1 className="text-6xl font-light mb-4 text-[#262626]">{userData?.userName ? `Hello, ${userData.userName}.` : 'Kindred.'}</h1>
              <div className="flex items-center gap-3">
                 <div className="relative flex items-center justify-center w-3 h-3">
                    <div className={`absolute w-full h-full rounded-full ${isPartnerActive ? 'bg-[#00FF41] animate-ping opacity-40' : 'bg-black/5'}`} />
                    <div className={`relative w-1.5 h-1.5 rounded-full ${isPartnerActive ? 'bg-[#00FF41]' : 'bg-black/10'} ${showPulseAnimation ? 'animate-ping' : ''}`} />
                 </div>
                 <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#262626]/70 heading-font">
                   {userData?.partnerName} is {isPartnerActive ? (partnerPresence?.vibe || 'Active') : 'Away'}
                 </p>
              </div>
            </div>
            <button 
                onClick={sendPulse}
                className="group relative flex items-center justify-center w-12 h-12 rounded-full border border-black/5 hover:border-[#00FF41]/30 transition-all active:scale-90"
                title="Send a Pulse"
            >
                <div className={`text-lg group-hover:scale-125 transition-transform ${showPulseAnimation ? 'text-[#00FF41]' : 'text-black/20'}`}>❤</div>
                {showPulseAnimation && <div className="absolute inset-0 rounded-full border border-[#00FF41] animate-ping opacity-20" />}
            </button>
        </header>

        {/* Action Cards Section */}
        {(activeActivity || partnerReflection || isPartnerActive || readyQuiz) && (
            <div className="mb-12 space-y-4">
                <h2 className="text-[8px] font-bold uppercase tracking-[0.3em] text-black/30 mb-2 px-2 heading-font">Echoes of Presence</h2>
                
                {readyQuiz && (
                    <div className="p-6 bg-[#00FF41]/5 border border-[#00FF41]/10 rounded-3xl animate-fade-in flex items-center justify-between group hover:bg-[#00FF41]/10 transition-all cursor-pointer" onClick={() => onNavigate && onNavigate(View.Quiz)}>
                        <div className="flex flex-col">
                            <span className="text-[8px] font-bold uppercase tracking-widest text-[#00FF41] mb-1">Alchemy Ready</span>
                            <p className="text-sm text-[#262626] font-medium">Results for "{readyQuiz}" are waiting.</p>
                        </div>
                        <span className="text-[10px] text-[#262626]/40 font-bold group-hover:translate-x-1 transition-transform">→</span>
                    </div>
                )}

                {isPartnerActive && (
                    <div className="p-6 bg-[#00FF41]/5 border border-[#00FF41]/10 rounded-3xl animate-fade-in flex items-center justify-between group hover:bg-[#00FF41]/10 transition-all cursor-default">
                        <div className="flex flex-col">
                            <span className="text-[8px] font-bold uppercase tracking-widest text-[#00FF41] mb-1">Live Connection</span>
                            <p className="text-sm text-[#262626] font-medium">{userData?.partnerName} is exploring the space.</p>
                        </div>
                        <div className="w-2 h-2 rounded-full bg-[#00FF41] animate-pulse" />
                    </div>
                )}

                {activeActivity && (
                  <div className="p-6 bg-white border border-[#262626]/5 rounded-3xl animate-fade-in shadow-sm flex items-center justify-between group hover:border-[#262626]/20 transition-all cursor-pointer" onClick={() => onNavigate && onNavigate(View.Activities)}>
                      <div className="flex flex-col">
                          <span className="text-[8px] font-bold uppercase tracking-widest text-[#262626]/40 mb-1">Shared Intent</span>
                          <p className="text-sm text-[#262626] font-medium">{userData?.partnerName} started: {activeActivity.title}</p>
                      </div>
                      <span className="text-[10px] text-[#262626]/40 font-bold group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                )}

                {partnerReflection && (
                  <div className="p-6 bg-white border border-[#262626]/5 rounded-3xl animate-fade-in shadow-sm flex items-center justify-between group hover:border-[#262626]/20 transition-all cursor-pointer" onClick={() => onNavigate && onNavigate(View.Dashboard)}>
                      <div className="flex flex-col">
                          <span className="text-[8px] font-bold uppercase tracking-widest text-[#262626]/40 mb-1">New Reflection</span>
                          <p className="text-sm text-[#262626] font-medium">{userData?.partnerName} left a heart for you to read.</p>
                      </div>
                      <span className="text-[10px] text-[#262626]/40 font-bold group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                )}
            </div>
        )}

        <DailyPrompt />
        <BondMap scores={bondScores} />

        <div className="grid grid-cols-2 gap-4 mb-16">
            <button onClick={() => onNavigate && onNavigate(View.Mediation)} className="py-12 border border-[#262626]/10 rounded-[2rem] group bg-white/5 hover:bg-black hover:text-white transition-all">
                <span className="text-[8px] font-bold uppercase tracking-[0.3em] text-[#262626]/60 group-hover:text-white transition-colors heading-font block mb-1">Mediation</span>
                <span className="text-xs font-light italic text-[#262626]/50 group-hover:text-white/70">Safe Space</span>
            </button>
            <button onClick={() => onNavigate && onNavigate(View.EsotericLens)} className="py-12 border border-[#262626]/10 rounded-[2rem] group bg-white/5 hover:bg-black hover:text-white transition-all">
                <span className="text-[8px] font-bold uppercase tracking-[0.3em] text-[#262626]/60 group-hover:text-white transition-colors heading-font block mb-1">Esoteric Lens</span>
                <span className="text-xs font-light italic text-[#262626]/50 group-hover:text-white/70">Synchronicity</span>
            </button>
        </div>

        <div className="py-16">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#262626]/70 heading-font mb-12">Shared Evolution</h2>
            <div className="space-y-6">
                {enrichedModules.map((m, i) => (
                    <button 
                      key={i} 
                      disabled={m.status === 'locked'} 
                      onClick={() => setSelectedModule(m)}
                      className={`w-full text-left py-10 px-6 border border-[#262626]/10 rounded-[2.5rem] relative transition-all ${m.status === 'locked' ? 'opacity-20 grayscale' : 'hover:border-[#262626]/30 hover:scale-[1.01] active:scale-[0.98]'}`}
                    >
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <span className="text-[8px] font-bold uppercase tracking-widest mb-2 block text-[#262626]/60">Phase {i+1}</span>
                                <h3 className="text-4xl font-light text-[#262626]">{m.title}</h3>
                            </div>
                            {m.status === 'completed' && <span className="text-[10px] text-[#00FF41] font-bold uppercase">✓</span>}
                        </div>
                        <div className="flex justify-between items-end">
                            <span className="text-[10px] italic text-[#262626]/40 font-light">{m.description.slice(0, 50)}...</span>
                            <span className="text-[8px] font-bold uppercase text-[#262626]/60">{m.completedCount}/{m.totalCount}</span>
                        </div>
                        <div className="absolute bottom-0 left-0 h-[2px] bg-[#00FF41]/10 w-full rounded-b-[2.5rem]">
                            <div className="h-full bg-[#00FF41] transition-all duration-1000" style={{ width: `${m.progress}%` }} />
                        </div>
                    </button>
                ))}
                {isLoadingPath && (
                   <div className="text-center py-20 animate-pulse">
                      <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-black/20">Architecting your unique path...</p>
                   </div>
                )}
            </div>
        </div>

        <AICoach />

        {/* Module/Phase Detail Overlay */}
        {selectedModule && (
          <div className="fixed inset-0 z-[150] bg-[#FDFCF0] overflow-y-auto animate-fade-in p-8">
             <header className="mb-12 flex justify-between items-start pt-4">
                <div>
                   <span className="text-[8px] font-bold uppercase tracking-[0.4em] text-black/30 mb-2 block heading-font">Exploring Phase</span>
                   <h2 className="text-5xl font-light text-black">{selectedModule.title}</h2>
                </div>
                <button onClick={() => setSelectedModule(null)} className="text-[10px] font-bold uppercase tracking-widest text-black/40 hover:text-black border-b border-black/10 pb-1 heading-font">Close</button>
             </header>

             <p className="text-xl text-black/70 italic font-light mb-12 leading-relaxed">"{selectedModule.description}"</p>

             <div className="space-y-4">
                {selectedModule.content?.map((lesson, idx) => (
                  <button 
                    key={lesson.id} 
                    onClick={() => setSelectedLesson(lesson)}
                    className="w-full text-left p-8 border border-black/5 rounded-[2rem] bg-white/40 hover:border-black/20 transition-all flex justify-between items-center group"
                  >
                     <div className="flex flex-col">
                        <span className="text-[8px] font-bold uppercase tracking-widest text-black/30 mb-2">Lesson {idx + 1} • {lesson.type}</span>
                        <h4 className="text-2xl font-light text-black group-hover:pl-1 transition-all">{lesson.title}</h4>
                     </div>
                     {completedLessonIds.includes(lesson.id) ? (
                        <span className="text-[10px] text-[#00FF41] font-bold uppercase">Complete</span>
                     ) : (
                        <span className="text-xs text-black/20 font-bold group-hover:text-black transition-colors">→</span>
                     )}
                  </button>
                ))}
             </div>
          </div>
        )}

        {/* Lesson Detail Overlay */}
        {selectedLesson && (
          <div className="fixed inset-0 z-[160] bg-[#FDFCF0] overflow-y-auto animate-fade-in p-8 pb-32">
             <header className="mb-12 flex justify-between items-start pt-4">
                <div>
                   <span className="text-[8px] font-bold uppercase tracking-[0.4em] text-black/30 mb-2 block heading-font">{selectedLesson.type}</span>
                   <h2 className="text-5xl font-light text-black">{selectedLesson.title}</h2>
                </div>
                <button onClick={() => setSelectedLesson(null)} className="text-[10px] font-bold uppercase tracking-widest text-black/40 hover:text-black border-b border-black/10 pb-1 heading-font">Close</button>
             </header>

             <div className="prose prose-stone prose-xl max-w-none lesson-content mb-24 font-light leading-relaxed italic text-black/80">
                <Markdown>{selectedLesson.longContent}</Markdown>
             </div>

             <div className="fixed bottom-12 left-0 right-0 px-8 flex justify-center">
                <button 
                  onClick={() => completeLesson(selectedLesson.id)}
                  className="w-full max-w-sm py-6 bg-black text-white rounded-full font-bold uppercase text-[10px] tracking-[0.3em] shadow-2xl active:scale-95 transition-all"
                >
                  Mark as Complete
                </button>
             </div>
          </div>
        )}
    </div>
  );
};

export default Dashboard;
