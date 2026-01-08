
import React, { useEffect, useState, useRef, useMemo } from 'react';
import DailyPrompt from '../components/DailyPrompt';
import AICoach from '../components/AICoach';
import { UserData, CourseModule, Lesson, BondScore, View } from '../types';
import { generateLearningPath, generateModuleContent, getExerciseInterpretation } from '../services/geminiService';
import { cloudService } from '../services/cloudService';
import Markdown from 'react-markdown';
import { BookOpenIcon, PuzzleIcon, SparklesIcon, BrainIcon, ScaleIcon } from '../components/Icons';
import { GoogleGenAI, Modality } from "@google/genai";

interface DashboardProps {
  userData: UserData | null;
  onNavigate?: (view: View) => void;
}

// Audio helper for TTS
const decodeAudioData = async (data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> => {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
};

const decodeBase64 = (base64: string) => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
};

/**
 * Visual Radar Chart for Bond Metrics
 */
const BondMap: React.FC<{ scores: BondScore[] }> = ({ scores }) => {
    const categories = ['Communication', 'Intimacy', 'Trust', 'Conflict', 'Shared Vision'];
    const chartData = useMemo(() => {
        return categories.map(cat => {
            const catScores = scores.filter(s => s.category === cat);
            const latest = catScores.length > 0 ? catScores[catScores.length - 1].score : 0; 
            return latest;
        });
    }, [scores]);

    const size = 200;
    const center = size / 2;
    const radius = size * 0.35;

    const points = chartData.map((val, i) => {
        const angle = (i * 2 * Math.PI) / categories.length - Math.PI / 2;
        const r = (val / 10) * radius;
        return {
            x: center + r * Math.cos(angle),
            y: center + r * Math.sin(angle),
            labelX: center + (radius + 20) * Math.cos(angle),
            labelY: center + (radius + 20) * Math.sin(angle),
        };
    });

    const polygonPath = points.map(p => `${p.x},${p.y}`).join(' ');
    const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0].map(level => {
        return categories.map((_, i) => {
            const angle = (i * 2 * Math.PI) / categories.length - Math.PI / 2;
            const r = level * radius;
            return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
        }).join(' ');
    });

    const hasNoData = chartData.every(v => v === 0);

    return (
        <div className="glass-panel rounded-3xl p-6 shadow-2xl border-white/10 relative overflow-hidden bg-white/5">
            <div className="flex items-center gap-2 mb-2">
                <BrainIcon className="w-5 h-5 text-rose-400" />
                <h3 className="text-sm font-semibold tracking-wide text-white/80 heading-font">Bond Map</h3>
            </div>
            
            <div className="flex justify-center items-center py-2">
                <svg width={size} height={size} className="overflow-visible">
                    {gridLevels.map((path, i) => (
                        <polygon key={i} points={path} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                    ))}
                    {categories.map((_, i) => {
                        const angle = (i * 2 * Math.PI) / categories.length - Math.PI / 2;
                        return (
                            <line 
                                key={i}
                                x1={center} y1={center} 
                                x2={center + radius * Math.cos(angle)} y2={center + radius * Math.sin(angle)} 
                                stroke="rgba(255,255,255,0.05)" strokeWidth="1" 
                            />
                        );
                    })}
                    {!hasNoData && (
                        <polygon 
                            points={polygonPath} 
                            fill="rgba(244, 63, 94, 0.2)" 
                            stroke="rgba(244, 63, 94, 0.6)" 
                            strokeWidth="2"
                            className="transition-all duration-1000 ease-out"
                        />
                    )}
                    {points.map((p, i) => (
                        <text 
                            key={i} 
                            x={p.labelX} y={p.labelY} 
                            fontSize="8" 
                            fontWeight="bold"
                            textAnchor="middle" 
                            alignmentBaseline="middle"
                            className="fill-white/30 uppercase tracking-tighter"
                        >
                            {categories[i]}
                        </text>
                    ))}
                    {!hasNoData && points.map((p, i) => (
                        <circle key={i} cx={p.x} cy={p.y} r="3" fill="rgba(244, 63, 94, 0.8)" />
                    ))}
                    {hasNoData && (
                        <text x={center} y={center} fontSize="10" textAnchor="middle" className="fill-white/20 italic">No activity data</text>
                    )}
                </svg>
            </div>
        </div>
    );
};

