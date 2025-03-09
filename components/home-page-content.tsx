'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, limit, orderBy } from 'firebase/firestore';
import { 
  MapPin, 
  Calendar, 
  Users, 
  User, 
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { useSport } from '@/components/sport-context';
import { Badge } from '@/components/ui/badge';
import { CourtImage } from '@/components/court-image';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';

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

export default function HomePageContent() {
  const { user } = useAuth();
  const { selectedSport } = useSport();
  const { setActiveTab } = useAppContext();
  const [upcomingGames, setUpcomingGames] = useState<GameData[]>([]);
  const [nearbyLocations, setNearbyLocations] = useState<LocationData[]>([]);
  const [teammates, setTeammates] = useState<TeammateData[]>([]);
  const [loading, setLoading] = useState({
    games: true,
    locations: true,
    teammates: true
  });

  useEffect(() => {
    if (!user) {
      return;
    }

    // Fetch upcoming games
    const fetchGames = async () => {
      setLoading(prev => ({ ...prev, games: true }));
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
        setUpcomingGames([]);
      } finally {
        setLoading(prev => ({ ...prev, games: false }));
      }
    };

    // Fetch nearby locations
    const fetchLocations = async () => {
      setLoading(prev => ({ ...prev, locations: true }));
      try {
        const locationsQuery = query(
          collection(db, 'locations'),
          limit(3)
        );
        const locationsSnapshot = await getDocs(locationsQuery);
        const locationsData = locationsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as LocationData[];
        setNearbyLocations(locationsData);
      } catch (error) {
        console.error('Error fetching locations:', error);
        setNearbyLocations([]);
      } finally {
        setLoading(prev => ({ ...prev, locations: false }));
      }
    };

    // Fetch teammates
    const fetchTeammates = async () => {
      setLoading(prev => ({ ...prev, teammates: true }));
      try {
        // Get friends from the friends subcollection
        const friendsCollectionRef = collection(db, "users", user.uid, "friends");
        const friendsSnapshot = await getDocs(friendsCollectionRef);
        
        const friendsData = friendsSnapshot.docs.map(doc => {
          return { id: doc.id, ...doc.data() } as TeammateData;
        });
        
        setTeammates(friendsData);
      } catch (error) {
        console.error('Error fetching teammates:', error);
        setTeammates([]);
      } finally {
        setLoading(prev => ({ ...prev, teammates: false }));
      }
    };

    fetchGames();
    fetchLocations();
    fetchTeammates();
  }, [user, selectedSport]);

  const formatDate = (date: any) => {
    if (!date) return 'No date';
    
    let dateObj: Date;
    
    if (date instanceof Date) {
      dateObj = date;
    } else if (typeof date === 'object' && 'seconds' in date) {
      dateObj = new Date(date.seconds * 1000);
    } else {
      return 'Invalid date';
    }
    
    return dateObj.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  // Navigation functions
  const navigateToSchedule = (gameId?: string) => {
    setActiveTab('schedule');
    // In a real implementation, you would store the gameId in a context or state
    // to be used by the schedule component
  };

  const navigateToMap = (locationId?: string) => {
    setActiveTab('map');
    // In a real implementation, you would store the locationId in a context or state
    // to be used by the map component
  };

  const navigateToTeammates = (teammateId?: string) => {
    setActiveTab('teammates');
    // In a real implementation, you would store the teammateId in a context or state
    // to be used by the teammates component
  };

  const navigateToPlayerSearch = () => {
    setActiveTab('player-search');
  };

  return (
    <div className="container mx-auto p-6 pb-20 space-y-8">
      <h1 className="text-3xl font-bold">Welcome back!</h1>
      
      {/* Upcoming Games Section */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold">Upcoming Games</h2>
          <Button variant="ghost" size="sm" asChild>
            <Button onClick={() => navigateToSchedule()}>
              View All <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Button>
        </div>
        
        {loading.games ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mr-2" />
            <p>Loading games...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingGames.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">No upcoming games</p>
                  <div className="flex justify-center mt-4">
                    <Button asChild>
                      <Button onClick={() => navigateToSchedule()}>Schedule a Game</Button>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              upcomingGames.map(game => (
                <Card key={game.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{game.title || 'Untitled Game'}</CardTitle>
                    <CardDescription>
                      {formatDate(game.date)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <MapPin className="mr-1 h-4 w-4" />
                      <span>{game.location?.name || 'No location'}</span>
                    </div>
                    {game.status && (
                      <Badge className="mt-2" variant={
                        game.status === 'Confirmed' ? 'default' :
                        game.status === 'Scheduled' ? 'outline' :
                        'secondary'
                      }>
                        {game.status}
                      </Badge>
                    )}
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" size="sm" className="w-full" asChild>
                      <Button onClick={() => navigateToSchedule(game.id)}>
                        View Details
                      </Button>
                    </Button>
                  </CardFooter>
                </Card>
              ))
            )}
          </div>
        )}
      </section>
      
      {/* Nearby Courts Section */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold">Nearby Courts</h2>
          <Button variant="ghost" size="sm" asChild>
            <Button onClick={() => navigateToMap()}>
              View Map <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Button>
        </div>
        
        {loading.locations ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mr-2" />
            <p>Loading locations...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {nearbyLocations.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">No nearby courts found</p>
                  <div className="flex justify-center mt-4">
                    <Button asChild>
                      <Button onClick={() => navigateToMap()}>Explore Map</Button>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              nearbyLocations.map(location => (
                <Card key={location.id} className="overflow-hidden">
                  <div className="h-32 relative">
                    <CourtImage 
                      sportId={selectedSport?.id || 'basketball'} 
                      sportName={selectedSport?.name || 'Basketball'}
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{location.name}</CardTitle>
                    <CardDescription>
                      {location.address || 'No address available'}
                    </CardDescription>
                  </CardHeader>
                  <CardFooter>
                    <Button variant="outline" size="sm" className="w-full" asChild>
                      <Button onClick={() => navigateToMap(location.id)}>
                        View on Map
                      </Button>
                    </Button>
                  </CardFooter>
                </Card>
              ))
            )}
          </div>
        )}
      </section>
      
      {/* Teammates Section */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold">Your Teammates</h2>
          <Button variant="ghost" size="sm" asChild>
            <Button onClick={() => navigateToTeammates()}>
              View All <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Button>
        </div>
        
        <Card>
          <CardContent className="pt-6">
            {loading.teammates ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mr-2" />
                <p>Loading teammates...</p>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {teammates.length === 0 ? (
                    <p className="text-center text-muted-foreground">No teammates yet</p>
                  ) : (
                    teammates.map(teammate => (
                      <div key={teammate.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                            {teammate.profilePicture ? (
                              <div className="relative h-full w-full">
                                <Image 
                                  src={teammate.profilePicture} 
                                  alt={`${teammate.firstName} ${teammate.lastName}`}
                                  fill
                                  className="object-cover"
                                  sizes="40px"
                                />
                              </div>
                            ) : (
                              <User className="h-6 w-6 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{teammate.firstName} {teammate.lastName}</p>
                            <p className="text-sm text-muted-foreground">
                              {selectedSport && teammate.athleticAttributes?.[selectedSport.id]?.skillLevel || 'No skill level'}
                            </p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" asChild>
                          <Button onClick={() => navigateToTeammates(teammate.id)}>
                            View
                          </Button>
                        </Button>
                      </div>
                    ))
                  )}
                </div>
                
                <div className="mt-6 flex justify-center">
                  <Button asChild>
                    <Button onClick={navigateToPlayerSearch}>
                      <Users className="mr-2 h-4 w-4" />
                      Find Players
                    </Button>
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
} 