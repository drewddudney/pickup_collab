"use client"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ChevronDown, MapPin, Moon, Sun } from "lucide-react"
import { useSport } from "./sport-context"
import { useEffect, useState } from "react"
import { BasketballIcon, VolleyballIcon, FootballIcon, SoccerIcon, TennisIcon, PickleballIcon } from "./sport-icons"

export function Header() {
  const { currentSport, setCurrentSport } = useSport()
  const [theme, setTheme] = useState<"light" | "dark">("light")

  // Handle theme toggle
  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light"
    setTheme(newTheme)
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }

  // Initialize theme based on system preference
  useEffect(() => {
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    if (isDark) {
      setTheme("dark")
      document.documentElement.classList.add("dark")
    }
  }, [])

  const sports = [
    { id: "basketball", name: "Basketball", icon: BasketballIcon },
    { id: "volleyball", name: "Volleyball", icon: VolleyballIcon },
    { id: "football", name: "Football", icon: FootballIcon },
    { id: "soccer", name: "Soccer", icon: SoccerIcon },
    { id: "tennis", name: "Tennis", icon: TennisIcon },
    { id: "pickleball", name: "Pickleball", icon: PickleballIcon },
  ]

  const CurrentSportIcon = sports.find((s) => s.id === currentSport)?.icon || BasketballIcon

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 py-4 px-6 sticky top-0 z-50">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Pickup</h1>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2 px-2 py-1 h-auto">
                <CurrentSportIcon className="w-6 h-6" />
                <span className="capitalize">{currentSport}</span>
                <ChevronDown className="h-4 w-4 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48 z-[9999]">
              {sports.map((sport) => (
                <DropdownMenuItem
                  key={sport.id}
                  className="flex items-center gap-2 cursor-pointer"
                  onClick={() => setCurrentSport(sport.id)}
                >
                  <sport.icon className="w-6 h-6" />
                  <span>{sport.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm md:text-base">
            <MapPin className="h-4 w-4 text-primary" />
            <span>Austin, TX</span>
          </div>
          <Button variant="ghost" size="icon" onClick={toggleTheme}>
            {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </Button>
        </div>
      </div>
    </header>
  )
}

