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
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CircleDot } from 'lucide-react';
import dynamic from 'next/dynamic';

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

// Global map instance tracker - completely outside of React
let globalMapInstance: L.Map | null = null;
let isMapInitializing = false;
let mapInitializationPromise: Promise<L.Map> | null = null;
let leafletCssLoaded = false;

// Define a constant map container ID outside the component
const MAP_CONTAINER_ID = "map-container";

// Add a type declaration for the global L object
declare global {
  interface Window {
    L: typeof import('leaflet');
  }
}

// Function to load Leaflet CSS
function loadLeafletCss() {
  if (leafletCssLoaded || typeof document === 'undefined') return;
  
  // Check if the CSS is already loaded
  const existingLink = document.querySelector('link[href*="leaflet.css"]');
  if (existingLink) {
    leafletCssLoaded = true;
    return;
  }
  
  // Create a new link element
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
  link.crossOrigin = '';
  
  // Append it to the head
  document.head.appendChild(link);
  
  // Mark as loaded
  leafletCssLoaded = true;
  
  console.log("DEBUG: Leaflet CSS loaded");
}

// Function to safely destroy any existing map
function cleanupExistingMap() {
  // Check if there's a global map instance
  if (globalMapInstance) {
    console.log("DEBUG: Cleaning up existing global map instance");
    try {
      globalMapInstance.off();
      globalMapInstance.remove();
      globalMapInstance = null;
    } catch (error) {
      console.error("DEBUG: Error cleaning up global map instance", error);
    }
  }
  
  // Also check for any map containers in the DOM
  if (typeof document !== 'undefined') {
    // Find the container
    const container = document.getElementById(MAP_CONTAINER_ID);
    if (container) {
      console.log("DEBUG: Cleaning up map container");
      // Clear the container
      container.innerHTML = '';
      
      // Remove any Leaflet-specific classes
      container.className = container.className
        .split(' ')
        .filter(c => !c.startsWith('leaflet'))
        .join(' ');
    }
    
    // Also remove any other leaflet containers that might exist
    document.querySelectorAll('.leaflet-container').forEach(el => {
      if (el.id !== MAP_CONTAINER_ID) {
        console.log("DEBUG: Removing extra leaflet container");
        if (el.parentNode) {
          el.parentNode.removeChild(el);
        }
      }
    });
  }
  
  // Reset the initialization state
  isMapInitializing = false;
  mapInitializationPromise = null;
}

// Function to safely initialize the map
function getOrCreateMapInstance(containerId: string, center: [number, number], zoom: number): Promise<L.Map> {
  // Load Leaflet CSS
  loadLeafletCss();
  
  // If we already have a map instance, return it
  if (globalMapInstance) {
    console.log("DEBUG: Reusing existing map instance");
    return Promise.resolve(globalMapInstance);
  }
  
  // If we're already initializing, return the promise
  if (mapInitializationPromise) {
    console.log("DEBUG: Map initialization already in progress");
    return mapInitializationPromise;
  }
  
  // Start initialization
  isMapInitializing = true;
  console.log("DEBUG: Starting map initialization");
  
  // Create a promise to initialize the map
  mapInitializationPromise = new Promise<L.Map>((resolve, reject) => {
    try {
      console.log("DEBUG: Creating new map instance");
      
      // Wait for the DOM to be ready and check multiple times for the container
      let attempts = 0;
      const maxAttempts = 10;
      const checkInterval = 300; // Increased interval to reduce CPU usage
      
      const checkForContainer = () => {
        // Check if the container exists
        const container = document.getElementById(containerId);
        
        if (container && container.clientWidth > 0 && container.clientHeight > 0) {
          console.log(`DEBUG: Container ${containerId} found with dimensions: ${container.clientWidth}x${container.clientHeight}`);
          
          try {
            // Fix Leaflet's icon paths
            if (typeof window !== 'undefined') {
              delete (L.Icon.Default.prototype as any)._getIconUrl;
              
              L.Icon.Default.mergeOptions({
                iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
                iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
              });
            }
            
            // Create the map
            const map = L.map(containerId, {
              center,
              zoom,
              zoomControl: true,
              attributionControl: true,
              // Add performance optimizations
              preferCanvas: true,
              renderer: L.canvas(),
            });
            
            // Add the tile layer
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
              maxZoom: 19,
            }).addTo(map);
            
            // Store the map instance globally
            globalMapInstance = map;
            isMapInitializing = false;
            mapInitializationPromise = null;
            
            console.log("DEBUG: Map initialization complete");
            resolve(map);
          } catch (error) {
            console.error("DEBUG: Error creating map:", error);
            isMapInitializing = false;
            mapInitializationPromise = null;
            reject(error);
          }
        } else {
          attempts++;
          if (attempts < maxAttempts) {
            console.log(`DEBUG: Container ${containerId} not found or has zero dimensions, retrying (${attempts}/${maxAttempts})...`);
            setTimeout(checkForContainer, checkInterval);
          } else {
            console.error(`DEBUG: Container ${containerId} not found after ${maxAttempts} attempts`);
            isMapInitializing = false;
            mapInitializationPromise = null;
            reject(new Error(`Container ${containerId} not found after ${maxAttempts} attempts`));
          }
        }
      };
      
      // Start checking for the container
      setTimeout(checkForContainer, 100);
    } catch (error) {
      console.error("DEBUG: Error in map initialization:", error);
      isMapInitializing = false;
      mapInitializationPromise = null;
      reject(error);
    }
  });
  
  return mapInitializationPromise;
}

