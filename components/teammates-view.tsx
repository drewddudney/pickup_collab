"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Search, UserPlus, Users, Shield, Check, UserMinus, Trash2, LogOut, UserX, X } from "lucide-react"
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
import Link from "next/link"
import { useAppContext } from "@/app/page"

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

interface PendingFriend extends User {
  requestId?: string
  direction?: 'incoming' | 'outgoing'
  isPending?: boolean
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
  const { setActiveTab } = useAppContext()
  const [teammatesTab, setTeammatesTab] = useState("friends")
  const [friends, setFriends] = useState<User[]>([])
  const [pendingFriends, setPendingFriends] = useState<PendingFriend[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isInviting, setIsInviting] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [showRemoveDialog, setShowRemoveDialog] = useState(false)
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
    pendingFriends: false,
  })

  // Fetch friends list
  useEffect(() => {
    const fetchFriends = async () => {
      if (!user?.uid) return
      
      setIsLoading(prev => ({ ...prev, friends: true, pendingFriends: true }))
      
      try {
        // Get friends from the friends subcollection
        const friendsCollectionRef = collection(db, "users", user.uid, "friends")
        const friendsSnapshot = await getDocs(friendsCollectionRef)
        
        // Get detailed user data for each friend
        const friendsPromises = friendsSnapshot.docs.map(async (docSnapshot) => {
          const friendId = docSnapshot.id
          const friendProfileRef = doc(db, "users", friendId)
          const friendProfileDoc = await getDoc(friendProfileRef)
          
          if (friendProfileDoc.exists()) {
            const friendData = friendProfileDoc.data()
            return { 
              id: friendId,
              firstName: friendData.firstName || '',
              lastName: friendData.lastName || '',
              email: friendData.email || '',
              photoURL: friendData.profilePicture || friendData.photoURL || '',
              city: friendData.city || ''
            } as User
          }
          
          return { id: friendId, ...docSnapshot.data() } as User
        })
        
        const friendsData = await Promise.all(friendsPromises)
        setFriends(friendsData)
        
        // Get incoming friend requests (requests sent to the current user)
        const incomingRequestsQuery = query(
          collection(db, "friendRequests"),
          where("toUserId", "==", user.uid),
          where("status", "==", "pending")
        )
        const incomingSnapshot = await getDocs(incomingRequestsQuery)
        
        const incomingFriendsPromises = incomingSnapshot.docs.map(async (docSnapshot) => {
          const data = docSnapshot.data()
          const fromUserId = data.fromUserId
          
          // Get detailed user data for the sender
          const senderProfileRef = doc(db, "users", fromUserId)
          const senderProfileDoc = await getDoc(senderProfileRef)
          
          let firstName = data.fromUserName?.split(' ')[0] || ''
          let lastName = data.fromUserName?.split(' ')[1] || ''
          let photoURL = data.fromUserPhoto || ''
          
          if (senderProfileDoc.exists()) {
            const senderData = senderProfileDoc.data()
            firstName = senderData.firstName || firstName
            lastName = senderData.lastName || lastName
            photoURL = senderData.profilePicture || senderData.photoURL || photoURL
          }
          
          return { 
            id: fromUserId,
            firstName,
            lastName,
            email: data.fromUserEmail || '',
            photoURL,
            requestId: docSnapshot.id,
            isPending: true,
            direction: 'incoming'
          } as PendingFriend
        })
        
        const incomingFriendsData = await Promise.all(incomingFriendsPromises)
        
        // Get outgoing friend requests (requests sent by the current user)
        const outgoingRequestsQuery = query(
          collection(db, "friendRequests"),
          where("fromUserId", "==", user.uid),
          where("status", "==", "pending")
        )
        const outgoingSnapshot = await getDocs(outgoingRequestsQuery)
        
        const outgoingFriendsPromises = outgoingSnapshot.docs.map(async (docSnapshot) => {
          const data = docSnapshot.data()
          const toUserId = data.toUserId
          
          // Get detailed user data for the recipient
          const recipientProfileRef = doc(db, "users", toUserId)
          const recipientProfileDoc = await getDoc(recipientProfileRef)
          
          let firstName = data.toUserName?.split(' ')[0] || ''
          let lastName = data.toUserName?.split(' ')[1] || ''
          let photoURL = data.toUserPhoto || ''
          
          if (recipientProfileDoc.exists()) {
            const recipientData = recipientProfileDoc.data()
            firstName = recipientData.firstName || firstName
            lastName = recipientData.lastName || lastName
            photoURL = recipientData.profilePicture || recipientData.photoURL || photoURL
          }
          
          return { 
            id: toUserId,
            firstName,
            lastName,
            email: data.toUserEmail || '',
            photoURL,
            requestId: docSnapshot.id,
            isPending: true,
            direction: 'outgoing'
          } as PendingFriend
        })
        
        const outgoingFriendsData = await Promise.all(outgoingFriendsPromises)
        
        // Combine incoming and outgoing requests
        const allPendingFriends = [...incomingFriendsData, ...outgoingFriendsData]
        
        // Set pending friends
        setPendingFriends(allPendingFriends)
      } catch (error) {
        console.error("Error fetching friends:", error)
      } finally {
        setIsLoading(prev => ({ ...prev, friends: false, pendingFriends: false }))
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
      
      // Add to local pending friends state to update UI immediately
      const newPendingFriend = {
        id: friendId,
        firstName: friendData?.firstName || "",
        lastName: friendData?.lastName || "",
        email: friendData?.email || "",
        photoURL: friendData?.photoURL || "",
        requestId: requestId,
        isPending: true,
        direction: 'outgoing'
      } as User & { requestId: string, isPending: boolean, direction: 'incoming' | 'outgoing' };
      
      setPendingFriends(prev => [...prev, newPendingFriend]);
      
      toast({
        title: "Friend request sent",
        description: `A friend request has been sent to ${friendData?.firstName} ${friendData?.lastName}`,
      })
      
      // Don't clear search results, just update the button state
      // setSearchResults([])
      // setSearchQuery("")
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

  const navigateToPlayerSearch = () => {
    setActiveTab('player-search');
  }

  const handleAcceptFriendRequest = async (requestId: string) => {
    if (!user) return;
    
    try {
      setIsLoading(prev => ({ ...prev, pendingFriends: true }));
      
      // Get the friend request document
      const requestDoc = await getDoc(doc(db, 'friendRequests', requestId));
      
      if (!requestDoc.exists()) {
        throw new Error("Friend request not found");
      }
      
      const requestData = requestDoc.data();
      const senderId = requestData.fromUserId;
      const receiverId = requestData.toUserId;
      
      // Get sender user data
      const senderDoc = await getDoc(doc(db, 'users', senderId));
      if (!senderDoc.exists()) {
        throw new Error("Sender user not found");
      }
      const senderData = senderDoc.data();
      
      // Get receiver user data
      const receiverDoc = await getDoc(doc(db, 'users', receiverId));
      if (!receiverDoc.exists()) {
        throw new Error("Receiver user not found");
      }
      const receiverData = receiverDoc.data();
      
      console.log("Adding friends:", {senderId, receiverId});
      console.log("Sender data:", senderData);
      console.log("Receiver data:", receiverData);
      
      // Create friend entries in both users' collections
      try {
        // Add sender to receiver's friends
        await setDoc(doc(db, `users/${receiverId}/friends/${senderId}`), {
          firstName: senderData.firstName || '',
          lastName: senderData.lastName || '',
          email: senderData.email || '',
          photoURL: senderData.profilePicture || senderData.photoURL || '',
          createdAt: new Date(),
          status: 'accepted'
        });
        
        console.log("Added sender to receiver's friends");
        
        // Add receiver to sender's friends
        await setDoc(doc(db, `users/${senderId}/friends/${receiverId}`), {
          firstName: receiverData.firstName || '',
          lastName: receiverData.lastName || '',
          email: receiverData.email || '',
          photoURL: receiverData.profilePicture || receiverData.photoURL || '',
          createdAt: new Date(),
          status: 'accepted'
        });
        
        console.log("Added receiver to sender's friends");
        
        // Delete the friend request
        await deleteDoc(doc(db, 'friendRequests', requestId));
        
        console.log("Deleted friend request");
        
        // Update the local state
        const friendToAdd = pendingFriends.find(friend => friend.requestId === requestId);
        if (friendToAdd) {
          setFriends(prev => [...prev, {
            id: friendToAdd.id,
            firstName: friendToAdd.firstName,
            lastName: friendToAdd.lastName,
            email: friendToAdd.email,
            photoURL: friendToAdd.photoURL,
            displayName: friendToAdd.displayName
          }]);
          
          setPendingFriends(prev => prev.filter(friend => friend.requestId !== requestId));
        }
        
        toast({
          title: "Friend request accepted",
          description: "You are now friends",
        });
      } catch (error) {
        console.error("Error accepting friend request:", error);
        toast({
          title: "Error",
          description: "Failed to accept friend request. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error accepting friend request:", error);
      toast({
        title: "Error",
        description: "Failed to accept friend request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(prev => ({ ...prev, pendingFriends: false }));
    }
  };

  const handleDeclineFriendRequest = async (requestId: string) => {
    if (!user) return;
    
    try {
      setIsLoading(prev => ({ ...prev, pendingFriends: true }));
      
      // Delete the friend request document
      await deleteDoc(doc(db, 'friendRequests', requestId));
      
      // Update the local state
      setPendingFriends(prev => prev.filter(friend => friend.requestId !== requestId));
      
      toast({
        title: "Friend request declined",
        description: "Friend request has been declined",
      });
    } catch (error) {
      console.error("Error declining friend request:", error);
      toast({
        title: "Error",
        description: "Failed to decline friend request",
        variant: "destructive",
      });
    } finally {
      setIsLoading(prev => ({ ...prev, pendingFriends: false }));
    }
  };

  const handleCancelFriendRequest = async (requestId: string) => {
    if (!user) return;
    
    try {
      setIsLoading(prev => ({ ...prev, pendingFriends: true }));
      
      // Delete the friend request document
      await deleteDoc(doc(db, 'friendRequests', requestId));
      
      // Update the local state
      setPendingFriends(prev => prev.filter(friend => friend.requestId !== requestId));
      
      toast({
        title: "Request cancelled",
        description: "Friend request has been cancelled",
      });
    } catch (error) {
      console.error("Error cancelling friend request:", error);
      toast({
        title: "Error",
        description: "Failed to cancel friend request",
        variant: "destructive",
      });
    } finally {
      setIsLoading(prev => ({ ...prev, pendingFriends: false }));
    }
  };

  return (
    <div className="container py-6 pb-20">
      <Card>
        <CardHeader>
          <CardTitle>Teammates</CardTitle>
          <CardDescription>Manage your friends and teammates</CardDescription>
        </CardHeader>
        
        <CardContent>
          <Tabs defaultValue="friends">
            <TabsList>
              <TabsTrigger value="friends">Friends</TabsTrigger>
              <TabsTrigger value="pending" className="relative">
                Pending
                {pendingFriends.length > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                    {pendingFriends.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="teams">Teams</TabsTrigger>
            </TabsList>
            
            <TabsContent value="friends" className="mt-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Your Friends</CardTitle>
                    <CardDescription>Manage your friends</CardDescription>
                  </div>
                  <Button onClick={navigateToPlayerSearch}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Find Players
                  </Button>
                </CardHeader>
                <CardContent>
                  {friends.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground mb-4">You don't have any friends yet</p>
                      <Button onClick={navigateToPlayerSearch}>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Find Players
                      </Button>
                    </div>
                  ) : (
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-4">
                        {friends.map((friend) => (
                          <div key={friend.id} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarImage src={friend.photoURL || ''} alt={`${friend.firstName} ${friend.lastName}`} />
                                <AvatarFallback>
                                  {friend.firstName && friend.lastName
                                    ? `${friend.firstName[0]}${friend.lastName[0]}`
                                    : "U"}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{friend.firstName} {friend.lastName}</p>
                                <p className="text-sm text-muted-foreground">{friend.city || 'No location'}</p>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemoveFriend(friend.id)}
                            >
                              <UserMinus className="h-4 w-4 mr-2" />
                              Remove
                            </Button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="pending" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Pending Requests</CardTitle>
                  <CardDescription>Manage your pending friend requests</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading.pendingFriends ? (
                    <div className="flex items-center justify-center h-[200px]">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : pendingFriends.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No pending friend requests</p>
                      <Button onClick={navigateToPlayerSearch} className="mt-4">
                        <UserPlus className="h-4 w-4 mr-2" />
                        Find Players
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Incoming requests */}
                      {pendingFriends.some(friend => friend.direction === 'incoming') && (
                        <div>
                          <h3 className="text-sm font-medium mb-3">Incoming Requests</h3>
                          <ScrollArea className="h-[200px]">
                            <div className="space-y-3">
                              {pendingFriends
                                .filter(friend => friend.direction === 'incoming')
                                .map((friend) => (
                                  <div key={friend.id} className="flex items-center justify-between p-3 border rounded-lg">
                                    <div className="flex items-center gap-3">
                                      <Avatar>
                                        <AvatarImage src={friend.photoURL || ""} alt={friend.displayName || "User"} />
                                        <AvatarFallback>
                                          {friend.firstName && friend.lastName
                                            ? `${friend.firstName[0]}${friend.lastName[0]}`
                                            : "U"}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div>
                                        <p className="font-medium">
                                          {friend.firstName} {friend.lastName}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                          Wants to be your friend
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex gap-2">
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => handleAcceptFriendRequest(friend.requestId || '')}
                                      >
                                        <Check className="h-4 w-4 mr-1" />
                                        Accept
                                      </Button>
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => handleDeclineFriendRequest(friend.requestId || '')}
                                      >
                                        <X className="h-4 w-4 mr-1" />
                                        Decline
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </ScrollArea>
                        </div>
                      )}
                      
                      {/* Outgoing requests */}
                      {pendingFriends.some(friend => friend.direction === 'outgoing') && (
                        <div>
                          <h3 className="text-sm font-medium mb-3">Outgoing Requests</h3>
                          <ScrollArea className="h-[200px]">
                            <div className="space-y-3">
                              {pendingFriends
                                .filter(friend => friend.direction === 'outgoing')
                                .map((friend) => (
                                  <div key={friend.id} className="flex items-center justify-between p-3 border rounded-lg">
                                    <div className="flex items-center gap-3">
                                      <Avatar>
                                        <AvatarImage src={friend.photoURL || ""} alt={friend.displayName || "User"} />
                                        <AvatarFallback>
                                          {friend.firstName && friend.lastName
                                            ? `${friend.firstName[0]}${friend.lastName[0]}`
                                            : "U"}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div>
                                        <p className="font-medium">
                                          {friend.firstName} {friend.lastName}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                          Request sent
                                        </p>
                                      </div>
                                    </div>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => handleCancelFriendRequest(friend.requestId || '')}
                                    >
                                      <X className="h-4 w-4 mr-1" />
                                      Cancel
                                    </Button>
                                  </div>
                                ))}
                            </div>
                          </ScrollArea>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="teams" className="mt-4">
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
        </CardContent>
      </Card>
    </div>
  )
} 