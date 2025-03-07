'use client';

import { useState } from "react";
import { Home, Map, Calendar, Users } from "lucide-react";
import { Header } from "@/components/header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MapView from "@/components/map-view";
import TeammatesView from "@/components/teammates-view";
import ScheduleView from "@/components/schedule-view";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function MapPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState("map");
  
  // Get the client parameter to preserve it in navigation
  const isClientOnly = searchParams.get('client') === 'true';
  const clientParam = isClientOnly ? '&client=true' : '';
  
  // Set the active tab based on the query parameter
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && ["schedule", "teammates"].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

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
              onClick={() => router.push(isClientOnly ? '/home?client=true' : '/home')}
            >
              <Home className="h-5 w-5" />
              <span className="text-xs">Home</span>
            </TabsTrigger>
            <TabsTrigger 
              value="map" 
              className="flex flex-col items-center justify-center data-[state=active]:bg-accent/50"
              onClick={() => {
                setActiveTab("map");
                router.push(isClientOnly ? '/map?client=true' : '/map');
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
                router.push(`/map?tab=schedule${clientParam}`);
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
                router.push(`/map?tab=teammates${clientParam}`);
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