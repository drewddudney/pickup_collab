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
import { useCallback, useState, useMemo } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/contexts/AuthContext"
import { SportSelector } from "@/components/sport-selector"
import { NotificationsDropdown } from "@/components/notifications-dropdown"
import Link from "next/link"
import { useRouter } from "next/navigation"

export function Header() {
  const { user, logout } = useAuth()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const router = useRouter()

  // Don't render if no user
  if (!user) return null;

  const handleLogout = useCallback(async () => {
    if (isLoggingOut) return; // Prevent multiple logout attempts
    
    try {
      setIsLoggingOut(true);
      await logout();
      // Use window.location instead of router
      window.location.href = '/login';
    } catch (error) {
      console.error('Failed to logout:', error);
      setIsLoggingOut(false);
    }
  }, [logout, isLoggingOut]);

  // Generate user initials from name or email
  const userInitials = useMemo(() => {
    if (user?.displayName) {
      // Get initials from display name (first letter of first and last name)
      const nameParts = user.displayName.split(' ');
      if (nameParts.length > 1) {
        return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
      }
      return nameParts[0][0].toUpperCase();
    }
    
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    
    return '?';
  }, [user]);

  // Generate a background color based on the user's ID for the avatar
  const avatarColor = useMemo(() => {
    if (!user?.uid) return 'bg-primary';
    
    // Generate a color based on the user's UID
    const colors = [
      'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500',
      'bg-lime-500', 'bg-green-500', 'bg-emerald-500', 'bg-teal-500',
      'bg-cyan-500', 'bg-sky-500', 'bg-blue-500', 'bg-indigo-500',
      'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500',
      'bg-rose-500'
    ];
    
    // Use the sum of character codes to pick a color
    const sum = user.uid.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[sum % colors.length];
  }, [user]);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <div className="mr-4 flex">
          <Link href="/home" className="mr-6 flex items-center space-x-2">
            <span className="font-bold sm:inline-block">
              PickUp
            </span>
          </Link>
        </div>
        <div className="flex items-center justify-end space-x-4">
          <SportSelector />
          <NotificationsDropdown />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar className="h-8 w-8 cursor-pointer">
                <AvatarImage src={user?.photoURL || ''} alt={user?.displayName || user?.email || 'User'} />
                <AvatarFallback className={avatarColor + " text-white"}>
                  {userInitials}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="z-50">
              <DropdownMenuItem 
                className="cursor-pointer"
                onClick={() => router.push('/profile')}
              >
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="cursor-pointer"
                onClick={() => router.push('/app-settings')}
              >
                <Settings className="mr-2 h-4 w-4" />
                <span>App Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="cursor-pointer" 
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}

