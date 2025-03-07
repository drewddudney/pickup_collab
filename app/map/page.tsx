'use client';

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { redirect } from "next/navigation";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// Import the configuration
import './config.js';

// Dynamically import components that use browser APIs with no SSR
const DynamicMapPage = dynamic(
  () => import('@/components/map-page-content'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading map...</span>
      </div>
    )
  }
);

export default function MapPage() {
  const { user, loading } = useAuth();
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  if (!user) {
    redirect("/login");
  }

  // Only render the map content on the client side
  if (!isMounted) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading map...</span>
      </div>
    );
  }

  return <DynamicMapPage />;
} 