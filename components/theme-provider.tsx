'use client'

import * as React from 'react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'

type ThemeProviderProps = {
  children: React.ReactNode;
  attribute?: 'class' | 'data-theme';
  defaultTheme?: string;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
  forcedTheme?: string;
}

export function ThemeProvider({ 
  children,
  ...props
}: ThemeProviderProps) {
  const [mounted, setMounted] = React.useState(false)

  // Ensure we only render theme changes on the client to avoid hydration mismatch
  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Prevent hydration mismatch by only rendering the children when mounted
  return (
    <NextThemesProvider {...props}>
      {mounted ? children : <div style={{ visibility: 'hidden' }}>{children}</div>}
    </NextThemesProvider>
  )
}
