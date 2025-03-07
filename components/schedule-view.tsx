"use client"

import { useState } from "react"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CalendarClock, Clock, MapPin, Plus, Users } from "lucide-react"
import { useSport } from "./sport-context"
import { allCourts } from "@/data/courts"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { GameDetailsDialog } from "./game-details-dialog"

// Type for scheduled game
interface ScheduledGame {
  id: string
  courtId: number
  sportType: string
  date: Date
  startTime: string
  endTime: string
  players: {
    name: string
    avatar?: string
  }[]
  maxPlayers: number
  createdBy: string
}

export default function ScheduleView() {
  const { currentSport } = useSport()
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [isAddGameOpen, setIsAddGameOpen] = useState(false)
  const [newGame, setNewGame] = useState({
    courtId: "",
    startTime: "18:00",
    endTime: "20:00",
    maxPlayers: "10",
    createdBy: "",
  })
  const [joinGameId, setJoinGameId] = useState<string | null>(null)
  const [joinPlayerName, setJoinPlayerName] = useState("")
  const [selectedGame, setSelectedGame] = useState<ScheduledGame | null>(null)

  // Sample scheduled games data
  const [scheduledGames, setScheduledGames] = useState<ScheduledGame[]>([
    {
      id: "1",
      courtId: 1,
      sportType: "basketball",
      date: new Date(),
      startTime: "18:00",
      endTime: "20:00",
      players: [
        { name: "Alex Johnson", avatar: "/avatars/avatar-1.png" },
        { name: "Jamie Smith", avatar: "/avatars/avatar-2.png" },
        { name: "Taylor Brown", avatar: "/avatars/avatar-3.png" },
        { name: "Jordan Lee", avatar: "/avatars/avatar-4.png" },
      ],
      maxPlayers: 10,
      createdBy: "Alex Johnson",
    },
    {
      id: "2",
      courtId: 5,
      sportType: "basketball",
      date: new Date(),
      startTime: "19:00",
      endTime: "21:00",
      players: [
        { name: "Casey Wilson", avatar: "/avatars/avatar-5.png" },
        { name: "Riley Davis", avatar: "/avatars/avatar-6.png" },
      ],
      maxPlayers: 10,
      createdBy: "Casey Wilson",
    },
    {
      id: "3",
      courtId: 3,
      sportType: "volleyball",
      date: new Date(),
      startTime: "17:30",
      endTime: "19:30",
      players: [
        { name: "Morgan Taylor", avatar: "/avatars/avatar-7.png" },
        { name: "Drew Parker", avatar: "/avatars/avatar-8.png" },
        { name: "Avery Garcia", avatar: "/avatars/avatar-9.png" },
      ],
      maxPlayers: 8,
      createdBy: "Morgan Taylor",
    },
    {
      id: "4",
      courtId: 2,
      sportType: "football",
      date: new Date(),
      startTime: "16:00",
      endTime: "18:00",
      players: [
        { name: "Quinn Murphy", avatar: "/avatars/avatar-10.png" },
        { name: "Reese Thompson", avatar: "/avatars/avatar-11.png" },
        { name: "Cameron White", avatar: "/avatars/avatar-12.png" },
        { name: "Jordan Black", avatar: "/avatars/avatar-13.png" },
        { name: "Taylor Green", avatar: "/avatars/avatar-14.png" },
      ],
      maxPlayers: 12,
      createdBy: "Quinn Murphy",
    },
  ])

  // Filter courts by current sport
  const filteredCourts = allCourts.filter((court) => court.sports.includes(currentSport))

  // Filter games by current date and sport
  const filteredGames = scheduledGames.filter(
    (game) => game.sportType === currentSport && date && game.date.toDateString() === date.toDateString(),
  )

  // Handle adding a new game
  const handleAddGame = () => {
    if (!date || !newGame.courtId || !newGame.createdBy) return

    const newScheduledGame: ScheduledGame = {
      id: Math.random().toString(36).substring(2, 9),
      courtId: Number.parseInt(newGame.courtId),
      sportType: currentSport,
      date: date,
      startTime: newGame.startTime,
      endTime: newGame.endTime,
      players: [{ name: newGame.createdBy }],
      maxPlayers: Number.parseInt(newGame.maxPlayers),
      createdBy: newGame.createdBy,
    }

    setScheduledGames([...scheduledGames, newScheduledGame])
    setIsAddGameOpen(false)

    // Reset form
    setNewGame({
      courtId: "",
      startTime: "18:00",
      endTime: "20:00",
      maxPlayers: "10",
      createdBy: "",
    })
  }

  // Join a scheduled game
  const joinGame = (gameId: string, playerName: string) => {
    setScheduledGames(
      scheduledGames.map((game) => {
        if (game.id === gameId) {
          // Check if player is already in the game
          if (!game.players.some((p) => p.name === playerName)) {
            return {
              ...game,
              players: [...game.players, { name: playerName }],
            }
          }
        }
        return game
      }),
    )
    setJoinGameId(null)
    setJoinPlayerName("")
  }

  // Get court name by ID
  const getCourtName = (courtId: number) => {
    const court = allCourts.find((c) => c.id === courtId)
    return court ? court.name : "Unknown Court"
  }

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-col md:flex-row gap-6">
        <Card className="md:w-80 flex-shrink-0">
          <CardHeader>
            <CardTitle>Select Date</CardTitle>
            <CardDescription>Choose a date to see scheduled games</CardDescription>
          </CardHeader>
          <CardContent>
            <Calendar mode="single" selected={date} onSelect={setDate} className="rounded-md border" />
          </CardContent>
          <CardFooter>
            <Dialog open={isAddGameOpen} onOpenChange={setIsAddGameOpen}>
              <DialogTrigger asChild>
                <Button className="w-full">
                  <Plus className="mr-2 h-4 w-4" /> Schedule Game
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Schedule a Pickup Game</DialogTitle>
                  <DialogDescription>Create a new pickup game for others to join.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="court" className="text-right">
                      Location
                    </Label>
                    <Select
                      value={newGame.courtId}
                      onValueChange={(value) => setNewGame({ ...newGame, courtId: value })}
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select a court" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredCourts.map((court) => (
                          <SelectItem key={court.id} value={court.id.toString()}>
                            {court.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="start-time" className="text-right">
                      Start Time
                    </Label>
                    <Input
                      id="start-time"
                      type="time"
                      value={newGame.startTime}
                      onChange={(e) => setNewGame({ ...newGame, startTime: e.target.value })}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="end-time" className="text-right">
                      End Time
                    </Label>
                    <Input
                      id="end-time"
                      type="time"
                      value={newGame.endTime}
                      onChange={(e) => setNewGame({ ...newGame, endTime: e.target.value })}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="max-players" className="text-right">
                      Max Players
                    </Label>
                    <Select
                      value={newGame.maxPlayers}
                      onValueChange={(value) => setNewGame({ ...newGame, maxPlayers: value })}
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select max players" />
                      </SelectTrigger>
                      <SelectContent>
                        {[4, 6, 8, 10, 12, 14, 16, 20].map((num) => (
                          <SelectItem key={num} value={num.toString()}>
                            {num} players
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="your-name" className="text-right">
                      Your Name
                    </Label>
                    <Input
                      id="your-name"
                      value={newGame.createdBy}
                      onChange={(e) => setNewGame({ ...newGame, createdBy: e.target.value })}
                      className="col-span-3"
                      placeholder="Enter your name"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" onClick={handleAddGame} disabled={!newGame.courtId || !newGame.createdBy}>
                    Schedule Game
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardFooter>
        </Card>

        <div className="flex-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="h-5 w-5" />
                Scheduled Games
                {date && (
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    {date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                  </span>
                )}
              </CardTitle>
              <CardDescription>Join a scheduled pickup game or create your own</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredGames.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredGames.map((game) => (
                    <Card
                      key={game.id}
                      className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => setSelectedGame(game)}
                    >
                      <CardHeader className="p-4 pb-2 bg-muted/30">
                        <CardTitle className="text-base">{getCourtName(game.courtId)}</CardTitle>
                        <CardDescription className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {allCourts.find((c) => c.id === game.courtId)?.address.split(",")[0]}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-4 pt-3 space-y-3">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-1 text-sm">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span>
                              {game.startTime} - {game.endTime}
                            </span>
                          </div>
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {game.players.length}/{game.maxPlayers}
                          </Badge>
                        </div>

                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Players:</p>
                          <div className="flex -space-x-2 overflow-hidden">
                            {game.players.slice(0, 5).map((player, i) => (
                              <Avatar key={i} className="border-2 border-background w-8 h-8">
                                <AvatarImage src={player.avatar} />
                                <AvatarFallback>{player.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                            ))}
                            {game.players.length > 5 && (
                              <div className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-background bg-muted text-xs font-medium">
                                +{game.players.length - 5}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No games scheduled for this date.</p>
                  <Button variant="outline" className="mt-4" onClick={() => setIsAddGameOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Schedule a Game
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Game Details Dialog */}
      <GameDetailsDialog
        game={selectedGame}
        onClose={() => setSelectedGame(null)}
        onJoin={(playerName) => {
          if (selectedGame) {
            joinGame(selectedGame.id, playerName)
          }
          setSelectedGame(null)
        }}
      />

      <Dialog open={joinGameId === null ? false : true} onOpenChange={(open) => !open && setJoinGameId(null)}>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full" disabled={true} onClick={() => setJoinGameId("temp")}>
            Join Game
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Join Pickup Game</DialogTitle>
            <DialogDescription>Enter your name to join this game at {getCourtName(1)}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="join-name" className="text-right">
                Your Name
              </Label>
              <Input
                id="join-name"
                value={joinPlayerName}
                onChange={(e) => setJoinPlayerName(e.target.value)}
                placeholder="Enter your name"
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => joinGame("temp", joinPlayerName)} disabled={!joinPlayerName.trim()}>
              Join Game
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