/**
 * Interactive Scoring and List Components
 */
const getScorePreview = (value: number) => {
  if (value === 0) return "Never or not at all";
  if (value === 1) return "I rarely feel this way";
  if (value === 2) return "I occasionally feel this way";
  if (value === 3) return "I feel this way sometimes";
  if (value === 4) return "This resonates somewhat";
  if (value === 5) return "This resonates moderately";
  if (value === 6) return "This feels mostly true";
  if (value === 7) return "This resonates quite often";
  if (value === 8) return "This is a frequent experience";
  if (value === 9) return "This highly resonates with me";
  if (value === 10) return "This completely defines us";
  return "";
};

const ScoreItem: React.FC<{ children?: React.ReactNode, value: number, onChange: (val: number) => void }> = ({ children, value, onChange }) => (
    <li className="flex flex-col gap-4 p-6 rounded-2xl bg-white/5 border border-white/10 mb-6 group hover:bg-white/10 transition-all cursor-pointer" onClick={() => onChange(Math.min(10, value + 1))}>
        <div className="text-white text-lg leading-relaxed font-semibold">{children}</div>
        
        <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/30 heading-font">Reflection Level</span>
                <span className="text-sm font-medium text-rose-300 transition-all duration-200" key={value}>
                    {getScorePreview(value)}
                </span>
            </div>
            
            <div className="flex items-center gap-6">
                <input 
                  type="range" 
                  min="0" max="10" step="1" 
                  value={value} 
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => onChange(parseInt(e.target.value))} 
                  className="flex-grow h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-rose-400" 
                />
                <div className="w-14 h-12 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-300 font-bold text-xl shadow-inner transition-transform active:scale-95">
                    {value}
                </div>
            </div>
        </div>
    </li>
);

const InteractiveListItem: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
    const [checked, setChecked] = useState(false);
    return (
        <li 
          onClick={() => setChecked(!checked)}
          className={`flex items-start gap-4 p-5 rounded-xl transition-all cursor-pointer mb-3 border ${
            checked ? 'bg-teal-500/10 border-teal-500/30' : 'bg-white/5 border-white/5 hover:bg-white/10'
          }`}
        >
            <div className={`mt-1.5 w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                checked ? 'bg-teal-500 border-teal-500 scale-110' : 'border-white/30'
            }`}>
                {checked && (
                    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                )}
            </div>
            <div className={`text-lg transition-opacity duration-300 ${checked ? 'line-through text-white/40' : 'text-white'}`}>
                {children}
            </div>
        </li>
    );
};

