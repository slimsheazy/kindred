
import React, { useEffect, useState, useRef } from 'react';
import DailyPrompt from '../components/DailyPrompt';
import AICoach from '../components/AICoach';
import { UserData, CourseModule, Lesson } from '../types';
import { generateLearningPath, generateModuleContent } from '../services/geminiService';
import Markdown from 'react-markdown';
import { BookOpenIcon, PuzzleIcon, SparklesIcon } from '../components/Icons';

interface DashboardProps {
  userData: UserData | null;
}

/**
 * Interactive List Item Component for Markdown
 * Properly handles optional children and catches internal markdown props.
 */
interface CheckableListItemProps {
  children?: React.ReactNode;
  node?: any;
  index?: any;
  ordered?: any;
  siblingCount?: any;
}

const CheckableListItem: React.FC<CheckableListItemProps> = ({ children }) => {
    const [checked, setChecked] = useState(false);
    return (
        <li 
            onClick={() => setChecked(!checked)}
            className={`flex items-start gap-4 p-4 rounded-xl transition-all cursor-pointer group mb-2 border ${
                checked 
                ? 'bg-teal-500/10 border-teal-500/30' 
                : 'bg-white/5 border-transparent hover:bg-white/10 hover:border-white/10'
            }`}
        >
            <div className={`mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                checked 
                ? 'bg-teal-500 border-teal-500 scale-110' 
                : 'border-white/30 group-hover:border-white/60'
            }`}>
                {checked && (
                    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                )}
            </div>
            <div className={`text-base md:text-lg leading-relaxed transition-opacity duration-300 ${checked ? 'line-through text-white/40' : 'text-white/90'}`}>
                {children}
            </div>
        </li>
    );
};

