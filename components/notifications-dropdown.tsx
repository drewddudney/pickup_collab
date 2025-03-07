"use client"

import { useState, useEffect } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/contexts/AuthContext"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc, setDoc, Timestamp, DocumentData } from "firebase/firestore"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Notification } from "@/lib/firebase"
import { toast } from "@/components/ui/use-toast"

export function NotificationsDropdown() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<(Notification & { id: string })[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!user?.uid) return
    
    setIsLoading(true)
    try {
      // Get all notifications for the current user
      const notificationsRef = collection(db, "notifications")
      const q = query(
        notificationsRef,
        where("toUserId", "==", user.uid)
      )
      
      const querySnapshot = await getDocs(q)
      
      // Convert to array and sort by createdAt
      const notificationsData = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Notification & { id: string }))
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 20) // Limit to 20 notifications
      
      setNotifications(notificationsData)
      
      // Count unread notifications
      const unread = notificationsData.filter(notification => !notification.read).length
      setUnreadCount(unread)
    } catch (error) {
      console.error("Error fetching notifications:", error)
      toast({
        title: "Error",
        description: "Failed to load notifications",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const notificationRef = doc(db, "notifications", notificationId)
      await updateDoc(notificationRef, {
        read: true
      })
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, read: true } 
            : notification
        )
      )
      
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  // Handle friend request acceptance
  const handleAcceptFriendRequest = async (notification: Notification & { id: string }) => {
    if (!user?.uid) return
    
    try {
      // Mark notification as read
      await markAsRead(notification.id)
      
      // Get current user data
      const userDocRef = doc(db, "users", user.uid)
      const userDocSnap = await getDocs(query(collection(db, "users"), where("id", "==", user.uid)))
      const userData = userDocSnap.docs[0]?.data() || {}
      
      // Get friend data
      const friendDocSnap = await getDocs(query(collection(db, "users"), where("id", "==", notification.fromUserId)))
      const friendData = friendDocSnap.docs[0]?.data() || {}
      
      // Add to friends collection for both users using setDoc instead of updateDoc
      const userFriendsRef = doc(db, "users", user.uid, "friends", notification.fromUserId)
      const friendFriendsRef = doc(db, "users", notification.fromUserId, "friends", user.uid)
      
      // Add each other as friends
      await setDoc(userFriendsRef, {
        id: notification.fromUserId,
        firstName: friendData.firstName || "",
        lastName: friendData.lastName || "",
        email: friendData.email || "",
        photoURL: friendData.photoURL || "",
        addedAt: Date.now()
      })
      
      await setDoc(friendFriendsRef, {
        id: user.uid,
        firstName: userData.firstName || "",
        lastName: userData.lastName || "",
        email: user.email || "",
        photoURL: user.photoURL || "",
        addedAt: Date.now()
      })
      
      // Delete the friend request notification
      const notificationRef = doc(db, "notifications", notification.id)
      await deleteDoc(notificationRef)
      
      // Remove from pending friends collection if it exists
      const pendingFriendRef = doc(db, "users", user.uid, "pendingFriends", notification.fromUserId)
      try {
        await deleteDoc(pendingFriendRef)
      } catch (error) {
        // Ignore if it doesn't exist
      }
      
      toast({
        title: "Friend request accepted",
        description: `You are now friends with ${notification.data?.fromUserName || "this user"}`,
      })
      
      // Refresh notifications
      fetchNotifications()
    } catch (error) {
      console.error("Error accepting friend request:", error)
      toast({
        title: "Error",
        description: "Failed to accept friend request",
        variant: "destructive"
      })
    }
  }
  
  // Handle friend request decline
  const handleDeclineFriendRequest = async (notification: Notification & { id: string }) => {
    if (!user?.uid) return
    
    try {
      // Delete the notification
      const notificationRef = doc(db, "notifications", notification.id)
      await deleteDoc(notificationRef)
      
      // Remove from pending friends collection if it exists
      const pendingFriendRef = doc(db, "users", user.uid, "pendingFriends", notification.fromUserId)
      try {
        await deleteDoc(pendingFriendRef)
      } catch (error) {
        // Ignore if it doesn't exist
      }
      
      // Update local state
      setNotifications(prev => prev.filter(n => n.id !== notification.id))
      
      toast({
        title: "Friend request declined",
        description: "The friend request has been declined",
      })
    } catch (error) {
      console.error("Error declining friend request:", error)
      toast({
        title: "Error",
        description: "Failed to decline friend request",
        variant: "destructive"
      })
    }
  }

  // Fetch notifications on mount and when user changes
  useEffect(() => {
    if (user?.uid) {
      fetchNotifications()
    }
  }, [user?.uid])

  if (!user) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-[300px] overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">Loading...</div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">No notifications</div>
          ) : (
            <DropdownMenuGroup>
              {notifications.map((notification) => (
                <DropdownMenuItem 
                  key={notification.id}
                  className={`flex flex-col items-start p-3 ${!notification.read ? 'bg-muted/50' : ''}`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex w-full items-start gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={notification.data?.fromUserPhoto || ''} />
                      <AvatarFallback>
                        {notification.data?.fromUserName?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{notification.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(notification.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  
                  {notification.type === 'friend_request' && !notification.read && (
                    <div className="mt-2 flex w-full justify-end gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeclineFriendRequest(notification)
                        }}
                      >
                        Decline
                      </Button>
                      <Button 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleAcceptFriendRequest(notification)
                        }}
                      >
                        Accept
                      </Button>
                    </div>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 