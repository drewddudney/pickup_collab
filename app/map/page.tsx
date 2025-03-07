'use client';

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { redirect, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import Script from "next/script";

// Import the configuration
import './config.js';

// Create a placeholder component for client-side only rendering
export default function MapPage() {
  const { user, loading } = useAuth();
  const [isClient, setIsClient] = useState(false);
  const [MapContent, setMapContent] = useState<React.ComponentType | null>(null);
  const searchParams = useSearchParams();
  
  // Check if we're being loaded in client-only mode
  const isClientOnly = searchParams.get('client') === 'true';
  const tabParam = searchParams.get('tab');
  const tabQueryString = tabParam ? `&tab=${tabParam}` : '';
  
  // Only load the map content on the client side
  useEffect(() => {
    // Set a flag to confirm we're running on the client
    setIsClient(true);
    
    // Dynamically import the map content
    import('../../components/map-page-content')
      .then((module) => {
        setMapContent(() => module.default);
      })
      .catch((err) => {
        console.error("Failed to load map content:", err);
      });
  }, []);

  // If we're not in client-only mode and this is server-side, redirect
  useEffect(() => {
    if (!isClientOnly && typeof window !== 'undefined') {
      window.location.href = `/map?client=true${tabQueryString}`;
    }
  }, [isClientOnly, tabQueryString]);

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

  // Show loading state until client-side rendering is ready
  if (!isClient || !MapContent) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading map...</span>
      </div>
    );
  }

  // Render the dynamically imported component
  return <MapContent />;
} 