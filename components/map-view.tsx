"use client"

import { useEffect, useState, useCallback, useRef } from 'react';
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

// Extend the Location type with additional fields
interface ExtendedLocation extends Location {
  hasLights?: boolean;
  accessType?: AccessType;
  hourlyRate?: number;
  streetViewUrl?: string;
  venueType: VenueType;
  sports: SportSelection[];
}

// Global map instance tracker - completely outside of React
let globalMapInstance: any = null;
let isMapInitializing = false;
let mapInitializationPromise: Promise<any> | null = null;
let leafletCssLoaded = false;
let mapInitializationAttempts = 0;
const MAX_INITIALIZATION_ATTEMPTS = 3;

// Define a constant map container ID outside the component
const MAP_CONTAINER_ID = "map-container-direct";

// Add a type declaration for the global L object
declare global {
  interface Window {
    L: any;
    deleteLocation: (locationId: string) => void;
    updateMapType: (type: 'street' | 'satellite') => void;
    getCurrentLocation: () => void;
    togglePinDropMode: (enable: boolean) => void;
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
  
  // Add the link to the document head
  document.head.appendChild(link);
  leafletCssLoaded = true;
  console.log("DEBUG: Leaflet CSS loaded");
}

// Simplified function to load Leaflet JS
function loadLeafletJs(): Promise<void> {
  return new Promise((resolve, reject) => {
    // If Leaflet is already available, resolve immediately
    if (typeof window !== 'undefined' && window.L) {
      console.log("DEBUG: Leaflet JS already loaded");
      resolve();
      return;
    }
    
    // If document is not available, reject
    if (typeof document === 'undefined') {
      reject(new Error("Document not available"));
      return;
    }
    
    // Check if script is already being loaded
    const existingScript = document.querySelector('script[src*="leaflet.js"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve());
      existingScript.addEventListener('error', (error) => reject(error));
      return;
    }
    
    // Create and add script element
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
    script.crossOrigin = '';
    
    script.onload = () => {
      console.log("DEBUG: Leaflet script loaded");
      resolve();
    };
    
    script.onerror = (error) => {
      console.error("DEBUG: Error loading Leaflet script", error);
      reject(error);
    };
    
    document.head.appendChild(script);
  });
}

// Function to clean up existing map instances
function cleanupExistingMap() {
  if (globalMapInstance) {
    try {
      console.log("DEBUG: Cleaning up existing map instance");
      globalMapInstance.remove();
      globalMapInstance = null;
    } catch (error) {
      console.error("DEBUG: Error cleaning up map:", error);
    }
  }
}

// Function to safely initialize the map
function getOrCreateMapInstance(containerId: string, center: [number, number], zoom: number): Promise<any> {
  // Load Leaflet CSS
  loadLeafletCss();
  
  console.log("DEBUG: getOrCreateMapInstance called with containerId:", containerId);
  console.log("DEBUG: globalMapInstance:", !!globalMapInstance);
  console.log("DEBUG: isMapInitializing:", isMapInitializing);
  console.log("DEBUG: mapInitializationPromise:", !!mapInitializationPromise);
  
  // If we've tried too many times, reject immediately
  if (mapInitializationAttempts >= MAX_INITIALIZATION_ATTEMPTS) {
    console.error("DEBUG: Too many initialization attempts, giving up");
    return Promise.reject(new Error("Too many initialization attempts"));
  }
  
  // Increment the attempt counter
  mapInitializationAttempts++;
  
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
  mapInitializationPromise = new Promise((resolve, reject) => {
    // Set a global timeout to prevent infinite loops
    const timeoutId = setTimeout(() => {
      console.error("DEBUG: Map initialization timed out after 10 seconds");
      isMapInitializing = false;
      mapInitializationPromise = null;
      reject(new Error("Map initialization timed out"));
    }, 10000); // 10 second timeout
    
    // First load Leaflet JS
    loadLeafletJs()
      .then(() => {
        try {
          console.log("DEBUG: Leaflet JS loaded successfully");
          console.log("DEBUG: Creating new map instance");
          
          // Wait for the DOM to be ready and check multiple times for the container
          let attempts = 0;
          const maxAttempts = 30; // Increase max attempts
          const checkInterval = 300; // Increased interval to reduce CPU usage
          
          const checkForContainer = () => {
            // Check if the container exists
            const container = document.getElementById(containerId);
            
            console.log(`DEBUG: Checking for container (attempt ${attempts + 1}/${maxAttempts})`);
            console.log(`DEBUG: Container exists:`, !!container);
            
            if (container) {
              console.log(`DEBUG: Container ${containerId} found with dimensions: ${container.clientWidth}x${container.clientHeight}`);
              console.log(`DEBUG: Container visibility:`, window.getComputedStyle(container).visibility);
              console.log(`DEBUG: Container display:`, window.getComputedStyle(container).display);
              console.log(`DEBUG: Container position:`, window.getComputedStyle(container).position);
              
              try {
                // Fix Leaflet's icon paths
                if (typeof window !== 'undefined' && window.L) {
                  console.log("DEBUG: window.L is available");
                  delete (window.L.Icon.Default.prototype as any)._getIconUrl;
                  
                  window.L.Icon.Default.mergeOptions({
                    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
                    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
                  });
                } else {
                  console.error("DEBUG: window.L not available");
                  clearTimeout(timeoutId);
                  reject(new Error("Leaflet not available"));
                  return;
                }
                
                // Create the map
                console.log("DEBUG: About to create map with L.map()");
                try {
                  const map = window.L.map(containerId, {
                    center,
                    zoom,
                    zoomControl: true,
                    attributionControl: true,
                    // Add performance optimizations
                    preferCanvas: true,
                    renderer: window.L.canvas(),
                  });
                  
                  console.log("DEBUG: Map created successfully");
                  
                  // Add the tile layer
                  console.log("DEBUG: Adding tile layer");
                  window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                    maxZoom: 19,
                  }).addTo(map);
                  
                  console.log("DEBUG: Tile layer added successfully");
                  
                  // Store the map instance globally
                  globalMapInstance = map;
                  isMapInitializing = false;
                  mapInitializationPromise = null;
                  
                  // Clear the timeout since we succeeded
                  clearTimeout(timeoutId);
                  
                  console.log("DEBUG: Map initialization complete");
                  resolve(map);
                } catch (mapError) {
                  console.error("DEBUG: Error in L.map() call:", mapError);
                  clearTimeout(timeoutId);
                  reject(mapError);
                }
              } catch (error) {
                console.error("DEBUG: Error creating map:", error);
                isMapInitializing = false;
                mapInitializationPromise = null;
                clearTimeout(timeoutId);
                reject(error);
              }
            } else {
              attempts++;
              if (attempts < maxAttempts) {
                console.log(`DEBUG: Container ${containerId} not found, retrying (${attempts}/${maxAttempts})...`);
                setTimeout(checkForContainer, checkInterval);
              } else {
                console.error(`DEBUG: Container ${containerId} not found after ${maxAttempts} attempts`);
                isMapInitializing = false;
                mapInitializationPromise = null;
                clearTimeout(timeoutId);
                reject(new Error(`Container ${containerId} not found after ${maxAttempts} attempts`));
              }
            }
          };
          
          // Start checking for the container
          console.log("DEBUG: Starting container check");
          setTimeout(checkForContainer, 100);
        } catch (error) {
          console.error("DEBUG: Error in map initialization:", error);
          isMapInitializing = false;
          mapInitializationPromise = null;
          clearTimeout(timeoutId);
          reject(error);
        }
      })
      .catch((error) => {
        console.error("DEBUG: Error loading Leaflet:", error);
        isMapInitializing = false;
        mapInitializationPromise = null;
        clearTimeout(timeoutId);
        reject(error);
      });
  });
  
  return mapInitializationPromise;
}

