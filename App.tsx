
import React, { useState, useEffect } from 'react';
import { View, UserData } from './types';
import BottomNav from './components/BottomNav';
import Dashboard from './views/Dashboard';
import Activities from './views/Activities';
import Journal from './views/Journal';
import Goals from './views/Goals';
import Profile from './views/Profile';
import Onboarding from './views/Onboarding';
import ConflictNavigator from './components/ConflictNavigator';
import { initializeGeminiContext } from './services/geminiService';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.Dashboard);
  const [hasOnboarded, setHasOnboarded] = useState<boolean | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);

  // Load initial state and check for API key
  useEffect(() => {
    const checkApiKey = async () => {
      // In the AI Studio shell environment, we should check if a key is actually selected
      if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (!hasKey) {
          console.log("No API key selected yet, opening selection dialog...");
          await window.aistudio.openSelectKey();
        }
      }
    };
    
    checkApiKey();

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
        return <Dashboard userData={userData} onNavigate={setCurrentView} />;
      case View.Activities:
        // FIX: Removed unused userData prop as Activities component does not accept props and the error "Property 'userData' does not exist on type 'IntrinsicAttributes'" was reported on this line.
        return <Activities />;
      case View.Journal:
        return <Journal />;
      case View.Goals:
        return <Goals />;
      case View.Profile:
        return <Profile onReset={handleReset} />;
      case View.Mediation:
        return <ConflictNavigator userData={userData} onClose={() => setCurrentView(View.Dashboard)} />;
      default:
        return <Dashboard userData={userData} onNavigate={setCurrentView} />;
    }
  };

  if (hasOnboarded === null) return null;

  if (!hasOnboarded) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="min-h-screen font-sans flex flex-col max-w-lg mx-auto">
      <main className="flex-grow pb-24 pt-4 px-2">
        {renderView()}
      </main>
      {currentView !== View.Mediation && (
        <BottomNav currentView={currentView} setCurrentView={setCurrentView} />
      )}
    </div>
  );
};

export default App;
