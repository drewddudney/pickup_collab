"use client"

import { useState, useEffect } from "react"
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc, Timestamp, DocumentData, getDoc, writeBatch, setDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Bell, Check, X, ArrowLeft, Trash2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"
import { useAppContext } from "@/contexts/AppContext"

interface Notification {
  id: string
  type: string
  fromUserId: string
  toUserId: string
  message: string
  read: boolean
  createdAt: number
  data?: {
    fromUserName?: string
    fromUserPhoto?: string
    fromUserEmail?: string
    requestId?: string
    [key: string]: any
  }
  handled?: boolean
}

interface ExtendedNotification extends Notification {
  id: string;
  handled?: boolean;
}

export default function NotificationsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const { setActiveTab } = useAppContext()
  const [notifications, setNotifications] = useState<ExtendedNotification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isClearingAll, setIsClearingAll] = useState(false)

  // Fetch notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user?.uid) return
      
      setIsLoading(true)
      
      try {
        console.log("Fetching notifications for user:", user.uid)
        
        // Get notifications for the current user
        const notificationsRef = collection(db, "notifications")
        const q = query(
          notificationsRef,
          where("toUserId", "==", user.uid),
          where("read", "==", false)
        )
        
        const querySnapshot = await getDocs(q)
        
        console.log("Found", querySnapshot.size, "unread notifications")
        
        const notificationsData = querySnapshot.docs
          .map(doc => {
            const data = { id: doc.id, ...doc.data(), handled: false } as ExtendedNotification;
            console.log("Notification data:", data);
            return data;
          })
          .sort((a, b) => b.createdAt - a.createdAt)
        
        setNotifications(notificationsData)
      } catch (error) {
        console.error("Error fetching notifications:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchNotifications()
  }, [user])

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    if (!user?.uid) return
    
    try {
      const notificationRef = doc(db, "notifications", notificationId)
      await updateDoc(notificationRef, {
        read: true
      })
      
      // Update local state
      setNotifications(prev => 
        prev.map((notification: ExtendedNotification) => 
          notification.id === notificationId 
            ? { ...notification, read: true } 
            : notification
        )
      )
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  // Handle friend request acceptance
  const handleAcceptFriendRequest = async (notification: ExtendedNotification) => {
    if (!user) return;
    
    try {
      // Mark notification as read
      await markAsRead(notification.id);
      
      // Get the request ID from the notification data
      const requestId = notification.data?.requestId;
      
      if (!requestId) {
        throw new Error("Friend request ID not found in notification data");
      }
      
      // Get the friend request document
      const requestDoc = await getDoc(doc(db, "friendRequests", requestId));
      
      if (!requestDoc.exists()) {
        throw new Error("Friend request not found");
      }
      
      const requestData = requestDoc.data();
      const senderId = requestData.fromUserId;
      const receiverId = requestData.toUserId;
      
      // Verify that the current user is the receiver
      if (receiverId !== user.uid) {
        throw new Error("You are not authorized to accept this friend request");
      }
      
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
        await deleteDoc(doc(db, "friendRequests", requestId));
        
        console.log("Deleted friend request");
        
        // Update the local state
        setNotifications(prev => 
          prev.map((n: ExtendedNotification) => 
            n.id === notification.id 
              ? { ...n, handled: true } 
              : n
          )
        );
        
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
    }
  };

  // Handle friend request decline
  const handleDeclineFriendRequest = async (notification: ExtendedNotification) => {
    if (!user?.uid) return
    
    try {
      // Mark notification as read
      await markAsRead(notification.id)
      
      // Get the request ID from the notification data
      const requestId = notification.data?.requestId
      
      if (!requestId) {
        throw new Error("Friend request ID not found in notification data")
      }
      
      // Delete the friend request
      await deleteDoc(doc(db, "friendRequests", requestId))
      
      // Update the local state
      setNotifications(prev => 
        prev.map(n => 
          n.id === notification.id 
            ? { ...n, handled: true } 
            : n
        )
      )
      
      toast({
        title: "Friend request declined",
        description: "Friend request has been declined",
      })
    } catch (error) {
      console.error("Error declining friend request:", error)
      toast({
        title: "Error",
        description: "Failed to decline friend request. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Handle notification click to navigate to relevant section
  const handleNotificationClick = (notification: ExtendedNotification) => {
    // Mark as read
    markAsRead(notification.id)
    
    // Navigate based on notification type
    switch (notification.type) {
      case "friend_request":
        setActiveTab("teammates")
        break
      case "game_invite":
        setActiveTab("schedule")
        break
      case "team_invite":
        setActiveTab("teammates")
        break
      default:
        // Do nothing for other notification types
        break
    }
  }

  // Clear all notifications
  const clearAllNotifications = async () => {
    if (!user?.uid || notifications.length === 0) return
    
    setIsClearingAll(true)
    try {
      const batch = writeBatch(db)
      
      notifications.forEach(notification => {
        const notificationRef = doc(db, "notifications", notification.id)
        batch.delete(notificationRef)
      })
      
      await batch.commit()
      
      setNotifications([])
      toast({
        title: "Success",
        description: "All notifications have been cleared.",
      })
    } catch (error) {
      console.error("Error clearing notifications:", error)
      toast({
        title: "Error",
        description: "Failed to clear notifications. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsClearingAll(false)
    }
  }

  const goToHome = () => {
    setActiveTab('home');
  }

  // Format timestamp for display
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="container py-6 pb-20">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Your recent notifications and alerts</CardDescription>
          </div>
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={goToHome}
              className="mr-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllNotifications}
              disabled={isLoading || isClearingAll || notifications.length === 0}
              className="flex items-center"
            >
              {isClearingAll ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Clear All
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-[400px]">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">You don't have any notifications</p>
            </div>
          ) : (
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-4">
                {notifications.map((notification) => (
                  <div 
                    key={notification.id} 
                    className={`p-4 rounded-lg border ${notification.read ? 'bg-background' : 'bg-muted'} ${!notification.handled ? 'cursor-pointer hover:bg-muted/80' : ''}`}
                    onClick={() => !notification.handled && handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={notification.data?.fromUserPhoto || ''} />
                        <AvatarFallback>
                          {notification.data?.fromUserName?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">
                            {notification.data?.fromUserName || 'Someone'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatTimestamp(notification.createdAt)}
                          </p>
                        </div>
                        <p className="text-sm mt-1">{notification.message}</p>
                        
                        {/* Friend request actions */}
                        {notification.type === 'friend_request' && !notification.handled && (
                          <div className="flex gap-2 mt-3">
                            <Button 
                              size="sm" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAcceptFriendRequest(notification);
                              }}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Accept
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeclineFriendRequest(notification);
                              }}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Decline
                            </Button>
                          </div>
                        )}
                        
                        {/* Handled notification indicator */}
                        {notification.handled && (
                          <Badge variant="outline" className="mt-2">
                            Handled
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 