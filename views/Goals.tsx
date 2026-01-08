
import React from 'react';
import { MOCK_GOALS } from '../constants';
import type { Goal } from '../types';

const GoalItem: React.FC<{ goal: Goal }> = ({ goal }) => (
  <div className="glass-panel rounded-2xl p-6 shadow-lg">
    <div className="flex justify-between items-start">
      <div>
        <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md tracking-wide ${goal.type === 'Couple' ? 'bg-teal-100/50 text-teal-800' : 'bg-rose-100/50 text-rose-800'}`}>{goal.type}</span>
        <p className="font-bold text-slate-800 mt-2 text-lg">{goal.title}</p>
      </div>
      <p className="text-xl font-bold text-slate-800/50">{goal.progress}%</p>
    </div>
    <div className="w-full bg-slate-200/50 rounded-full h-2 mt-5 overflow-hidden">
      <div className="bg-slate-800 h-2 rounded-full shadow-sm" style={{ width: `${goal.progress}%` }}></div>
    </div>
  </div>
);

const Goals: React.FC = () => {
  return (
    <div className="p-2 md:p-4">
      <header className="mb-8 mt-4">
        <h1 className="text-4xl font-light text-white tracking-tight">Our Goals</h1>
        <p className="text-white/70 mt-1">Growing together, step by step.</p>
      </header>
      <div className="space-y-4 pb-8">
        {MOCK_GOALS.map((goal) => (
          <GoalItem key={goal.id} goal={goal} />
        ))}
      </div>
    </div>
  );
};

export default Goals;
