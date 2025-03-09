"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { User, Settings, LogOut } from "lucide-react"
import { useCallback, useState, useMemo, useRef, useEffect } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/contexts/AuthContext"
import { SportSelector } from "@/components/sport-selector"
import { NotificationsDropdown } from "@/components/notifications-dropdown"
import { useAppContext } from "@/contexts/AppContext"

export function Header() {
  const { user, logout, refreshUser } = useAuth()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const { activeTab, setActiveTab } = useAppContext()
  const [avatarKey, setAvatarKey] = useState(Date.now())
  const lastRefreshTimeRef = useRef<number>(Date.now())

  // Refresh user data with throttling to prevent excessive refreshes
  useEffect(() => {
    // Only refresh on mount, not on every render
    if (refreshUser) {
      refreshUser();
      lastRefreshTimeRef.current = Date.now();
    }

    // Set up an interval to refresh user data less frequently (every 5 minutes)
    const intervalId = setInterval(() => {
      const now = Date.now();
      // Only refresh if it's been at least 5 minutes since the last refresh
      if (refreshUser && (now - lastRefreshTimeRef.current > 300000)) {
        refreshUser();
        setAvatarKey(now);
        lastRefreshTimeRef.current = now;
      }
    }, 300000); // 5 minutes

    // Also refresh when tab becomes active, but only if it's been at least 5 minutes
    const handleVisibilityChange = () => {
      const now = Date.now();
      if (document.visibilityState === 'visible' && refreshUser && (now - lastRefreshTimeRef.current > 300000)) {
        refreshUser();
        setAvatarKey(now);
        lastRefreshTimeRef.current = now;
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Clean up interval and event listener
    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []); // Empty dependency array to run only on mount

  // Don't render if no user
  if (!user) return null;

  const handleLogout = useCallback(async () => {
    try {
      setIsLoggingOut(true)
      await logout()
    } catch (error) {
      console.error("Error logging out:", error)
    } finally {
      setIsLoggingOut(false)
    }
  }, [logout])

  // Update URL and state when navigating to different tabs
  const navigateToTab = (tab: string) => {
    setActiveTab(tab);
    // The setActiveTab function in AppContext will handle the URL update
    // through the onTabChange callback in the parent component
  }

  const showProfile = () => {
    navigateToTab('profile');
  }

  const showSettings = () => {
    navigateToTab('settings');
  }

  const showNotifications = () => {
    navigateToTab('notifications');
  }

  const goToHome = () => {
    navigateToTab('home');
  }

  const getInitials = () => {
    if (!user.displayName) return "U";
    return user.displayName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <div className="mr-4 flex">
          <Button variant="link" className="mr-6 flex items-center space-x-2 p-0" onClick={goToHome}>
            <span className="font-bold sm:inline-block">
              PickUp
            </span>
          </Button>
        </div>
        <div className="flex items-center justify-end space-x-4">
          <SportSelector />
          <NotificationsDropdown onShowAll={showNotifications} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8" key={`avatar-${avatarKey}-${user.photoURL}`}>
                  <AvatarImage 
                    src={user.photoURL || ""} 
                    alt={user.displayName || "User"} 
                    referrerPolicy="no-referrer"
                  />
                  <AvatarFallback>{getInitials()}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuItem onClick={showProfile}>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={showSettings}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>{isLoggingOut ? "Logging out..." : "Log out"}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}

