'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { LoginForm } from "@/components/auth/LoginForm";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { Loading } from "@/components/ui/loading";
import { AuthLayout } from "@/app/auth-layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Home as HomeIcon, Map, Calendar, Users, Bell } from 'lucide-react';
import { Header } from '@/components/header';
import { AppContextProvider } from '@/contexts/AppContext';

// Import ForgotPasswordForm directly
import { ForgotPasswordForm } from "../components/auth/ForgotPasswordForm";

// Dynamically import content components with loading states
const HomeContent = dynamic(() => import('@/app/home/page'), {
  loading: () => <div className="flex justify-center items-center h-full"><Loading /></div>
});

const MapView = dynamic(() => import('@/components/map-view'), {
  loading: () => <div className="flex justify-center items-center h-full"><Loading /></div>
});

// Update the import path for ScheduleContent
const ScheduleContent = dynamic(() => import('../app/schedule/page-content'), {
  loading: () => <div className="flex justify-center items-center h-full"><Loading /></div>
});

const TeammatesContent = dynamic(() => import('@/components/teammates-view'), {
  loading: () => <div className="flex justify-center items-center h-full"><Loading /></div>
});

const ProfileContent = dynamic(() => import('@/components/profile-content'), {
  loading: () => <div className="flex justify-center items-center h-full"><Loading /></div>
});

const SettingsContent = dynamic(() => import('@/components/settings-content'), {
  loading: () => <div className="flex justify-center items-center h-full"><Loading /></div>
});

const NotificationsContent = dynamic(() => import('@/app/notifications/page'), {
  loading: () => <div className="flex justify-center items-center h-full"><Loading /></div>
});

const PlayerSearchContent = dynamic(() => import('@/app/player-search/page'), {
  loading: () => <div className="flex justify-center items-center h-full"><Loading /></div>
});

export default function Home() {
  const { user, loading, authInitialized } = useAuth();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const viewParam = searchParams.get('view');
  
  // Set initial active tab based on URL parameters for auth
  const initialTab = tabParam === 'signup' ? 'signup' : 'login';
  const initialView = viewParam === 'forgot-password' ? 'forgot-password' : null;
  
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [activeView, setActiveView] = useState<string | null>(initialView);

  // For authenticated users, we'll use this state for the main app tabs
  const [activeAppTab, setActiveAppTab] = useState<string>('home');

  // Show loading state during auth initialization
  if (loading && !authInitialized) {
    return <Loading />;
  }

  // If user is authenticated, show the main app with tabs
  if (authInitialized && user && !loading) {
    return (
      <AppContextProvider initialTab={activeAppTab}>
        <div className="flex flex-col h-screen">
          <Header />
          <main className="flex-1 overflow-auto pb-16">
            <Tabs value={activeAppTab} onValueChange={setActiveAppTab} className="h-full">
              <TabsContent value="home" className="h-full">
                <HomeContent />
              </TabsContent>
              
              <TabsContent value="map" className="h-full">
                <MapView />
              </TabsContent>
              
              <TabsContent value="schedule" className="h-full">
                <ScheduleContent />
              </TabsContent>
              
              <TabsContent value="teammates" className="h-full">
                <TeammatesContent />
              </TabsContent>
              
              <TabsContent value="profile" className="h-full">
                <ProfileContent />
              </TabsContent>
              
              <TabsContent value="settings" className="h-full">
                <SettingsContent />
              </TabsContent>
              
              <TabsContent value="notifications" className="h-full">
                <NotificationsContent />
              </TabsContent>
              
              <TabsContent value="player-search" className="h-full">
                <PlayerSearchContent />
              </TabsContent>
              
              <TabsList className="fixed bottom-0 left-0 right-0 h-16 grid grid-cols-4 bg-background border-t">
                <TabsTrigger value="home" className="flex flex-col items-center justify-center">
                  <HomeIcon className="h-5 w-5" />
                  <span className="text-xs">Home</span>
                </TabsTrigger>
                <TabsTrigger value="map" className="flex flex-col items-center justify-center">
                  <Map className="h-5 w-5" />
                  <span className="text-xs">Map</span>
                </TabsTrigger>
                <TabsTrigger value="schedule" className="flex flex-col items-center justify-center">
                  <Calendar className="h-5 w-5" />
                  <span className="text-xs">Schedule</span>
                </TabsTrigger>
                <TabsTrigger value="teammates" className="flex flex-col items-center justify-center">
                  <Users className="h-5 w-5" />
                  <span className="text-xs">Teammates</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </main>
        </div>
      </AppContextProvider>
    );
  }

  // If not authenticated, show login/signup forms
  return (
    <AuthLayout>
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          {activeView === 'forgot-password' ? (
            <ForgotPasswordForm onBackToLogin={() => setActiveView(null)} />
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              <TabsContent value="login">
                <LoginForm onForgotPassword={() => setActiveView('forgot-password')} />
              </TabsContent>
              <TabsContent value="signup">
                <SignUpForm />
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </AuthLayout>
  );
}

