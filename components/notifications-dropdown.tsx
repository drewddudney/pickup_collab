"use client"

import { useState, useEffect } from "react"
import { Bell, Loader2 } from "lucide-react"
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
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc, setDoc, Timestamp, DocumentData, getDoc, writeBatch } from "firebase/firestore"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Notification } from "@/lib/firebase"
import { toast } from "@/components/ui/use-toast"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { useAppContext } from "@/app/page"

interface NotificationsDropdownProps {
  onShowAll?: () => void;
}

interface ExtendedNotification extends Notification {
  id: string;
  handled?: boolean;
}

export function NotificationsDropdown({ onShowAll }: NotificationsDropdownProps) {
  const { user } = useAuth()
  const { setActiveTab } = useAppContext()
  const [notifications, setNotifications] = useState<ExtendedNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  // Function to show all notifications
  const showAllNotifications = () => {
    if (onShowAll) {
      onShowAll();
    } else {
      setActiveTab('notifications');
    }
  }

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!user?.uid) return
    
    console.log("Fetching notifications for user:", user.uid);
    
    setIsLoading(true)
    try {
      // Get all notifications for the current user
      const notificationsRef = collection(db, "notifications")
      const q = query(
        notificationsRef,
        where("toUserId", "==", user.uid)
      )
      
      console.log("Executing notifications query");
      
      const querySnapshot = await getDocs(q)
      
      console.log("Notifications query returned", querySnapshot.docs.length, "results");
      
      // Convert to array and sort by createdAt
      const notificationsData = querySnapshot.docs
        .map(doc => {
          const data = { id: doc.id, ...doc.data() } as ExtendedNotification;
          console.log("Notification data:", data);
          return data;
        })
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 20) // Limit to 20 notifications
      
      console.log("Processed notifications:", notificationsData);
      
      setNotifications(notificationsData)
      
      // Count unread notifications
      const unread = notificationsData.filter(notification => !notification.read).length
      setUnreadCount(unread)
      
      console.log("Unread notifications count:", unread);
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

  // Handle notification click to navigate to relevant section
  const handleNotificationClick = (notification: ExtendedNotification) => {
    // Mark as read
    markAsRead(notification.id);
    
    // Navigate based on notification type
    switch (notification.type) {
      case "friend_request":
        setActiveTab("teammates");
        break;
      case "game_invite":
        setActiveTab("schedule");
        break;
      case "team_invite":
        setActiveTab("teammates");
        break;
      default:
        // Do nothing for other notification types
        break;
    }
  };

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
    if (!user) return;
    
    try {
      // Mark notification as read
      await markAsRead(notification.id);
      
      // Get the request ID from the notification data
      const requestId = notification.data?.requestId;
      
      if (!requestId) {
        throw new Error("Friend request ID not found in notification data");
      }
      
      // Delete the friend request
      await deleteDoc(doc(db, "friendRequests", requestId));
      
      // Update the local state
      setNotifications(prev => 
        prev.map((n: ExtendedNotification) => 
          n.id === notification.id 
            ? { ...n, handled: true } 
            : n
        )
      );
      
      toast({
        title: "Friend request declined",
        description: "Friend request has been declined",
      });
    } catch (error) {
      console.error("Error declining friend request:", error);
      toast({
        title: "Error",
        description: "Failed to decline friend request. Please try again.",
        variant: "destructive",
      });
    }
  };

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
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[350px]">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="ml-2">
              {unreadCount} new
            </Badge>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {isLoading ? (
          <div className="flex items-center justify-center p-4">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <span>Loading...</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center p-4 text-muted-foreground">
            No notifications
          </div>
        ) : (
          <>
            <DropdownMenuGroup className="max-h-[300px] overflow-auto">
              {notifications.slice(0, 5).map((notification) => (
                <DropdownMenuItem 
                  key={notification.id} 
                  className={`flex flex-col items-start p-3 ${!notification.read ? 'bg-muted/50' : ''} ${!notification.handled ? 'cursor-pointer' : ''}`}
                  onClick={() => !notification.handled && handleNotificationClick(notification)}
                >
                  <div className="flex w-full items-start gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={notification.data?.fromUserPhoto || ''} />
                      <AvatarFallback>
                        {notification.data?.fromUserName?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">
                          {notification.data?.fromUserName || 'Someone'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatTimestamp(notification.createdAt)}
                        </p>
                      </div>
                      <p className="text-xs mt-1">{notification.message}</p>
                      
                      {/* Friend request actions */}
                      {notification.type === 'friend_request' && !notification.handled && (
                        <div className="flex gap-2 mt-2">
                          <Button 
                            size="sm" 
                            variant="secondary"
                            className="h-7 text-xs px-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAcceptFriendRequest(notification);
                            }}
                          >
                            Accept
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="h-7 text-xs px-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeclineFriendRequest(notification);
                            }}
                          >
                            Decline
                          </Button>
                        </div>
                      )}
                      
                      {/* Handled notification indicator */}
                      {notification.handled && (
                        <Badge variant="outline" className="mt-1 text-xs">
                          Handled
                        </Badge>
                      )}
                    </div>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="justify-center text-center cursor-pointer"
              onClick={showAllNotifications}
            >
              See all notifications
              <ChevronRight className="ml-1 h-4 w-4" />
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 