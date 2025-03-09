'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

// Define the AppContext type
interface AppContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

// Create the context with undefined as default value
const AppContext = createContext<AppContextType | undefined>(undefined);

// Create a provider component
export function AppContextProvider({ children, initialTab = 'home' }: { children: ReactNode, initialTab?: string }) {
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  
  const value = {
    activeTab,
    setActiveTab,
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