const LessonView: React.FC<{ lesson: Lesson, userData: UserData | null, onClose: () => void, onComplete: (scores?: Record<string, number>) => void }> = ({ lesson, userData, onClose, onComplete }) => {
    const [scores, setScores] = useState<Record<string, number>>({});
    const [interpretation, setInterpretation] = useState('');
    const [isInterpreting, setIsInterpreting] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const audioRef = useRef<AudioBufferSourceNode | null>(null);

    const handleReadAloud = async () => {
        if (isSpeaking) {
            setIsSpeaking(false);
            if (audioRef.current) audioRef.current.stop();
            return;
        }

        setIsSpeaking(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `Read the following relationship lesson content aloud in a calm, soothing, and supportive tone. 
            Content: ${lesson.title}. ${lesson.description}. ${lesson.longContent}`;
            
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text: prompt }] }],
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
                    },
                },
            });

            const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
                const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
                const audioBuffer = await decodeAudioData(decodeBase64(base64Audio), ctx, 24000, 1);
                const source = ctx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(ctx.destination);
                source.onended = () => setIsSpeaking(false);
                audioRef.current = source;
                source.start();
            } else {
                setIsSpeaking(false);
            }
        } catch (e) {
            console.error("TTS failed", e);
            setIsSpeaking(false);
        }
    };

    const handleInterpretation = async () => {
        setIsInterpreting(true);
        const res = await getExerciseInterpretation(lesson.title, scores, lesson.description);
        setInterpretation(res);
        setIsInterpreting(false);
    };

    return (
        <div className="fixed inset-0 z-[120] flex flex-col bg-[#110d12] animate-fade-in overflow-y-auto">
             <div className="flex-none px-6 py-4 flex justify-between items-center bg-[#110d12]/95 backdrop-blur-xl border-b border-white/10 sticky top-0 z-10">
                <button onClick={onClose} className="text-white hover:text-white/80 flex items-center gap-2 text-sm font-semibold tracking-wide heading-font">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                    </svg>
                    Back
                </button>
                <div className="flex gap-3">
                    <button 
                      onClick={handleReadAloud} 
                      className={`p-2 rounded-full transition-all ${isSpeaking ? 'bg-rose-500 text-white animate-pulse' : 'bg-white/10 text-white hover:bg-white/20'}`}
                      title="Read Aloud"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                        </svg>
                    </button>
                    <div className="text-[10px] font-bold uppercase px-4 py-1.5 rounded-full bg-rose-500/20 text-rose-200 border border-rose-500/30 heading-font">{lesson.type}</div>
                </div>
             </div>

             <div className="max-w-2xl mx-auto px-6 py-12 lesson-content">
                <h1 className="text-4xl md:text-5xl font-medium text-white mb-6 leading-tight">{lesson.title}</h1>
                <p className="text-xl text-rose-200/80 mb-12 italic font-light">{lesson.description}</p>
                
                <div className="space-y-8">
                    <Markdown components={{
                        h1: ({node, ...props}) => <h1 className="text-3xl font-medium text-rose-300 mt-12 mb-6" {...props} />,
                        h2: ({node, ...props}) => <h2 className="text-2xl font-medium text-teal-300 mt-10 mb-5" {...props} />,
                        p: ({node, ...props}) => <p className="text-xl text-white leading-relaxed mb-8" {...props} />,
                        li: ({node, index, children, ...props}) => lesson.type === 'Exercise' ? 
                            <ScoreItem 
                                value={scores[children?.toString().substring(0,30) || 'item'] || 0} 
                                onChange={(val) => setScores(s => ({...s, [children?.toString().substring(0,30) || 'item']: val}))}
                            >
                                {children}
                            </ScoreItem> : 
                            <InteractiveListItem {...props}>{children}</InteractiveListItem>
                    }}>{lesson.longContent}</Markdown>
                </div>

                {lesson.type === 'Exercise' && !interpretation && (
                    <button 
                        onClick={handleInterpretation} 
                        disabled={isInterpreting} 
                        className="w-full mt-16 bg-rose-500 hover:bg-rose-400 text-white font-bold py-6 rounded-3xl shadow-2xl transition-all active:scale-95 heading-font text-lg tracking-wide"
                    >
                        {isInterpreting ? (
                            <span className="flex items-center justify-center gap-2">
                                <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                                Analyzing results...
                            </span>
                        ) : 'Get Interpretation'}
                    </button>
                )}

                {interpretation && (
                    <div className="mt-16 p-8 bg-white/5 border border-white/10 rounded-3xl animate-fade-in-up">
                        <h3 className="text-rose-400 font-semibold tracking-widest text-sm mb-6 heading-font uppercase">AI Synthesis</h3>
                        <Markdown className="prose prose-invert prose-rose max-w-none">{interpretation}</Markdown>
                    </div>
                )}

                {(lesson.type !== 'Exercise' || interpretation) && (
                    <button 
                        onClick={() => onComplete(scores)} 
                        className="w-full mt-12 bg-white text-slate-900 font-bold py-6 rounded-3xl shadow-2xl hover:bg-slate-100 transition-all active:scale-95 heading-font text-lg tracking-wide"
                    >
                        Complete Session
                    </button>
                )}
             </div>
        </div>
    );
};

