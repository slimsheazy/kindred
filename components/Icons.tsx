
import React from 'react';

// Abstract Geometric Elements for Navigation
export const AbstractHomeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="12" cy="12" r="3" fill="currentColor" />
  </svg>
);

export const AbstractJournalIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect x="6" y="4" width="2" height="16" fill="currentColor" />
    <rect x="11" y="8" width="2" height="12" fill="currentColor" />
    <rect x="16" y="6" width="2" height="14" fill="currentColor" />
  </svg>
);

export const AbstractActivitiesIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M12 4L19 18H5L12 4Z" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="12" cy="13" r="2" fill="currentColor" />
  </svg>
);

export const AbstractGoalsIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect x="11" y="3" width="2" height="18" fill="currentColor" />
    <path d="M7 12L12 7L17 12L12 17L7 12Z" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

export const AbstractProfileIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
    <rect x="4" y="16" width="16" height="2" fill="currentColor" />
  </svg>
);

// Standard Functional Icons (Updated for dark mode)
export const HomeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

export const BookOpenIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);

export const SparklesIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.293 2.293a1 1 0 010 1.414L11.414 15l-1.414 1.414a1 1 0 01-1.414 0L5 13.586a1 1 0 010-1.414L7.293 10l2.293-2.293a1 1 0 011.414 0L13.586 10l1.414-1.414a1 1 0 011.414 0L19 11.172" />
  </svg>
);

export const FlagIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6H8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
  </svg>
);

export const UserCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export const PaperAirplaneIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
    </svg>
);

export const ChatBubbleLeftRightIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193l-3.72 3.72a1.125 1.125 0 01-1.59 0l-3.72-3.72c-1.133-.093-1.98-1.057-1.98-2.193v-4.286c0-.97.616-1.813 1.5-2.097M16.5 7.5v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5A3.375 3.375 0 006.375 7.5v1.875m9.125 0c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193l-3.72 3.72a1.125 1.125 0 01-1.59 0l-3.72-3.72c-1.133-.093-1.98-1.057-1.98-2.193v-4.286c0-.97.616-1.813 1.5-2.097" />
    </svg>
);

export const ScaleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.303.485 2.713.75 4.185.75m0 0c.674 0 1.33-.044 1.969-.13M12 3c-1.472 0-2.882.265-4.185.75M12 3c1.303.485 2.713.75 4.185.75m0 0c.674 0 1.33-.044 1.969-.13M3.75 20.25c.639.086 1.295.13 1.969.13 1.472 0 2.882-.265 4.185-.75M3.75 20.25c-1.303.485-2.713.75-4.185.75M12 3c1.472 0 2.882.265 4.185.75M12 3c-1.303.485-2.713.75-4.185.75M3.75 20.25c.639.086 1.295.13 1.969.13 1.472 0 2.882-.265 4.185-.75M3.75 20.25c-1.303.485-2.713.75-4.185.75M20.25 20.25c-.639.086-1.295.13-1.969.13-1.472 0-2.882-.265-4.185-.75M20.25 20.25c1.303.485 2.713.75 4.185.75M12 3c-1.472 0-2.882.265-4.185.75M12 3c1.303.485 2.713.75 4.185.75m-9.313 12.375h13.125c.621 0 1.125-.504 1.125-1.125V6.75c0-.621-.504-1.125-1.125-1.125H2.687c-.621 0-1.125.504-1.125 1.125v6.75c0 .621.504 1.125 1.125 1.125z" />
  </svg>
);

export const PuzzleIcon: React.FC<{ className?: string }> = ({ className }) => <div className={`text-3xl ${className || ''}`}>🧩</div>;
export const RunningIcon: React.FC<{ className?: string }> = ({ className }) => <div className={`text-3xl ${className || ''}`}>🏃‍♀️</div>;
export const GamepadIcon: React.FC<{ className?: string }> = ({ className }) => <div className={`text-3xl ${className || ''}`}>🎮</div>;
export const LightbulbIcon: React.FC<{ className?: string }> = ({ className }) => <div className={`text-3xl ${className || ''}`}>💡</div>;
export const CalendarIcon: React.FC<{ className?: string }> = ({ className }) => <div className={`text-3xl ${className || ''}`}>🗓️</div>;
export const BrainIcon: React.FC<{ className?: string }> = ({ className }) => <div className={`text-3xl ${className || ''}`}>🧠</div>;
