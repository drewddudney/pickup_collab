'use client';

// Import the configuration to ensure this page is only rendered on the client side
import './config.js';

import { useAuth } from "@/contexts/AuthContext";
import { redirect } from "next/navigation";
import { Home, Map, Calendar, Users } from "lucide-react";
import { Header } from "@/components/header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MapView from "@/components/map-view";
import TeammatesView from "@/components/teammates-view";
import ScheduleView from "@/components/schedule-view";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function MapPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState("map");

  // Set the active tab based on the query parameter
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && ["schedule", "teammates"].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  if (loading) {
    return null;
  }

  if (!user) {
    redirect("/login");
  }

  return (
    <>
      <Header />
      <main className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          <div className="container py-6">
            <TabsContent value="map" className="h-full">
              <MapView />
            </TabsContent>
            <TabsContent value="schedule">
              <ScheduleView />
            </TabsContent>
            <TabsContent value="teammates">
              <TeammatesView />
            </TabsContent>
          </div>
          <TabsList className="fixed bottom-0 left-0 right-0 h-16 grid grid-cols-4 gap-4 bg-background border-t px-4 py-2 z-50">
            <TabsTrigger 
              value="home" 
              className="flex flex-col items-center justify-center data-[state=active]:bg-accent/50"
              onClick={() => router.push('/home')}
            >
              <Home className="h-5 w-5" />
              <span className="text-xs">Home</span>
            </TabsTrigger>
            <TabsTrigger 
              value="map" 
              className="flex flex-col items-center justify-center data-[state=active]:bg-accent/50"
              onClick={() => {
                setActiveTab("map");
                router.push('/map');
              }}
            >
              <Map className="h-5 w-5" />
              <span className="text-xs">Map</span>
            </TabsTrigger>
            <TabsTrigger 
              value="schedule" 
              className="flex flex-col items-center justify-center data-[state=active]:bg-accent/50"
              onClick={() => {
                setActiveTab("schedule");
                router.push('/map?tab=schedule');
              }}
            >
              <Calendar className="h-5 w-5" />
              <span className="text-xs">Schedule</span>
            </TabsTrigger>
            <TabsTrigger 
              value="teammates" 
              className="flex flex-col items-center justify-center data-[state=active]:bg-accent/50"
              onClick={() => {
                setActiveTab("teammates");
                router.push('/map?tab=teammates');
              }}
            >
              <Users className="h-5 w-5" />
              <span className="text-xs">Team</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </main>
    </>
  );
} 