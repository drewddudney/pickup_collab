'use client';

import { useState, useEffect, useRef } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { Upload, Camera, X } from "lucide-react";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { db, getUserProfilePath, UserProfile } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { SPORTS } from "@/lib/sports-config";
import { useSport } from "@/components/sport-context";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { useAppContext } from "@/contexts/AppContext";

const profileFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  city: z.string().optional(),
});

// Base athletic attributes
const baseAthleticSchema = {
  experience: z.string().optional(),
  skillLevel: z.enum(["beginner", "intermediate", "advanced", "expert"]).optional(),
  preferredSports: z.array(z.string()).optional(),
  weekdays: z.boolean().optional(),
  weekends: z.boolean().optional(),
  evenings: z.boolean().optional(),
  mornings: z.boolean().optional(),
};

// Sport-specific schemas
const basketballSchema = z.object({
  ...baseAthleticSchema,
  height: z.string().optional(),
  weight: z.string().optional(),
  position: z.string().optional(),
});

const tennisSchema = z.object({
  ...baseAthleticSchema,
  playStyle: z.enum(["singles", "doubles", "both"]).optional(),
  handedness: z.enum(["right", "left"]).optional(),
});

const volleyballSchema = z.object({
  ...baseAthleticSchema,
  position: z.string().optional(),
  verticalJump: z.string().optional(),
});

const pickleballSchema = z.object({
  ...baseAthleticSchema,
  playStyle: z.enum(["singles", "doubles", "both"]).optional(),
  handedness: z.enum(["right", "left"]).optional(),
});

