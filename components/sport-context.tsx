"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

type SportContextType = {
  currentSport: string
  setCurrentSport: (sport: string) => void
}

const SportContext = createContext<SportContextType | undefined>(undefined)

export function SportProvider({ children }: { children: ReactNode }) {
  const [currentSport, setCurrentSport] = useState("basketball")

  return <SportContext.Provider value={{ currentSport, setCurrentSport }}>{children}</SportContext.Provider>
}

export function useSport() {
  const context = useContext(SportContext)
  if (context === undefined) {
    throw new Error("useSport must be used within a SportProvider")
  }
  return context
}

