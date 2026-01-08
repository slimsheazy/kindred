
import React, { useEffect, useState, useRef, useMemo } from 'react';
import DailyPrompt from '../components/DailyPrompt';
import AICoach from '../components/AICoach';
import { UserData, CourseModule, Lesson, BondScore, View } from '../types';
import { generateLearningPath, generateModuleContent, getExerciseInterpretation } from '../services/geminiService';
import { cloudService } from '../services/cloudService';
import Markdown from 'react-markdown';
import { GoogleGenAI, Modality } from "@google/genai";

interface DashboardProps {
  userData: UserData | null;
  onNavigate?: (view: View) => void;
}

const decodeAudioData = async (data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> => {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
  }
  return buffer;
};

const decodeBase64 = (base64: string) => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
};

const BondMap: React.FC<{ scores: BondScore[] }> = ({ scores }) => {
    const categories = ['Communication', 'Intimacy', 'Trust', 'Conflict', 'Shared Vision'];
    const chartData = useMemo(() => categories.map(cat => {
        const catScores = scores.filter(s => s.category === cat);
        return catScores.length > 0 ? catScores[catScores.length - 1].score : 0;
    }), [scores]);

    const size = 240;
    const center = size / 2;
    const radius = size * 0.35;
    const points = chartData.map((val, i) => {
        const angle = (i * 2 * Math.PI) / categories.length - Math.PI / 2;
        const r = (val / 10) * radius;
        return { x: center + r * Math.cos(angle), y: center + r * Math.sin(angle), labelX: center + (radius + 30) * Math.cos(angle), labelY: center + (radius + 30) * Math.sin(angle) };
    });

    const polygonPath = points.map(p => `${p.x},${p.y}`).join(' ');
    const hasNoData = chartData.every(v => v === 0);

    return (
        <div className="py-12 border-y border-[#262626]/10 flex flex-col items-center">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#262626]/70 mb-8 heading-font">Bond Equilibrium</h3>
            <svg width={size} height={size} className="overflow-visible">
                {categories.map((_, i) => {
                    const angle = (i * 2 * Math.PI) / categories.length - Math.PI / 2;
                    return <line key={i} x1={center} y1={center} x2={center + radius * Math.cos(angle)} y2={center + radius * Math.sin(angle)} stroke="#262626" strokeWidth="0.5" strokeOpacity="0.2" />;
                })}
                {!hasNoData && <polygon points={polygonPath} fill="#00FF41" fillOpacity="0.15" stroke="#00FF41" strokeWidth="1.5" />}
                {points.map((p, i) => (
                    <text key={i} x={p.labelX} y={p.labelY} fontSize="7" fontWeight="700" textAnchor="middle" className="fill-[#262626]/70 uppercase tracking-widest heading-font">{categories[i]}</text>
                ))}
            </svg>
        </div>
    );
};

const ScoreItem: React.FC<{ children?: React.ReactNode, value: number, onChange: (val: number) => void }> = ({ children, value, onChange }) => (
    <div className="py-6 border-b border-[#262626]/10">
        <div className="text-[#262626] text-lg font-medium mb-4">{children}</div>
        <div className="flex items-center gap-6">
            <input type="range" min="0" max="10" step="1" value={value} onChange={(e) => onChange(parseInt(e.target.value))} className="flex-grow" />
            <span className="text-xl font-bold w-6 text-center text-[#262626]">{value}</span>
        </div>
    </div>
);

