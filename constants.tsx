import React from 'react';
import type { Activity, Goal, JournalEntry } from './types';
import { BrainIcon, CalendarIcon, FlagIcon, GamepadIcon, LightbulbIcon, PuzzleIcon, RunningIcon } from './components/Icons';

export const MOCK_ACTIVITIES: Activity[] = [
  {
    title: 'Love Language Quiz',
    category: 'Quiz',
    description: 'Discover your primary love languages and how to speak your partner\'s.',
    icon: <PuzzleIcon />,
    duration: '15 mins',
    difficulty: 'Easy',
  },
  {
    title: '7-Day Gratitude Challenge',
    category: 'Challenge',
    description: 'Share one thing you\'re grateful for about your partner each day.',
    icon: <RunningIcon />,
    duration: '7 Days',
    difficulty: 'Medium',
  },
  {
    title: 'Relationship Trivia',
    category: 'Game',
    description: 'How well do you know each other? A fun game to test your knowledge.',
    icon: <GamepadIcon />,
    duration: '30 mins',
    difficulty: 'Easy',
  },
  {
    title: 'At-Home Date Night',
    category: 'Date Idea',
    description: 'Get a curated idea for a cozy and romantic night in.',
    icon: <LightbulbIcon />,
    duration: '2 hours',
    difficulty: 'Medium',
  },
];

export const MOCK_JOURNAL_ENTRIES: JournalEntry[] = [
  {
    // Fix: Changed id from number to string and added required fields authorId and timestamp
    id: '1',
    authorId: 'partner-id',
    timestamp: Date.now() - 172800000,
    author: 'Partner',
    authorImage: 'https://picsum.photos/seed/partner/100/100',
    date: '2 days ago',
    text: 'I was thinking about our trip to the coast last year. Seeing the sunset from that little cafe was so magical. We should do that again soon!',
    image: 'https://picsum.photos/seed/coast/400/300'
  },
  {
    // Fix: Changed id from number to string and added required fields authorId and timestamp
    id: '2',
    authorId: 'user-id',
    timestamp: Date.now() - 86400000,
    author: 'You',
    authorImage: 'https://picsum.photos/seed/you/100/100',
    date: 'Yesterday',
    text: 'Felt so appreciated when you made me coffee this morning without me even asking. It\'s the small things that make my day. Thank you ❤️',
  },
];

export const MOCK_GOALS: Goal[] = [
  {
    // Fix: Changed id from number to string and added required field lastUpdated
    id: '1',
    title: 'Save for a vacation to Italy',
    type: 'Couple',
    progress: 65,
    lastUpdated: Date.now(),
  },
  {
    // Fix: Changed id from number to string and added required field lastUpdated
    id: '2',
    title: 'Practice active listening',
    type: 'Individual',
    progress: 80,
    lastUpdated: Date.now(),
  },
  {
    // Fix: Changed id from number to string and added required field lastUpdated
    id: '3',
    title: 'Go on a weekly date night',
    type: 'Couple',
    progress: 90,
    lastUpdated: Date.now(),
  },
];