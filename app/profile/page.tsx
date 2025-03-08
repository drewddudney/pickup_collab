"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore"
import { Calendar, Home, Map, Users, Upload, Camera, X } from "lucide-react"
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/components/ui/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { auth, db, getUserProfilePath, UserProfile } from "@/lib/firebase"
import { useAuth } from "@/contexts/AuthContext"
import { SPORTS } from "@/lib/sports-config"
import { useSport } from "@/components/sport-context"
import { Header } from "@/components/header"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Label } from "@/components/ui/label"

const profileFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  city: z.string().optional(),
})

// Base athletic attributes
const baseAthleticSchema = {
  experience: z.string().optional(),
  skillLevel: z.enum(["beginner", "intermediate", "advanced", "expert"]).optional(),
  preferredSports: z.array(z.string()).optional(),
  weekdays: z.boolean().optional(),
  weekends: z.boolean().optional(),
  evenings: z.boolean().optional(),
  mornings: z.boolean().optional(),
}

// Sport-specific schemas
const basketballSchema = z.object({
  ...baseAthleticSchema,
  height: z.string().optional(),
  weight: z.string().optional(),
  position: z.string().optional(),
})

const tennisSchema = z.object({
  ...baseAthleticSchema,
  playStyle: z.enum(["singles", "doubles", "both"]).optional(),
  handedness: z.enum(["right", "left"]).optional(),
})

const volleyballSchema = z.object({
  ...baseAthleticSchema,
  position: z.string().optional(),
  verticalJump: z.string().optional(),
})

const pickleballSchema = z.object({
  ...baseAthleticSchema,
  playStyle: z.enum(["singles", "doubles", "both"]).optional(),
  handedness: z.enum(["right", "left"]).optional(),
})

const footballSchema = z.object({
  ...baseAthleticSchema,
  position: z.string().optional(),
  height: z.string().optional(),
  weight: z.string().optional(),
  fortyYardDash: z.string().optional(),
})

type ProfileFormValues = z.infer<typeof profileFormSchema>
type BasketballFormValues = z.infer<typeof basketballSchema>
type TennisFormValues = z.infer<typeof tennisSchema>
type VolleyballFormValues = z.infer<typeof volleyballSchema>
type PickleballFormValues = z.infer<typeof pickleballSchema>
type FootballFormValues = z.infer<typeof footballSchema>

// Union type for all sport-specific forms
type SportFormValues = 
  | BasketballFormValues 
  | TennisFormValues 
  | VolleyballFormValues 
  | PickleballFormValues 
  | FootballFormValues