const libraries: Libraries = ['places'];

// Define sport image mapping at the component level
const sportImageMap: Record<string, string> = {
  basketball: "basketball.png",
  pickleball: "pickleball.png",
  tennis: "tennisball.png",
  volleyball: "volleyball.png",
  football: "football.png",
  soccer: "football.png" // Use football as fallback for soccer
};

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
  
  // Use a ref instead of state to track if the component is mounted
  // This prevents re-renders that cause the component to unmount
  const isMountedRef = useRef<boolean>(false);
  const [isMapInitialized, setIsMapInitialized] = useState(false);
  
  // Reference to the map instance
  const mapRef = useRef<any | null>(null);
  
  // Add refs to store previous values to prevent unnecessary re-renders
  const prevSportRef = useRef<string | null>(null);
  const markersRef = useRef<any[]>([]);
  
  // Define a constant map container ID
  const MAP_CONTAINER_ID = "map-container-direct";

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  // Function to format access type for display
  const formatAccessType = (type: AccessType | undefined) => {
    switch (type) {
      case ACCESS_TYPES.PUBLIC:
        return 'Public';
      case ACCESS_TYPES.MEMBERSHIP:
        return 'Membership Required';
      case ACCESS_TYPES.PAID:
        return 'Pay to Play';
      case ACCESS_TYPES.PRIVATE:
        return 'Private';
      default:
        return 'Unknown';
    }
  };

  // Get sport icon for markers
  const getSportIcon = useCallback((sportId: string) => {
    if (!window.L) {
      console.error("DEBUG: Leaflet not available for icon creation");
      return null;
    }
    
    // Use the PNG files directly from the public folder
    const imagePath = `/${sportImageMap[sportId] || 'basketball.png'}`;
    
    console.log("DEBUG: Using sport image:", imagePath);
    
    return window.L.icon({
      iconUrl: imagePath,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16]
    });
  }, []);

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
  const handleMapClick = useCallback((e: any) => {
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
  const handleMarkerDragEnd = useCallback((e: any) => {
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

  // DIRECT DOM APPROACH FOR MAP INITIALIZATION
  useEffect(() => {
    console.log("DEBUG: Starting direct DOM map initialization");
    
    // Only initialize once
    if (isMountedRef.current) {
      console.log("DEBUG: Map already initialized, skipping");
      return;
    }
    
    // Mark as mounted
    isMountedRef.current = true;
    
    // Load Leaflet CSS
    loadLeafletCss();
    
    // Function to create the map container if it doesn't exist
    const ensureMapContainer = () => {
      // Check if container already exists
      let container = document.getElementById(MAP_CONTAINER_ID);
      
      if (!container) {
        console.log("DEBUG: Creating map container element");
        container = document.createElement('div');
        container.id = MAP_CONTAINER_ID;
        container.style.width = '100%';
        container.style.height = 'calc(100vh - 8rem)';
        container.style.minHeight = '500px';
        container.style.position = 'relative';
        container.style.zIndex = '1';
        container.style.border = '1px solid #ccc';
        
        // Find the parent element to append to
        const mapParent = document.querySelector('.map-parent');
        if (mapParent) {
          console.log("DEBUG: Found map parent element, appending container");
          mapParent.appendChild(container);
        } else {
          console.log("DEBUG: No map parent found, appending to body");
          document.body.appendChild(container);
        }
      } else {
        console.log("DEBUG: Map container already exists");
      }
      
      return container;
    };
    
    // Function to initialize map
    const initMap = async () => {
      try {
        // Ensure container exists
        const container = ensureMapContainer();
        console.log(`DEBUG: Container dimensions: ${container.clientWidth}x${container.clientHeight}`);
        
        // Load Leaflet JS if needed
        if (!window.L) {
          console.log("DEBUG: Loading Leaflet JS");
          await loadLeafletJs();
        }
        
        console.log("DEBUG: Creating map with container ID:", MAP_CONTAINER_ID);
        
        // Create map
        const map = window.L.map(MAP_CONTAINER_ID, {
          center: center,
          zoom: 13,
          preferCanvas: true,
          fadeAnimation: false,
          markerZoomAnimation: false
        });
        
        // Store a reference to the current state in the map object
        (map as any)._isAddingLocation = isAddingLocation;
        
        // Add tile layer based on current mapType
        const addTileLayer = () => {
          console.log("DEBUG: Adding tile layer for map type:", mapType);
          
          // Remove existing tile layer if any
          if ((map as any).currentTileLayer) {
            console.log("DEBUG: Removing existing tile layer");
            map.removeLayer((map as any).currentTileLayer);
          }
          
          // Get tile URL based on map type
          const tileUrl = mapType === 'satellite' 
            ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
            : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
            
          console.log("DEBUG: Using tile URL:", tileUrl);
            
          // Get attribution based on map type
          const attribution = mapType === 'satellite'
            ? 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
            : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
          
          // Add the tile layer
          const tileLayer = window.L.tileLayer(tileUrl, {
            attribution: attribution,
            maxZoom: 19
          }).addTo(map);
          
          console.log("DEBUG: Tile layer added successfully");
          
          // Store reference to the tile layer
          (map as any).currentTileLayer = tileLayer;
        };
        
        // Add initial tile layer
        addTileLayer();
        
        // Store map reference
        mapRef.current = map;
        globalMapInstance = map;
        
        // Set up click handler
        map.on('click', (e: { latlng: { lat: number; lng: number } }) => {
          console.log("DEBUG: Map click event:", e);
          
          // Get the current state directly from the map object
          const currentIsAddingLocation = (map as any)._isAddingLocation;
          console.log("DEBUG: isAddingLocation from map object:", currentIsAddingLocation);
          console.log("DEBUG: isAddingLocation from React state:", isAddingLocation);
          
          if (currentIsAddingLocation) {
            console.log("DEBUG: Adding location at:", e.latlng);
            
            // Update the new location with the clicked coordinates
            setNewLocation(prev => ({
              ...prev,
              lat: e.latlng.lat,
              lng: e.latlng.lng
            }));
            
            // Open the dialog
            setIsDialogOpen(true);
            
            // Turn off adding mode
            setIsAddingLocation(false);
            (map as any)._isAddingLocation = false;
            
            // Reset cursor
            map.getContainer().style.cursor = '';
            
            // Reverse geocode the location
            reverseGeocode(e.latlng.lat, e.latlng.lng);
          }
        });
        
        // Add global delete function
        window.deleteLocation = handleDeleteLocation;
        
        // Add method to update map type
        window.updateMapType = (type: 'street' | 'satellite') => {
          console.log("DEBUG: Global updateMapType called with:", type);
          
          // Update React state
          setMapType(type);
          
          // Update tile layer directly
          if (mapRef.current) {
            console.log("DEBUG: Updating tile layer directly");
            
            // Remove existing tile layer
            if ((mapRef.current as any).currentTileLayer) {
              console.log("DEBUG: Removing existing tile layer");
              mapRef.current.removeLayer((mapRef.current as any).currentTileLayer);
            }
            
            // Get tile URL based on map type
            const tileUrl = type === 'satellite' 
              ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
              : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
              
            console.log("DEBUG: Using tile URL:", tileUrl);
              
            // Get attribution based on map type
            const attribution = type === 'satellite'
              ? 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
              : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
            
            // Add the tile layer
            const tileLayer = window.L.tileLayer(tileUrl, {
              attribution: attribution,
              maxZoom: 19
            }).addTo(mapRef.current);
            
            console.log("DEBUG: Tile layer added successfully");
            
            // Store reference to the tile layer
            (mapRef.current as any).currentTileLayer = tileLayer;
          }
        };
        
        // Add method to toggle pin drop mode
        window.togglePinDropMode = (enable: boolean) => {
          console.log("DEBUG: Global togglePinDropMode called with:", enable);
          
          // Update React state
          setIsAddingLocation(enable);
          
          // Update map state directly
          if (mapRef.current) {
            (mapRef.current as any)._isAddingLocation = enable;
            console.log("DEBUG: Updated map._isAddingLocation to:", enable);
            
            // Update cursor
            mapRef.current.getContainer().style.cursor = enable ? 'crosshair' : '';
          }
        };
        
        // Add method to get current location
        window.getCurrentLocation = () => {
          console.log("DEBUG: Getting current location");
          if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
                
                // Set user location
        setUserLocation([lat, lng]);
                
                // Update map center
                map.setView([lat, lng], 15);
                
                // Add marker for user location
                const userMarker = window.L.marker([lat, lng], {
                  icon: window.L.divIcon({
                    className: 'user-location-marker',
                    html: '<div class="w-4 h-4 bg-blue-500 rounded-full border-2 border-white"></div>',
                    iconSize: [16, 16],
                    iconAnchor: [8, 8],
                  })
                }).addTo(map);
                
                userMarker.bindPopup('Your Location');
                
                toast({
                  title: "Location Found",
                  description: "Map centered on your current location",
                });
      },
      (error) => {
                console.error("DEBUG: Error getting location:", error);
        toast({
          title: "Error",
                  description: "Unable to retrieve your location. Please check your browser permissions.",
          variant: "destructive"
        });
      }
    );
    } else {
            toast({
              title: "Error",
              description: "Geolocation is not supported by your browser",
              variant: "destructive"
            });
          }
        };
        
        // Mark as initialized
        setIsMapInitialized(true);
        console.log("DEBUG: Map successfully initialized");
        
        // Force resize
        setTimeout(() => {
          map.invalidateSize();
          console.log("DEBUG: Map size invalidated");
          
          // Force a second resize after a longer delay
          setTimeout(() => {
            map.invalidateSize();
            console.log("DEBUG: Second map size invalidation");
          }, 500);
        }, 300);
      } catch (error) {
        console.error("DEBUG: Error initializing map:", error);
        setError(`Map initialization error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };
    
    // Wait for DOM to be fully loaded
    if (document.readyState === 'loading') {
      console.log("DEBUG: Document still loading, waiting for DOMContentLoaded");
      document.addEventListener('DOMContentLoaded', () => {
        // Initialize with delay to ensure DOM is ready
        setTimeout(initMap, 500);
      });
    } else {
      console.log("DEBUG: Document already loaded, initializing map with delay");
      // Initialize with delay to ensure DOM is ready
      setTimeout(initMap, 500);
    }
    
    // Cleanup
    return () => {
      if (mapRef.current) {
        console.log("DEBUG: Cleaning up map");
        mapRef.current.off('click');
        
        // Use type assertion to fix delete operator errors
        (window as any).deleteLocation = undefined;
        (window as any).updateMapType = undefined;
        (window as any).togglePinDropMode = undefined;
        (window as any).getCurrentLocation = undefined;
      }
    };
  }, [center, mapType, isAddingLocation, reverseGeocode, toast, handleDeleteLocation]);

  // Update markers when filtered locations change
  useEffect(() => {
    if (!mapRef.current || !isMapInitialized) {
      console.log("DEBUG: Map not ready for markers");
      return;
    }
    
    const map = mapRef.current;
    const currentSportId = selectedSport?.id || null;
    
    // Only update markers if the sport has changed or locations have changed
    if (prevSportRef.current === currentSportId && markersRef.current.length === filteredLocations.length) {
      console.log("DEBUG: No need to update markers");
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
      if (!window.L) {
        console.error("DEBUG: window.L not available for markers");
        return;
      }
      
      // Find the primary sport for this location
      const primarySport = location.sports?.[0]?.sportId || 'basketball';
      console.log("DEBUG: Creating marker for location:", location.name, "with sport:", primarySport);
      
      try {
        const marker = window.L.marker(
          [location.lat, location.lng],
          { icon: getSportIcon(primarySport) }
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
                  <img src="/${sportImageMap[sport.sportId] || 'basketball.png'}" alt="${sport.sportId}" class="w-5 h-5" />
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
      } catch (error) {
        console.error("DEBUG: Error creating marker:", error);
      }
    });
    
  }, [filteredLocations, selectedSport, isMapInitialized, user, formatAccessType, getSportIcon]);

  // Add preview marker when adding a new location
  useEffect(() => {
    if (!isDialogOpen || !isMapInitialized || !mapRef.current || !newLocation.lat || !newLocation.lng) return;
    
    try {
      console.log("DEBUG: Adding preview marker for new location");
      
      // Create marker
      const marker = window.L.marker(
        [newLocation.lat, newLocation.lng],
        { 
          icon: getSportIcon(selectedSport?.id || 'basketball'),
          draggable: true,
          autoPan: true
        }
      ).addTo(mapRef.current);
      
      marker.on('dragstart', () => setIsDraggingMarker(true));
      marker.on('dragend', (e: { target: { getLatLng: () => { lat: number; lng: number } } }) => {
        setIsDraggingMarker(false);
        const position = e.target.getLatLng();
        setNewLocation(prev => ({
          ...prev,
          lat: position.lat,
          lng: position.lng
        }));
        
        // Update address based on new coordinates
        reverseGeocode(position.lat, position.lng);
      });
      
      // Add popup
      marker.bindPopup(`
        <div class="p-2">
          <h3 class="font-semibold">${newLocation.name || 'New Location'}</h3>
          <p class="text-sm">${newLocation.address || 'Address will appear here'}</p>
          <div class="mt-2">
            <div class="flex items-center gap-2">
              <img src="/${sportImageMap[selectedSport.id] || 'basketball.png'}" alt="${selectedSport.name}" class="w-5 h-5" />
              <p class="text-sm">${selectedSport.name}</p>
            </div>
            <p class="text-xs text-gray-500">Drag marker to adjust position</p>
          </div>
        </div>
      `);
    } catch (error) {
      console.error("DEBUG: Error creating preview marker:", error);
    }
  }, [isDialogOpen, isMapInitialized, mapRef, newLocation.lat, newLocation.lng, selectedSport, reverseGeocode, getSportIcon]);

  const hasValidLocation = (loc: Partial<ExtendedLocation>) => {
    return loc.address && typeof loc.lat === 'number' && typeof loc.lng === 'number';
  };

  const getStreetViewUrl = (loc: Partial<ExtendedLocation>) => {
    if (!loc.lat || !loc.lng) return null;
    return `https://maps.googleapis.com/maps/api/streetview?size=600x300&location=${loc.lat!},${loc.lng!}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}`;
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

  if (loading && !isMapInitialized) {
  return (
      <div className="h-full w-full flex items-center justify-center bg-muted/20">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-sm text-muted-foreground">Initializing map...</p>
          {error && (
            <div className="mt-4 p-4 bg-red-50 text-red-800 rounded-md max-w-md">
              <p className="font-medium">Error initializing map:</p>
              <p className="text-sm mt-1">{error}</p>
              <button 
                className="mt-3 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded-md text-sm"
                onClick={() => window.location.reload()}
              >
                Reload Page
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full map-parent">
      {/* Map Controls - positioned above the map but below dialogs */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <Button
          variant={isAddingLocation ? "destructive" : "default"}
          size="sm"
          className={`flex items-center gap-2 ${!isAddingLocation ? "sport-accent-bg" : ""}`}
          onClick={() => {
            console.log("DEBUG: Add location button clicked, current state:", isAddingLocation);
            const newState = !isAddingLocation;
            
            // Use the global function to ensure state is updated correctly
            if (typeof window.togglePinDropMode === 'function') {
              window.togglePinDropMode(newState);
            } else {
              setIsAddingLocation(newState);
              console.log("DEBUG: Setting isAddingLocation to:", newState);
              
              // If we're turning on adding mode, update the global state
              if (newState && mapRef.current) {
                console.log("DEBUG: Enabling pin drop mode");
                // Add a visual indicator that the map is in pin drop mode
                mapRef.current.getContainer().style.cursor = 'crosshair';
              } else if (mapRef.current) {
                // Reset cursor
                mapRef.current.getContainer().style.cursor = '';
              }
            }
          }}
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
          onClick={() => {
            console.log("DEBUG: Satellite view button clicked, current map type:", mapType);
            const newMapType = mapType === 'street' ? 'satellite' : 'street';
            console.log("DEBUG: Setting map type to:", newMapType);
            
            if (typeof window.updateMapType === 'function') {
              window.updateMapType(newMapType);
            } else {
              setMapType(newMapType);
            }
          }}
          disabled={isAddingLocation}
        >
          <Layers className="h-4 w-4" />
          {mapType === 'street' ? 'Satellite View' : 'Street View'}
        </Button>
        
        <Button
          variant="secondary"
          size="sm"
          className="flex items-center gap-2"
          onClick={() => {
            if (typeof window.getCurrentLocation === 'function') {
              window.getCurrentLocation();
            } else {
              handleGetCurrentLocation();
            }
          }}
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
      
      {/* Map Container - using direct DOM manipulation instead of refs */}
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
              <div className="grid grid-cols-2 gap-4 mt-4">
                {sports.map((sport) => (
                  <div key={sport.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`sport-${sport.id}`}
                      checked={(newLocation.sports || []).some(s => s.sportId === sport.id)}
                      onCheckedChange={(checked) => handleSportSelection(sport.id, !!checked)}
                    />
                    <label
                      htmlFor={`sport-${sport.id}`}
                      className="flex items-center text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      <img 
                        src={`/sports/${sport.id}-logo.svg`} 
                        alt={sport.name} 
                        className="w-5 h-5 mr-2" 
                      />
                      {sport.name}
                    </label>
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

