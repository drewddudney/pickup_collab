'use client';

import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/contexts/AuthContext"
import { SportProvider } from "@/components/sport-context"
import { Header } from "@/components/header"
import { Toaster } from "@/components/ui/toaster"

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <AuthProvider>
        <SportProvider>
          <Header />
          {children}
          <Toaster />
        </SportProvider>
      </AuthProvider>
    </ThemeProvider>
  )
} 