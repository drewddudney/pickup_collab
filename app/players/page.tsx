"use client"

import { useState, useEffect } from "react"
import { collection, getDocs } from "firebase/firestore"
import { useRouter } from "next/navigation"
import Image from "next/image"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { db, UserProfile } from "@/lib/firebase"
import { SPORTS } from "@/lib/sports-config"
import { useAuth } from "@/contexts/AuthContext"
import { useSport } from "@/components/sport-context"
import { Header } from "@/components/header"

export default function PlayersPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { selectedSport } = useSport()
  const [players, setPlayers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [skillFilter, setSkillFilter] = useState<string>("all")

  useEffect(() => {
    const fetchPlayers = async () => {
      if (!user) {
        router.push("/sign-in")
        return
      }

      try {
        setLoading(true)
        const querySnapshot = await getDocs(collection(db, "users"))
        const playersData = querySnapshot.docs
          .map(doc => doc.data() as UserProfile)
          .filter(player => player.id !== user.uid) // Exclude current user
        
        setPlayers(playersData)
      } catch (error) {
        console.error("Error fetching players:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchPlayers()
  }, [user, router])

  // Filter players based on selected sport and skill level
  const filteredPlayers = players.filter(player => {
    // Filter by sport
    const sportMatch = player.athleticAttributes?.preferredSports?.includes(selectedSport.id) ||
      player.athleticAttributes?.sportSpecific?.[selectedSport.id] !== undefined;
    
    // Filter by skill level
    const skillMatch = skillFilter === "all" || 
      player.athleticAttributes?.skillLevel === skillFilter;
    
    return sportMatch && skillMatch;
  });

  const getSkillLevelColor = (level?: string) => {
    switch (level) {
      case "beginner": return "bg-green-100 text-green-800";
      case "intermediate": return "bg-blue-100 text-blue-800";
      case "advanced": return "bg-purple-100 text-purple-800";
      case "expert": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  // Render sport-specific attributes
  const renderSportSpecificAttributes = (player: UserProfile) => {
    const sportData = player.athleticAttributes?.sportSpecific?.[selectedSport.id];
    
    if (!sportData) return null;
    
    switch (selectedSport.id) {
      case 'basketball':
        return (
          <>
            {sportData.position && (
              <div>
                <span className="text-muted-foreground">Position:</span> {sportData.position}
              </div>
            )}
            {sportData.height && (
              <div>
                <span className="text-muted-foreground">Height:</span> {sportData.height}
              </div>
            )}
            {sportData.weight && (
              <div>
                <span className="text-muted-foreground">Weight:</span> {sportData.weight}
              </div>
            )}
          </>
        );
        
      case 'tennis':
      case 'pickleball':
        return (
          <>
            {sportData.playStyle && (
              <div>
                <span className="text-muted-foreground">Play Style:</span> {sportData.playStyle.charAt(0).toUpperCase() + sportData.playStyle.slice(1)}
              </div>
            )}
            {sportData.handedness && (
              <div>
                <span className="text-muted-foreground">Handedness:</span> {sportData.handedness === 'right' ? 'Right-handed' : 'Left-handed'}
              </div>
            )}
          </>
        );
        
      case 'volleyball':
        return (
          <>
            {sportData.position && (
              <div>
                <span className="text-muted-foreground">Position:</span> {sportData.position}
              </div>
            )}
            {sportData.verticalJump && (
              <div>
                <span className="text-muted-foreground">Vertical Jump:</span> {sportData.verticalJump}
              </div>
            )}
          </>
        );
        
      case 'football':
        return (
          <>
            {sportData.position && (
              <div>
                <span className="text-muted-foreground">Position:</span> {sportData.position}
              </div>
            )}
            {sportData.height && (
              <div>
                <span className="text-muted-foreground">Height:</span> {sportData.height}
              </div>
            )}
            {sportData.weight && (
              <div>
                <span className="text-muted-foreground">Weight:</span> {sportData.weight}
              </div>
            )}
            {sportData.fortyYardDash && (
              <div>
                <span className="text-muted-foreground">40-Yard Dash:</span> {sportData.fortyYardDash}
              </div>
            )}
          </>
        );
        
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="flex min-h-screen items-center justify-center">
          <p>Loading players...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="container py-10">
        <h1 className="text-3xl font-bold mb-6">Players for {selectedSport.name}</h1>
        
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="w-full">
            <label className="block text-sm font-medium mb-2">Filter by Skill Level</label>
            <Select value={skillFilter} onValueChange={setSkillFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Select skill level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
                <SelectItem value="expert">Expert</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {filteredPlayers.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-lg text-muted-foreground">No players found for {selectedSport.name}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPlayers.map(player => (
              <Card key={player.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{player.firstName} {player.lastName}</CardTitle>
                      {player.athleticAttributes?.skillLevel && (
                        <Badge className={`mt-1 ${getSkillLevelColor(player.athleticAttributes.skillLevel)}`}>
                          {player.athleticAttributes.skillLevel.charAt(0).toUpperCase() + player.athleticAttributes.skillLevel.slice(1)}
                        </Badge>
                      )}
                    </div>
                    <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-lg font-bold">
                      {player.firstName?.[0]}{player.lastName?.[0]}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pb-2">
                  {player.athleticAttributes ? (
                    <div className="space-y-3">
                      {/* Sport-specific attributes */}
                      <div className="space-y-1">
                        {renderSportSpecificAttributes(player)}
                      </div>
                      
                      {/* Common attributes */}
                      {player.athleticAttributes.experience && (
                        <div>
                          <span className="text-muted-foreground">Experience:</span> {player.athleticAttributes.experience}
                        </div>
                      )}
                      
                      {player.athleticAttributes.availability && (
                        <div>
                          <span className="text-muted-foreground block mb-1">Availability:</span>
                          <div className="flex flex-wrap gap-1">
                            {player.athleticAttributes.availability.weekdays && (
                              <Badge variant="outline" className="bg-gray-100">Weekdays</Badge>
                            )}
                            {player.athleticAttributes.availability.weekends && (
                              <Badge variant="outline" className="bg-gray-100">Weekends</Badge>
                            )}
                            {player.athleticAttributes.availability.mornings && (
                              <Badge variant="outline" className="bg-gray-100">Mornings</Badge>
                            )}
                            {player.athleticAttributes.availability.evenings && (
                              <Badge variant="outline" className="bg-gray-100">Evenings</Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm italic">No athletic information provided</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  )
} 