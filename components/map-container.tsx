"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Navigation, Info, UserPlus, Clock, Users, PlusCircle, X, MapPin, Edit } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import dynamic from "next/dynamic"
import { allCourts } from "@/data/courts"
import { Badge } from "@/components/ui/badge"
import { BasketballIcon, VolleyballIcon, FootballIcon, SoccerIcon, TennisIcon } from "./sport-icons"

// Type for waitlist entry
interface WaitlistEntry {
  id: string
  type: "individual" | "team"
  names: string[]
  courtId: number
  joinedAt: Date
}

// Type for court
interface Court {
  id: number
  name: string
  address: string
  lat: number
  lng: number
  hoops?: number
  surface?: string
  lights?: boolean
  isUserAdded?: boolean
  sports: string[]
}

// Dynamically import the map component with no SSR to avoid Leaflet errors
const MapWithNoSSR = dynamic(() => import("@/components/leaflet-map"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-muted/20">
      <div className="flex flex-col items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="mt-4 text-muted-foreground">Loading map...</p>
      </div>
    </div>
  ),
})

interface MapContainerProps {
  sportType: string
}

export default function MapContainer({ sportType }: MapContainerProps) {
  const [courts, setCourts] = useState<Court[]>(allCourts)
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [showInfo, setShowInfo] = useState(false)
  const [waitlistName, setWaitlistName] = useState("")
  const [waitlistType, setWaitlistType] = useState<"individual" | "team">("individual")
  const [teamSize, setTeamSize] = useState("1")
  const [teamNames, setTeamNames] = useState<string[]>([])
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([])
  const [currentTime, setCurrentTime] = useState(new Date())
  const [addLocationOpen, setAddLocationOpen] = useState(false)
  const [editLocationOpen, setEditLocationOpen] = useState(false)
  const [newCourtLocation, setNewCourtLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [newCourtName, setNewCourtName] = useState("")
  const [newCourtAddress, setNewCourtAddress] = useState("")
  const [newCourtHoops, setNewCourtHoops] = useState<string>("2")
  const [newCourtSurface, setNewCourtSurface] = useState<string>("Concrete")
  const [newCourtLights, setNewCourtLights] = useState(false)
  const [newCourtSports, setNewCourtSports] = useState<string[]>([sportType])
  const [isAddingLocation, setIsAddingLocation] = useState(false)

  // Filter courts by sport type
  const filteredCourts = courts.filter((court) => court.sports.includes(sportType))

  // Update current time every minute to keep "minutes ago" accurate
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000) // Update every minute

    return () => clearInterval(timer)
  }, [])

  // Handle user location
  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
        },
        () => {
          alert("Error getting your location. Please enable location services.")
        },
      )
    } else {
      alert("Geolocation is not supported by your browser.")
    }
  }

  // Join waitlist function
  const joinWaitlist = (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedCourt || !waitlistType) return

    if (waitlistType === "individual" && !waitlistName.trim()) return
    if (waitlistType === "team" && (!teamNames || teamNames.length === 0)) return

    const newEntry: WaitlistEntry = {
      id: Math.random().toString(36).substring(2, 9),
      type: waitlistType,
      names: waitlistType === "individual" ? [waitlistName.trim()] : teamNames,
      courtId: selectedCourt.id,
      joinedAt: new Date(),
    }

    setWaitlist((prev) => [...prev, newEntry])
    setWaitlistName("")
    setTeamNames([])
    setTeamSize("1")
  }

  // Add team member
  const addTeamMember = () => {
    if (!waitlistName?.trim() || !teamSize) return
    if (teamNames.length < parseInt(teamSize)) {
      setTeamNames((prev) => [...prev, waitlistName.trim()])
      setWaitlistName("")
    }
  }

  // Remove team member
  const removeTeamMember = (index: number) => {
    if (!teamNames) return
    setTeamNames((prev) => prev.filter((_, i) => i !== index))
  }

  // Get waitlist for current court
  const getCourtWaitlist = (courtId: number) => {
    if (!waitlist) return []
    return waitlist.filter((entry) => entry.courtId === courtId)
  }

  // Calculate minutes since joined
  const getMinutesSinceJoined = (joinedAt: Date) => {
    if (!currentTime || !joinedAt) return "Just now"
    const diffMs = currentTime.getTime() - joinedAt.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    return diffMins === 0 ? "Just now" : `${diffMins} min ago`
  }

  // Handle map click when adding a new location
  const handleMapClick = (latlng: { lat: number; lng: number }) => {
    if (isAddingLocation) {
      setNewCourtLocation(latlng)
      setAddLocationOpen(true)
      setIsAddingLocation(false)
    }
  }

  // Toggle sport selection for new court
  const toggleSportSelection = (sport: string) => {
    setNewCourtSports((prev) => (prev.includes(sport) ? prev.filter((s) => s !== sport) : [...prev, sport]))
  }

  // Add new court
  const addNewCourt = () => {
    if (!newCourtLocation || !newCourtName.trim() || !newCourtAddress.trim() || newCourtSports.length === 0) return

    const newCourt: Court = {
      id: Math.max(...courts.map((c) => c.id)) + 1,
      name: newCourtName.trim(),
      address: newCourtAddress.trim(),
      lat: newCourtLocation.lat,
      lng: newCourtLocation.lng,
      hoops: Number.parseInt(newCourtHoops),
      surface: newCourtSurface,
      lights: newCourtLights,
      isUserAdded: true,
      sports: newCourtSports,
    }

    setCourts((prev) => [...prev, newCourt])
    setSelectedCourt(newCourt)

    // Reset form
    setNewCourtLocation(null)
    setNewCourtName("")
    setNewCourtAddress("")
    setNewCourtHoops("2")
    setNewCourtSurface("Concrete")
    setNewCourtLights(false)
    setNewCourtSports([sportType])
    setAddLocationOpen(false)
  }

  // Edit court
  const editCourt = () => {
    if (!selectedCourt || !newCourtName.trim() || !newCourtAddress.trim() || newCourtSports.length === 0) return

    const updatedCourt: Court = {
      ...selectedCourt,
      name: newCourtName.trim(),
      address: newCourtAddress.trim(),
      hoops: Number.parseInt(newCourtHoops),
      surface: newCourtSurface,
      lights: newCourtLights,
      sports: newCourtSports,
    }

    setCourts((prev) => prev.map((court) => (court.id === selectedCourt.id ? updatedCourt : court)))
    setSelectedCourt(updatedCourt)
    setEditLocationOpen(false)
  }

  // Open edit dialog
  const openEditDialog = () => {
    if (!selectedCourt) return

    setNewCourtName(selectedCourt.name)
    setNewCourtAddress(selectedCourt.address)
    setNewCourtHoops(selectedCourt.hoops?.toString() || "2")
    setNewCourtSurface(selectedCourt.surface || "Concrete")
    setNewCourtLights(selectedCourt.lights || false)
    setNewCourtSports(selectedCourt.sports)
    setEditLocationOpen(true)
  }

  return (
    <div className="relative h-full rounded-lg overflow-hidden">
      <MapWithNoSSR
        courts={filteredCourts}
        selectedCourt={selectedCourt}
        setSelectedCourt={setSelectedCourt}
        userLocation={userLocation}
        setUserLocation={setUserLocation}
        isAddingLocation={isAddingLocation}
        onMapClick={handleMapClick}
        sportType={sportType}
      />

      {/* Add Location Button */}
      <div className="absolute top-4 right-4 z-[1000]">
        <Button
          variant={isAddingLocation ? "destructive" : "default"}
          className="shadow-lg rounded-full"
          onClick={() => setIsAddingLocation(!isAddingLocation)}
        >
          {isAddingLocation ? (
            <>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </>
          ) : (
            <>
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Location
            </>
          )}
        </Button>
        {isAddingLocation && (
          <Card className="mt-2 p-2 w-64 shadow-lg">
            <p className="text-xs text-muted-foreground">
              Click anywhere on the map to add a new {sportType} location.
            </p>
          </Card>
        )}
      </div>

      {/* Add Location Dialog */}
      <Dialog open={addLocationOpen} onOpenChange={setAddLocationOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Location</DialogTitle>
            <DialogDescription>Enter details about the location you want to add to the map.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={newCourtName}
                onChange={(e) => setNewCourtName(e.target.value)}
                className="col-span-3"
                placeholder="e.g. Community Park Courts"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="address" className="text-right">
                Address
              </Label>
              <Input
                id="address"
                value={newCourtAddress}
                onChange={(e) => setNewCourtAddress(e.target.value)}
                className="col-span-3"
                placeholder="e.g. 123 Main St, Austin, TX"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="sports" className="text-right">
                Sports
              </Label>
              <div className="col-span-3 flex flex-wrap gap-2">
                {["basketball", "volleyball", "football", "soccer", "tennis"].map((sport) => (
                  <Badge
                    key={sport}
                    variant={newCourtSports.includes(sport) ? "default" : "outline"}
                    className="cursor-pointer capitalize"
                    onClick={() => toggleSportSelection(sport)}
                  >
                    {sport}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="hoops" className="text-right">
                Facilities
              </Label>
              <Select value={newCourtHoops} onValueChange={setNewCourtHoops}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Number of courts/fields" />
                </SelectTrigger>
                <SelectContent position="popper" className="z-[9999]">
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="4">4</SelectItem>
                  <SelectItem value="6">6</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="surface" className="text-right">
                Surface
              </Label>
              <Select value={newCourtSurface} onValueChange={setNewCourtSurface}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Court surface" />
                </SelectTrigger>
                <SelectContent position="popper" className="z-[9999]">
                  <SelectItem value="Concrete">Concrete</SelectItem>
                  <SelectItem value="Asphalt">Asphalt</SelectItem>
                  <SelectItem value="Wood">Wood</SelectItem>
                  <SelectItem value="Grass">Grass</SelectItem>
                  <SelectItem value="Turf">Turf</SelectItem>
                  <SelectItem value="Sand">Sand</SelectItem>
                  <SelectItem value="Rubber">Rubber</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="lights" className="text-right">
                Lights
              </Label>
              <div className="flex items-center space-x-2 col-span-3">
                <Checkbox
                  id="lights"
                  checked={newCourtLights}
                  onCheckedChange={(checked) => setNewCourtLights(checked === true)}
                />
                <label
                  htmlFor="lights"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Location has lights for night play
                </label>
              </div>
            </div>
            {newCourtLocation && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Location</Label>
                <div className="col-span-3 text-sm text-muted-foreground">
                  <div className="flex items-center">
                    <MapPin className="h-3 w-3 mr-1" />
                    Lat: {newCourtLocation.lat.toFixed(6)}, Lng: {newCourtLocation.lng.toFixed(6)}
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddLocationOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={addNewCourt}
              disabled={
                !newCourtLocation || !newCourtName.trim() || !newCourtAddress.trim() || newCourtSports.length === 0
              }
            >
              Add Location
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Location Dialog */}
      <Dialog open={editLocationOpen} onOpenChange={setEditLocationOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Location</DialogTitle>
            <DialogDescription>Update the details of this location.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">
                Name
              </Label>
              <Input
                id="edit-name"
                value={newCourtName}
                onChange={(e) => setNewCourtName(e.target.value)}
                className="col-span-3"
                placeholder="e.g. Community Park Courts"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-address" className="text-right">
                Address
              </Label>
              <Input
                id="edit-address"
                value={newCourtAddress}
                onChange={(e) => setNewCourtAddress(e.target.value)}
                className="col-span-3"
                placeholder="e.g. 123 Main St, Austin, TX"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-sports" className="text-right">
                Sports
              </Label>
              <div className="col-span-3 flex flex-wrap gap-2">
                {["basketball", "volleyball", "football", "soccer", "tennis"].map((sport) => (
                  <Badge
                    key={sport}
                    variant={newCourtSports.includes(sport) ? "default" : "outline"}
                    className="cursor-pointer capitalize"
                    onClick={() => toggleSportSelection(sport)}
                  >
                    {sport}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-hoops" className="text-right">
                Facilities
              </Label>
              <Select value={newCourtHoops} onValueChange={setNewCourtHoops}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Number of courts/fields" />
                </SelectTrigger>
                <SelectContent position="popper" className="z-[9999]">
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="4">4</SelectItem>
                  <SelectItem value="6">6</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-surface" className="text-right">
                Surface
              </Label>
              <Select value={newCourtSurface} onValueChange={setNewCourtSurface}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Court surface" />
                </SelectTrigger>
                <SelectContent position="popper" className="z-[9999]">
                  <SelectItem value="Concrete">Concrete</SelectItem>
                  <SelectItem value="Asphalt">Asphalt</SelectItem>
                  <SelectItem value="Wood">Wood</SelectItem>
                  <SelectItem value="Grass">Grass</SelectItem>
                  <SelectItem value="Turf">Turf</SelectItem>
                  <SelectItem value="Sand">Sand</SelectItem>
                  <SelectItem value="Rubber">Rubber</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-lights" className="text-right">
                Lights
              </Label>
              <div className="flex items-center space-x-2 col-span-3">
                <Checkbox
                  id="edit-lights"
                  checked={newCourtLights}
                  onCheckedChange={(checked) => setNewCourtLights(checked === true)}
                />
                <label
                  htmlFor="edit-lights"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Location has lights for night play
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditLocationOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={editCourt}
              disabled={!newCourtName.trim() || !newCourtAddress.trim() || newCourtSports.length === 0}
            >
              Update Location
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedCourt && (
        <Card className="absolute top-4 left-4 w-64 md:w-96 shadow-lg z-[1000] border border-gray-200 dark:border-gray-700">
          <Tabs defaultValue="info">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="info">Location Info</TabsTrigger>
              <TabsTrigger value="waitlist">Waitlist</TabsTrigger>
            </TabsList>

            <TabsContent value="info">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  {selectedCourt.name}
                  {selectedCourt.isUserAdded && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      User Added
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {selectedCourt.address}
                </CardDescription>
                <button
                  className="absolute top-2 right-2 h-6 w-6 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted"
                  onClick={() => setSelectedCourt(null)}
                >
                  ✕
                </button>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid gap-1 text-sm">
                  <div>
                    <span className="font-medium">Sports:</span>{" "}
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedCourt.sports.map((sport) => (
                        <Badge key={sport} variant="secondary" className="capitalize">
                          {sport}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  {selectedCourt.hoops && (
                    <div className="mt-2">
                      <span className="font-medium">Courts/Fields:</span> {selectedCourt.hoops}
                    </div>
                  )}
                  {selectedCourt.surface && (
                    <div>
                      <span className="font-medium">Surface:</span> {selectedCourt.surface}
                    </div>
                  )}
                  {selectedCourt.lights !== undefined && (
                    <div>
                      <span className="font-medium">Lights:</span> {selectedCourt.lights ? "Yes" : "No"}
                    </div>
                  )}
                  <div className="mt-2">
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${selectedCourt.lat},${selectedCourt.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:text-primary/80 inline-flex items-center gap-1"
                    >
                      <Navigation className="h-3 w-3" /> Get Directions
                    </a>
                  </div>
                  <div className="mt-2">
                    <Button variant="outline" size="sm" onClick={openEditDialog}>
                      <Edit className="h-3 w-3 mr-1" /> Edit Location
                    </Button>
                  </div>
                </div>
              </CardContent>
            </TabsContent>

            <TabsContent value="waitlist">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Waitlist
                </CardTitle>
                <CardDescription>
                  {getCourtWaitlist(selectedCourt.id).length === 0
                    ? "No one is waiting to play. Be the first!"
                    : `${getCourtWaitlist(selectedCourt.id).length} ${
                        getCourtWaitlist(selectedCourt.id).length === 1 ? "entry" : "entries"
                      } in the waitlist`}
                </CardDescription>
                <button
                  className="absolute top-2 right-2 h-6 w-6 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted"
                  onClick={() => setSelectedCourt(null)}
                >
                  ✕
                </button>
              </CardHeader>
              <CardContent className="pt-0">
                <form onSubmit={joinWaitlist} className="space-y-3 mb-4">
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={waitlistType === "individual" ? "default" : "outline"}
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          setWaitlistType("individual")
                          setTeamNames([])
                          setTeamSize("1")
                        }}
                      >
                        Individual
                      </Button>
                      <Button
                        type="button"
                        variant={waitlistType === "team" ? "default" : "outline"}
                        size="sm"
                        className="flex-1"
                        onClick={() => setWaitlistType("team")}
                      >
                        Team
                      </Button>
                    </div>

                    {waitlistType === "team" ? (
                      <>
                        <div className="space-y-2">
                          <Label>Team Size</Label>
                          <Select value={teamSize} onValueChange={setTeamSize}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select team size" />
                            </SelectTrigger>
                            <SelectContent position="popper" className="z-[9999]">
                              {[...Array(10)].map((_, i) => (
                                <SelectItem key={i + 1} value={(i + 1).toString()}>
                                  {i + 1} {i === 0 ? "player" : "players"}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <div className="space-y-1">
                            <Label htmlFor="name">Add Team Member</Label>
                            <div className="flex gap-2">
                              <Input
                                id="name"
                                value={waitlistName}
                                onChange={(e) => setWaitlistName(e.target.value)}
                                placeholder="Enter team member's name"
                              />
                              <Button
                                type="button"
                                size="sm"
                                onClick={addTeamMember}
                                disabled={teamNames.length >= parseInt(teamSize)}
                              >
                                Add
                              </Button>
                            </div>
                          </div>

                          <div className="space-y-2">
                            {teamNames.map((name, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between bg-muted/50 p-2 rounded-md"
                              >
                                <span>{name}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeTeamMember(index)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>

                          {teamNames.length > 0 && (
                            <Button
                              type="submit"
                              className="w-full"
                              disabled={teamNames.length === 0}
                            >
                              Join Waitlist as Team ({teamNames.length}/{teamSize})
                            </Button>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="space-y-1">
                        <Label htmlFor="name">Your Name</Label>
                        <div className="flex gap-2">
                          <Input
                            id="name"
                            value={waitlistName}
                            onChange={(e) => setWaitlistName(e.target.value)}
                            placeholder="Enter your name"
                            required
                          />
                          <Button type="submit" size="sm">
                            <UserPlus className="h-4 w-4 mr-1" />
                            Join
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </form>

                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {getCourtWaitlist(selectedCourt.id).length > 0 ? (
                    getCourtWaitlist(selectedCourt.id).map((entry, index) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between bg-muted/50 p-2 rounded-md text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <div className="bg-primary text-primary-foreground w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-medium flex items-center gap-1">
                              {entry.type === "team" && (
                                <Badge variant="outline" className="text-xs">
                                  Team
                                </Badge>
                              )}
                              {entry.names[0]}
                            </div>
                            {entry.type === "team" && entry.names.length > 1 && (
                              <div className="text-xs text-muted-foreground">
                                +{entry.names.length - 1} team members
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Clock className="h-3 w-3 mr-1" />
                          {getMinutesSinceJoined(entry.joinedAt)}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-muted-foreground text-sm py-2">Waitlist is empty</div>
                  )}
                </div>
              </CardContent>
            </TabsContent>
          </Tabs>
        </Card>
      )}

      <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-[1000]">
        <Button
          variant="default"
          size="icon"
          className="h-10 w-10 rounded-full shadow-lg"
          onClick={getUserLocation}
          title="Find my location"
        >
          <Navigation className="h-5 w-5" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 rounded-full bg-white shadow-lg dark:bg-gray-800"
          onClick={() => setShowInfo(!showInfo)}
          title="Information"
        >
          <Info className="h-5 w-5" />
        </Button>
      </div>

      {showInfo && (
        <Card className="absolute bottom-4 left-4 w-64 shadow-lg z-[1000] border border-gray-200 dark:border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              Austin {sportType.charAt(0).toUpperCase() + sportType.slice(1)} Locations
            </CardTitle>
            <CardDescription className="text-xs">Find public outdoor {sportType} locations in Austin</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground mb-2">
              This map shows {filteredCourts.length} {sportType} locations in Austin, TX.
              {filteredCourts.filter((c) => c.isUserAdded).length > 0 &&
                ` (${filteredCourts.filter((c) => c.isUserAdded).length} added by users)`}
            </p>
            <div className="flex items-center gap-2 text-xs">
              <div className="flex items-center gap-1">
                {sportType === "basketball" && <BasketballIcon className="w-4 h-4" />}
                {sportType === "volleyball" && <VolleyballIcon className="w-4 h-4" />}
                {sportType === "football" && <FootballIcon className="w-4 h-4" />}
                {sportType === "soccer" && <SoccerIcon className="w-4 h-4" />}
                {sportType === "tennis" && <TennisIcon className="w-4 h-4" />}
                <span className="capitalize">{sportType} Location</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

