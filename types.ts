
import React from 'react';

export enum View {
  Dashboard = 'DASHBOARD',
  Journal = 'JOURNAL',
  Activities = 'ACTIVITIES',
  Goals = 'GOALS',
  Profile = 'PROFILE',
  Mediation = 'MEDIATION',
  Quiz = 'QUIZ',
}

export interface UserData {
  id: string;
  userName: string;
  partnerName: string;
  yearsTogether: string;
  focusAreas: string[];
  partnerCode?: string;
  linkedPartnerId?: string;
  syncStatus: 'synced' | 'syncing' | 'offline';
}

export interface BondScore {
  category: string;
  score: number;
  timestamp: number;
}

export interface Lesson {
  title: string;
  type: 'Reading' | 'Exercise' | 'Prompt';
  description: string;
  longContent: string;
  isCompleted?: boolean;
}

export interface CourseModule {
  title: string;
  description: string;
  duration: string;
  status: 'active' | 'locked' | 'completed';
  content?: Lesson[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface Activity {
  title: string;
  category: string;
  description: string;
  duration: string;
  difficulty: string;
  icon?: React.ReactNode; 
  isGenerated?: boolean;
}

export interface JournalEntry {
  id: string;
  authorId: string;
  author: string;
  authorImage: string;
  date: string;
  timestamp: number;
  text: string;
  image?: string;
}

export interface Goal {
  id: string;
  title: string;
  type: 'Individual' | 'Couple';
  progress: number;
  lastUpdated: number;
}

export interface QuizQuestion {
  id: string;
  question: string;
  type: 'open' | 'multiple_choice';
  options?: string[];
}

export interface QuizSession {
  id: string;
  title: string;
  questions: QuizQuestion[];
  timestamp: number;
}
