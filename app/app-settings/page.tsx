"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Calendar, Home, Map, Users, Moon, Sun, Laptop } from "lucide-react"
import { doc, getDoc, setDoc } from "firebase/firestore"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { auth, db, getUserProfilePath } from "@/lib/firebase"
import { useAuth } from "@/contexts/AuthContext"
import { Header } from "@/components/header"
import { useTheme } from "next-themes"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

interface AppSettings {
  profileVisibility: 'public' | 'friends' | 'private';
  emailNotifications: boolean;
  pushNotifications: boolean;
  locationSharing: boolean;
  theme?: 'light' | 'dark' | 'system';
}

export default function AppSettingsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useAuth()
  const { theme, setTheme } = useTheme()
  const [isLoading, setIsLoading] = useState(false)
  const [settings, setSettings] = useState<AppSettings>({
    profileVisibility: 'public',
    emailNotifications: true,
    pushNotifications: true,
    locationSharing: false,
    theme: 'system',
  })

  // Load settings from Firestore
  useEffect(() => {
    const loadSettings = async () => {
      if (!user) {
        router.push("/login")
        return
      }
      
      try {
        const userDocRef = doc(db, getUserProfilePath(user.uid))
        const userDoc = await getDoc(userDocRef)
        
        if (userDoc.exists() && userDoc.data().appSettings) {
          const appSettings = userDoc.data().appSettings;
          setSettings(appSettings);
          
          // Apply theme from settings
          if (appSettings.theme) {
            setTheme(appSettings.theme);
          }
        }
      } catch (error) {
        console.error("Error loading app settings:", error)
      }
    }
    
    loadSettings()
  }, [user, setTheme])

  const saveSettings = async () => {
    if (!user) return
    
    setIsLoading(true)
    
    try {
      const userDocRef = doc(db, getUserProfilePath(user.uid))
      
      await setDoc(userDocRef, {
        appSettings: settings
      }, { merge: true })
      
      // Apply theme change
      if (settings.theme) {
        setTheme(settings.theme);
      }
      
      toast({
        title: "Settings saved",
        description: "Your app settings have been updated successfully.",
      })
    } catch (error) {
      console.error("Error saving app settings:", error)
      toast({
        title: "Error",
        description: "Failed to save your settings. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!user) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>
  }

  return (
    <>
      <Header />
      <main className="flex-1 overflow-hidden">
        <Tabs defaultValue="home" className="h-full">
          <div className="container py-10 pb-20">
            <h1 className="text-3xl font-bold mb-6">App Settings</h1>
            
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Appearance</CardTitle>
                  <CardDescription>
                    Customize how the app looks
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>Theme</Label>
                    <RadioGroup
                      value={settings.theme || 'system'}
                      onValueChange={(value: 'light' | 'dark' | 'system') => 
                        setSettings({...settings, theme: value})
                      }
                      className="flex flex-col space-y-3 sm:flex-row sm:space-x-4 sm:space-y-0"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="light" id="light" />
                        <Label htmlFor="light" className="flex items-center gap-1.5">
                          <Sun className="h-4 w-4" />
                          <span>Light</span>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="dark" id="dark" />
                        <Label htmlFor="dark" className="flex items-center gap-1.5">
                          <Moon className="h-4 w-4" />
                          <span>Dark</span>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="system" id="system" />
                        <Label htmlFor="system" className="flex items-center gap-1.5">
                          <Laptop className="h-4 w-4" />
                          <span>System</span>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Privacy</CardTitle>
                  <CardDescription>
                    Control who can see your profile and location
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="profileVisibility">Profile Visibility</Label>
                    <Select 
                      value={settings.profileVisibility || 'public'} 
                      onValueChange={(value: 'public' | 'friends' | 'private') => 
                        setSettings({...settings, profileVisibility: value})
                      }
                    >
                      <SelectTrigger id="profileVisibility">
                        <SelectValue placeholder="Select visibility" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">Public (Everyone)</SelectItem>
                        <SelectItem value="friends">Friends Only</SelectItem>
                        <SelectItem value="private">Private</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="locationSharing">Location Sharing</Label>
                      <p className="text-sm text-muted-foreground">
                        Allow others to see your location when you're at a venue
                      </p>
                    </div>
                    <Switch
                      id="locationSharing"
                      checked={settings.locationSharing}
                      onCheckedChange={(checked) => 
                        setSettings({...settings, locationSharing: checked})
                      }
                    />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Notifications</CardTitle>
                  <CardDescription>
                    Manage how you receive notifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="emailNotifications">Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications via email
                      </p>
                    </div>
                    <Switch
                      id="emailNotifications"
                      checked={settings.emailNotifications}
                      onCheckedChange={(checked) => 
                        setSettings({...settings, emailNotifications: checked})
                      }
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="pushNotifications">Push Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive push notifications on your device
                      </p>
                    </div>
                    <Switch
                      id="pushNotifications"
                      checked={settings.pushNotifications}
                      onCheckedChange={(checked) => 
                        setSettings({...settings, pushNotifications: checked})
                      }
                    />
                  </div>
                </CardContent>
              </Card>
              
              <Button 
                onClick={saveSettings} 
                disabled={isLoading}
                className="w-full md:w-auto"
              >
                {isLoading ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </div>
          
          {/* Bottom Navigation */}
          <TabsList className="fixed bottom-0 left-0 right-0 h-16 grid grid-cols-4 gap-4 bg-background border-t px-4 py-2 z-50">
            <TabsTrigger value="home" className="flex flex-col items-center justify-center data-[state=active]:bg-accent/50" onClick={() => router.push('/home')}>
              <Home className="h-5 w-5" />
              <span className="text-xs">Home</span>
            </TabsTrigger>
            <TabsTrigger value="map" className="flex flex-col items-center justify-center data-[state=active]:bg-accent/50" onClick={() => router.push('/map')}>
              <Map className="h-5 w-5" />
              <span className="text-xs">Map</span>
            </TabsTrigger>
            <TabsTrigger value="schedule" className="flex flex-col items-center justify-center data-[state=active]:bg-accent/50" onClick={() => router.push('/map?tab=schedule')}>
              <Calendar className="h-5 w-5" />
              <span className="text-xs">Schedule</span>
            </TabsTrigger>
            <TabsTrigger value="teammates" className="flex flex-col items-center justify-center data-[state=active]:bg-accent/50" onClick={() => router.push('/map?tab=teammates')}>
              <Users className="h-5 w-5" />
              <span className="text-xs">Team</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </main>
    </>
  )
} 