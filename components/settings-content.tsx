'use client';

import { useState, useEffect } from "react";
import { Moon, Sun, Laptop } from "lucide-react";
import { doc, getDoc, setDoc } from "firebase/firestore";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { db, getUserProfilePath } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "next-themes";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAppContext } from "@/contexts/AppContext";

interface AppSettings {
  profileVisibility: 'public' | 'friends' | 'private';
  emailNotifications: boolean;
  pushNotifications: boolean;
  locationSharing: boolean;
  theme?: 'light' | 'dark' | 'system';
}

export default function SettingsContent() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { setActiveTab } = useAppContext();
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState<AppSettings>({
    profileVisibility: 'public',
    emailNotifications: true,
    pushNotifications: true,
    locationSharing: false,
    theme: 'system',
  });

  // Load settings from Firestore
  useEffect(() => {
    const loadSettings = async () => {
      if (!user) {
        return;
      }
      
      try {
        const userDocRef = doc(db, getUserProfilePath(user.uid));
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists() && userDoc.data().appSettings) {
          const appSettings = userDoc.data().appSettings;
          setSettings(appSettings);
          
          // Apply theme from settings
          if (appSettings.theme) {
            setTheme(appSettings.theme);
          }
        }
      } catch (error) {
        console.error("Error loading app settings:", error);
      }
    };
    
    loadSettings();
  }, [user, setTheme]);

  const saveSettings = async () => {
    if (!user) return;
    
    setIsLoading(true);
    
    try {
      const userDocRef = doc(db, getUserProfilePath(user.uid));
      
      await setDoc(userDocRef, {
        appSettings: settings
      }, { merge: true });
      
      // Apply theme change
      if (settings.theme) {
        setTheme(settings.theme);
      }
      
      toast({
        title: "Settings saved",
        description: "Your app settings have been updated successfully.",
      });
    } catch (error) {
      console.error("Error saving app settings:", error);
      toast({
        title: "Error",
        description: "Failed to save your settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setActiveTab('home');
  };

  return (
    <div className="container py-6 pb-20">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">App Settings</h1>
        <Button variant="outline" onClick={handleCancel}>Back to Home</Button>
      </div>
      
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
          className="w-full"
        >
          {isLoading ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}
