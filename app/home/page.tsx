'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, where, limit, orderBy } from 'firebase/firestore';
import { 
  MapPin, 
  Calendar, 
  Users, 
  User, 
  ArrowRight,
  Home,
  Map as MapIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/header';
import { db } from '@/lib/firebase';
import { useSport } from '@/components/sport-context';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { CourtImage } from '@/components/court-image';

// Define types for our data
interface GameData {
  id: string;
  title?: string;
  date?: {
    seconds: number;
    nanoseconds: number;
  } | Date;
  status?: string;
  location?: {
    name: string;
  };
  participants?: string[];
  [key: string]: any;
}

interface LocationData {
  id: string;
  name: string;
  address?: string;
  lat: number;
  lng: number;
  [key: string]: any;
}

interface TeammateData {
  id: string;
  firstName?: string;
  lastName?: string;
  profilePicture?: string;
  athleticAttributes?: {
    [sportId: string]: {
      skillLevel?: string;
      [key: string]: any;
    };
  };
  [key: string]: any;
}

// Mock data for when Firebase permissions fail
const MOCK_GAMES: GameData[] = [
  {
    id: 'mock-game-1',
    title: 'Pickup Game at Central Park',
    date: new Date(Date.now() + 86400000), // Tomorrow
    status: 'Scheduled',
    location: { name: 'Central Park Courts' }
  },
  {
    id: 'mock-game-2',
    title: 'League Match',
    date: new Date(Date.now() + 172800000), // Day after tomorrow
    status: 'Confirmed',
    location: { name: 'Community Center' }
  }
];

const MOCK_LOCATIONS: LocationData[] = [
  {
    id: 'mock-location-1',
    name: 'Downtown Courts',
    address: '123 Main St, Austin, TX',
    lat: 30.2672,
    lng: -97.7431
  },
  {
    id: 'mock-location-2',
    name: 'Riverside Park',
    address: '456 River Rd, Austin, TX',
    lat: 30.2742,
    lng: -97.7451
  }
];

const MOCK_TEAMMATES: TeammateData[] = [
  {
    id: 'mock-teammate-1',
    firstName: 'John',
    lastName: 'Doe',
    athleticAttributes: {
      basketball: { skillLevel: 'Intermediate' },
      tennis: { skillLevel: 'Advanced' },
      volleyball: { skillLevel: 'Beginner' },
      pickleball: { skillLevel: 'Intermediate' },
      football: { skillLevel: 'Advanced' }
    }
  },
  {
    id: 'mock-teammate-2',
    firstName: 'Jane',
    lastName: 'Smith',
    athleticAttributes: {
      basketball: { skillLevel: 'Advanced' },
      tennis: { skillLevel: 'Intermediate' },
      volleyball: { skillLevel: 'Advanced' },
      pickleball: { skillLevel: 'Beginner' },
      football: { skillLevel: 'Intermediate' }
    }
  }
];

export default function HomePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { selectedSport } = useSport();
  const [upcomingGames, setUpcomingGames] = useState<GameData[]>([]);
  const [nearbyLocations, setNearbyLocations] = useState<LocationData[]>([]);
  const [teammates, setTeammates] = useState<TeammateData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      let useMockData = false;
      
      // Fetch upcoming games
      try {
        // First try to fetch with the complex query that requires an index
        try {
          const gamesQuery = query(
            collection(db, 'games'),
            where('participants', 'array-contains', user.uid),
            where('date', '>=', new Date()),
            orderBy('date', 'asc'),
            limit(3)
          );
          const gamesSnapshot = await getDocs(gamesQuery);
          const gamesData = gamesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as GameData[];
          setUpcomingGames(gamesData);
        } catch (indexError: any) {
          // If we get an index error, try a simpler query without the ordering
          if (indexError.message && indexError.message.includes('requires an index')) {
            console.warn('Index not yet created. Using simpler query without ordering.');
            const simpleGamesQuery = query(
              collection(db, 'games'),
              where('participants', 'array-contains', user.uid),
              limit(5)
            );
            const gamesSnapshot = await getDocs(simpleGamesQuery);
            let gamesData = gamesSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            })) as GameData[];
            
            // Filter and sort manually in JavaScript
            gamesData = gamesData
              .filter(game => {
                if (!game.date) return false;
                
                if (game.date instanceof Date) {
                  return game.date >= new Date();
                } else if (typeof game.date === 'object' && 'seconds' in game.date) {
                  return new Date(game.date.seconds * 1000) >= new Date();
                }
                
                return false;
              })
              .sort((a, b) => {
                let dateA: Date;
                let dateB: Date;
                
                if (a.date instanceof Date) {
                  dateA = a.date;
                } else if (typeof a.date === 'object' && 'seconds' in a.date) {
                  dateA = new Date(a.date.seconds * 1000);
                } else {
                  dateA = new Date(0); // Default to epoch if invalid
                }
                
                if (b.date instanceof Date) {
                  dateB = b.date;
                } else if (typeof b.date === 'object' && 'seconds' in b.date) {
                  dateB = new Date(b.date.seconds * 1000);
                } else {
                  dateB = new Date(0); // Default to epoch if invalid
                }
                
                return dateA.getTime() - dateB.getTime();
              })
              .slice(0, 3);
            
            setUpcomingGames(gamesData);
          } else {
            // If it's not an index error, rethrow
            throw indexError;
          }
        }
      } catch (error) {
        console.error('Error fetching games:', error);
        // Use mock data if Firebase permissions fail
        setUpcomingGames(MOCK_GAMES);
        useMockData = true;
      }

      // Fetch nearby locations
      try {
        if (useMockData) {
          setNearbyLocations(MOCK_LOCATIONS);
        } else {
          const locationsQuery = query(
            collection(db, 'locations'),
            limit(3)
          );
          const locationsSnapshot = await getDocs(locationsQuery);
          const locationsData = locationsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as LocationData[];
          setNearbyLocations(locationsData.length > 0 ? locationsData : MOCK_LOCATIONS);
        }
      } catch (error) {
        console.error('Error fetching locations:', error);
        setNearbyLocations(MOCK_LOCATIONS);
        useMockData = true;
      }

      // Fetch teammates/friends
      try {
        if (useMockData) {
          setTeammates(MOCK_TEAMMATES);
        } else {
          const teammatesQuery = query(
            collection(db, 'users'),
            limit(3)
          );
          const teammatesSnapshot = await getDocs(teammatesQuery);
          const teammatesData = teammatesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as TeammateData[];
          setTeammates(teammatesData.length > 0 ? teammatesData : MOCK_TEAMMATES);
        }
      } catch (error) {
        console.error('Error fetching teammates:', error);
        setTeammates(MOCK_TEAMMATES);
      }
      
      setLoading(false);
    };

    fetchData();
  }, [user, router]);

  if (!user) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }

  const formatDate = (date: any) => {
    if (!date) return 'TBD';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  return (
    <>
      <Header />
      <main className="flex-1 overflow-hidden">
        <Tabs defaultValue="home" className="h-full">
          <div className="container py-10 pb-20">
            <h1 className="text-3xl font-bold mb-6">Home</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Find Courts Card */}
              <Card className="overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle>Find Courts</CardTitle>
                  <CardDescription>
                    Discover {selectedSport.name} courts near you
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <CourtImage 
                    sportId={selectedSport.id}
                    sportName={selectedSport.name}
                    locations={nearbyLocations}
                  />
                </CardContent>
                <CardFooter className="pt-2">
                  <Button 
                    className="w-full" 
                    onClick={() => router.push('/map')}
                  >
                    <MapPin className="mr-2 h-4 w-4" />
                    <span>Find Courts</span>
                    <ArrowRight className="ml-auto h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>

              {/* Upcoming Games Card */}
              <Card className="overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle>Upcoming Games</CardTitle>
                  <CardDescription>
                    View your scheduled {selectedSport.name} games
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="relative min-h-40 w-full">
                    {upcomingGames.length > 0 ? (
                      <div className="p-4">
                        {upcomingGames.map((game) => (
                          <div key={game.id} className="mb-3 last:mb-0 p-2 rounded-md bg-muted/50">
                            <div className="flex justify-between items-center">
                              <div className="font-medium">{game.title || 'Pickup Game'}</div>
                              <Badge variant="outline">{game.status || 'Scheduled'}</Badge>
                            </div>
                            <div className="text-sm text-muted-foreground mt-1 flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              {formatDate(game.date)}
                            </div>
                            <div className="text-sm text-muted-foreground mt-1 flex items-center">
                              <MapPin className="h-3 w-3 mr-1" />
                              {game.location?.name || 'TBD'}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-40 p-4 text-center">
                        <Calendar className="h-8 w-8 mb-2 text-muted-foreground" />
                        <p className="text-muted-foreground">No upcoming games</p>
                        <p className="text-xs text-muted-foreground">Schedule a game to see it here</p>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="pt-2">
                  <Button 
                    className="w-full" 
                    onClick={() => router.push('/map?tab=schedule')}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    <span>View Schedule</span>
                    <ArrowRight className="ml-auto h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>

              {/* Team Card */}
              <Card className="overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle>Your Team</CardTitle>
                  <CardDescription>
                    Manage your {selectedSport.name} teammates
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="relative min-h-40 w-full">
                    {teammates.length > 0 ? (
                      <div className="p-4">
                        <div className="flex flex-wrap gap-2">
                          {teammates.map((teammate) => (
                            <div key={teammate.id} className="flex items-center p-2 rounded-md bg-muted/50">
                              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center mr-2">
                                {teammate.profilePicture ? (
                                  <Image 
                                    src={teammate.profilePicture} 
                                    alt={teammate.firstName || 'User'} 
                                    width={32} 
                                    height={32} 
                                    className="rounded-full"
                                  />
                                ) : (
                                  <User className="h-4 w-4" />
                                )}
                              </div>
                              <div>
                                <div className="font-medium text-sm">
                                  {teammate.firstName} {teammate.lastName}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {teammate.athleticAttributes?.[selectedSport.id]?.skillLevel || 'Beginner'}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-40 p-4 text-center">
                        <Users className="h-8 w-8 mb-2 text-muted-foreground" />
                        <p className="text-muted-foreground">No teammates yet</p>
                        <p className="text-xs text-muted-foreground">Add teammates to see them here</p>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="pt-2">
                  <Button 
                    className="w-full" 
                    onClick={() => router.push('/map?tab=teammates')}
                  >
                    <Users className="mr-2 h-4 w-4" />
                    <span>Manage Team</span>
                    <ArrowRight className="ml-auto h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>

              {/* Profile Card */}
              <Card className="overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle>Your Profile</CardTitle>
                  <CardDescription>
                    Update your {selectedSport.name} profile
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="p-4 flex items-center">
                    <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center mr-4">
                      {user.photoURL ? (
                        <Image 
                          src={user.photoURL} 
                          alt="Profile" 
                          width={64} 
                          height={64} 
                          className="rounded-full"
                        />
                      ) : (
                        <User className="h-8 w-8" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium">{user.displayName || user.email}</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {selectedSport.name} Player
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="outline">Profile</Badge>
                        <Badge variant="outline">Settings</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-2">
                  <Button 
                    className="w-full" 
                    onClick={() => router.push('/profile')}
                  >
                    <User className="mr-2 h-4 w-4" />
                    <span>Update Profile</span>
                    <ArrowRight className="ml-auto h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
          
          {/* Bottom Navigation */}
          <TabsList className="fixed bottom-0 left-0 right-0 h-16 grid grid-cols-4 gap-4 bg-background border-t px-4 py-2 z-50">
            <TabsTrigger value="home" className="flex flex-col items-center justify-center data-[state=active]:bg-accent/50">
              <Home className="h-5 w-5" />
              <span className="text-xs">Home</span>
            </TabsTrigger>
            <TabsTrigger value="map" className="flex flex-col items-center justify-center data-[state=active]:bg-accent/50" onClick={() => router.push('/map')}>
              <MapIcon className="h-5 w-5" />
              <span className="text-xs">Map</span>
            </TabsTrigger>
            <TabsTrigger value="schedule" className="flex flex-col items-center justify-center data-[state=active]:bg-accent/50" onClick={() => router.push('/map?tab=schedule')}>
              <Calendar className="h-5 w-5" />
              <span className="text-xs">Schedule</span>
            </TabsTrigger>
            <TabsTrigger value="teammates" className="flex flex-col items-center justify-center data-[state=active]:bg-accent/50" onClick={() => router.push('/map?tab=teammates')}>
              <Users className="h-5 w-5" />
              <span className="text-xs">Team</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </main>
    </>
  );
} 