"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { User } from "lucide-react"

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

const profileFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
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

export default function SettingsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useAuth()
  const { selectedSport } = useSport()
  const [isLoading, setIsLoading] = useState(false)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)

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
        router.push("/sign-in")
        return
      }

      try {
        const userDocRef = doc(db, getUserProfilePath(user.uid))
        const userDoc = await getDoc(userDocRef)
        
        if (userDoc.exists()) {
          const userData = userDoc.data() as UserProfile
          setUserProfile(userData)
          
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
      
      // Update only the profile fields
      await setDoc(userDocRef, {
        firstName: data.firstName,
        lastName: data.lastName,
      }, { merge: true })
      
      toast({
        title: "Profile updated",
        description: "Your profile information has been updated successfully.",
      })
      
      // Update local state
      setUserProfile(prev => {
        if (!prev) return null
        return {
          ...prev,
          firstName: data.firstName,
          lastName: data.lastName,
        }
      })
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
      const existingData = userDoc.exists() ? userDoc.data() as UserProfile : {};
      const existingAthletic = existingData.athleticAttributes || {};
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
      <div className="container max-w-4xl py-10">
        <h1 className="text-3xl font-bold mb-6">Account Settings</h1>
        
        <div className="relative mb-6">
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="athletic">Athletic Info</TabsTrigger>
            </TabsList>
            
            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>
                    Update your personal information
                  </CardDescription>
                </CardHeader>
                <CardContent>
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
    </>
  )
} 