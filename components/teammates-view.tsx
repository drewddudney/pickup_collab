"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Search, UserPlus, Users, Shield, Check, UserMinus, Trash2, LogOut, UserX } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion, arrayRemove, setDoc, getDoc, deleteDoc, addDoc } from "firebase/firestore"
import { useAuth } from "@/contexts/AuthContext"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { Loader2 } from "lucide-react"
import { useSport } from "@/components/sport-context"
import { SportSelector } from "@/components/sport-selector"

interface User {
  id: string
  displayName?: string
  email: string
  photoURL?: string
  sportId?: string
  firstName: string
  lastName: string
  city?: string
}

interface Team {
  id?: string
  name: string
  members: string[]
  owner: string
  createdAt: number
  sportId: string
}

export default function TeammatesView() {
  const { user } = useAuth()
  const { toast } = useToast()
  const { selectedSport } = useSport()
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [friends, setFriends] = useState<User[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)
  const [activeTeamId, setActiveTeamId] = useState<string>("")
  const [newTeamName, setNewTeamName] = useState("")
  const [selectedFriends, setSelectedFriends] = useState<string[]>([])
  const [teamMembers, setTeamMembers] = useState<{ [teamId: string]: User[] }>({})
  const [isLoading, setIsLoading] = useState({
    friends: false,
    teams: false,
    search: false,
    addFriend: false,
    removeFriend: false,
    createTeam: false,
    inviteMembers: false,
    removeMember: false,
    deleteTeam: false,
    leaveTeam: false,
  })
  const [pendingFriends, setPendingFriends] = useState<User[]>([])

  // Fetch friends list
  useEffect(() => {
    const fetchFriends = async () => {
      if (!user?.uid) return
      
      try {
        // Get friends from the friends subcollection
        const friendsCollectionRef = collection(db, "users", user.uid, "friends")
        const friendsSnapshot = await getDocs(friendsCollectionRef)
        
        const friendsData = friendsSnapshot.docs.map(doc => {
          return { id: doc.id, ...doc.data() } as User
        })
        
        setFriends(friendsData)
        
        // Get pending friend requests from the friendRequests collection
        const pendingRequestsQuery = query(
          collection(db, "friendRequests"),
          where("toUserId", "==", user.uid),
          where("status", "==", "pending")
        )
        const pendingSnapshot = await getDocs(pendingRequestsQuery)
        
        const pendingFriendsData = pendingSnapshot.docs.map(doc => {
          const data = doc.data()
          return { 
            id: data.fromUserId,
            firstName: data.fromUserName.split(' ')[0] || '',
            lastName: data.fromUserName.split(' ')[1] || '',
            email: data.fromUserEmail,
            photoURL: data.fromUserPhoto,
            requestId: doc.id,
            isPending: true 
          } as User & { requestId: string, isPending: boolean }
        })
        
        // Set pending friends
        setPendingFriends(pendingFriendsData)
      } catch (error) {
        console.error("Error fetching friends:", error)
      }
    }

    fetchFriends()
  }, [user])

  // Fetch teams
  useEffect(() => {
    const fetchTeams = async () => {
      if (!user?.uid) return
      
      setIsLoading(prev => ({ ...prev, teams: true }))
      try {
        const teamsQuery = query(
          collection(db, "teams"),
          where("members", "array-contains", user.uid),
          where("sportId", "==", selectedSport.id)
        )
        
        const teamsSnapshot = await getDocs(teamsQuery)
        const teamsData = teamsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Team[]
        
        setTeams(teamsData)

        // Fetch members for each team
        const membersData: { [teamId: string]: User[] } = {}
        await Promise.all(
          teamsData.map(async (team) => {
            const members = await Promise.all(
              team.members.map(async (memberId) => {
                const memberDoc = await getDoc(doc(db, "users", memberId))
                return { id: memberId, ...memberDoc.data() } as User
              })
            )
            if (team.id) {
              membersData[team.id] = members
            }
          })
        )
        setTeamMembers(membersData)
      } catch (error) {
        console.error("Error fetching teams:", error)
        toast({
          title: "Error fetching teams",
          description: "There was a problem loading your teams.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(prev => ({ ...prev, teams: false }))
      }
    }

    fetchTeams()
  }, [user, selectedSport.id])

  // Search users
  const handleSearch = async () => {
    if (!searchQuery.trim() || !user?.uid) return

    setIsLoading(prev => ({ ...prev, search: true }))
    try {
      const usersRef = collection(db, "users")
      
      // Get all users and filter in JavaScript
      const querySnapshot = await getDocs(usersRef)
      
      const allUsers = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as User))
        .filter(u => u.id !== user.uid)
      
      // Filter users by search query
      const results = allUsers.filter(user => {
        const fullName = `${user.firstName} ${user.lastName}`.toLowerCase()
        const email = user.email.toLowerCase()
        const firstName = user.firstName?.toLowerCase() || ''
        const lastName = user.lastName?.toLowerCase() || ''
        const query = searchQuery.toLowerCase()
        
        return fullName.includes(query) || 
               email.includes(query) || 
               firstName.includes(query) || 
               lastName.includes(query)
      })
      
      setSearchResults(results)
    } catch (error) {
      console.error("Error searching users:", error)
      toast({
        title: "Search failed",
        description: "There was a problem searching for users.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(prev => ({ ...prev, search: false }))
    }
  }

  // Send friend request
  const handleAddFriend = async (friendId: string) => {
    if (!user?.uid) return
    
    setIsLoading(prev => ({ ...prev, addFriend: true }))
    
    try {
      console.log("Starting friend request process for:", friendId);
      
      // Get the friend's data to include in the notification
      const friendDocRef = doc(db, "users", friendId)
      const friendDocSnap = await getDoc(friendDocRef)
      const friendData = friendDocSnap.data()
      
      console.log("Friend data:", friendData);
      
      // Get current user's data
      const userDocRef = doc(db, "users", user.uid)
      const userDocSnap = await getDoc(userDocRef)
      const userData = userDocSnap.data()
      
      console.log("User data:", userData);
      
      // Create a unique ID for the friend request
      const requestId = `${user.uid}_${friendId}`
      
      console.log("Creating friend request with ID:", requestId);
      
      // Create the friend request in the friendRequests collection
      const friendRequestRef = doc(db, "friendRequests", requestId)
      await setDoc(friendRequestRef, {
        fromUserId: user.uid,
        toUserId: friendId,
        fromUserName: `${userData?.firstName} ${userData?.lastName}`,
        fromUserEmail: user.email || "",
        fromUserPhoto: user.photoURL || "",
        toUserName: `${friendData?.firstName} ${friendData?.lastName}`,
        toUserEmail: friendData?.email || "",
        status: "pending",
        createdAt: Date.now()
      })
      
      console.log("Friend request created successfully");
      
      // Create a notification for the friend
      const notificationsRef = collection(db, "notifications")
      const notificationData = {
        type: 'friend_request',
        fromUserId: user.uid,
        toUserId: friendId,
        message: `${userData?.firstName} ${userData?.lastName} sent you a friend request`,
        read: false,
        createdAt: Date.now(),
        data: {
          fromUserName: `${userData?.firstName} ${userData?.lastName}`,
          fromUserPhoto: user.photoURL || null,
          fromUserEmail: user.email,
          requestId: requestId
        }
      };
      
      console.log("Creating notification with data:", notificationData);
      console.log("Notification toUserId:", friendId);
      console.log("Current user ID:", user.uid);
      
      // Double-check that we're not sending a notification to ourselves
      if (friendId === user.uid) {
        throw new Error("Cannot send a friend request to yourself");
      }
      
      const notificationDoc = await addDoc(notificationsRef, notificationData);
      
      console.log("Notification created with ID:", notificationDoc.id);
      
      toast({
        title: "Friend request sent",
        description: `A friend request has been sent to ${friendData?.firstName} ${friendData?.lastName}`,
      })
      
      // Clear search results
      setSearchResults([])
      setSearchQuery("")
    } catch (error) {
      console.error("Error sending friend request:", error)
      toast({
        title: "Error",
        description: "Failed to send friend request. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(prev => ({ ...prev, addFriend: false }))
    }
  }

  // Create team
  const handleCreateTeam = async () => {
    if (!user?.uid || !newTeamName.trim()) return

    setIsLoading(prev => ({ ...prev, createTeam: true }))
    try {
      const newTeam: Team = {
        name: newTeamName,
        members: [user.uid, ...selectedFriends],
        owner: user.uid,
        createdAt: Date.now(),
        sportId: selectedSport.id
      }

      const teamRef = doc(collection(db, "teams"))
      await setDoc(teamRef, newTeam)

      // Fetch member details for the new team
      const members = await Promise.all(
        newTeam.members.map(async (memberId) => {
          const memberDoc = await getDoc(doc(db, "users", memberId))
          return { id: memberId, ...memberDoc.data() } as User
        })
      )

      const newTeamWithId = { ...newTeam, id: teamRef.id }
      setTeams([...teams, newTeamWithId])
      setTeamMembers({ ...teamMembers, [teamRef.id]: members })
      
      // Reset state
      setNewTeamName("")
      setSelectedFriends([])
      setIsDialogOpen(false)
    } catch (error) {
      console.error("Error creating team:", error)
      toast({
        title: "Error creating team",
        description: "There was a problem creating your team.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(prev => ({ ...prev, createTeam: false }))
    }
  }

  const toggleFriendSelection = (friendId: string) => {
    setSelectedFriends(prev => 
      prev.includes(friendId) 
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    )
  }

  // Remove friend
  const handleRemoveFriend = async (friendId: string) => {
    if (!user?.uid) return;

    setIsLoading(prev => ({ ...prev, removeFriend: true }));

    try {
      // Delete from both users' friends subcollections
      const userFriendRef = doc(db, "users", user.uid, "friends", friendId);
      const friendUserRef = doc(db, "users", friendId, "friends", user.uid);
      
      await deleteDoc(userFriendRef);
      
      // Try to delete from the other user's collection, but don't fail if it doesn't exist
      try {
        await deleteDoc(friendUserRef);
      } catch (error) {
        console.log("Friend reference may not exist", error);
      }

      // Update local state
      setFriends(friends.filter(friend => friend.id !== friendId));
      
      toast({
        title: "Friend removed",
        description: "This person has been removed from your friends list.",
      });
    } catch (error) {
      console.error("Error removing friend:", error);
      toast({
        title: "Error",
        description: "Failed to remove friend. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(prev => ({ ...prev, removeFriend: false }));
    }
  };

  // Leave team
  const handleLeaveTeam = async (teamId: string) => {
    if (!user?.uid) return;

    try {
      const teamRef = doc(db, "teams", teamId);
      await updateDoc(teamRef, {
        members: arrayRemove(user.uid)
      });

      // Update local state
      setTeams(teams.filter(team => team.id !== teamId));
      const newTeamMembers = { ...teamMembers };
      delete newTeamMembers[teamId];
      setTeamMembers(newTeamMembers);
    } catch (error) {
      console.error("Error leaving team:", error);
    }
  };

  // Delete team
  const handleDeleteTeam = async (teamId: string) => {
    if (!user?.uid) return;

    try {
      const teamRef = doc(db, "teams", teamId);
      await deleteDoc(teamRef);

      // Update local state
      setTeams(teams.filter(team => team.id !== teamId));
      const newTeamMembers = { ...teamMembers };
      delete newTeamMembers[teamId];
      setTeamMembers(newTeamMembers);
    } catch (error) {
      console.error("Error deleting team:", error);
    }
  };

  // Invite members to existing team
  const handleInviteMembers = async (teamId: string) => {
    if (!user?.uid || !selectedFriends.length) return;

    setIsLoading(prev => ({ ...prev, inviteMembers: true }));
    try {
      const teamRef = doc(db, "teams", teamId);
      await updateDoc(teamRef, {
        members: arrayUnion(...selectedFriends)
      });

      // Fetch updated member details
      const newMembers = await Promise.all(
        selectedFriends.map(async (memberId) => {
          const memberDoc = await getDoc(doc(db, "users", memberId));
          return { id: memberId, ...memberDoc.data() } as User;
        })
      );

      // Update local state
      setTeamMembers(prev => ({
        ...prev,
        [teamId]: [...(prev[teamId] || []), ...newMembers]
      }));

      setSelectedFriends([]);
      setIsInviteDialogOpen(false);
      toast({
        title: "Team members invited",
        description: "The selected friends have been added to the team.",
      });
    } catch (error) {
      console.error("Error inviting members:", error);
      toast({
        title: "Error inviting members",
        description: "There was a problem adding members to the team.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(prev => ({ ...prev, inviteMembers: false }));
    }
  };

  // Remove member from team
  const handleRemoveMember = async (teamId: string, memberId: string) => {
    if (!user?.uid) return;

    setIsLoading(prev => ({ ...prev, removeMember: true }));
    try {
      const teamRef = doc(db, "teams", teamId);
      await updateDoc(teamRef, {
        members: arrayRemove(memberId)
      });

      // Update local state
      setTeamMembers(prev => ({
        ...prev,
        [teamId]: prev[teamId]?.filter(member => member.id !== memberId) || []
      }));

      toast({
        title: "Member removed",
        description: "The team member has been removed.",
      });
    } catch (error) {
      console.error("Error removing member:", error);
      toast({
        title: "Error removing member",
        description: "There was a problem removing the team member.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(prev => ({ ...prev, removeMember: false }));
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Teams & Friends</h2>
      </div>

      <Tabs defaultValue="friends">
        <TabsList>
          <TabsTrigger value="friends">
            <Users className="h-4 w-4 mr-2" />
            Friends
          </TabsTrigger>
          <TabsTrigger value="teams">
            <Shield className="h-4 w-4 mr-2" />
            Teams
          </TabsTrigger>
        </TabsList>

        <TabsContent value="friends">
      <Card>
        <CardHeader>
              <CardTitle>Find Players</CardTitle>
              <CardDescription>Search for other players to add as friends</CardDescription>
        </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex gap-2">
              <Input
                  placeholder="Search by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Button onClick={handleSearch} variant="secondary">
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
              </div>
              
              {searchResults.length > 0 && (
                <ScrollArea className="h-[200px]">
                  <div className="space-y-4">
                    {searchResults.map((result) => (
                      <div key={result.id} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={result.photoURL} />
                            <AvatarFallback>
                              {result.firstName?.[0] || ''}{result.lastName?.[0] || ''}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {result.firstName} {result.lastName}
                            </p>
                            <div className="flex items-center gap-2">
                              <p className="text-sm text-muted-foreground">{result.email}</p>
                              {result.city && (
                                <span className="text-xs bg-muted px-1.5 py-0.5 rounded-md">
                                  {result.city}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddFriend(result.id)}
                          disabled={
                            friends.some(f => f.id === result.id) || 
                            pendingFriends.some(f => f.id === result.id) ||
                            isLoading.addFriend
                          }
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          {friends.some(f => f.id === result.id) 
                            ? "Friend Added" 
                            : pendingFriends.some(f => f.id === result.id)
                              ? "Request Pending"
                              : isLoading.addFriend
                                ? "Sending..."
                                : "Add Friend"
                          }
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}

              <div>
                <h3 className="font-medium mb-4">Your Friends</h3>
                
                {pendingFriends.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Pending Friend Requests</h4>
                    <div className="space-y-2">
                      {pendingFriends.map((friend) => (
                        <div key={friend.id} className="flex items-center justify-between p-2 bg-muted/50 border border-dashed border-muted-foreground/30 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={friend.photoURL} />
                              <AvatarFallback>{friend.firstName?.[0]}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{friend.firstName} {friend.lastName}</p>
                                <Badge variant="outline" className="text-xs">Pending</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">{friend.email}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <ScrollArea className="h-[200px]">
                  <div className="space-y-4">
                    {friends.map((friend) => (
                      <div key={friend.id} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={friend.photoURL} />
                            <AvatarFallback>{friend.firstName?.[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{friend.firstName} {friend.lastName}</p>
                            <p className="text-sm text-muted-foreground">{friend.email}</p>
                          </div>
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
                              <UserMinus className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove Friend</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to remove this friend? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleRemoveFriend(friend.id)}>
                                Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="teams">
          {isLoading.teams ? (
            <div className="flex items-center justify-center h-[400px]">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Your Teams</CardTitle>
                    <CardDescription>Teams you're a part of</CardDescription>
                  </div>
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <Shield className="h-4 w-4 mr-2" />
                        Create Team
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create New Team</DialogTitle>
                        <DialogDescription>
                          Name your team and invite friends to join
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
            <div className="space-y-2">
                          <Label htmlFor="team-name">Team Name</Label>
              <Input
                            id="team-name"
                            placeholder="Enter team name..."
                            value={newTeamName}
                            onChange={(e) => setNewTeamName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
                          <Label>Select Friends to Invite</Label>
                          <ScrollArea className="h-[200px] border rounded-md p-2">
          <div className="space-y-2">
                              {friends.map((friend) => (
                                <div
                                  key={friend.id}
                                  className="flex items-center justify-between p-2 hover:bg-muted rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                                      <AvatarImage src={friend.photoURL} />
                                      <AvatarFallback>{friend.displayName?.[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                                      <p className="font-medium">{friend.displayName}</p>
                                      <p className="text-sm text-muted-foreground">{friend.email}</p>
                                    </div>
                                  </div>
                                  <Button
                                    variant={selectedFriends.includes(friend.id) ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => toggleFriendSelection(friend.id)}
                                  >
                                    {selectedFriends.includes(friend.id) ? (
                                      <>
                                        <Check className="h-4 w-4 mr-2" />
                                        Selected
                                      </>
                                    ) : (
                                      "Select"
                                    )}
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" onClick={() => {
                            setIsDialogOpen(false)
                            setNewTeamName("")
                            setSelectedFriends([])
                          }}>
                            Cancel
                          </Button>
                          <Button 
                            onClick={handleCreateTeam} 
                            disabled={!newTeamName.trim()}
                          >
                            Create Team
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4">
                    {teams.map((team) => (
                      <Card key={team.id}>
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle>{team.name}</CardTitle>
                              <CardDescription>
                                {team.owner === user?.uid ? "Team Owner" : "Team Member"}
                              </CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                              {team.owner === user?.uid && (
                                <Dialog open={isInviteDialogOpen && activeTeamId === team.id} 
                                       onOpenChange={(open) => {
                                         setIsInviteDialogOpen(open);
                                         if (open) setActiveTeamId(team.id!);
                                         else {
                                           setSelectedFriends([]);
                                           setActiveTeamId("");
                                         }
                                       }}>
                                  <DialogTrigger asChild>
                                    <Button variant="outline" size="sm">
                                      <UserPlus className="h-4 w-4 mr-2" />
                                      Invite Members
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Invite Team Members</DialogTitle>
                                      <DialogDescription>
                                        Select friends to invite to {team.name}
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                      <ScrollArea className="h-[200px] border rounded-md p-2">
                                        <div className="space-y-2">
                                          {friends
                                            .filter(friend => !team.members.includes(friend.id))
                                            .map((friend) => (
                                              <div
                                                key={friend.id}
                                                className="flex items-center justify-between p-2 hover:bg-muted rounded-lg"
                                              >
                                                <div className="flex items-center gap-3">
                                                  <Avatar>
                                                    <AvatarImage src={friend.photoURL} />
                                                    <AvatarFallback>
                                                      {friend.firstName?.[0] || ''}{friend.lastName?.[0] || ''}
                                                    </AvatarFallback>
                                                  </Avatar>
                                                  <div>
                                                    <p className="font-medium">
                                                      {friend.firstName} {friend.lastName}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">{friend.email}</p>
                                                  </div>
                                                </div>
                                                <Button
                                                  variant={selectedFriends.includes(friend.id) ? "default" : "outline"}
                                                  size="sm"
                                                  onClick={() => toggleFriendSelection(friend.id)}
                                                >
                                                  {selectedFriends.includes(friend.id) ? (
                                                    <>
                                                      <Check className="h-4 w-4 mr-2" />
                                                      Selected
                                                    </>
                                                  ) : (
                                                    "Select"
                                                  )}
                                                </Button>
                                              </div>
                                            ))}
                                        </div>
                                      </ScrollArea>
                                      <div className="flex justify-end gap-2">
                                        <Button variant="ghost" onClick={() => {
                                          setIsInviteDialogOpen(false);
                                          setSelectedFriends([]);
                                          setActiveTeamId("");
                                        }}>
                                          Cancel
                                        </Button>
                                        <Button
                                          onClick={() => handleInviteMembers(team.id!)}
                                          disabled={!selectedFriends.length || isLoading.inviteMembers}
                                        >
                                          {isLoading.inviteMembers && (
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                          )}
                                          Invite Selected
                    </Button>
                  </div>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              )}
                              <Badge variant="secondary">
                                {team.members.length} members
                              </Badge>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <Label>Team Members</Label>
                              {team.owner === user?.uid ? (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="sm" className="text-destructive">
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete Team
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Team</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete this team? This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDeleteTeam(team.id!)}
                                        className="bg-destructive hover:bg-destructive/90"
                                        disabled={isLoading.deleteTeam}
                                      >
                                        {isLoading.deleteTeam && (
                                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        )}
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              ) : (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="sm" className="text-muted-foreground">
                                      <LogOut className="h-4 w-4 mr-2" />
                                      Leave Team
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Leave Team</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to leave this team?
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleLeaveTeam(team.id!)}
                                        className="bg-destructive hover:bg-destructive/90"
                                        disabled={isLoading.leaveTeam}
                                      >
                                        {isLoading.leaveTeam && (
                                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        )}
                                        Leave
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </div>
                            <div className="space-y-2">
                              {team.id && teamMembers[team.id]?.map((member) => (
                                <div
                                  key={member.id}
                                  className="flex items-center justify-between p-2 bg-muted rounded-lg"
                                >
                                  <div className="flex items-center gap-3">
                                    <Avatar>
                                      <AvatarImage src={member.photoURL} />
                                      <AvatarFallback>{member.displayName?.[0]}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <p className="font-medium">{member.displayName}</p>
                                      <p className="text-sm text-muted-foreground">{member.email}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {member.id === team.owner ? (
                                      <Badge>Owner</Badge>
                                    ) : team.owner === user?.uid && (
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
                                            <UserX className="h-4 w-4" />
                                          </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>Remove Member</AlertDialogTitle>
                                            <AlertDialogDescription>
                                              Are you sure you want to remove {member.displayName} from the team?
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction
                                              onClick={() => handleRemoveMember(team.id!, member.id)}
                                              className="bg-destructive hover:bg-destructive/90"
                                              disabled={isLoading.removeMember}
                                            >
                                              {isLoading.removeMember && (
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                              )}
                                              Remove
                                            </AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
            )}
          </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
        </CardContent>
      </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
} 