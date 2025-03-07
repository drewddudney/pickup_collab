"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Clock, MapPin, Users } from "lucide-react"
import { useState } from "react"
import { allCourts } from "@/data/courts"

interface ScheduledGame {
  id: string
  courtId: number
  startTime: string
  endTime: string
  players: {
    name: string
    avatar: string
  }[]
  maxPlayers: number
}

interface GameDetailsDialogProps {
  game: ScheduledGame | null
  onClose: () => void
  onJoin: (playerName: string) => void
}

export function GameDetailsDialog({ game, onClose, onJoin }: GameDetailsDialogProps) {
  const [playerName, setPlayerName] = useState("")

  if (!game) return null

  const court = allCourts.find((c) => c.id === game.courtId)

  return (
    <Dialog open={!!game} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{court?.name}</DialogTitle>
          <DialogDescription className="flex items-center gap-1 text-sm">
            <MapPin className="h-3 w-3" />
            {court?.address}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>
                {game.startTime} - {game.endTime}
              </span>
            </div>
            <Badge variant="outline" className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {game.players.length}/{game.maxPlayers}
            </Badge>
          </div>
          <div>
            <h4 className="mb-2 font-medium">Players:</h4>
            <div className="grid grid-cols-2 gap-2">
              {game.players.map((player, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={player.avatar} />
                    <AvatarFallback>{player.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{player.name}</span>
                </div>
              ))}
            </div>
          </div>
          {game.players.length < game.maxPlayers && (
            <div className="space-y-2">
              <Label htmlFor="player-name">Your Name</Label>
              <Input
                id="player-name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter your name to join"
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {game.players.length < game.maxPlayers && (
            <Button onClick={() => onJoin(playerName)} disabled={!playerName.trim()}>
              Join Game
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