const LessonView: React.FC<{ lesson: Lesson, onClose: () => void, onComplete: (scores?: Record<string, number>) => void }> = ({ lesson, onClose, onComplete }) => {
    const [scores, setScores] = useState<Record<string, number>>({});
    const [interpretation, setInterpretation] = useState('');
    const [isInterpreting, setIsInterpreting] = useState(false);

    return (
        <div className="fixed inset-0 z-[120] bg-[#FDFCF0] overflow-y-auto px-6 py-12 animate-fade-in">
             <button onClick={onClose} className="text-[#262626]/70 text-[10px] font-bold uppercase tracking-widest mb-12 heading-font">← Back</button>
             <div className="max-w-xl mx-auto">
                <h1 className="text-5xl font-light mb-8 leading-tight text-[#262626]">{lesson.title}</h1>
                <p className="text-xl text-[#262626]/70 mb-12 italic">{lesson.description}</p>
                <div className="lesson-content">
                    <Markdown components={{
                        li: ({children}) => lesson.type === 'Exercise' ? 
                            <ScoreItem value={scores[children?.toString() || ''] || 0} onChange={(v) => setScores(s => ({...s, [children?.toString() || '']: v}))}>{children}</ScoreItem> : 
                            <div className="py-4 border-b border-[#262626]/10 text-lg text-[#262626]">{children}</div>
                    }}>{lesson.longContent}</Markdown>
                </div>
                {lesson.type === 'Exercise' && !interpretation && (
                    <button onClick={async () => { setIsInterpreting(true); setInterpretation(await getExerciseInterpretation(lesson.title, scores, lesson.description)); setIsInterpreting(false); }} className="w-full mt-12 py-5 border border-[#262626] text-[#262626] font-bold rounded-full uppercase text-xs tracking-widest">
                        {isInterpreting ? 'Analyzing...' : 'Synthesize Insights'}
                    </button>
                )}
                {interpretation && <div className="mt-12 p-8 border border-[#262626]/20 rounded-3xl bg-[#262626]/5 text-[#262626]"><Markdown>{interpretation}</Markdown></div>}
                <button onClick={() => onComplete(scores)} className="w-full mt-12 py-5 bg-[#262626] text-white font-bold rounded-full uppercase text-xs tracking-widest">Finish Session</button>
             </div>
        </div>
    );
};

const Dashboard: React.FC<DashboardProps> = ({ userData, onNavigate }) => {
  const [courseModules, setCourseModules] = useState<CourseModule[]>([]);
  const [bondScores, setBondScores] = useState<BondScore[]>([]);
  const [selectedModule, setSelectedModule] = useState<CourseModule | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('bonds_learning_path');
    if (saved) setCourseModules(JSON.parse(saved));
    else generateLearningPath().then(path => { setCourseModules(path); localStorage.setItem('bonds_learning_path', JSON.stringify(path)); });
    cloudService.getBondScores(userData?.partnerCode || 'default').then(setBondScores);
  }, [userData]);

  return (
    <div className="px-6 py-12 max-w-xl mx-auto">
        <header className="mb-16">
            <h1 className="text-6xl font-light mb-2 text-[#262626]">{userData?.userName ? `Hello, ${userData.userName}.` : 'Embrace Connection.'}</h1>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#262626]/70 heading-font">With {userData?.partnerName}</p>
        </header>

        <DailyPrompt />
        <BondMap scores={bondScores} />

        <div className="py-16">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#262626]/70 mb-8 heading-font">Growth Architecture</h2>
            <div className="space-y-2">
                {courseModules.map((m, i) => (
                    <button key={i} onClick={() => setSelectedModule(m)} className={`w-full text-left py-10 flex justify-between items-end border-b border-[#262626]/10 group transition-opacity ${m.status === 'locked' ? 'opacity-30 pointer-events-none' : 'hover:opacity-70'}`}>
                        <div>
                            <span className="text-[8px] font-bold uppercase tracking-widest mb-2 block text-[#262626]/60 heading-font">Phase {i+1} — {m.status}</span>
                            <h3 className="text-4xl font-light text-[#262626]">{m.title}</h3>
                        </div>
                        <span className="text-xs mb-1 font-bold heading-font text-[#262626] opacity-0 group-hover:opacity-100 transition-opacity">Explore</span>
                    </button>
                ))}
            </div>
        </div>

        <button onClick={() => onNavigate && onNavigate(View.Mediation)} className="w-full py-20 border border-[#262626]/20 hover:border-[#262626]/50 transition-all text-center rounded-[3rem] mb-16 group">
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#262626]/60 group-hover:text-[#262626] transition-colors heading-font">Enter Mediation Mode</span>
        </button>

        <AICoach />

        {selectedModule && (
            <div className="fixed inset-0 z-[110] bg-[#FDFCF0] overflow-y-auto px-6 py-12">
                <button onClick={() => setSelectedModule(null)} className="text-[#262626]/70 text-[10px] font-bold uppercase tracking-widest mb-12 heading-font">← Back</button>
                <div className="max-w-xl mx-auto">
                    <h2 className="text-5xl font-light mb-4 text-[#262626]">{selectedModule.title}</h2>
                    <p className="text-xl text-[#262626]/70 mb-16 italic">{selectedModule.description}</p>
                    <div className="space-y-2">
                        {(selectedModule.content || []).map((l, i) => (
                            <button key={i} onClick={() => {}} className="w-full text-left py-8 border-b border-[#262626]/10 flex justify-between items-center group">
                                <h4 className="text-2xl font-light text-[#262626] group-hover:pl-4 transition-all">{l.title}</h4>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-[#262626]/40">{l.type}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default Dashboard;
