"use client"

import { useState, useEffect } from "react"
import { collection, query, where, getDocs, getDoc, doc, setDoc, addDoc, deleteDoc, limit } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/AuthContext"
import { useSport } from "@/components/sport-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, UserPlus, ArrowLeft, Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import Link from "next/link"
import Image from "next/image"
import { useAppContext } from "@/contexts/AppContext"

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

export default function PlayerSearchPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const { selectedSport } = useSport()
  const { setActiveTab } = useAppContext()
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [friends, setFriends] = useState<User[]>([])
  const [pendingFriends, setPendingFriends] = useState<(User & { requestId?: string, direction?: 'incoming' | 'outgoing' })[]>([])
  const [isLoading, setIsLoading] = useState({
    search: false,
    addFriend: false,
    cancelRequest: false
  })
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // Fetch friends and pending requests
  useEffect(() => {
    const fetchFriendsAndRequests = async () => {
      if (!user?.uid) return
      
      try {
        // Get friends from the friends subcollection
        const friendsCollectionRef = collection(db, "users", user.uid, "friends")
        const friendsSnapshot = await getDocs(friendsCollectionRef)
        
        const friendsData = friendsSnapshot.docs.map(doc => {
          return { id: doc.id, ...doc.data() } as User
        })
        
        setFriends(friendsData)
        
        // Get outgoing friend requests (requests sent by the current user)
        const outgoingRequestsQuery = query(
          collection(db, "friendRequests"),
          where("fromUserId", "==", user.uid),
          where("status", "==", "pending")
        )
        const outgoingSnapshot = await getDocs(outgoingRequestsQuery)
        
        const outgoingFriendsData = outgoingSnapshot.docs.map(doc => {
          const data = doc.data()
          return { 
            id: data.toUserId,
            firstName: data.toUserName.split(' ')[0] || '',
            lastName: data.toUserName.split(' ')[1] || '',
            email: data.toUserEmail,
            photoURL: data.toUserPhoto,
            requestId: doc.id,
            direction: 'outgoing'
          } as User & { requestId: string, direction: 'outgoing' }
        })
        
        setPendingFriends(outgoingFriendsData)
        
        // Fetch all users for search
        const usersRef = collection(db, "users")
        const querySnapshot = await getDocs(usersRef)
        
        const users = querySnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as User))
          .filter(u => u.id !== user.uid)
        
        setAllUsers(users)
      } catch (error) {
        console.error("Error fetching friends:", error)
      }
    }

    fetchFriendsAndRequests()
  }, [user])

  // Search users
  const handleSearch = async () => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      toast({
        title: "Search query too short",
        description: "Please enter at least 2 characters to search",
        variant: "default",
      });
      return;
    }
    
    setIsSearching(true);
    setSearchResults([]);
    
    try {
      // Get all users and filter client-side
      // This approach works without requiring specific indexes
      const usersRef = collection(db, "users")
      const usersSnapshot = await getDocs(usersRef)
      const results: User[] = []
      
      const searchTermLower = searchQuery.toLowerCase()
      
      usersSnapshot.forEach((doc) => {
        const userData = doc.data()
        
        // Skip current user
        if (doc.id === user?.uid) return
        
        // Check if user matches search term
        const firstName = (userData.firstName || "").toLowerCase()
        const lastName = (userData.lastName || "").toLowerCase()
        const fullName = `${firstName} ${lastName}`.toLowerCase()
        const email = (userData.email || "").toLowerCase()
        
        if (firstName.includes(searchTermLower) || 
            lastName.includes(searchTermLower) || 
            fullName.includes(searchTermLower) || 
            email.includes(searchTermLower)) {
          
          results.push({
            id: doc.id,
            firstName: userData.firstName || "",
            lastName: userData.lastName || "",
            email: userData.email || "",
            photoURL: userData.profilePicture || userData.photoURL || "",
            city: userData.city || "",
          })
        }
      })
      
      setSearchResults(results)
    } catch (error) {
      console.error("Error searching for users:", error)
      toast({
        title: "Error",
        description: "Failed to search for users. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSearching(false)
    }
  }
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Handle search input change with debounce
  useEffect(() => {
    if (searchQuery.length >= 3) {
      const timer = setTimeout(() => {
        handleSearch()
      }, 300) // 300ms debounce
      
      return () => clearTimeout(timer)
    } else if (searchQuery.length === 0) {
      setSearchResults([])
    }
  }, [searchQuery])

  // Send friend request
  const handleAddFriend = async (friendId: string) => {
    if (!user) return
    
    setIsLoading(prev => ({ ...prev, addFriend: true }))
    
    try {
      // Check if there's already a pending request
      const existingRequestQuery = query(
        collection(db, "friendRequests"),
        where("fromUserId", "==", user.uid),
        where("toUserId", "==", friendId),
        where("status", "==", "pending")
      )
      
      const existingRequestSnapshot = await getDocs(existingRequestQuery)
      
      if (!existingRequestSnapshot.empty) {
        toast({
          title: "Request already sent",
          description: "You've already sent a friend request to this user",
        })
        return
      }
      
      // Get friend's user data
      const friendDocRef = doc(db, "users", friendId)
      const friendDoc = await getDoc(friendDocRef)
      
      if (!friendDoc.exists()) {
        throw new Error("User not found")
      }
      
      const friendData = friendDoc.data()
      
      // Get current user's profile data
      const userDocRef = doc(db, "users", user.uid)
      const userDoc = await getDoc(userDocRef)
      const userData = userDoc.exists() ? userDoc.data() : null
      
      // Create a friend request
      const requestId = `${user.uid}_${friendId}_${Date.now()}`
      const friendRequestRef = doc(db, "friendRequests", requestId)
      
      await setDoc(friendRequestRef, {
        fromUserId: user.uid,
        toUserId: friendId,
        status: "pending",
        createdAt: Date.now(),
        fromUserName: userData ? `${userData.firstName} ${userData.lastName}` : user.displayName || user.email,
        fromUserEmail: user.email,
        fromUserPhoto: userData?.profilePicture || user.photoURL,
        toUserName: `${friendData.firstName} ${friendData.lastName}`,
        toUserEmail: friendData.email,
        toUserPhoto: friendData.profilePicture || friendData.photoURL,
      })
      
      // Create a notification for the friend
      const notificationsRef = collection(db, "notifications")
      
      const notificationData = {
        type: "friendRequest",
        fromUserId: user.uid,
        toUserId: friendId,
        message: `${userData ? `${userData.firstName} ${userData.lastName}` : user.displayName || user.email} sent you a friend request`,
        read: false,
        createdAt: Date.now(),
        data: {
          fromUserName: userData ? `${userData.firstName} ${userData.lastName}` : user.displayName || user.email,
          fromUserPhoto: userData?.profilePicture || user.photoURL,
          fromUserEmail: user.email,
          requestId: requestId
        }
      };
      
      const notificationDoc = await addDoc(notificationsRef, notificationData);
      
      // Add to local pending friends state to update UI immediately
      const newPendingFriend = {
        id: friendId,
        firstName: friendData.firstName || "",
        lastName: friendData.lastName || "",
        email: friendData.email || "",
        photoURL: friendData.profilePicture || friendData.photoURL || "",
        requestId: requestId,
        direction: 'outgoing'
      } as User & { requestId: string, direction: 'outgoing' };
      
      setPendingFriends(prev => [...prev, newPendingFriend]);
      
      toast({
        title: "Friend request sent",
        description: `A friend request has been sent to ${friendData.firstName} ${friendData.lastName}`,
      })
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

  // Cancel friend request
  const handleCancelFriendRequest = async (requestId: string) => {
    if (!user) return
    
    setIsLoading(prev => ({ ...prev, cancelRequest: true }))
    
    try {
      // Delete the friend request document
      await deleteDoc(doc(db, 'friendRequests', requestId))
      
      // Update the local state
      setPendingFriends(prev => prev.filter(f => f.requestId !== requestId))
      
      toast({
        title: "Request cancelled",
        description: "Friend request has been cancelled",
      })
    } catch (error) {
      console.error("Error cancelling friend request:", error)
      toast({
        title: "Error",
        description: "Failed to cancel friend request",
        variant: "destructive",
      })
    } finally {
      setIsLoading(prev => ({ ...prev, cancelRequest: false }))
    }
  }

  const goBack = () => {
    setActiveTab('teammates');
  }

  if (!user) {
    return null
  }

  return (
    <div className="container py-6 pb-20">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4 mb-4">
            <Button variant="ghost" size="sm" onClick={goBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Teammates
            </Button>
          </div>
          <CardTitle>Find Players</CardTitle>
          <CardDescription>Search for players to add as friends</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex gap-2">
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full"
            />
            <Button onClick={handleSearch} disabled={isSearching}>
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>
          
          {searchQuery && searchQuery.length < 2 && (
            <div className="text-center py-4">
              <p className="text-muted-foreground">Please enter at least 2 characters to search</p>
            </div>
          )}
          
          {isSearching && (
            <div className="text-center py-4">
              <Loader2 className="h-6 w-6 animate-spin mx-auto" />
              <p className="text-muted-foreground mt-2">Searching...</p>
            </div>
          )}
          
          {searchQuery && searchResults.length === 0 && !isSearching && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No players found matching "{searchQuery}"</p>
            </div>
          )}
          
          {searchResults.length > 0 && (
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {searchResults.map((result) => (
                  <div key={result.id} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        {result.photoURL ? (
                          <div className="relative h-full w-full">
                            <Image 
                              src={result.photoURL} 
                              alt={`${result.firstName} ${result.lastName}`}
                              fill
                              className="object-cover"
                              sizes="40px"
                            />
                          </div>
                        ) : (
                          <AvatarFallback>
                            {result.firstName?.[0] || ''}{result.lastName?.[0] || ''}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {result.firstName} {result.lastName}
                        </p>
                        <div className="flex items-center gap-2">
                          {result.city ? (
                            <span className="text-xs bg-muted-foreground/20 px-1.5 py-0.5 rounded-md text-muted-foreground">
                              {result.city}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">No location set</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const pendingRequest = pendingFriends.find(f => f.id === result.id);
                        if (pendingRequest?.requestId) {
                          handleCancelFriendRequest(pendingRequest.requestId);
                        } else {
                          handleAddFriend(result.id);
                        }
                      }}
                      disabled={
                        friends.some(f => f.id === result.id) || 
                        isLoading.addFriend ||
                        isLoading.cancelRequest
                      }
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      {friends.some(f => f.id === result.id) 
                        ? "Friend Added" 
                        : pendingFriends.some(f => f.id === result.id)
                          ? "Cancel Request"
                          : isLoading.addFriend
                            ? "Sending..."
                            : isLoading.cancelRequest
                              ? "Cancelling..."
                              : "Add Friend"
                      }
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 
