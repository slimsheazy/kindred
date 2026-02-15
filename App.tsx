
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { View, UserData } from './types';
import BottomNav from './components/BottomNav';
import Dashboard from './views/Dashboard';
import ActivitiesView from './views/Activities';
import Journal from './views/Journal';
import Goals from './views/Goals';
import Profile from './views/Profile';
import Quiz from './views/Quiz';
import Onboarding from './views/Onboarding';
import ConflictNavigator from './components/ConflictNavigator';
import { initializeGeminiContext } from './services/geminiService';
import { cloudService } from './services/cloudService';
import { supabase } from './services/supabase';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.Dashboard);
  const [hasOnboarded, setHasOnboarded] = useState<boolean | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const syncState = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  useEffect(() => {
    // 1. Check for active Supabase session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      const onboarded = localStorage.getItem('kindred_has_onboarded') === 'true';
      const savedData = localStorage.getItem('kindred_user_data');
      
      if (session && savedData) {
        const parsed = JSON.parse(savedData);
        setUserData(parsed);
        initializeGeminiContext(parsed);
        setHasOnboarded(true);

        if (parsed.partnerCode) {
           cloudService.subscribeToPartnerSpace(parsed.partnerCode, syncState);
        }
      } else if (onboarded && savedData) {
        // Fallback for local-only testing or expired session
        const parsed = JSON.parse(savedData);
        setUserData(parsed);
        setHasOnboarded(true);
      } else {
        setHasOnboarded(false);
      }
    };

    checkSession();

    // 2. Listen for Auth changes (Global Logout/Login)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        localStorage.removeItem('kindred_user_data');
        localStorage.removeItem('kindred_has_onboarded');
        setUserData(null);
        setHasOnboarded(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [syncState]);

  const handleOnboardingComplete = useCallback((data: UserData) => {
    setUserData(data);
    initializeGeminiContext(data);
    setHasOnboarded(true);
    localStorage.setItem('kindred_user_data', JSON.stringify(data));
    localStorage.setItem('kindred_has_onboarded', 'true');
    // Save profile to DB if authenticated
    cloudService.signUp(data);
  }, []);

  const handleReset = useCallback(async () => {
    const confirmReset = window.confirm("Are you sure? This will sign you out of Kindred.");
    if (confirmReset) {
      await supabase.auth.signOut();
      localStorage.removeItem('kindred_user_data');
      localStorage.removeItem('kindred_has_onboarded');
      window.location.reload();
    }
  }, []);

  const viewContent = useMemo(() => {
    switch (currentView) {
      case View.Dashboard:
        return <Dashboard key={refreshTrigger} userData={userData} onNavigate={setCurrentView} />;
      case View.Activities:
        return <ActivitiesView key={refreshTrigger} />;
      case View.Journal:
        return <Journal key={refreshTrigger} />;
      case View.Quiz:
        return <Quiz key={refreshTrigger} />;
      case View.Goals:
        return <Goals key={refreshTrigger} />;
      case View.Profile:
        return <Profile onReset={handleReset} />;
      case View.Mediation:
        return <ConflictNavigator userData={userData} onClose={() => setCurrentView(View.Dashboard)} />;
      default:
        return <Dashboard userData={userData} onNavigate={setCurrentView} />;
    }
  }, [currentView, userData, handleReset, refreshTrigger]);

  if (hasOnboarded === null) return (
    <div className="min-h-screen flex items-center justify-center bg-[#FDFCF0]">
      <div className="w-8 h-8 border-2 border-black/10 border-t-black rounded-full animate-spin" />
    </div>
  );

  if (!hasOnboarded) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="min-h-screen font-sans flex flex-col max-w-lg mx-auto overflow-x-hidden bg-[#FDFCF0]">
      <main className="flex-grow pb-32 pt-4 px-4 animate-fade-in">
        {viewContent}
      </main>
      {currentView !== View.Mediation && (
        <BottomNav currentView={currentView} setCurrentView={setCurrentView} />
      )}
      <Analytics />
    </div>
  );
};

export default App;