const ModuleDetailView: React.FC<{ module: CourseModule, userData: UserData | null, onClose: () => void, onUpdateModule: (updated: CourseModule) => void, onScoreUpdate: () => void }> = ({ module, userData, onClose, onUpdateModule, onScoreUpdate }) => {
    const [lessons, setLessons] = useState<Lesson[]>(module.content || []);
    const [loading, setLoading] = useState(!module.content);
    const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);

    useEffect(() => {
        if (!module.content) {
            generateModuleContent(module.title).then(data => { setLessons(data); setLoading(false); onUpdateModule({...module, content: data}); });
        }
    }, [module]);

    const handleComplete = async (lesson: Lesson, scores?: Record<string, number>) => {
        const updated = lessons.map(l => l.title === lesson.title ? {...l, isCompleted: true} : l);
        setLessons(updated);
        setActiveLesson(null);
        if (scores && userData) {
            const categories = ['Communication', 'Intimacy', 'Trust', 'Conflict', 'Shared Vision'];
            const avg = Object.values(scores).length > 0 ? Object.values(scores).reduce((a,b)=>a+b,0) / Object.values(scores).length : 5;
            const score: BondScore = { category: categories[Math.floor(Math.random()*5)], score: Math.round(avg), timestamp: Date.now() };
            await cloudService.saveBondScore(userData.partnerCode || 'default', score);
            onScoreUpdate();
        }
        onUpdateModule({...module, content: updated, status: updated.every(l => l.isCompleted) ? 'completed' : module.status});
    };

    return (
        <div className="fixed inset-0 z-[110] bg-[#1a1618] overflow-y-auto p-6 md:p-12 animate-fade-in">
            {activeLesson && <LessonView lesson={activeLesson} userData={userData} onClose={()=>setActiveLesson(null)} onComplete={(s)=>handleComplete(activeLesson, s)} />}
            
            <button onClick={onClose} className="text-white/50 mb-10 flex items-center gap-2 hover:text-white transition-colors heading-font tracking-widest text-xs uppercase">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
                Dashboard
            </button>

            <div className="max-w-xl mx-auto">
                <div className="mb-12">
                    <h2 className="text-5xl font-light text-white mb-4 leading-tight">{module.title}</h2>
                    <p className="text-xl text-white/50 font-light">{module.description}</p>
                </div>

                {loading ? (
                    <div className="space-y-6">
                        {[1,2,3].map(i=><div key={i} className="h-28 bg-white/5 rounded-3xl animate-pulse"/>)}
                    </div>
                ) : (
                    <div className="space-y-4">
                        <h3 className="text-xs font-semibold text-rose-400 uppercase tracking-widest mb-4 heading-font">Session List</h3>
                        {lessons.map((l, i) => (
                            <button 
                                key={i} 
                                onClick={()=>setActiveLesson(l)} 
                                className="w-full text-left glass-panel p-6 rounded-3xl border border-white/10 flex justify-between items-center group hover:bg-white/10 transition-all hover:translate-x-1"
                            >
                                <div className="flex items-center gap-5">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${l.isCompleted ? 'bg-teal-500/20 border-teal-500/40' : 'bg-white/5 border-white/10'}`}>
                                        {l.isCompleted ? (
                                            <svg className="w-6 h-6 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                            </svg>
                                        ) : (
                                            <span className="text-white/30 font-bold heading-font">{i+1}</span>
                                        )}
                                    </div>
                                    <div>
                                        <h4 className={`text-xl font-medium ${l.isCompleted ? 'text-white/30 line-through' : 'text-white'}`}>{l.title}</h4>
                                        <p className="text-xs tracking-widest text-rose-400/80 font-semibold heading-font uppercase">{l.type}</p>
                                    </div>
                                </div>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-white/20 group-hover:text-white transition-colors">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                                </svg>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const Dashboard: React.FC<DashboardProps> = ({ userData, onNavigate }) => {
  const [courseModules, setCourseModules] = useState<CourseModule[]>([]);
  const [bondScores, setBondScores] = useState<BondScore[]>([]);
  const [loadingPath, setLoadingPath] = useState(false);
  const [selectedModule, setSelectedModule] = useState<CourseModule | null>(null);

  const fetchScores = async () => {
    if (userData) {
        const scores = await cloudService.getBondScores(userData.partnerCode || 'default');
        setBondScores(scores);
    }
  };

  useEffect(() => {
    const savedPath = localStorage.getItem('bonds_learning_path');
    if (savedPath) {
        setCourseModules(JSON.parse(savedPath));
    } else if (userData) {
        setLoadingPath(true);
        generateLearningPath().then(path => {
            setCourseModules(path);
            localStorage.setItem('bonds_learning_path', JSON.stringify(path));
            setLoadingPath(false);
        });
    }
    fetchScores();
  }, [userData]);

  const updateModule = (updated: CourseModule) => {
      const newModules = courseModules.map(m => m.title === updated.title ? updated : m);
      setCourseModules(newModules);
      localStorage.setItem('bonds_learning_path', JSON.stringify(newModules));
  };

  return (
    <div className="p-2 md:p-4 pb-20 transition-opacity duration-300">
        {selectedModule && <ModuleDetailView module={selectedModule} userData={userData} onClose={()=>setSelectedModule(null)} onUpdateModule={updateModule} onScoreUpdate={fetchScores} />}
        
        <header className="mb-10 mt-6 text-center animate-fade-in">
            <h1 className="text-5xl md:text-6xl font-light text-white tracking-tight mb-2">
            {userData ? `Hi, ${userData.userName}.` : 'Ready to Connect?'}
            </h1>
            {userData && <p className="text-rose-400 text-sm font-semibold tracking-widest heading-font uppercase">Partner Portal: {userData.partnerName}</p>}
        </header>
        
        <div className="animate-fade-in-up max-w-xl mx-auto space-y-6" style={{animationDelay: '0.1s'}}>
            <DailyPrompt />

            <button 
                onClick={() => onNavigate && onNavigate(View.Mediation)} 
                className="w-full glass-panel rounded-[2rem] p-6 shadow-2xl border-white/5 relative overflow-hidden bg-gradient-to-br from-rose-500/10 to-indigo-500/10 text-left group hover:scale-[1.02] transition-all"
            >
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-rose-500/20 rounded-2xl flex items-center justify-center border border-rose-500/30 group-hover:bg-rose-500/40 transition-colors">
                        <ScaleIcon className="w-7 h-7 text-rose-300" />
                    </div>
                    <div>
                        <h3 className="text-2xl text-white font-normal tracking-wide heading-font">Conflict Navigator</h3>
                        <p className="text-white/50 text-sm font-light italic">Real-time mediation for heated moments.</p>
                    </div>
                </div>
            </button>

            <BondMap scores={bondScores} />

            {userData && (
                <div className="animate-fade-in-up pt-4" style={{animationDelay: '0.2s'}}>
                    <div className="flex items-center justify-between mb-6 px-2">
                        <h2 className="text-3xl font-light text-white tracking-wide heading-font">Growth Path</h2>
                    </div>
                    
                    <div className="space-y-4">
                        {loadingPath ? (
                            <div className="p-12 text-center text-white/40 animate-pulse bg-white/5 rounded-[2rem]">Designing your journey...</div>
                        ) : (
                            courseModules.map((module, idx) => (
                                <button 
                                    key={idx}
                                    onClick={() => setSelectedModule(module)}
                                    disabled={module.status === 'locked'}
                                    className={`w-full text-left glass-panel p-6 rounded-[2rem] border border-white/5 relative flex items-center gap-6 transition-all duration-300
                                        ${module.status === 'locked' ? 'opacity-40 grayscale cursor-not-allowed' : 'bg-white/5 hover:bg-white/10 cursor-pointer shadow-xl hover:translate-y-[-2px]'}`}
                                >
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xl heading-font shrink-0 shadow-sm transition-colors
                                        ${module.status === 'completed' ? 'bg-teal-500 text-white' : 
                                        module.status === 'active' ? 'bg-rose-500 text-white animate-pulse' : 'bg-white/10 text-white/20'}`}>
                                        {module.status === 'completed' ? '✓' : idx + 1}
                                    </div>
                                    <div className="flex-grow">
                                        <h4 className="text-2xl font-normal text-white leading-tight">{module.title}</h4>
                                        <p className="text-white/50 text-xs font-semibold tracking-widest mt-1 heading-font uppercase">{module.duration} • {module.status}</p>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
            <AICoach />
        </div>
    </div>
  );
};

export default Dashboard;