const LessonView: React.FC<{ lesson: Lesson, onClose: () => void, onComplete: () => void }> = ({ lesson, onClose, onComplete }) => {
    const [reflection, setReflection] = useState('');
    const [scrollProgress, setScrollProgress] = useState(0);
    const contentRef = useRef<HTMLDivElement>(null);

    const handleScroll = () => {
        if (contentRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
            const progress = (scrollTop / (scrollHeight - clientHeight)) * 100;
            setScrollProgress(progress);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex flex-col bg-[#1a1618] animate-fade-in">
             <div className="h-1 w-full bg-white/10 fixed top-0 left-0 z-[70]">
                 <div className="h-full bg-teal-500 transition-all duration-150" style={{ width: `${scrollProgress}%` }}></div>
             </div>

             <div className="flex-none px-6 py-4 flex justify-between items-center bg-[#1a1618]/80 backdrop-blur-xl border-b border-white/10 z-[60]">
                <button 
                    onClick={onClose}
                    className="text-white/80 hover:text-white flex items-center gap-2 text-sm font-bold tracking-wide transition-colors"
                >
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                        </svg>
                    </div>
                    Back
                </button>
                <div className={`text-[10px] font-bold uppercase px-3 py-1.5 rounded-full tracking-wider shadow-sm ${
                    lesson.type === 'Reading' ? 'bg-blue-500/20 text-blue-200 border border-blue-500/20' :
                    lesson.type === 'Exercise' ? 'bg-orange-500/20 text-orange-200 border border-orange-500/20' :
                    'bg-purple-500/20 text-purple-200 border border-purple-500/20'
                }`}>
                    {lesson.type}
                </div>
             </div>

             <div 
                ref={contentRef}
                onScroll={handleScroll}
                className="flex-grow overflow-y-auto"
             >
                 <div className="max-w-2xl mx-auto px-6 py-10 md:py-16">
                    <div className="mb-12 border-b border-white/10 pb-8">
                         <h1 className="text-3xl md:text-5xl font-light text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70 mb-4 leading-tight">
                            {lesson.title}
                        </h1>
                        <p className="text-lg text-white/50 font-light leading-relaxed">
                            {lesson.description}
                        </p>
                    </div>
                    
                    <div className="space-y-6">
                        <Markdown
                            components={{
                                h1: ({node, ...props}) => <h1 className="text-2xl font-medium text-rose-200 mt-10 mb-4" {...props} />,
                                h2: ({node, ...props}) => <h2 className="text-xl font-medium text-teal-200 mt-10 mb-4 border-l-2 border-teal-500/50 pl-4" {...props} />,
                                h3: ({node, ...props}) => <h3 className="text-lg font-bold text-white mt-8 mb-3" {...props} />,
                                p: ({node, ...props}) => <p className="text-lg text-white/80 leading-relaxed mb-6 font-light" {...props} />,
                                ul: ({node, ...props}) => <ul className="space-y-2 mb-8" {...props} />,
                                ol: ({node, ...props}) => <ol className="list-decimal pl-5 space-y-2 mb-8 text-white/80" {...props} />,
                                li: ({node, ...props}) => <CheckableListItem {...props} />, 
                                blockquote: ({node, ...props}) => (
                                    <blockquote className="border-l-4 border-rose-400/50 bg-rose-900/10 p-6 rounded-r-xl italic text-rose-100 my-8">
                                        {props.children}
                                    </blockquote>
                                ),
                                strong: ({node, ...props}) => <strong className="font-bold text-white" {...props} />,
                            }}
                        >
                            {lesson.longContent}
                        </Markdown>
                    </div>

                    <div className="mt-16 bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 backdrop-blur-sm">
                        <div className="flex items-center gap-3 mb-4 text-teal-300">
                             <span className="w-5 h-5 flex items-center justify-center">✨</span>
                             <h3 className="text-lg font-bold">Your Reflection</h3>
                        </div>
                        <p className="text-white/60 text-sm mb-4">Take a moment to write down one key takeaway or intention from this session.</p>
                        <textarea 
                            value={reflection}
                            onChange={(e) => setReflection(e.target.value)}
                            placeholder="I noticed that..."
                            className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-white placeholder-white/20 min-h-[120px] focus:outline-none focus:ring-1 focus:ring-teal-500/50 transition-all resize-none"
                        />
                    </div>

                    <div className="mt-10 flex justify-center pb-20">
                        <button 
                            onClick={() => { onComplete(); onClose(); }}
                            className="group relative bg-white text-slate-900 font-bold py-5 px-12 rounded-full shadow-2xl shadow-white/10 transition-all hover:scale-105 active:scale-95 overflow-hidden"
                        >
                            <span className="relative z-10 flex items-center gap-2">
                                Complete Lesson
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 group-hover:translate-x-1 transition-transform">
                                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                                </svg>
                            </span>
                            <div className="absolute inset-0 bg-gradient-to-r from-teal-200 to-rose-200 opacity-0 group-hover:opacity-100 transition-opacity duration-300 mix-blend-screen"></div>
                        </button>
                    </div>
                 </div>
             </div>
        </div>
    );
};

const ModuleDetailView: React.FC<{ 
    module: CourseModule, 
    onClose: () => void,
    onUpdateModule: (updated: CourseModule) => void 
}> = ({ module, onClose, onUpdateModule }) => {
  const [lessons, setLessons] = useState<Lesson[]>(module.content || []);
  const [loading, setLoading] = useState(!module.content);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);

  useEffect(() => {
    if (!module.content) {
        const fetchContent = async () => {
            const data = await generateModuleContent(module.title);
            setLessons(data);
            setLoading(false);
            onUpdateModule({ ...module, content: data });
        };
        fetchContent();
    }
  }, [module]);

  const handleLessonComplete = (lessonToMark: Lesson) => {
      const updatedLessons = lessons.map(l => l.title === lessonToMark.title ? { ...l, isCompleted: true } : l);
      setLessons(updatedLessons);
      
      const allDone = updatedLessons.every(l => l.isCompleted);
      onUpdateModule({ 
          ...module, 
          content: updatedLessons, 
          status: allDone ? 'completed' : module.status 
      });
  };

  return (
    <>
        {activeLesson && (
            <LessonView 
                lesson={activeLesson} 
                onClose={() => setActiveLesson(null)} 
                onComplete={() => handleLessonComplete(activeLesson)}
            />
        )}

        <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/95 backdrop-blur-xl animate-fade-in p-6 overflow-hidden">
            <button 
                onClick={onClose}
                className="self-start text-white/60 hover:text-white mb-6 flex items-center gap-2"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
                Back to Dashboard
            </button>

            <div className="flex-grow max-w-lg w-full mx-auto space-y-6 overflow-y-auto pb-20 custom-scrollbar">
                <header>
                    <div className="text-xs font-bold text-teal-400 uppercase tracking-widest mb-2">{module.duration}</div>
                    <h2 className="text-3xl font-light text-white mb-2">{module.title}</h2>
                    <p className="text-white/70 leading-relaxed">{module.description}</p>
                </header>

                <div className="border-t border-white/10 my-6"></div>

                {loading ? (
                    <div className="space-y-4 animate-pulse">
                        <p className="text-white/40 text-center text-sm mb-4">AI is crafting your personalized curriculum...</p>
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-white/5 rounded-2xl h-24 border border-white/10"></div>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-4">
                        <h3 className="text-white font-medium mb-4">This Week's Curriculum</h3>
                        {lessons.map((lesson, idx) => (
                            <button 
                                key={idx} 
                                onClick={() => setActiveLesson(lesson)}
                                className="w-full text-left group bg-white/5 border border-white/10 p-5 rounded-2xl hover:bg-white/10 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-sm relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity text-white/40">
                                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                                    </svg>
                                </div>

                                <div className="flex items-center justify-between mb-3">
                                    <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md tracking-wider ${
                                        lesson.type === 'Reading' ? 'bg-blue-500/10 text-blue-200' :
                                        lesson.type === 'Exercise' ? 'bg-orange-500/10 text-orange-200' :
                                        'bg-purple-500/10 text-purple-200'
                                    }`}>
                                        {lesson.type}
                                    </span>
                                    {lesson.isCompleted && (
                                        <div className="w-6 h-6 rounded-full bg-teal-500 text-white flex items-center justify-center shadow-lg shadow-teal-500/20">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                                                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                    )}
                                </div>
                                <h4 className={`text-lg font-bold mb-1 transition-colors ${lesson.isCompleted ? 'text-white/40 line-through' : 'text-white'}`}>{lesson.title}</h4>
                                <p className={`text-sm ${lesson.isCompleted ? 'text-white/30' : 'text-white/60'} font-light`}>{lesson.description}</p>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    </>
  );
};

const CourseModuleCard: React.FC<{ 
    module: CourseModule, 
    index: number, 
    onClick: () => void 
}> = ({ module, index, onClick }) => (
    <button 
        onClick={onClick}
        disabled={module.status === 'locked'}
        className={`w-full text-left glass-panel p-5 rounded-2xl border border-white/40 relative flex items-center gap-4 transition-all duration-300
            ${module.status === 'locked' ? 'opacity-60 cursor-not-allowed' : 'bg-white/40 hover:scale-[1.02] hover:bg-white/50 cursor-pointer shadow-md'}`}
    >
        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 shadow-sm transition-colors
            ${module.status === 'completed' ? 'bg-teal-400 text-white' : 
              module.status === 'active' ? 'bg-rose-400 text-white animate-pulse' : 'bg-slate-300 text-slate-500'}`}>
            {module.status === 'completed' ? '✓' : index + 1}
        </div>
        <div className="flex-grow">
            <h4 className="text-slate-800 font-bold text-sm">{module.title}</h4>
            <p className="text-slate-600 text-xs mt-1">{module.description}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
             <div className="text-xs font-medium text-slate-500 bg-white/40 px-2 py-1 rounded-lg border border-white/30 whitespace-nowrap">
                {module.duration}
            </div>
            {module.status !== 'locked' && (
                <span className="text-[10px] font-bold text-rose-700 bg-rose-100/50 px-2 py-0.5 rounded-full">
                    {module.status === 'active' ? 'OPEN' : 'REVIEW'}
                </span>
            )}
        </div>
    </button>
);

const Dashboard: React.FC<DashboardProps> = ({ userData }) => {
  const [courseModules, setCourseModules] = useState<CourseModule[]>([]);
  const [loadingPath, setLoadingPath] = useState(false);
  const [selectedModule, setSelectedModule] = useState<CourseModule | null>(null);

  useEffect(() => {
    const savedPath = localStorage.getItem('bonds_learning_path');
    if (savedPath) {
        setCourseModules(JSON.parse(savedPath));
    } else if (userData) {
        const fetchPath = async () => {
            setLoadingPath(true);
            const path = await generateLearningPath();
            setCourseModules(path);
            localStorage.setItem('bonds_learning_path', JSON.stringify(path));
            setLoadingPath(false);
        };
        fetchPath();
    }
  }, [userData]);

  const updateModule = (updated: CourseModule) => {
      const newModules = courseModules.map(m => m.title === updated.title ? updated : m);
      setCourseModules(newModules);
      localStorage.setItem('bonds_learning_path', JSON.stringify(newModules));
      if (selectedModule?.title === updated.title) {
          setSelectedModule(updated);
      }
  };

  const handleModuleClick = (module: CourseModule) => {
      if (module.status !== 'locked') {
          setSelectedModule(module);
      }
  };

  return (
    <>
        {selectedModule && (
            <ModuleDetailView 
                module={selectedModule} 
                onClose={() => setSelectedModule(null)} 
                onUpdateModule={updateModule}
            />
        )}
        
        <div className={`p-2 md:p-4 pb-20 transition-opacity duration-300 ${selectedModule ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100'}`}>
        <header className="mb-8 mt-4 text-center animate-fade-in">
            <p className="text-white/90 font-bold tracking-widest uppercase text-[10px] mb-2 drop-shadow-sm">Daily Focus</p>
            <h1 className="text-4xl font-light text-white tracking-tight drop-shadow-md">
            {userData ? `Hi, ${userData.userName}.` : 'Ready to Connect?'}
            </h1>
            {userData && (
                <p className="text-white/90 text-sm mt-1 font-medium drop-shadow-sm">
                    Let's strengthen your bond with {userData.partnerName}.
                </p>
            )}
        </header>
        
        <div className="animate-fade-in-up max-w-xl mx-auto space-y-8" style={{animationDelay: '0.1s'}}>
            <DailyPrompt />

            {userData && (
                <div className="animate-fade-in-up" style={{animationDelay: '0.2s'}}>
                    <div className="flex items-center justify-between mb-4 px-2">
                        <h2 className="text-white font-light text-xl tracking-tight drop-shadow-sm">Your Growth Path</h2>
                        <span className="text-xs text-white/80 bg-white/10 px-2 py-1 rounded-lg">Personalized Course</span>
                    </div>
                    
                    <div className="space-y-3 relative">
                        <div className="absolute left-[29px] top-6 bottom-6 w-0.5 bg-white/30 z-0"></div>

                        {loadingPath ? (
                            <div className="p-6 text-center text-white/70 animate-pulse bg-white/10 rounded-2xl">
                                Designing your custom relationship curriculum...
                            </div>
                        ) : (
                            courseModules.map((module, idx) => (
                                <CourseModuleCard 
                                    key={idx} 
                                    module={module} 
                                    index={idx} 
                                    onClick={() => handleModuleClick(module)}
                                />
                            ))
                        )}
                    </div>
                </div>
            )}

            <AICoach />
        </div>
        </div>
    </>
  );
};

export default Dashboard;
