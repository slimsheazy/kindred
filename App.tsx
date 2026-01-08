
import React, { useState, useEffect } from 'react';
import { View, UserData } from './types';
import BottomNav from './components/BottomNav';
import Dashboard from './views/Dashboard';
import Activities from './views/Activities';
import Journal from './views/Journal';
import Goals from './views/Goals';
import Profile from './views/Profile';
import Onboarding from './views/Onboarding';
import { initializeGeminiContext } from './services/geminiService';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.Dashboard);
  const [hasOnboarded, setHasOnboarded] = useState<boolean | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);

  // Load initial state
  useEffect(() => {
    const savedData = localStorage.getItem('bonds_user_data');
    const onboarded = localStorage.getItem('bonds_has_onboarded');
    
    if (savedData) {
      const parsed = JSON.parse(savedData);
      setUserData(parsed);
      initializeGeminiContext(parsed);
    }
    
    setHasOnboarded(onboarded === 'true');
  }, []);

  const handleOnboardingComplete = (data: UserData) => {
    setUserData(data);
    initializeGeminiContext(data);
    setHasOnboarded(true);
    localStorage.setItem('bonds_user_data', JSON.stringify(data));
    localStorage.setItem('bonds_has_onboarded', 'true');
  };

  const handleReset = () => {
    localStorage.removeItem('bonds_user_data');
    localStorage.removeItem('bonds_has_onboarded');
    localStorage.removeItem('bonds_learning_path');
    localStorage.removeItem('bonds_journal_entries');
    window.location.reload();
  };

  const renderView = () => {
    switch (currentView) {
      case View.Dashboard:
        return <Dashboard userData={userData} />;
      case View.Activities:
        return <Activities userData={userData} />;
      case View.Journal:
        return <Journal />;
      case View.Goals:
        return <Goals />;
      case View.Profile:
        return <Profile onReset={handleReset} />;
      default:
        return <Dashboard userData={userData} />;
    }
  };

  // Prevent flash of onboarding screen during hydration
  if (hasOnboarded === null) return null;

  if (!hasOnboarded) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="min-h-screen font-sans flex flex-col max-w-lg mx-auto">
      <main className="flex-grow pb-24 pt-4 px-2">
        {renderView()}
      </main>
      <BottomNav currentView={currentView} setCurrentView={setCurrentView} />
    </div>
  );
};

export default App;