// Function to safely destroy the map
function destroyMapInstance() {
  if (globalMapInstance) {
    try {
      console.log("DEBUG: Destroying map instance");
      globalMapInstance.off();
      globalMapInstance.remove();
      globalMapInstance = null;
    } catch (error) {
      console.error("DEBUG: Error destroying map instance", error);
    }
  }
}

// Create a component to handle map initialization
function MapInitializer({ onMapReady }: { onMapReady: (map: L.Map) => void }) {
  useEffect(() => {
    console.log("DEBUG: Map initializer mounted");
    
    // Get or create the map instance
    if (globalMapInstance) {
      onMapReady(globalMapInstance);
    }
    
    return () => {
      console.log("DEBUG: Map initializer unmounting");
    };
  }, [onMapReady]);
  
  return null;
}

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
  const { selectedSport, setSelectedSport, sports } = useSport();
  const [locations, setLocations] = useState<ExtendedLocation[]>([]);
  const [filteredLocations, setFilteredLocations] = useState<ExtendedLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
  const [isMounted, setIsMounted] = useState(false);
  
  // Reference to the map instance
  const mapRef = useRef<L.Map | null>(null);
  
  // Use the constant map container ID instead of creating it in the component
  const [isMapInitialized, setIsMapInitialized] = useState(false);
  
  // Add refs to store previous values to prevent unnecessary re-renders
  const prevSportRef = useRef<string | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  // Handle auth state changes
  useEffect(() => {
    if (!authLoading && !user) {
      // User is not authenticated, show a message
      console.log("DEBUG: User is not authenticated");
      setError("Please log in to view and add locations.");
    } else if (!authLoading && user) {
      // User is authenticated, clear any auth-related errors
      console.log("DEBUG: User is authenticated:", user.uid);
      if (error === "Please log in to view and add locations.") {
        setError(null);
      }
    }
  }, [user, authLoading, error]);
  
  // Reverse geocode function
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
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
  
  // Update the map click handler to use the map instance directly
  const handleMapClick = useCallback((e: L.LeafletMouseEvent) => {
    if (!isAddingLocation) return;
    
    const { lat, lng } = e.latlng;
    
    // Update the new location with the clicked coordinates
    setNewLocation(prev => ({
      ...prev,
      lat,
      lng
    }));
    
    // Open the dialog
    setIsDialogOpen(true);
    
    // Turn off adding mode
    setIsAddingLocation(false);
    
    // Reverse geocode the location
    reverseGeocode(lat, lng);
  }, [isAddingLocation, reverseGeocode, setNewLocation, setIsDialogOpen, setIsAddingLocation]);
  
  // Update the marker drag end handler
  const handleMarkerDragEnd = useCallback((e: L.DragEndEvent) => {
    const marker = e.target;
    const position = marker.getLatLng();
    
    setNewLocation(prev => ({
      ...prev,
      lat: position.lat,
      lng: position.lng
    }));
    
    reverseGeocode(position.lat, position.lng);
  }, [reverseGeocode, setNewLocation]);
  
  // Memoize the filtered locations to prevent unnecessary re-renders
  const getFilteredLocations = useCallback(() => {
    if (!selectedSport) return locations;
    
    return locations.filter(location => 
      location.sports?.some(sport => sport.sportId === selectedSport.id)
    );
  }, [locations, selectedSport]);

  // Update filtered locations when locations or selected sport changes
  useEffect(() => {
    setFilteredLocations(getFilteredLocations());
  }, [getFilteredLocations]);

  // Fetch locations only once on component mount or when user changes
  useEffect(() => {
    if (!authLoading) {
      fetchLocations();
    }
  }, [authLoading, user?.uid]); // Only depend on auth state and user ID

  // Handle map initialization - OPTIMIZED to prevent multiple initializations
  useEffect(() => {
    console.log(`DEBUG: MapView component mounted`);
    
    if (!isMounted) {
      setIsMounted(true);
      
      // Initialize the map only once
      getOrCreateMapInstance(MAP_CONTAINER_ID, center, 13)
        .then((map) => {
          console.log("DEBUG: Map instance obtained");
          mapRef.current = map;
          setIsMapInitialized(true);
          
          // Force a resize to ensure the map renders correctly
          setTimeout(() => {
            map.invalidateSize();
            console.log("DEBUG: Map size invalidated");
          }, 100);
          
          // Set up map click handler
          map.on('click', handleMapClick);
          
          // Add a global function to handle location deletion
          (window as any).deleteLocation = (locationId: string) => {
            handleDeleteLocation(locationId);
          };
        })
        .catch((error) => {
          console.error("DEBUG: Error obtaining map instance", error);
          setError("Failed to initialize map. Please try again.");
        });
    }
    
    return () => {
      console.log(`DEBUG: MapView component unmounting`);
      
      // Remove the click handler
      if (mapRef.current) {
        mapRef.current.off('click', handleMapClick);
      }
      
      // Remove the global function
      delete (window as any).deleteLocation;
    };
  }, [isMounted]); // Only depend on isMounted to ensure it runs once

  // SEPARATE useEffect for updating markers when locations or sport changes
  useEffect(() => {
    if (!mapRef.current || !isMapInitialized) return;
    
    const map = mapRef.current;
    const currentSportId = selectedSport?.id || null;
    
    // Only update markers if the sport has changed or locations have changed
    if (prevSportRef.current === currentSportId && markersRef.current.length === filteredLocations.length) {
      return;
    }
    
    prevSportRef.current = currentSportId;
    
    console.log("DEBUG: Updating markers for sport:", currentSportId);
    
    // Clear existing markers
    markersRef.current.forEach(marker => {
      map.removeLayer(marker);
    });
    markersRef.current = [];
    
    // Add location markers for the filtered locations
    filteredLocations.forEach((location) => {
      const marker = L.marker(
        [location.lat, location.lng],
        { icon: getSportIcon(location.sports?.[0]?.sportId || 'basketball') }
      ).addTo(map);
      
      // Add popup
      marker.bindPopup(`
        <div class="p-2">
          <h3 class="font-semibold">${location.name}</h3>
          <p class="text-sm">${location.address}</p>
          <div class="mt-2 space-y-1">
            <p class="text-sm">
              ${location.venueType === 'indoor' ? '🏢 Indoor' : '🌳 Outdoor'} Facility
            </p>
            ${(location.sports || []).map(sport => `
              <div class="flex items-center gap-2">
                <p class="text-sm">
                  ${sport.sportId.charAt(0).toUpperCase() + sport.sportId.slice(1)}: ${sport.courtCount} courts
                </p>
              </div>
            `).join('')}
            ${location.hasLights ? `
              <p class="text-sm flex items-center">
                <span class="mr-1">🌙</span> Available for night play
              </p>
            ` : ''}
            <p class="text-sm">
              Access: ${formatAccessType(location.accessType)}
              ${location.accessType === ACCESS_TYPES.PAID && location.hourlyRate ? 
                ` ($${location.hourlyRate}/hour)` : ''}
            </p>
          </div>
          ${user && location.createdBy === user.uid ? `
            <button 
              class="mt-2 px-2 py-1 bg-red-500 text-white rounded text-sm"
              onclick="window.deleteLocation('${location.id}')"
            >
              Delete
            </button>
          ` : ''}
        </div>
      `);
      
      // Store the marker reference
      markersRef.current.push(marker);
    });
    
  }, [filteredLocations, selectedSport, isMapInitialized, user]);

  // SEPARATE useEffect for handling preview marker for new location
  useEffect(() => {
    if (!mapRef.current || !isMapInitialized || !isDialogOpen || !newLocation.lat || !newLocation.lng) return;
    
    const map = mapRef.current;
    
    // Create a new marker for the preview
    const marker = L.marker(
      [newLocation.lat, newLocation.lng],
      { 
        icon: getSportIcon(selectedSport?.id || 'basketball'),
        draggable: true
      }
    ).addTo(map);
    
    // Add drag events
    marker.on('dragstart', () => setIsDraggingMarker(true));
    marker.on('dragend', (e) => {
      setIsDraggingMarker(false);
      handleMarkerDragEnd(e);
    });
    
    // Add popup
    marker.bindPopup(`
      <div class="p-2">
        <h3 class="font-semibold">${newLocation.name || 'New Location'}</h3>
        <p class="text-sm">${newLocation.address || 'Adjusting location...'}</p>
        ${isDraggingMarker ? `
          <p class="text-xs text-blue-600 mt-1">Release to set new position</p>
        ` : `
          <p class="text-xs text-muted-foreground mt-1">Drag marker to adjust position</p>
        `}
      </div>
    `);
    
    return () => {
      // Clean up the marker when the dialog closes
      map.removeLayer(marker);
    };
  }, [isDialogOpen, newLocation.lat, newLocation.lng, newLocation.name, newLocation.address, selectedSport, isDraggingMarker, handleMarkerDragEnd, isMapInitialized]);

  // SEPARATE useEffect for handling user location marker
  useEffect(() => {
    if (!mapRef.current || !isMapInitialized || !userLocation) return;
    
    const map = mapRef.current;
    
    // Create a new marker for the user location
    const marker = L.marker(
      userLocation,
      {
        icon: L.divIcon({
          className: 'user-location-marker',
          html: '<div class="w-4 h-4 bg-blue-500 rounded-full border-2 border-white"></div>',
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        })
      }
    ).addTo(map);
    
    marker.bindPopup('Your Location');
    
    return () => {
      // Clean up the marker when the user location changes
      map.removeLayer(marker);
    };
  }, [userLocation, isMapInitialized]);

  // SEPARATE useEffect for handling map type changes
  useEffect(() => {
    if (!mapRef.current || !isMapInitialized) return;
    
    const map = mapRef.current;
    const currentTileLayer = (map as any).currentTileLayer;
    
    if (currentTileLayer) {
      map.removeLayer(currentTileLayer);
    }
    
    const newTileLayer = L.tileLayer(getTileLayerUrl(mapType), {
      maxZoom: 19,
      attribution: getTileLayerAttribution()
    }).addTo(map);
    
    (map as any).currentTileLayer = newTileLayer;
    
  }, [mapType, isMapInitialized]);

  // Optimize the fetchLocations function to prevent unnecessary re-renders
  const fetchLocations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log("DEBUG: Fetching locations from Firestore");
      
      const locationsRef = collection(db, 'locations');
      const q = query(locationsRef);
      const querySnapshot = await getDocs(q);
      
      const fetchedLocations: ExtendedLocation[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data() as ExtendedLocation;
        fetchedLocations.push({
          ...data,
          id: doc.id
        });
      });
      
      console.log(`DEBUG: Fetched ${fetchedLocations.length} locations`);
      setLocations(fetchedLocations);
      
      // Update filtered locations based on selected sport
      setFilteredLocations(
        selectedSport 
          ? fetchedLocations.filter(location => 
              location.sports?.some(sport => sport.sportId === selectedSport.id)
            )
          : fetchedLocations
      );
      
    } catch (error) {
      console.error("Error fetching locations:", error);
      setError("Failed to load locations. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [selectedSport]);

  const handleAddLocation = async () => {
    if (!user) return;
    
    if (!hasValidLocation(newLocation)) {
      toast({
        title: "Invalid location",
        description: "Please provide a name, address, and valid coordinates.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Prepare the location data
      const locationData: Omit<ExtendedLocation, 'id'> = {
        name: newLocation.name || '',
        address: newLocation.address || '',
        lat: newLocation.lat || 0,
        lng: newLocation.lng || 0,
        createdBy: user.uid,
        createdAt: Date.now(),
        hasLights: newLocation.hasLights || false,
        accessType: newLocation.accessType || 'public',
        hourlyRate: newLocation.hourlyRate || 0,
        venueType: newLocation.venueType || 'outdoor',
        sports: newLocation.sports || []
      };
      
      // Add to Firestore
      const docRef = await addDoc(collection(db, "locations"), locationData);
      
      // Add to local state with the new ID
      const newLocationWithId: ExtendedLocation = {
        ...locationData,
        id: docRef.id
      };
      
      setLocations(prev => [...prev, newLocationWithId]);
      
      toast({
        title: "Success",
        description: "Location added successfully!",
      });
      
      // Reset form
      setNewLocation({
        name: '',
        address: '',
        lat: 0,
        lng: 0,
        hasLights: false,
        accessType: 'public',
        venueType: 'outdoor',
        sports: []
      });
      
      // Close dialog
      setIsDialogOpen(false);
      setIsAddingLocation(false);
    } catch (error) {
      console.error("Error adding location:", error);
      toast({
        title: "Error",
        description: "Failed to add location. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteLocation = async (locationId: string) => {
    if (!user) return;
    
    try {
      // Delete from Firestore
      await deleteDoc(doc(db, "locations", locationId));
      
      // Remove from local state
      setLocations(prev => prev.filter(loc => loc.id !== locationId));
      
      toast({
        title: "Success",
        description: "Location deleted successfully!",
      });
    } catch (error) {
      console.error("Error deleting location:", error);
      toast({
        title: "Error",
        description: "Failed to delete location. Please try again.",
        variant: "destructive"
      });
    }
  };

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

  // Function to get the tile layer URL based on the map type
  const getTileLayerUrl = (type: 'street' | 'satellite') => {
    if (type === 'satellite') {
      return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    }
    return 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  };

  // Function to get the tile layer attribution
  const getTileLayerAttribution = () => {
    return mapType === 'satellite' 
      ? 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
      : '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>';
  };

  // Only render the map if the component is mounted and there's no error
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4">
        <div className="text-center mb-4">
          <h2 className="text-xl font-bold mb-2">Error</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => {
            setError(null);
            if (typeof window !== 'undefined') {
              window.location.reload();
            }
          }}>Retry</Button>
        </div>
      </div>
    );
  }
  
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <Loader2 className="h-8 w-8 animate-spin mr-2" />
        <p>Checking authentication...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="w-full h-[calc(100vh-4rem)] flex items-center justify-center">
        <p>Please log in to view and add locations.</p>
      </div>
    );
  }

  if (!isMapInitialized) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-muted/20">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-sm text-muted-foreground">Initializing map...</p>
        </div>
        
        {/* Create an empty container for the map - make sure it exists but is hidden */}
        <div 
          id={MAP_CONTAINER_ID} 
          style={{ 
            position: 'absolute', 
            visibility: 'hidden',
            height: "100%", 
            width: "100%" 
          }}
        ></div>
      </div>
    );
  }

  if (loading) {
    return <div className="flex items-center justify-center h-[80vh]">
      <Loader2 className="h-8 w-8 animate-spin mr-2" />
      <p>Loading...</p>
    </div>;
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
      
      {/* Map Container - make sure it's visible and has proper dimensions */}
      <div 
        id={MAP_CONTAINER_ID} 
        className="w-full h-full"
        style={{ 
          height: 'calc(100vh - 8rem)', 
          minHeight: '500px',
          position: 'relative',
          zIndex: 1,
          border: '1px solid #ccc'
        }}
      ></div>

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

