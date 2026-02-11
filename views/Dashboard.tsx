
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
                <polygon 
                    points={polygonPath} 
                    fill="#00FF41" 
                    fillOpacity="0.1" 
                    stroke="#00FF41" 
                    strokeWidth="1.5" 
                    style={{ transition: 'all 2s cubic-bezier(0.2, 0.8, 0.2, 1)' }}
                />
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
  const [selectedModule, setSelectedModule] = useState<CourseModule | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [isLoadingPath, setIsLoadingPath] = useState(false);
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([]);
  const [activeActivity, setActiveActivity] = useState<Activity | null>(null);

  useEffect(() => {
    const initializeDashboard = async () => {
      const savedPath = localStorage.getItem('kindred_learning_path');
      if (savedPath) {
        setCourseModules(JSON.parse(savedPath));
      } else {
        setIsLoadingPath(true);
        const path = await generateLearningPath();
        setCourseModules(path);
        localStorage.setItem('kindred_learning_path', JSON.stringify(path));
        setIsLoadingPath(false);
      }
      
      const scores = await cloudService.getBondScores(userData?.partnerCode || 'default');
      setBondScores(scores);
      
      const lessons = cloudService.getCompletedLessons();
      setCompletedLessonIds(lessons);
      
      const savedActive = localStorage.getItem('kindred_active_activity');
      if (savedActive) setActiveActivity(JSON.parse(savedActive));
    };

    initializeDashboard();

    const interval = setInterval(async () => {
      const scores = await cloudService.getBondScores(userData?.partnerCode || 'default');
      setBondScores(scores);
    }, 10000);
    
    return () => clearInterval(interval);
  }, [userData]);

  // Derived Module Statuses
  const enrichedModules = useMemo(() => {
    return courseModules.map((m, index) => {
      const moduleLessons = m.content || [];
      const completedInModule = moduleLessons.filter(l => completedLessonIds.includes(l.id));
      const isCompleted = moduleLessons.length > 0 && completedInModule.length === moduleLessons.length;
      
      // A module is unlocked if it's the first one OR the previous one is completed
      let status: 'active' | 'locked' | 'completed' = 'locked';
      if (index === 0) {
        status = isCompleted ? 'completed' : 'active';
      } else {
        const prevModule = courseModules[index - 1];
        const prevLessons = prevModule?.content || [];
        const prevCompleted = prevLessons.filter(l => completedLessonIds.includes(l.id)).length === prevLessons.length;
        
        if (prevCompleted) {
          status = isCompleted ? 'completed' : 'active';
        }
      }

      return {
        ...m,
        status,
        progress: moduleLessons.length > 0 ? (completedInModule.length / moduleLessons.length) * 100 : 0,
        completedCount: completedInModule.length,
        totalCount: moduleLessons.length
      };
    });
  }, [courseModules, completedLessonIds]);

  const refreshLearningPath = async () => {
    setIsLoadingPath(true);
    const path = await generateLearningPath();
    setCourseModules(path);
    localStorage.setItem('kindred_learning_path', JSON.stringify(path));
    setIsLoadingPath(false);
  }

  const handleCompleteLesson = async (lessonId: string) => {
    await cloudService.markLessonComplete(lessonId);
    setCompletedLessonIds(prev => [...prev, lessonId]);
    setSelectedLesson(null);
    
    // Add small bonus to communication score
    await cloudService.updateBondScore(userData?.partnerCode || 'default', 'Communication', 0.2);
    const scores = await cloudService.getBondScores(userData?.partnerCode || 'default');
    setBondScores(scores);
  };

  const cancelActivity = () => {
    localStorage.removeItem('kindred_active_activity');
    setActiveActivity(null);
  }

  return (
    <div className="px-6 py-12 max-w-xl mx-auto">
        <header className="mb-16">
            <h1 className="text-6xl font-light mb-2 text-[#262626]">{userData?.userName ? `Hello, ${userData.userName}.` : 'Embrace Connection.'}</h1>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#262626]/70 heading-font">Kindred with {userData?.partnerName}</p>
        </header>

        {activeActivity && (
          <div className="mb-12 p-8 bg-[#00FF41]/5 border border-[#00FF41]/10 rounded-[2rem] animate-fade-in">
              <span className="text-[8px] font-bold uppercase tracking-widest text-[#00FF41] mb-2 block heading-font">Active Intent</span>
              <h3 className="text-2xl font-light mb-2 text-[#262626]">{activeActivity.title}</h3>
              <p className="text-sm text-[#262626]/60 mb-6 font-light">{activeActivity.description}</p>
              <div className="flex gap-4">
                <button onClick={cancelActivity} className="text-[8px] font-bold uppercase tracking-widest border-b border-[#262626]/20 pb-1">Conclude</button>
              </div>
          </div>
        )}

        <DailyPrompt />
        <BondMap scores={bondScores} />

        <div className="grid grid-cols-2 gap-4 mb-16">
            <button 
                onClick={() => onNavigate && onNavigate(View.Mediation)} 
                className="py-12 border border-[#262626]/10 hover:border-[#262626]/30 transition-all text-center rounded-[2rem] group bg-white/5"
            >
                <span className="text-[8px] font-bold uppercase tracking-[0.3em] text-[#262626]/60 group-hover:text-[#262626] transition-colors heading-font block mb-1">Mediation</span>
                <span className="text-xs font-light italic text-[#262626]/50">Neutral Space</span>
            </button>
            <button 
                onClick={() => onNavigate && onNavigate(View.EsotericLens)} 
                className="py-12 border border-[#262626]/10 hover:border-[#262626]/30 transition-all text-center rounded-[2rem] group bg-white/5"
            >
                <span className="text-[8px] font-bold uppercase tracking-[0.3em] text-[#262626]/60 group-hover:text-[#262626] transition-colors heading-font block mb-1">Esoteric Lens</span>
                <span className="text-xs font-light italic text-[#262626]/50">Synchronicity</span>
            </button>
        </div>

        <div className="py-16">
            <div className="flex justify-between items-center mb-12">
                <div>
                  <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#262626]/70 heading-font">Growth Architecture</h2>
                  <p className="text-[8px] font-bold uppercase text-[#262626]/30 mt-1 tracking-widest">A sequence of shared evolution</p>
                </div>
                <button onClick={refreshLearningPath} className="text-[8px] font-bold uppercase tracking-widest text-[#262626]/40 hover:text-[#262626] transition-all">Reset Path</button>
            </div>
            
            {isLoadingPath && (
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#262626]/40 animate-pulse py-10">Architecting your path...</div>
            )}

            <div className="space-y-6">
                {enrichedModules.map((m, i) => (
                    <div key={i} className="group">
                      <button 
                        onClick={() => setSelectedModule(m)} 
                        disabled={m.status === 'locked'}
                        className={`w-full text-left py-10 px-6 border border-[#262626]/10 rounded-[2.5rem] transition-all flex flex-col justify-between overflow-hidden relative ${m.status === 'locked' ? 'opacity-20 grayscale pointer-events-none' : 'hover:border-[#262626]/30 hover:bg-black/[0.01]'}`}
                      >
                          <div className="flex justify-between items-start mb-6">
                              <div>
                                  <span className="text-[8px] font-bold uppercase tracking-widest mb-2 block text-[#262626]/60 heading-font">
                                    Phase {i+1} — {m.status === 'completed' ? 'Mastered' : m.status}
                                  </span>
                                  <h3 className="text-4xl font-light text-[#262626] leading-tight">{m.title}</h3>
                              </div>
                              {m.status === 'locked' && (
                                <span className="text-[10px] text-[#262626]/20">Locked</span>
                              )}
                              {m.status === 'completed' && (
                                <span className="text-[10px] text-[#00FF41] font-bold uppercase tracking-widest heading-font">✓</span>
                              )}
                          </div>
                          
                          <div className="flex justify-between items-end">
                            <span className="text-[10px] italic text-[#262626]/40 font-light">{m.description.slice(0, 60)}...</span>
                            <span className="text-[8px] font-bold uppercase tracking-widest text-[#262626]/60 heading-font">
                              {m.completedCount}/{m.totalCount} Lessons
                            </span>
                          </div>

                          {/* Progress bar line at bottom */}
                          <div className="absolute bottom-0 left-0 h-[2px] bg-[#00FF41]/10 w-full">
                            <div 
                              className="h-full bg-[#00FF41] transition-all duration-1000 ease-out" 
                              style={{ width: `${m.progress}%` }} 
                            />
                          </div>
                      </button>
                    </div>
                ))}
            </div>
        </div>

        <AICoach />

        {selectedModule && (
            <div className="fixed inset-0 z-[110] bg-[#FDFCF0] overflow-y-auto px-6 py-12 animate-fade-in">
                <div className="max-w-xl mx-auto">
                    <button onClick={() => setSelectedModule(null)} className="text-[#262626]/70 text-[10px] font-bold uppercase tracking-widest mb-12 heading-font group">
                      <span className="group-hover:pr-2 transition-all">←</span> Back to Dashboard
                    </button>
                    <header className="mb-16">
                      <span className="text-[8px] font-bold uppercase tracking-widest text-[#262626]/40 mb-2 block heading-font">Detailed Phase Architecture</span>
                      <h2 className="text-5xl font-light mb-4 text-[#262626] leading-tight">{selectedModule.title}</h2>
                      <p className="text-xl text-[#262626]/70 italic font-light leading-relaxed">{selectedModule.description}</p>
                    </header>
                    
                    <div className="space-y-4">
                        {(selectedModule.content || []).map((l, i) => (
                            <button key={i} onClick={() => setSelectedLesson(l)} className="w-full text-left p-8 border border-[#262626]/10 rounded-[2rem] flex justify-between items-center group hover:border-[#262626]/30 transition-all bg-white/5">
                                <div className="flex-grow">
                                    <div className="flex items-center gap-4">
                                        <h4 className={`text-2xl font-light transition-all ${completedLessonIds.includes(l.id) ? 'text-[#262626]/30 line-through' : 'text-[#262626]'}`}>
                                          {l.title}
                                        </h4>
                                        {completedLessonIds.includes(l.id) && <span className="w-1.5 h-1.5 bg-[#00FF41] rounded-full animate-pulse" />}
                                    </div>
                                    <p className="text-[10px] font-light text-[#262626]/40 mt-1 uppercase tracking-widest">{l.type} — {l.description}</p>
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-[#262626]/20 group-hover:text-[#262626] transition-colors heading-font">Begin</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {selectedLesson && (
            <div className="fixed inset-0 z-[120] bg-[#FDFCF0] overflow-y-auto px-6 py-12 animate-fade-in">
                <div className="max-w-xl mx-auto pb-32">
                    <button onClick={() => setSelectedLesson(null)} className="text-[#262626]/70 text-[10px] font-bold uppercase tracking-widest mb-12 heading-font group">
                      <span className="group-hover:pr-2 transition-all">←</span> Back to Module
                    </button>
                    
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#262626]/40 mb-2 block heading-font">{selectedLesson.type}</span>
                    <h2 className="text-5xl font-light mb-12 text-[#262626] leading-tight">{selectedLesson.title}</h2>
                    
                    <div className="prose prose-stone prose-xl max-w-none text-[#262626] leading-relaxed font-light mb-24">
                        <Markdown>{selectedLesson.longContent}</Markdown>
                    </div>
                    
                    {!completedLessonIds.includes(selectedLesson.id) ? (
                        <button 
                            onClick={() => handleCompleteLesson(selectedLesson.id)} 
                            className="w-full py-6 bg-[#262626] text-white font-bold rounded-full uppercase text-xs tracking-[0.3em] hover:opacity-90 transition-all shadow-xl heading-font"
                        >
                            Mark as Internalized
                        </button>
                    ) : (
                      <div className="text-center">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#00FF41] heading-font">This Lesson is Embodied</span>
                      </div>
                    )}
                </div>
            </div>
        )}
    </div>
  );
};

export default Dashboard;