export default function ProfilePage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, updateUserProfile } = useAuth()
  const { selectedSport } = useSport()
  const [isLoading, setIsLoading] = useState(false)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [activeTab, setActiveTab] = useState("profile")
  const [profilePicture, setProfilePicture] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
    },
  })

  // Get the appropriate schema based on the selected sport
  const getSchemaForSport = () => {
    switch (selectedSport.id) {
      case 'basketball':
        return basketballSchema;
      case 'tennis':
        return tennisSchema;
      case 'volleyball':
        return volleyballSchema;
      case 'pickleball':
        return pickleballSchema;
      case 'football':
        return footballSchema;
      default:
        return basketballSchema;
    }
  }

  // Create a form for the selected sport
  const athleticForm = useForm<SportFormValues>({
    resolver: zodResolver(getSchemaForSport()),
    defaultValues: {
      experience: "",
      skillLevel: undefined,
      preferredSports: [],
      weekdays: false,
      weekends: false,
      evenings: false,
      mornings: false,
      // Add default values for all possible fields
      height: "",
      weight: "",
      position: "",
      playStyle: undefined,
      handedness: undefined,
      verticalJump: "",
      fortyYardDash: "",
    },
  })

  // Reset the form when the sport changes
  useEffect(() => {
    if (userProfile) {
      const sportData = userProfile.athleticAttributes?.sportSpecific?.[selectedSport.id] || {};
      const availability = userProfile.athleticAttributes?.availability || {};
      
      athleticForm.reset({
        ...sportData,
        preferredSports: userProfile.athleticAttributes?.preferredSports || [],
        weekdays: availability.weekdays || false,
        weekends: availability.weekends || false,
        evenings: availability.evenings || false,
        mornings: availability.mornings || false,
      });
    }
  }, [selectedSport.id, userProfile, athleticForm]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) {
        router.push("/login")
        return
      }

      try {
        const userDocRef = doc(db, getUserProfilePath(user.uid))
        const userDoc = await getDoc(userDocRef)
        
        if (userDoc.exists()) {
          const userData = userDoc.data() as UserProfile
          setUserProfile(userData)
          setProfilePicture(userData.profilePicture || null)
          
          // Set form values
          profileForm.reset({
            firstName: userData.firstName || "",
            lastName: userData.lastName || "",
          })
          
          const athleticAttributes = userData.athleticAttributes || {}
          const sportData = athleticAttributes.sportSpecific?.[selectedSport.id] || {};
          const availability = athleticAttributes.availability || {}
          
          athleticForm.reset({
            ...sportData,
            experience: athleticAttributes.experience || "",
            skillLevel: athleticAttributes.skillLevel,
            preferredSports: athleticAttributes.preferredSports || [],
            weekdays: availability.weekdays || false,
            weekends: availability.weekends || false,
            evenings: availability.evenings || false,
            mornings: availability.mornings || false,
          })
        } else {
          // Create a new user profile if it doesn't exist
          const newProfile: UserProfile = {
            id: user.uid,
            email: user.email || "",
            firstName: "",
            lastName: "",
            createdAt: Date.now(),
          }
          
          await setDoc(userDocRef, newProfile)
          setUserProfile(newProfile)
        }
      } catch (error) {
        console.error("Error fetching user profile:", error)
        toast({
          title: "Error",
          description: "Failed to load your profile. Please try again.",
          variant: "destructive",
        })
      }
    }

    fetchUserProfile()
  }, [user, router, toast, profileForm, athleticForm, selectedSport.id])

  async function onProfileSubmit(data: ProfileFormValues) {
    if (!user) return
    
    setIsLoading(true)
    
    try {
      const userDocRef = doc(db, getUserProfilePath(user.uid))
      
      // Update profile fields including profile picture
      const updatedProfile = {
        firstName: data.firstName,
        lastName: data.lastName,
        profilePicture: profilePicture
      };
      
      await setDoc(userDocRef, updatedProfile, { merge: true })
      
      // Update the user's profile in Firebase Auth if available
      if (typeof updateUserProfile === 'function') {
        await updateUserProfile({
          displayName: `${data.firstName} ${data.lastName}`,
          photoURL: profilePicture || undefined
        });
      }
      
      // Update auth user's photoURL directly as a fallback
      if (auth.currentUser && profilePicture) {
        await updateDoc(userDocRef, {
          photoURL: profilePicture
        });
        
        // Force refresh the auth token to update the profile
        await auth.currentUser.getIdToken(true);
      }
      
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      })
      
      // Reload the page to reflect changes
      window.location.reload();
    } catch (error) {
      console.error("Error updating profile:", error)
      toast({
        title: "Error",
        description: "Failed to update your profile. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function onAthleticSubmit(data: SportFormValues) {
    if (!user) return
    
    setIsLoading(true)
    
    try {
      const userDocRef = doc(db, getUserProfilePath(user.uid))
      
      // Get existing profile data
      const userDoc = await getDoc(userDocRef)
      const existingData = userDoc.exists() ? userDoc.data() as UserProfile : { 
        athleticAttributes: { 
          sportSpecific: {} 
        } 
      };
      const existingAthletic = existingData.athleticAttributes || { sportSpecific: {} };
      const existingSportSpecific = existingAthletic.sportSpecific || {};
      
      // Extract common fields
      const { 
        experience, 
        skillLevel, 
        preferredSports, 
        weekdays, 
        weekends, 
        evenings, 
        mornings, 
        ...sportSpecificData 
      } = data;
      
      // Prepare athletic attributes
      const athleticAttributes = {
        ...existingAthletic,
        experience,
        skillLevel,
        preferredSports,
        availability: {
          weekdays,
          weekends,
          evenings,
          mornings,
        },
        sportSpecific: {
          ...existingSportSpecific,
          [selectedSport.id]: sportSpecificData
        }
      }
      
      // Update only the athletic attributes
      await setDoc(userDocRef, {
        athleticAttributes,
      }, { merge: true })
      
      toast({
        title: "Athletic profile updated",
        description: `Your ${selectedSport.name} information has been updated successfully.`,
      })
      
      // Update local state
      setUserProfile(prev => {
        if (!prev) return null
        return {
          ...prev,
          athleticAttributes,
        }
      })
    } catch (error) {
      console.error("Error updating athletic profile:", error)
      toast({
        title: "Error",
        description: "Failed to update your athletic profile. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    
    setIsUploading(true)
    
    try {
      const storage = getStorage()
      const storageRef = ref(storage, `profile-pictures/${user.uid}`)
      
      await uploadBytes(storageRef, file)
      const downloadURL = await getDownloadURL(storageRef)
      
      setProfilePicture(downloadURL)
      
      // Also update the profile in Firestore with the new profile picture URL
      const userDocRef = doc(db, getUserProfilePath(user.uid))
      await setDoc(userDocRef, {
        profilePicture: downloadURL
      }, { merge: true })
      
      toast({
        title: "Upload successful",
        description: "Your profile picture has been uploaded.",
      })
    } catch (error: any) {
      console.error("Error uploading profile picture:", error)
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload your profile picture. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemoveProfilePicture = async () => {
    if (!user) return
    
    setIsUploading(true)
    
    try {
      // Update the profile in Firestore to remove the profile picture
      const userDocRef = doc(db, getUserProfilePath(user.uid))
      await setDoc(userDocRef, {
        profilePicture: null
      }, { merge: true })
      
      setProfilePicture(null)
      
      toast({
        title: "Profile picture removed",
        description: "Your profile picture has been removed.",
      })
    } catch (error: any) {
      console.error("Error removing profile picture:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to remove your profile picture. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  if (!user) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>
  }

  // Render sport-specific form fields
  const renderSportSpecificFields = () => {
    switch (selectedSport.id) {
      case 'basketball':
        return (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={athleticForm.control}
                name="height"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Height</FormLabel>
                    <FormControl>
                      <Input placeholder="6'2&quot;" {...field} />
                    </FormControl>
                    <FormDescription>
                      Optional: e.g., 5&apos;10&quot;, 6&apos;2&quot;
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={athleticForm.control}
                name="weight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Weight</FormLabel>
                    <FormControl>
                      <Input placeholder="185 lbs" {...field} />
                    </FormControl>
                    <FormDescription>
                      Optional: e.g., 165 lbs, 180 lbs
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={athleticForm.control}
              name="position"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Position</FormLabel>
                  <FormControl>
                    <Input placeholder="Point Guard, Forward, etc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        );
        
      case 'tennis':
      case 'pickleball':
        return (
          <>
            <FormField
              control={athleticForm.control}
              name="playStyle"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Play Style</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value || ""}
                      className="flex flex-col space-y-1"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="singles" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Singles
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="doubles" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Doubles
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="both" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Both
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={athleticForm.control}
              name="handedness"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Handedness</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value || ""}
                      className="flex space-x-4"
                    >
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="right" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Right-handed
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="left" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Left-handed
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        );
        
      case 'volleyball':
        return (
          <>
            <FormField
              control={athleticForm.control}
              name="position"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Position</FormLabel>
                  <FormControl>
                    <Input placeholder="Setter, Outside Hitter, etc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={athleticForm.control}
              name="verticalJump"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vertical Jump</FormLabel>
                  <FormControl>
                    <Input placeholder="24 inches" {...field} />
                  </FormControl>
                  <FormDescription>
                    Optional: Your vertical jump height
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        );
        
      case 'football':
        return (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={athleticForm.control}
                name="height"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Height</FormLabel>
                    <FormControl>
                      <Input placeholder="6'2&quot;" {...field} />
                    </FormControl>
                    <FormDescription>
                      Optional: e.g., 5&apos;10&quot;, 6&apos;2&quot;
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={athleticForm.control}
                name="weight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Weight</FormLabel>
                    <FormControl>
                      <Input placeholder="185 lbs" {...field} />
                    </FormControl>
                    <FormDescription>
                      Optional: e.g., 165 lbs, 180 lbs
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={athleticForm.control}
              name="position"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Position</FormLabel>
                  <FormControl>
                    <Input placeholder="Quarterback, Wide Receiver, etc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={athleticForm.control}
              name="fortyYardDash"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>40-Yard Dash Time</FormLabel>
                  <FormControl>
                    <Input placeholder="4.5 seconds" {...field} />
                  </FormControl>
                  <FormDescription>
                    Optional: Your 40-yard dash time
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        );
        
      default:
        return null;
    }
  };

  return (
    <>
      <Header />
      <main className="flex-1 overflow-hidden">
        <Tabs defaultValue="home" className="h-full">
          <div className="container py-10 pb-20">
            <h1 className="text-3xl font-bold mb-6">Player Profile</h1>
            
            <div className="relative mb-6">
              <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="profile">Basic Info</TabsTrigger>
                  <TabsTrigger value="athletic">Athletic Info</TabsTrigger>
                </TabsList>
                
                <TabsContent value="profile">
                  <Card>
                    <CardHeader>
                      <CardTitle>Player Information</CardTitle>
                      <CardDescription>
                        Update your personal information
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="mb-6">
                        <Label className="mb-2 block">Profile Picture</Label>
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <Avatar className="h-24 w-24">
                              {profilePicture ? (
                                <AvatarImage src={profilePicture} alt="Profile" />
                              ) : user?.photoURL ? (
                                <AvatarImage src={user.photoURL} alt="Profile" />
                              ) : (
                                <AvatarFallback className="text-2xl">
                                  {userProfile?.firstName?.[0] || ""}{userProfile?.lastName?.[0] || ""}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            {profilePicture && (
                              <Button 
                                variant="destructive" 
                                size="icon" 
                                className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                                onClick={handleRemoveProfilePicture}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                          <div className="space-y-2">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              ref={fileInputRef}
                              onChange={handleFileChange}
                            />
                            <Button 
                              variant="outline" 
                              onClick={() => fileInputRef.current?.click()}
                              disabled={isUploading}
                              className="flex items-center gap-2"
                            >
                              {isUploading ? (
                                <>
                                  <span className="animate-spin">⏳</span>
                                  <span>Uploading...</span>
                                </>
                              ) : (
                                <>
                                  <Upload className="h-4 w-4" />
                                  <span>Upload Photo</span>
                                </>
                              )}
                            </Button>
                            <Button 
                              variant="outline" 
                              onClick={() => fileInputRef.current?.click()}
                              disabled={isUploading}
                              className="flex items-center gap-2"
                            >
                              <Camera className="h-4 w-4" />
                              <span>Take Photo</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                      <Form {...profileForm}>
                        <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={profileForm.control}
                              name="firstName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>First Name</FormLabel>
                                  <FormControl>
                                    <Input placeholder="John" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={profileForm.control}
                              name="lastName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Last Name</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Doe" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <FormField
                            control={profileForm.control}
                            name="city"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>City</FormLabel>
                                <FormControl>
                                  <Input placeholder="Austin" {...field} value={field.value || ''} />
                                </FormControl>
                                <FormDescription>
                                  Enter the city where you're based
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div>
                            <p className="text-sm text-muted-foreground mb-2">Email</p>
                            <p>{user.email}</p>
                          </div>
                          <Button type="submit" disabled={isLoading}>
                            {isLoading ? "Saving..." : "Save Changes"}
                          </Button>
                        </form>
                      </Form>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="athletic">
                  <Card>
                    <CardHeader>
                      <CardTitle>Athletic Information for {selectedSport.name}</CardTitle>
                      <CardDescription>
                        Share your athletic details with other players
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Form {...athleticForm}>
                        <form onSubmit={athleticForm.handleSubmit(onAthleticSubmit)} className="space-y-6">
                          {/* Sport-specific fields */}
                          {renderSportSpecificFields()}
                          
                          {/* Common fields for all sports */}
                          <FormField
                            control={athleticForm.control}
                            name="experience"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Experience</FormLabel>
                                <FormControl>
                                  <Input placeholder="5 years, College, etc." {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={athleticForm.control}
                            name="skillLevel"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Skill Level</FormLabel>
                                <Select 
                                  onValueChange={field.onChange} 
                                  value={field.value || ""}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select your skill level" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="beginner">Beginner</SelectItem>
                                    <SelectItem value="intermediate">Intermediate</SelectItem>
                                    <SelectItem value="advanced">Advanced</SelectItem>
                                    <SelectItem value="expert">Expert</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <div>
                            <FormLabel>Availability</FormLabel>
                            <FormDescription className="mb-3">
                              When are you typically available to play?
                            </FormDescription>
                            <div className="grid grid-cols-2 gap-2">
                              <FormField
                                control={athleticForm.control}
                                name="weekdays"
                                render={({ field }) => (
                                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                      />
                                    </FormControl>
                                    <FormLabel className="font-normal">
                                      Weekdays
                                    </FormLabel>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={athleticForm.control}
                                name="weekends"
                                render={({ field }) => (
                                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                      />
                                    </FormControl>
                                    <FormLabel className="font-normal">
                                      Weekends
                                    </FormLabel>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={athleticForm.control}
                                name="mornings"
                                render={({ field }) => (
                                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                      />
                                    </FormControl>
                                    <FormLabel className="font-normal">
                                      Mornings
                                    </FormLabel>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={athleticForm.control}
                                name="evenings"
                                render={({ field }) => (
                                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                      />
                                    </FormControl>
                                    <FormLabel className="font-normal">
                                      Evenings
                                    </FormLabel>
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>
                          
                          <Button type="submit" disabled={isLoading}>
                            {isLoading ? "Saving..." : "Save Athletic Info"}
                          </Button>
                        </form>
                      </Form>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
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