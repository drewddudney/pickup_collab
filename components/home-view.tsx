'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Calendar, Users, UserPlus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSport } from "@/components/sport-context";
import { collection, query, where, getDocs, getDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface User {
  id: string;
  displayName?: string;
  email: string;
  photoURL?: string;
  firstName: string;
  lastName: string;
}

interface Team {
  id: string;
  name: string;
  members: string[];
  owner: string;
  createdAt: number;
  sportId: string;
}

function TeamCard({ team, members }: { team: Team; members: User[] }) {
  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  return (
    <Link href="/team" className="block">
      <div className="flex items-center p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
        <div className="flex-1">
          <h3 className="font-medium">{team.name}</h3>
          <p className="text-sm text-muted-foreground">{members.length} members</p>
        </div>
        <div className="flex -space-x-2">
          {members.slice(0, 3).map((member) => (
            <Avatar key={member.id} className="border-2 border-background">
              <AvatarImage src={member.photoURL} alt={`${member.firstName} ${member.lastName}`} />
              <AvatarFallback>{getInitials(`${member.firstName} ${member.lastName}`)}</AvatarFallback>
            </Avatar>
          ))}
          {members.length > 3 && (
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-xs border-2 border-background">
              +{members.length - 3}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

function YourTeamsWidget() {
  const { user } = useAuth();
  const { selectedSport } = useSport();
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamMembers, setTeamMembers] = useState<{ [teamId: string]: User[] }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeams = async () => {
      if (!user?.uid) return;
      
      setLoading(true);
      try {
        const teamsQuery = query(
          collection(db, "teams"),
          where("members", "array-contains", user.uid),
          where("sportId", "==", selectedSport.id)
        );
        
        const teamsSnapshot = await getDocs(teamsQuery);
        const teamsData = teamsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Team[];
        
        setTeams(teamsData);

        // Fetch members for each team
        const membersData: { [teamId: string]: User[] } = {};
        await Promise.all(
          teamsData.map(async (team) => {
            const members = await Promise.all(
              team.members.map(async (memberId) => {
                const memberDoc = await getDoc(doc(db, "users", memberId));
                return { id: memberId, ...memberDoc.data() } as User;
              })
            );
            membersData[team.id] = members;
          })
        );
        setTeamMembers(membersData);
      } catch (error) {
        console.error("Error fetching teams:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTeams();
  }, [user, selectedSport.id]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Your Teams</CardTitle>
          <CardDescription>Teams you're a member of</CardDescription>
        </div>
        <Link href="/team">
          <Button variant="outline" size="sm">
            <UserPlus className="h-4 w-4 mr-2" />
            Manage Teams
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : teams.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-muted-foreground mb-4">You're not a member of any teams yet</p>
            <Link href="/team">
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Create or Join a Team
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {teams.map((team) => (
              <TeamCard 
                key={team.id} 
                team={team} 
                members={teamMembers[team.id] || []} 
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function HomeView() {
  return (
    <div className="container mx-auto p-6 pb-20 space-y-8">
      <div className="grid gap-6 md:grid-cols-3">
        {/* Map Summary Card */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Nearby Courts
            </CardTitle>
            <CardDescription>Find courts in your area</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Discover basketball courts, volleyball courts, and more near you. 
              View real-time availability and court conditions.
            </p>
          </CardContent>
        </Card>

        {/* Schedule Summary Card */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Upcoming Games
            </CardTitle>
            <CardDescription>Your scheduled matches</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              View and manage your upcoming games. Join open games or create your own pickup matches.
            </p>
          </CardContent>
        </Card>

        {/* Teammates Summary Card */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Team Network
            </CardTitle>
            <CardDescription>Your sports community</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Connect with other players, find teammates, and build your sports network.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Your Teams Widget */}
      <YourTeamsWidget />

      {/* Recent Activity Section */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest updates from your network</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <p className="text-sm">New pickup game scheduled at Pan Am Courts - Tomorrow at 6 PM</p>
            </div>
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="h-2 w-2 rounded-full bg-blue-500" />
              <p className="text-sm">3 courts available now at Zilker Park</p>
            </div>
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="h-2 w-2 rounded-full bg-orange-500" />
              <p className="text-sm">2 players looking for a game at Austin Recreation Center</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 