const footballSchema = z.object({
  ...baseAthleticSchema,
  position: z.string().optional(),
  height: z.string().optional(),
  weight: z.string().optional(),
  fortyYardDash: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;
type BasketballFormValues = z.infer<typeof basketballSchema>;
type TennisFormValues = z.infer<typeof tennisSchema>;
type VolleyballFormValues = z.infer<typeof volleyballSchema>;
type PickleballFormValues = z.infer<typeof pickleballSchema>;
type FootballFormValues = z.infer<typeof footballSchema>;

// Union type for all sport-specific forms
type SportFormValues = 
  | BasketballFormValues 
  | TennisFormValues 
  | VolleyballFormValues 
  | PickleballFormValues 
  | FootballFormValues;

export default function ProfileContent() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { selectedSport } = useSport();
  const { setActiveTab } = useAppContext();
  const [isLoading, setIsLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeProfileTab, setActiveProfileTab] = useState("profile");
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      city: "",
    },
  });

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
  };

  // Create a form for the selected sport
  const athleticForm = useForm<SportFormValues>({
    resolver: zodResolver(getSchemaForSport()),
    defaultValues: {
      experience: "",
      skillLevel: "beginner",
      preferredSports: [],
      weekdays: false,
      weekends: false,
      evenings: false,
      mornings: false,
      // Add default values for all possible fields
      height: "",
      weight: "",
      position: "",
      playStyle: "singles",
      handedness: "right",
      verticalJump: "",
      fortyYardDash: "",
    },
  });

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
        return;
      }

      try {
        const userDocRef = doc(db, getUserProfilePath(user.uid));
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data() as UserProfile;
          setUserProfile(userData);
          setProfilePicture(userData.profilePicture || null);
          
          // Set form values
          profileForm.reset({
            firstName: userData.firstName || "",
            lastName: userData.lastName || "",
            city: userData.city || "",
          });
          
          const athleticAttributes = userData.athleticAttributes || {};
          const sportData = athleticAttributes.sportSpecific?.[selectedSport.id] || {};
          const availability = athleticAttributes.availability || {};
          
          athleticForm.reset({
            ...sportData,
            experience: athleticAttributes.experience || "",
            skillLevel: athleticAttributes.skillLevel,
            preferredSports: athleticAttributes.preferredSports || [],
            weekdays: availability.weekdays || false,
            weekends: availability.weekends || false,
            evenings: availability.evenings || false,
            mornings: availability.mornings || false,
          });
        } else {
          // Create a new user profile if it doesn't exist
          const newProfile: UserProfile = {
            id: user.uid,
            email: user.email || "",
            firstName: "",
            lastName: "",
            createdAt: Date.now(),
          };
          
          await setDoc(userDocRef, newProfile);
          setUserProfile(newProfile);
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
        toast({
          title: "Error",
          description: "Failed to load your profile. Please try again.",
          variant: "destructive",
        });
      }
    };

    fetchUserProfile();
  }, [user, toast, profileForm, athleticForm, selectedSport.id]);

  async function onProfileSubmit(data: ProfileFormValues) {
    if (!user) return;
    
    setIsLoading(true);
    
    try {
      const userDocRef = doc(db, getUserProfilePath(user.uid));
      
      // Update profile fields including profile picture
      const updatedProfile = {
        firstName: data.firstName,
        lastName: data.lastName,
        city: data.city,
        profilePicture: profilePicture,
        updatedAt: Date.now(),
      };
      
      await setDoc(userDocRef, updatedProfile, { merge: true });
      
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
      
      // Update local state
      setUserProfile(prev => prev ? { ...prev, ...updatedProfile } : null);
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update your profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function onAthleticSubmit(data: SportFormValues) {
    if (!user) return;
    
    setIsLoading(true);
    
    try {
      const userDocRef = doc(db, getUserProfilePath(user.uid));
      
      // Extract availability data
      const { weekdays, weekends, evenings, mornings, ...sportSpecificData } = data;
      
      // Create the athletic attributes object
      const athleticAttributes = {
        experience: data.experience,
        skillLevel: data.skillLevel,
        preferredSports: data.preferredSports,
        availability: {
          weekdays,
          weekends,
          evenings,
          mornings,
        },
        sportSpecific: {
          [selectedSport.id]: sportSpecificData,
        },
      };
      
      // Update the user profile
      await updateDoc(userDocRef, {
        athleticAttributes,
        updatedAt: Date.now(),
      });
      
      toast({
        title: "Athletic profile updated",
        description: "Your athletic profile has been updated successfully.",
      });
      
      // Update local state
      setUserProfile(prev => prev ? { 
        ...prev, 
        athleticAttributes: {
          ...prev.athleticAttributes,
          ...athleticAttributes,
          sportSpecific: {
            ...prev.athleticAttributes?.sportSpecific,
            [selectedSport.id]: sportSpecificData,
          },
        } 
      } : null);
    } catch (error) {
      console.error("Error updating athletic profile:", error);
      toast({
        title: "Error",
        description: "Failed to update your athletic profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !user) return;
    
    const file = e.target.files[0];
    setIsUploading(true);
    
    try {
      const storage = getStorage();
      const storageRef = ref(storage, `profile-pictures/${user.uid}`);
      
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      
      setProfilePicture(downloadURL);
      
      // Update the user profile with the new profile picture
      const userDocRef = doc(db, getUserProfilePath(user.uid));
      await updateDoc(userDocRef, {
        profilePicture: downloadURL,
        updatedAt: Date.now(),
      });
      
      toast({
        title: "Profile picture updated",
        description: "Your profile picture has been updated successfully.",
      });
    } catch (error) {
      console.error("Error uploading profile picture:", error);
      toast({
        title: "Error",
        description: "Failed to upload your profile picture. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancel = () => {
    setActiveTab('home');
  };

  return (
    <div className="container py-6 pb-20">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Profile</h1>
        <Button variant="outline" onClick={handleCancel}>Back to Home</Button>
      </div>
      
      <Tabs value={activeProfileTab} onValueChange={setActiveProfileTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="profile">Personal Info</TabsTrigger>
          <TabsTrigger value="athletic">Athletic Profile</TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your personal information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                  <Avatar className="h-24 w-24">
                    {profilePicture ? (
                      <AvatarImage src={profilePicture} alt="Profile" />
                    ) : (
                      <AvatarFallback>
                        {profileForm.getValues().firstName?.[0] || ''}{profileForm.getValues().lastName?.[0] || ''}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="absolute -bottom-2 -right-2 flex space-x-1">
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      className="h-8 w-8 rounded-full"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <span className="animate-spin">⏳</span>
                      ) : (
                        <Camera className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </div>
              </div>
              
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                      control={profileForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your first name" {...field} />
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
                            <Input placeholder="Enter your last name" {...field} />
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
                          <Input placeholder="Enter your city" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Saving..." : "Save Changes"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="athletic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Athletic Profile</CardTitle>
              <CardDescription>
                Update your athletic information for {selectedSport.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...athleticForm}>
                <form onSubmit={athleticForm.handleSubmit(onAthleticSubmit)} className="space-y-6">
                  <FormField
                    control={athleticForm.control}
                    name="experience"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Experience</FormLabel>
                        <FormControl>
                          <Input placeholder="Years of experience" {...field} />
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
                          defaultValue={field.value}
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
                  
                  {/* Sport-specific fields */}
                  {selectedSport.id === 'basketball' && (
                    <>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <FormField
                          control={athleticForm.control}
                          name="height"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Height</FormLabel>
                              <FormControl>
                                <Input placeholder="Height (e.g., 6&apos;2&quot;)" {...field} />
                              </FormControl>
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
                                <Input placeholder="Weight (lbs)" {...field} />
                              </FormControl>
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
                              <Input placeholder="Position (e.g., Point Guard)" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}
                  
                  {(selectedSport.id === 'tennis' || selectedSport.id === 'pickleball') && (
                    <>
                      <FormField
                        control={athleticForm.control}
                        name="playStyle"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Play Style</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select your play style" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="singles">Singles</SelectItem>
                                <SelectItem value="doubles">Doubles</SelectItem>
                                <SelectItem value="both">Both</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={athleticForm.control}
                        name="handedness"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Handedness</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select your handedness" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="right">Right-handed</SelectItem>
                                <SelectItem value="left">Left-handed</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}
                  
                  {selectedSport.id === 'volleyball' && (
                    <>
                      <FormField
                        control={athleticForm.control}
                        name="position"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Position</FormLabel>
                            <FormControl>
                              <Input placeholder="Position (e.g., Setter)" {...field} />
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
                              <Input placeholder="Vertical jump (inches)" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}
                  
                  {selectedSport.id === 'football' && (
                    <>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <FormField
                          control={athleticForm.control}
                          name="height"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Height</FormLabel>
                              <FormControl>
                                <Input placeholder="Height (e.g., 6&apos;2&quot;)" {...field} />
                              </FormControl>
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
                                <Input placeholder="Weight (lbs)" {...field} />
                              </FormControl>
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
                              <Input placeholder="Position (e.g., Quarterback)" {...field} />
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
                            <FormLabel>40-Yard Dash</FormLabel>
                            <FormControl>
                              <Input placeholder="40-yard dash time (seconds)" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Availability</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={athleticForm.control}
                        name="weekdays"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel>Weekdays</FormLabel>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={athleticForm.control}
                        name="weekends"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel>Weekends</FormLabel>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={athleticForm.control}
                        name="mornings"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel>Mornings</FormLabel>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={athleticForm.control}
                        name="evenings"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel>Evenings</FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Saving..." : "Save Athletic Profile"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
