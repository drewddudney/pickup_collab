"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { UserPlus, X, Mail, Phone } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface Teammate {
  id: string
  name: string
  email?: string
  phone?: string
  avatar?: string
}

export default function TeammatesView() {
  const [teammates, setTeammates] = useState<Teammate[]>([])
  const [newTeammate, setNewTeammate] = useState({
    name: "",
    email: "",
    phone: "",
  })

  const addTeammate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTeammate.name.trim()) return

    const teammate: Teammate = {
      id: Math.random().toString(36).substring(2, 9),
      name: newTeammate.name.trim(),
      email: newTeammate.email.trim() || undefined,
      phone: newTeammate.phone.trim() || undefined,
      avatar: undefined, // You could add avatar upload functionality later
    }

    setTeammates((prev) => [...prev, teammate])
    setNewTeammate({ name: "", email: "", phone: "" })
  }

  const removeTeammate = (id: string) => {
    setTeammates((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>My Teammates</CardTitle>
          <CardDescription>Add and manage your regular teammates for quick team formation</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={addTeammate} className="space-y-4 mb-6">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={newTeammate.name}
                onChange={(e) => setNewTeammate({ ...newTeammate, name: e.target.value })}
                placeholder="Enter teammate's name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email (optional)</Label>
              <Input
                id="email"
                type="email"
                value={newTeammate.email}
                onChange={(e) => setNewTeammate({ ...newTeammate, email: e.target.value })}
                placeholder="Enter teammate's email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone (optional)</Label>
              <Input
                id="phone"
                type="tel"
                value={newTeammate.phone}
                onChange={(e) => setNewTeammate({ ...newTeammate, phone: e.target.value })}
                placeholder="Enter teammate's phone"
              />
            </div>
            <Button type="submit" className="w-full">
              <UserPlus className="h-4 w-4 mr-2" />
              Add Teammate
            </Button>
          </form>

          <div className="space-y-2">
            {teammates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No teammates added yet. Add some teammates to get started!
              </div>
            ) : (
              teammates.map((teammate) => (
                <div
                  key={teammate.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>{teammate.name.charAt(0)}</AvatarFallback>
                      {teammate.avatar && <AvatarImage src={teammate.avatar} />}
                    </Avatar>
                    <div>
                      <div className="font-medium">{teammate.name}</div>
                      {(teammate.email || teammate.phone) && (
                        <div className="text-sm text-muted-foreground space-x-3">
                          {teammate.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {teammate.email}
                            </span>
                          )}
                          {teammate.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {teammate.phone}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeTeammate(teammate.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 