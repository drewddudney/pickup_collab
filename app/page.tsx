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

// Dynamically import content components with loading states
const HomeContent = dynamic(() => import('@/app/home/page'), {
  loading: () => <div className="flex justify-center items-center h-full"><Loading /></div>
});

const MapView = dynamic(() => import('@/components/map-view'), {
  loading: () => <div className="flex justify-center items-center h-full"><Loading /></div>
});

// Create a simple schedule component to avoid import issues
const ScheduleContent = () => {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Schedule</h1>
      <p className="mb-4">Your upcoming games will appear here.</p>
      <div className="bg-muted p-4 rounded-lg text-center">
        <p>No upcoming games scheduled.</p>
        <button className="mt-4 bg-primary text-primary-foreground px-4 py-2 rounded">
          Find Games
        </button>
      </div>
    </div>
  );
};

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

  // Create a function to handle tab changes from both the UI and the context
  const handleTabChange = (tab: string) => {
    setActiveAppTab(tab);
  };

  // Show loading state during auth initialization
  if (loading && !authInitialized) {
    return <Loading />;
  }

  // If user is authenticated, show the main app with tabs
  if (authInitialized && user && !loading) {
    return (
      <AppContextProvider 
        initialTab={activeAppTab}
        onTabChange={handleTabChange}
      >
        <div className="flex flex-col h-screen">
          <Header />
          <main className="flex-1 overflow-auto pb-20">
            <Tabs 
              value={activeAppTab} 
              onValueChange={handleTabChange} 
              className="h-full"
            >
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
              
              <TabsList className="fixed bottom-0 left-0 right-0 h-16 grid grid-cols-4 bg-background border-t z-50">
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
      <div className="flex min-h-screen flex-col items-center justify-center">
        <Card className="w-[90%] max-w-md">
          <CardContent className="pt-6">
            {activeView === 'forgot-password' ? (
              <div className="text-center">
                <h2 className="text-lg font-semibold mb-4">Reset Password</h2>
                <p className="mb-4">Please enter your email to receive a password reset link.</p>
                <div className="space-y-4">
                  <input 
                    type="email" 
                    placeholder="Email" 
                    className="w-full p-2 border rounded"
                  />
                  <div className="flex flex-col space-y-2">
                    <button 
                      className="bg-primary text-primary-foreground py-2 rounded"
                      onClick={() => alert('Password reset functionality would be implemented here')}
                    >
                      Send Reset Link
                    </button>
                    <button 
                      className="text-sm text-muted-foreground"
                      onClick={() => setActiveView(null)}
                    >
                      Back to Login
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="login" className="text-center">Login</TabsTrigger>
                  <TabsTrigger value="signup" className="text-center">Sign Up</TabsTrigger>
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
      </div>
    </AuthLayout>
  );
}

