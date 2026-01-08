
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, UserData } from './types';
import BottomNav from './components/BottomNav';
import Dashboard from './views/Dashboard';
import Activities from './views/Activities';
import Journal from './views/Journal';
import Goals from './views/Goals';
import Profile from './views/Profile';
import Quiz from './views/Quiz';
import Onboarding from './views/Onboarding';
import ConflictNavigator from './components/ConflictNavigator';
import { initializeGeminiContext } from './services/geminiService';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.Dashboard);
  const [hasOnboarded, setHasOnboarded] = useState<boolean | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);

  useEffect(() => {
    const initializeApp = async () => {
      // Check API Key for AI Studio environment
      if (window.aistudio?.hasSelectedApiKey) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (!hasKey) {
          await window.aistudio.openSelectKey();
        }
      }

      const savedData = localStorage.getItem('bonds_user_data');
      const onboarded = localStorage.getItem('bonds_has_onboarded');
      
      if (savedData) {
        const parsed = JSON.parse(savedData);
        setUserData(parsed);
        initializeGeminiContext(parsed);
      }
      
      setHasOnboarded(onboarded === 'true');
    };
    
    initializeApp();
  }, []);

  const handleOnboardingComplete = useCallback((data: UserData) => {
    setUserData(data);
    initializeGeminiContext(data);
    setHasOnboarded(true);
    localStorage.setItem('bonds_user_data', JSON.stringify(data));
    localStorage.setItem('bonds_has_onboarded', 'true');
  }, []);

  const handleReset = useCallback(() => {
    const confirmReset = window.confirm("Are you sure? This will delete all your shared memories and data.");
    if (confirmReset) {
      localStorage.clear();
      window.location.reload();
    }
  }, []);

  const viewContent = useMemo(() => {
    switch (currentView) {
      case View.Dashboard:
        return <Dashboard userData={userData} onNavigate={setCurrentView} />;
      case View.Activities:
        return <Activities />;
      case View.Journal:
        return <Journal />;
      case View.Quiz:
        return <Quiz />;
      case View.Goals:
        return <Goals />;
      case View.Profile:
        return <Profile onReset={handleReset} />;
      case View.Mediation:
        return <ConflictNavigator userData={userData} onClose={() => setCurrentView(View.Dashboard)} />;
      default:
        return <Dashboard userData={userData} onNavigate={setCurrentView} />;
    }
  }, [currentView, userData, handleReset]);

  if (hasOnboarded === null) return null;

  if (!hasOnboarded) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="min-h-screen font-sans flex flex-col max-w-lg mx-auto overflow-x-hidden">
      <main className="flex-grow pb-32 pt-4 px-4 animate-fade-in">
        {viewContent}
      </main>
      {currentView !== View.Mediation && (
        <BottomNav currentView={currentView} setCurrentView={setCurrentView} />
      )}
    </div>
  );
};

export default App;
