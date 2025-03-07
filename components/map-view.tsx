"use client"

import { useEffect, useState, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Trash2, Plus, Loader2, Layers, Navigation, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { db, auth } from '@/lib/firebase';
import { collection, addDoc, deleteDoc, doc, getDocs, query, where, getDoc } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { useSport } from '@/components/sport-context';
import { SportMarkers } from './sport-markers';
import 'leaflet/dist/leaflet.css';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import ReactDOMServer from 'react-dom/server';
import { Libraries, useLoadScript } from '@react-google-maps/api';
import { Autocomplete } from '@/components/ui/autocomplete';
import React from 'react';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

// Add access types
const ACCESS_TYPES = {
  PUBLIC: 'public',
  MEMBERSHIP: 'membership',
  PAID: 'paid',
  PRIVATE: 'private'
} as const;

type AccessType = typeof ACCESS_TYPES[keyof typeof ACCESS_TYPES];

// Extend Location type
type VenueType = 'indoor' | 'outdoor';

interface SportSelection {
  sportId: string;
  courtCount: number;
}

// Define the Location type directly in this file
interface Location {
  id?: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  createdBy: string;
  createdAt: number;
}

// Define the ExtendedLocation type
interface ExtendedLocation extends Location {
  hasLights?: boolean;
  accessType?: AccessType;
  hourlyRate?: number;
  streetViewUrl?: string;
  venueType: VenueType;
  sports: SportSelection[];
}

// Mock data for testing when Firebase permissions fail
const MOCK_LOCATIONS: ExtendedLocation[] = [
  {
    id: 'mock-1',
    name: 'Downtown Basketball Courts',
    address: '123 Main St, Austin, TX',
    lat: 30.2672,
    lng: -97.7431,
    createdBy: 'system',
    createdAt: Date.now(),
    hasLights: false,
    accessType: 'public',
    venueType: 'outdoor',
    sports: [{ sportId: 'basketball', courtCount: 2 }]
  },
  {
    id: 'mock-2',
    name: 'Riverside Tennis Center',
    address: '456 Riverside Dr, Austin, TX',
    lat: 30.2642,
    lng: -97.7668,
    createdBy: 'system',
    createdAt: Date.now(),
    hasLights: true,
    accessType: 'public',
    venueType: 'outdoor',
    sports: [{ sportId: 'tennis', courtCount: 4 }]
  },
  {
    id: 'mock-3',
    name: 'South Austin Pickleball Club',
    address: '789 South Lamar, Austin, TX',
    lat: 30.2472,
    lng: -97.7631,
    createdBy: 'system',
    createdAt: Date.now(),
    hasLights: true,
    accessType: 'membership',
    venueType: 'indoor',
    sports: [{ sportId: 'pickleball', courtCount: 6 }]
  }
];

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center);
  }, [center, map]);
  return null;
}

function MapClickHandler({ onMapClick }: { onMapClick: (e: L.LeafletMouseEvent) => void }) {
  useMapEvents({
    click: onMapClick,
  });
  return null;
}

const libraries: Libraries = ['places'];

