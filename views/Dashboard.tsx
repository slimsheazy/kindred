
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
  const [selectedModule, setSelectedModule] = useState<CourseModule | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [isLoadingPath, setIsLoadingPath] = useState(false);
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([]);
  const [activeActivity, setActiveActivity] = useState<Activity | null>(null);
  const [isPartnerActive, setIsPartnerActive] = useState(false);

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
    };

    initializeDashboard();
    
    // Simulate/Check for partner activity via Supabase would go here
    const checkPartnerStatus = async () => {
        // In a real app, you'd check a 'presence' or 'last_seen' field in profiles
        setIsPartnerActive(Math.random() > 0.5); 
    };
    checkPartnerStatus();

  }, [userData]);

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

  return (
    <div className="px-6 py-12 max-w-xl mx-auto">
        <header className="mb-16 flex justify-between items-start">
            <div>
              <h1 className="text-6xl font-light mb-2 text-[#262626]">{userData?.userName ? `Hello, ${userData.userName}.` : 'Kindred.'}</h1>
              <div className="flex items-center gap-3">
                 <div className={`w-1.5 h-1.5 rounded-full ${isPartnerActive ? 'bg-[#00FF41] animate-pulse' : 'bg-black/10'}`} />
                 <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#262626]/70 heading-font">
                   {userData?.partnerName} {isPartnerActive ? 'is present' : 'is away'}
                 </p>
              </div>
            </div>
        </header>

        {activeActivity && (
          <div className="mb-12 p-8 bg-[#00FF41]/5 border border-[#00FF41]/10 rounded-[2rem] animate-fade-in relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4">
                  <span className="text-[8px] font-bold uppercase tracking-widest text-[#00FF41] animate-pulse">Live Action</span>
              </div>
              <h3 className="text-2xl font-light mb-2 text-[#262626]">{activeActivity.title}</h3>
              <p className="text-sm text-[#262626]/60 mb-6 font-light">{activeActivity.description}</p>
              <button onClick={() => onNavigate && onNavigate(View.Activities)} className="text-[8px] font-bold uppercase tracking-widest bg-black text-white px-6 py-3 rounded-full">Continue Journey</button>
          </div>
        )}

        <DailyPrompt />
        <BondMap scores={bondScores} />

        <div className="grid grid-cols-2 gap-4 mb-16">
            <button onClick={() => onNavigate && onNavigate(View.Mediation)} className="py-12 border border-[#262626]/10 rounded-[2rem] group bg-white/5">
                <span className="text-[8px] font-bold uppercase tracking-[0.3em] text-[#262626]/60 group-hover:text-[#262626] transition-colors heading-font block mb-1">Mediation</span>
                <span className="text-xs font-light italic text-[#262626]/50">Neutral Space</span>
            </button>
            <button onClick={() => onNavigate && onNavigate(View.EsotericLens)} className="py-12 border border-[#262626]/10 rounded-[2rem] group bg-white/5">
                <span className="text-[8px] font-bold uppercase tracking-[0.3em] text-[#262626]/60 group-hover:text-[#262626] transition-colors heading-font block mb-1">Esoteric Lens</span>
                <span className="text-xs font-light italic text-[#262626]/50">Synchronicity</span>
            </button>
        </div>

        <div className="py-16">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#262626]/70 heading-font mb-12">Shared Evolution</h2>
            <div className="space-y-6">
                {enrichedModules.map((m, i) => (
                    <button key={i} onClick={() => setSelectedModule(m)} disabled={m.status === 'locked'} className={`w-full text-left py-10 px-6 border border-[#262626]/10 rounded-[2.5rem] relative ${m.status === 'locked' ? 'opacity-20 grayscale' : 'hover:border-[#262626]/30'}`}>
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
                            <div className="h-full bg-[#00FF41]" style={{ width: `${m.progress}%` }} />
                        </div>
                    </button>
                ))}
            </div>
        </div>

        <AICoach />
    </div>
  );
};

export default Dashboard;
