"use client"

import { createContext, useContext, useState, useEffect } from "react"
import { SPORTS, type Sport } from "@/lib/sports-config"

interface SportContextType {
  selectedSport: Sport
  setSelectedSport: (sport: Sport) => void
  sports: Sport[]
}

const SportContext = createContext<SportContextType | undefined>(undefined)

function hexToHSL(hex: string): string {
  // Remove the hash if it exists
  hex = hex.replace('#', '')

  // Convert hex to RGB
  const r = parseInt(hex.substring(0, 2), 16) / 255
  const g = parseInt(hex.substring(2, 4), 16) / 255
  const b = parseInt(hex.substring(4, 6), 16) / 255

  // Find greatest and smallest channel values
  const cmin = Math.min(r, g, b)
  const cmax = Math.max(r, g, b)
  const delta = cmax - cmin
  let h = 0
  let s = 0
  let l = 0

  // Calculate hue
  if (delta === 0) h = 0
  else if (cmax === r) h = ((g - b) / delta) % 6
  else if (cmax === g) h = (b - r) / delta + 2
  else h = (r - g) / delta + 4

  h = Math.round(h * 60)
  if (h < 0) h += 360

  // Calculate lightness
  l = (cmax + cmin) / 2

  // Calculate saturation
  s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1))

  // Convert to percentages
  s = +(s * 100).toFixed(1)
  l = +(l * 100).toFixed(1)

  return `${h} ${s}% ${l}%`
}

export function SportProvider({ children }: { children: React.ReactNode }) {
  const [selectedSport, setSelectedSport] = useState<Sport>(SPORTS[0])

  // Update CSS variables when sport changes
  useEffect(() => {
    const root = document.documentElement
    const hslColor = hexToHSL(selectedSport.secondaryColor)
    
    // Set the CSS variables
    root.style.setProperty('--accent', hslColor)
    root.style.setProperty('--accent-foreground', hslColor)
    root.style.setProperty('--sport-color', selectedSport.secondaryColor)
    
    // Update Tailwind classes
    const oldSportClass = SPORTS.map(s => `sport-${s.id}`).join(" ")
    document.body.classList.remove(...oldSportClass.split(" "))
    document.body.classList.add(`sport-${selectedSport.id}`)

    // Update tab indicator color
    const activeTab = document.querySelector('[role="tab"][data-state="active"]') as HTMLElement
    if (activeTab) {
      activeTab.style.setProperty('--sport-color', selectedSport.secondaryColor)
    }
  }, [selectedSport])

  return <SportContext.Provider value={{ selectedSport, setSelectedSport, sports: SPORTS }}>{children}</SportContext.Provider>
}

export function useSport() {
  const context = useContext(SportContext)
  if (context === undefined) {
    throw new Error("useSport must be used within a SportProvider")
  }
  return context
}