export default function MapView() {
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const { selectedSport } = useSport();
  const [locations, setLocations] = useState<ExtendedLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useMockData, setUseMockData] = useState(false);
  const [center, setCenter] = useState<[number, number]>([30.2672, -97.7431]); // Austin
  const [newLocation, setNewLocation] = useState<Partial<ExtendedLocation>>({
    name: '',
    address: '',
    lat: 0,
    lng: 0,
    hasLights: false,
    accessType: 'public' as AccessType,
    venueType: 'outdoor' as VenueType,
    sports: []
  });
  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [mapType, setMapType] = useState<'street' | 'satellite'>('street');
  const [isDraggingMarker, setIsDraggingMarker] = useState(false);

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  // Fix Leaflet icon issues
  // This is needed because Leaflet's default icon paths are based on the page location
  // and don't work correctly with Next.js
  useEffect(() => {
    // Only run this code on the client side
    if (typeof window !== 'undefined') {
      // Fix Leaflet's icon paths
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
      });
    }
  }, []);

  // Debug Google Maps API key and environment
  useEffect(() => {
    console.log("DEBUG: MapView component mounted");
    console.log("DEBUG: Google Maps API Key (masked):", 
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY 
        ? `${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.substring(0, 8)}...` 
        : 'Not set');
    console.log("DEBUG: Google Maps API loaded:", isLoaded);
    console.log("DEBUG: Selected sport:", selectedSport);
    console.log("DEBUG: User authenticated:", !!user);
    console.log("DEBUG: Using mock data:", useMockData);
    
    // Check if Leaflet CSS is loaded
    const leafletCssLoaded = document.querySelector('link[href*="leaflet.css"]');
    console.log("DEBUG: Leaflet CSS loaded:", !!leafletCssLoaded);
    
    // Check if window.L is available (Leaflet global)
    console.log("DEBUG: Leaflet global available:", typeof L !== 'undefined');
  }, [isLoaded, selectedSport, user, useMockData]);

  // Test Firebase connection
  useEffect(() => {
    const testConnection = async () => {
      if (!user) return;
      
      try {
        // Try to access a document that should be accessible to all authenticated users
        const testDoc = await getDoc(doc(db, 'users', user.uid));
        console.log('Firebase connection test:', testDoc.exists() ? 'Success' : 'User document not found');
        setUseMockData(false);
      } catch (error) {
        console.error('Firebase connection test failed:', error);
        setError('Firebase connection failed. Using mock data for demonstration.');
        setUseMockData(true);
      }
    };
    
    testConnection();
  }, [user]);

  // Fetch locations for current sport
  useEffect(() => {
    const fetchLocations = async () => {
      if (authLoading) return; // Wait for auth to initialize
      
      setLoading(true);
      setError(null);
      
      if (!user) {
        setLoading(false);
        setLocations([]);
        return;
      }
      
      // If we're using mock data, filter by sport and return
      if (useMockData) {
        const filteredLocations = MOCK_LOCATIONS.filter(
          loc => loc.sports?.some(s => s.sportId === selectedSport?.id)
        );
        setLocations(filteredLocations);
        setLoading(false);
        return;
      }
      
      try {
        // Make sure we have a valid sport ID before querying
        if (!selectedSport?.id) {
          console.error('No sport selected');
          setLoading(false);
          return;
        }

        // Make sure auth is initialized and token is refreshed
        if (!auth.currentUser) {
          console.error('User not authenticated');
          setLoading(false);
          setError('Authentication error. Please try logging in again.');
          return;
        }

        // Force token refresh to ensure we have a valid token
        await auth.currentUser.getIdToken(true);

        const q = query(
          collection(db, 'locations')
        );
        
        const querySnapshot = await getDocs(q);
        const locationsData = querySnapshot.docs.map(doc => {
          const data = doc.data();
          // Ensure sports array exists and convert old format to new format
          if (!data.sports && data.sportId) {
            data.sports = [{ sportId: data.sportId, courtCount: data.courtCount || 1 }];
          }
          return {
            id: doc.id,
            ...data,
            sports: data.sports || []
          };
        }) as ExtendedLocation[];

        // Filter locations that have the selected sport
        const filteredLocations = locationsData.filter(
          loc => loc.sports.some(s => s.sportId === selectedSport.id)
        );
        
        setLocations(filteredLocations);
        setError(null);
      } catch (error) {
        console.error('Error fetching locations:', error);
        
        // Fall back to mock data if Firebase query fails
        setError('Failed to load locations from Firebase. Using mock data for demonstration.');
        const filteredLocations = MOCK_LOCATIONS.filter(
          loc => loc.sports?.some(s => s.sportId === selectedSport?.id)
        );
        setLocations(filteredLocations);
        setUseMockData(true);
      } finally {
        setLoading(false);
      }
    };

    fetchLocations();
  }, [user, authLoading, selectedSport?.id, toast, useMockData]);

  const handleAddLocation = async () => {
    if (!user) return;
    
    try {
      // If using mock data, just add to local state
      if (useMockData) {
        const mockLocation: ExtendedLocation = {
          id: `mock-${Date.now()}`,
          ...newLocation as Omit<ExtendedLocation, 'id'>,
          sportId: selectedSport?.id || 'basketball',
          createdBy: user.uid,
          createdAt: Date.now(),
        };
        
        setLocations(prev => [...prev, mockLocation]);
        setNewLocation({ name: '', address: '', lat: 0, lng: 0, courtCount: 1, hasLights: false, accessType: 'public', venueType: 'outdoor', sports: [] });
        setIsDialogOpen(false);
        
        toast({
          title: 'Success',
          description: 'Location added successfully (mock data)',
        });
        return;
      }
      
      // Force token refresh to ensure we have a valid token
      await auth.currentUser?.getIdToken(true);
      
      const locationData: Omit<ExtendedLocation, 'id'> = {
        ...newLocation as Omit<ExtendedLocation, 'id'>,
        sportId: selectedSport?.id || 'basketball',
        createdBy: user.uid,
        createdAt: Date.now(),
      };

      const docRef = await addDoc(collection(db, 'locations'), locationData);
      const newLocationWithId = { ...locationData, id: docRef.id };
      
      setLocations(prev => [...prev, newLocationWithId]);
      setNewLocation({ name: '', address: '', lat: 0, lng: 0, courtCount: 1, hasLights: false, accessType: 'public', venueType: 'outdoor', sports: [] });
      setIsDialogOpen(false);
      
      toast({
        title: 'Success',
        description: 'Location added successfully',
      });
    } catch (error) {
      console.error('Error adding location:', error);
      
      // Fall back to mock data if Firebase operation fails
      setUseMockData(true);
      
      toast({
        title: 'Error',
        description: 'Failed to add location to Firebase. Using mock data instead.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteLocation = async (locationId: string) => {
    if (!user) return;
    
    try {
      // If using mock data, just remove from local state
      if (useMockData || locationId.startsWith('mock-')) {
        setLocations(prev => prev.filter(loc => loc.id !== locationId));
        
        toast({
          title: 'Success',
          description: 'Location deleted successfully (mock data)',
        });
        return;
      }
      
      // Force token refresh to ensure we have a valid token
      await auth.currentUser?.getIdToken(true);
      
      await deleteDoc(doc(db, 'locations', locationId));
      setLocations(prev => prev.filter(loc => loc.id !== locationId));
      
      toast({
        title: 'Success',
        description: 'Location deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting location:', error);
      
      // Fall back to mock data if Firebase operation fails
      setUseMockData(true);
      
      toast({
        title: 'Error',
        description: 'Failed to delete location from Firebase. Using mock data instead.',
        variant: 'destructive',
      });
    }
  };

  const handleMapClick = useCallback(async (e: L.LeafletMouseEvent) => {
    if (!isAddingLocation) return;
    
    const { lat, lng } = e.latlng;
    
    try {
      // Reverse geocode the clicked location
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();
      
      if (data.results?.[0]) {
        setNewLocation(prev => ({
          ...prev,
          address: data.results[0].formatted_address,
          lat,
          lng,
          sports: selectedSport ? [{ sportId: selectedSport.id, courtCount: 1 }] : []
        }));
      } else {
        setNewLocation(prev => ({
          ...prev,
          lat,
          lng,
          sports: selectedSport ? [{ sportId: selectedSport.id, courtCount: 1 }] : []
        }));
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      setNewLocation(prev => ({
        ...prev,
        lat,
        lng,
        sports: selectedSport ? [{ sportId: selectedSport.id, courtCount: 1 }] : []
      }));
    }
    
    setIsDialogOpen(true);
    setIsAddingLocation(false);
  }, [isAddingLocation, selectedSport]);

  // Add function to handle sport selection
  const handleSportSelection = (sportId: string, checked: boolean) => {
    setNewLocation(prev => ({
      ...prev,
      sports: checked
        ? [...(prev.sports || []), { sportId, courtCount: 1 }]
        : (prev.sports || []).filter(s => s.sportId !== sportId)
    }));
  };

  // Add function to update court count for a sport
  const handleCourtCountChange = (sportId: string, count: number) => {
    setNewLocation(prev => ({
      ...prev,
      sports: (prev.sports || []).map(s =>
        s.sportId === sportId ? { ...s, courtCount: count } : s
      )
    }));
  };

  // Create sport-specific icons
  const getSportIcon = useCallback((sportId: string) => {
    const sportMarker = SportMarkers[sportId as keyof typeof SportMarkers] || SportMarkers.basketball;
    const iconHtml = document.createElement('div');
    iconHtml.className = 'sport-marker';
    const svgString = ReactDOMServer.renderToString(
      React.createElement(sportMarker, { className: 'w-8 h-8' })
    );
    iconHtml.innerHTML = svgString;
    
    return L.divIcon({
      html: iconHtml.outerHTML,
      className: '',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    });
  }, []);

  const hasValidLocation = (loc: Partial<ExtendedLocation>) => {
    return loc.address && typeof loc.lat === 'number' && typeof loc.lng === 'number';
  };

  const getStreetViewUrl = (loc: Partial<ExtendedLocation>) => {
    if (!loc.lat || !loc.lng) return null;
    return `https://maps.googleapis.com/maps/api/streetview?size=600x300&location=${loc.lat!},${loc.lng!}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}`;
  };

  const formatAccessType = (type: AccessType | undefined) => {
    if (!type) return 'Public';
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  // Update the handleGetCurrentLocation function to remove address autofill
  const handleGetCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast({
        title: "Error",
        description: "Geolocation is not supported by your browser",
        variant: "destructive"
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setUserLocation([lat, lng]);
        setCenter([lat, lng]);
      },
      (error) => {
        toast({
          title: "Error",
          description: "Unable to retrieve your location",
          variant: "destructive"
        });
      }
    );
  }, [toast]);

  // Get tile layer URL based on map type
  const getTileLayerUrl = () => {
    if (mapType === 'satellite') {
      return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    } else {
      return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    }
  };

  const getTileLayerAttribution = () => {
    if (mapType === 'satellite') {
      return 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community';
    } else {
      return '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
    }
  };

  // Handle marker drag end
  const handleMarkerDragEnd = useCallback((event: L.DragEndEvent) => {
    const marker = event.target;
    const position = marker.getLatLng();
    const { lat, lng } = position;
    
    // Update location with new coordinates
    setNewLocation(prev => ({
      ...prev,
      lat,
      lng
    }));
    
    // Reverse geocode the new position
    fetchAddressFromCoordinates(lat, lng);
  }, []);
  
  // Fetch address from coordinates
  const fetchAddressFromCoordinates = useCallback(async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();
      
      if (data.results?.[0]) {
        setNewLocation(prev => ({
          ...prev,
          address: data.results[0].formatted_address
        }));
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error);
    }
  }, []);

  // Add debug rendering
  if (loading) {
    return <div className="flex items-center justify-center h-[80vh]">
      <Loader2 className="h-8 w-8 animate-spin mr-2" />
      <p>Loading...</p>
    </div>;
  }

  if (error) {
    return <div className="flex flex-col items-center justify-center h-[80vh] p-4">
      <p className="text-red-500 mb-4">Error: {error}</p>
      <Button onClick={() => window.location.reload()}>Retry</Button>
    </div>;
  }

  if (!user) {
    return (
      <div className="w-full h-[calc(100vh-4rem)] flex items-center justify-center">
        <p>Please log in to view and add locations.</p>
      </div>
    );
  }

  return (
    <div className="relative h-full">
      {/* Map Controls - positioned above the map but below dialogs */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <Button
          variant={isAddingLocation ? "destructive" : "default"}
          size="sm"
          className={`flex items-center gap-2 ${!isAddingLocation ? "sport-accent-bg" : ""}`}
          onClick={() => setIsAddingLocation(!isAddingLocation)}
          disabled={isDialogOpen}
        >
          {isAddingLocation ? (
            <>
              <X className="h-4 w-4" />
              Cancel Pin Drop
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              Add {selectedSport?.name || 'Sports'} Location
            </>
          )}
        </Button>
        
        <Button
          variant="secondary"
          size="sm"
          className="flex items-center gap-2"
          onClick={() => setMapType(mapType === 'street' ? 'satellite' : 'street')}
          disabled={isAddingLocation}
        >
          <Layers className="h-4 w-4" />
          {mapType === 'street' ? 'Satellite View' : 'Street View'}
        </Button>
        
        <Button
          variant="secondary"
          size="sm"
          className="flex items-center gap-2"
          onClick={handleGetCurrentLocation}
          disabled={isAddingLocation}
        >
          <Navigation className="h-4 w-4" />
          See Current Location
        </Button>
      </div>
      
      {/* Pin Drop Mode Notification */}
      {isAddingLocation && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-10 bg-background/90 border border-primary px-4 py-2 rounded-full shadow-lg animate-pulse">
          <p className="text-sm font-medium flex items-center">
            <span className="sport-accent mr-2">●</span>
            Click anywhere on the map to drop a {selectedSport?.name || 'sports'} location pin
          </p>
        </div>
      )}
      
      <MapContainer
        center={center}
        zoom={13}
        className={`w-full h-full ${isAddingLocation ? 'cursor-crosshair' : ''}`}
        style={{ height: 'calc(100vh - 8rem)', minHeight: '500px' }}
        zoomControl={true}
        attributionControl={true}
        doubleClickZoom={true}
        scrollWheelZoom={true}
        dragging={true}
        easeLinearity={0.35}
      >
        <MapUpdater center={center} />
        <MapClickHandler onMapClick={handleMapClick} />
        <TileLayer
          attribution={getTileLayerAttribution()}
          url={getTileLayerUrl()}
        />
        
        {/* Existing Locations */}
        {locations.map((location) => (
          <Marker
            key={location.id}
            position={[location.lat, location.lng]}
            icon={getSportIcon(location.sports?.[0]?.sportId || 'basketball')}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-semibold">{location.name}</h3>
                <p className="text-sm">{location.address}</p>
                <div className="mt-2 space-y-1">
                  <p className="text-sm">
                    {location.venueType === 'indoor' ? '🏢 Indoor' : '🌳 Outdoor'} Facility
                  </p>
                  {(location.sports || []).map(sport => (
                    <div key={sport.sportId} className="flex items-center gap-2">
                      {React.createElement(SportMarkers[sport.sportId as keyof typeof SportMarkers], {
                        className: 'w-4 h-4'
                      })}
                      <p className="text-sm">
                        {sport.sportId.charAt(0).toUpperCase() + sport.sportId.slice(1)}: {sport.courtCount} courts
                      </p>
                    </div>
                  ))}
                  {location.hasLights && (
                    <p className="text-sm flex items-center">
                      <span className="mr-1">🌙</span> Available for night play
                    </p>
                  )}
                  <p className="text-sm">
                    Access: {formatAccessType(location.accessType)}
                    {location.accessType === ACCESS_TYPES.PAID && location.hourlyRate && 
                      ` ($${location.hourlyRate}/hour)`
                    }
                  </p>
                </div>
                {location.createdBy === user.uid && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="mt-2"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Location</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this location? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => location.id && handleDeleteLocation(location.id)}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Preview marker for new location */}
        {isDialogOpen && newLocation.lat && newLocation.lng && (
          <Marker
            position={[newLocation.lat, newLocation.lng]}
            icon={getSportIcon(selectedSport?.id || 'basketball')}
            draggable={true}
            eventHandlers={{
              dragstart: () => setIsDraggingMarker(true),
              dragend: (e) => {
                setIsDraggingMarker(false);
                handleMarkerDragEnd(e);
              }
            }}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-semibold">{newLocation.name || 'New Location'}</h3>
                <p className="text-sm">{newLocation.address || 'Adjusting location...'}</p>
                {isDraggingMarker && (
                  <p className="text-xs text-blue-600 mt-1">Release to set new position</p>
                )}
                {!isDraggingMarker && (
                  <p className="text-xs text-muted-foreground mt-1">Drag marker to adjust position</p>
                )}
              </div>
            </Popup>
          </Marker>
        )}

        {/* Add user location marker if available */}
        {userLocation && (
          <Marker
            position={userLocation}
            icon={L.divIcon({
              className: 'user-location-marker',
              html: '<div class="w-4 h-4 bg-blue-500 rounded-full border-2 border-white"></div>',
              iconSize: [16, 16],
              iconAnchor: [8, 8],
            })}
          >
            <Popup>Your Location</Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Add Location Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Location</DialogTitle>
            <DialogDescription>
              Enter details about the {selectedSport?.name || 'sports'} location.
            </DialogDescription>
            {hasValidLocation(newLocation) && (
              <div className="text-sm text-muted-foreground mt-2">
                You can drag the marker on the map to fine-tune the location.
              </div>
            )}
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Location Name</Label>
              <Input
                id="name"
                value={newLocation.name || ''}
                onChange={(e) => setNewLocation(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Downtown Courts"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="address">Address</Label>
              {isLoaded ? (
                <Autocomplete
                  onLoad={(autocomplete) => {
                    autocomplete.addListener('place_changed', () => {
                      const place = autocomplete.getPlace();
                      if (place.formatted_address && place.geometry?.location) {
                        const lat = place.geometry.location.lat();
                        const lng = place.geometry.location.lng();
                        setNewLocation(prev => ({
                          ...prev,
                          address: place.formatted_address,
                          lat,
                          lng
                        }));
                        setCenter([lat, lng]);
                      }
                    });
                  }}
                >
                  <Input
                    id="address"
                    value={newLocation.address || ''}
                    onChange={(e) => setNewLocation(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Search for an address"
                  />
                </Autocomplete>
              ) : (
                <Input
                  id="address"
                  value={newLocation.address || ''}
                  onChange={(e) => setNewLocation(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Loading address search..."
                  disabled
                />
              )}
              {hasValidLocation(newLocation) && (
                <div className="mt-2 p-2 bg-muted rounded-md">
                  <p className="text-sm text-muted-foreground mb-2">Location Preview:</p>
                  <div className="aspect-video w-full bg-muted-foreground/10 rounded-md overflow-hidden">
                    <iframe 
                      src={`https://www.google.com/maps/embed/v1/streetview?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&location=${newLocation.lat},${newLocation.lng}&heading=210&pitch=10&fov=90`}
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      title="Street View"
                      className="w-full h-full"
                    ></iframe>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Coordinates: {newLocation.lat?.toFixed(6) || '0.000000'}, {newLocation.lng?.toFixed(6) || '0.000000'}
                  </div>
                </div>
              )}
            </div>
            <div className="grid gap-4">
              <Label>Venue Type</Label>
              <RadioGroup
                value={newLocation.venueType || 'outdoor'}
                onValueChange={(value: VenueType) => 
                  setNewLocation(prev => ({ ...prev, venueType: value }))
                }
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="outdoor" id="outdoor" />
                  <Label htmlFor="outdoor">Outdoor</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="indoor" id="indoor" />
                  <Label htmlFor="indoor">Indoor</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="grid gap-4">
              <Label>Available Sports</Label>
              <div className="grid gap-4">
                {Object.entries(SportMarkers).map(([sportId, SportIcon]) => (
                  <div key={sportId} className="flex items-start space-x-4">
                    <Checkbox
                      id={`sport-${sportId}`}
                      checked={(newLocation.sports || []).some(s => s.sportId === sportId)}
                      onCheckedChange={(checked) => handleSportSelection(sportId, checked === true)}
                    />
                    <div className="grid gap-1.5 leading-none">
                      <div className="flex items-center gap-2">
                        <SportIcon className="w-4 h-4" />
                        <Label htmlFor={`sport-${sportId}`} className="font-medium">
                          {sportId.charAt(0).toUpperCase() + sportId.slice(1)}
                        </Label>
                      </div>
                      {(newLocation.sports || []).some(s => s.sportId === sportId) && (
                        <div className="flex items-center gap-2 ml-6">
                          <Label htmlFor={`courts-${sportId}`}>Courts:</Label>
                          <Input
                            id={`courts-${sportId}`}
                            type="number"
                            min="1"
                            className="w-20"
                            value={(newLocation.sports || []).find(s => s.sportId === sportId)?.courtCount || 1}
                            onChange={(e) => handleCourtCountChange(sportId, parseInt(e.target.value) || 1)}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Lighting</Label>
              {(newLocation.venueType === 'outdoor' || newLocation.venueType === undefined) && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="hasLights"
                    checked={newLocation.hasLights}
                    onCheckedChange={(checked) => 
                      setNewLocation(prev => ({ ...prev, hasLights: checked === true }))
                    }
                  />
                  <label
                    htmlFor="hasLights"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Has lights for night play
                  </label>
                </div>
              )}
            </div>
            <div className="grid gap-2">
              <Label>Access Type</Label>
              <Select
                value={newLocation.accessType || 'public'}
                onValueChange={(value: AccessType) => 
                  setNewLocation(prev => ({ ...prev, accessType: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select access type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ACCESS_TYPES.PUBLIC}>Open to Public</SelectItem>
                  <SelectItem value={ACCESS_TYPES.MEMBERSHIP}>Membership Required</SelectItem>
                  <SelectItem value={ACCESS_TYPES.PAID}>Pay to Play</SelectItem>
                  <SelectItem value={ACCESS_TYPES.PRIVATE}>Private Access</SelectItem>
                </SelectContent>
              </Select>
              {newLocation.accessType === ACCESS_TYPES.PAID && (
                <div className="mt-2">
                  <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
                  <Input
                    id="hourlyRate"
                    type="number"
                    min="0"
                    step="0.01"
                    value={newLocation.hourlyRate || ''}
                    onChange={(e) => setNewLocation(prev => ({ 
                      ...prev, 
                      hourlyRate: parseFloat(e.target.value) || 0 
                    }))}
                    placeholder="e.g., 15.00"
                  />
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsDialogOpen(false);
              setNewLocation({ 
                name: '', 
                address: '', 
                lat: 0, 
                lng: 0, 
                courtCount: 1,
                hasLights: false,
                accessType: 'public' as AccessType,
                venueType: 'outdoor' as VenueType,
                sports: []
              });
            }}>
              Cancel
            </Button>
            <Button onClick={handleAddLocation} disabled={!newLocation.name || !newLocation.address}>
              Add Location
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

