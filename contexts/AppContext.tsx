'use client';

import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';

// Define the AppContext type
interface AppContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

// Create the context with undefined as default value
const AppContext = createContext<AppContextType | undefined>(undefined);

// Create a provider component
export function AppContextProvider({ 
  children, 
  initialTab = 'home',
  onTabChange
}: { 
  children: ReactNode, 
  initialTab?: string,
  onTabChange?: (tab: string) => void
}) {
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  
  // Update activeTab when initialTab changes
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);
  
  // Create a wrapped setActiveTab function that also calls the callback
  const handleSetActiveTab = useCallback((tab: string) => {
    setActiveTab(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
  }, [onTabChange]);
  
  const value = {
    activeTab,
    setActiveTab: handleSetActiveTab,
  };
  
  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

// Create a hook to use the context
export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppContextProvider');
  }
  return context;
} 