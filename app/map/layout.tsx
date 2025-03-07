'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

export default function MapLayout({ children }: { children: React.ReactNode }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // If we're not on the client yet, show a loading indicator
  if (!isClient) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading map...</span>
      </div>
    );
  }

  // Once we're on the client, render the children
  return <>{children}</>;
} 