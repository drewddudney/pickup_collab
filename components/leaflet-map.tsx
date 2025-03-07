"use client"

import { useEffect, useRef } from "react"
import "leaflet/dist/leaflet.css"
import L from "leaflet"

interface Court {
  id: number
  name: string
  address: string
  lat: number
  lng: number
  hoops?: number
  surface?: string
  lights?: boolean
  isUserAdded?: boolean
  sports: string[]
}

interface LeafletMapProps {
  courts: Court[]
  selectedCourt: Court | null
  setSelectedCourt: (court: Court | null) => void
  userLocation: { lat: number; lng: number } | null
  setUserLocation: (location: { lat: number; lng: number } | null) => void
  isAddingLocation: boolean
  onMapClick: (latlng: { lat: number; lng: number }) => void
  sportType: string
}

const austinCenter = {
  lat: 30.2672,
  lng: -97.7431,
}

export default function LeafletMap({
  courts,
  selectedCourt,
  setSelectedCourt,
  userLocation,
  setUserLocation,
  isAddingLocation,
  onMapClick,
  sportType,
}: LeafletMapProps) {
  const mapRef = useRef<L.Map | null>(null)
  const tileLayerRef = useRef<L.TileLayer | null>(null)
  const markersRef = useRef<L.Marker[]>([])
  const userMarkerRef = useRef<L.Marker | null>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const clickHandlerRef = useRef<((e: L.LeafletMouseEvent) => void) | null>(null)

  // Fix for Leaflet icon issues in Next.js
  useEffect(() => {
    // Fix Leaflet icon issues
    const fixLeafletIcon = () => {
      // Only run on client side
      if (typeof window === "undefined") return

      // Make sure L is defined
      if (!L || !L.Icon) return

      // @ts-ignore
      delete L.Icon.Default.prototype._getIconUrl

      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "/leaflet/marker-icon-2x.png",
        iconUrl: "/leaflet/marker-icon.png",
        shadowUrl: "/leaflet/marker-shadow.png",
      })
    }

    fixLeafletIcon()
  }, [])

  // Initialize map
  useEffect(() => {
    // Only run on client side
    if (typeof window === "undefined") return

    // Make sure L is defined
    if (!L || !L.map) return

    // Make sure the container exists
    if (!mapContainerRef.current) return

    try {
      // Initialize map if it doesn't exist
      if (!mapRef.current) {
        mapRef.current = L.map(mapContainerRef.current, {
          zoomControl: true,
          attributionControl: true,
        }).setView([austinCenter.lat, austinCenter.lng], 12)

        // Try multiple tile providers to ensure one works
        try {
          // First try OpenStreetMap
          tileLayerRef.current = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          }).addTo(mapRef.current)
        } catch (error) {
          console.error("Error loading OpenStreetMap tiles:", error)

          // Fallback to Stamen
          try {
            tileLayerRef.current = L.tileLayer("https://stamen-tiles-{s}.a.ssl.fastly.net/terrain/{z}/{x}/{y}.png", {
              maxZoom: 18,
              attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>',
            }).addTo(mapRef.current)
          } catch (error) {
            console.error("Error loading Stamen tiles:", error)

            // Last resort fallback to Carto
            try {
              tileLayerRef.current = L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
                maxZoom: 19,
                attribution:
                  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
              }).addTo(mapRef.current)
            } catch (error) {
              console.error("Error loading Carto tiles:", error)
            }
          }
        }
      }
    } catch (error) {
      console.error("Error initializing map:", error)
    }

    // Cleanup on unmount
    return () => {
      if (mapRef.current) {
        try {
          mapRef.current.remove()
          mapRef.current = null
        } catch (error) {
          console.error("Error cleaning up map:", error)
        }
      }
    }
  }, [])

  // Add court markers
  useEffect(() => {
    // Only run on client side
    if (typeof window === "undefined") return

    // Make sure L and map are defined
    if (!L || !mapRef.current) return

    try {
      // Clear existing markers
      markersRef.current.forEach((marker) => {
        if (marker) marker.remove()
      })
      markersRef.current = []

      // Create sport-specific icon
      const sportIcon = L.icon({
        iconUrl: `/sports/${sportType}-marker.svg`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16],
        className: "sport-marker",
      })

      // Add markers for courts
      courts.forEach((court) => {
        try {
          // Create marker with the sport icon
          const marker = L.marker([court.lat, court.lng], {
            icon: sportIcon,
            title: court.name,
          })
            .addTo(mapRef.current!)
            .on("click", () => {
              if (!isAddingLocation) {
                setSelectedCourt(court)
              }
            })

          // Add a tooltip with the court name
          marker.bindTooltip(court.name, {
            permanent: false,
            direction: "top",
            className: "court-tooltip",
            offset: [0, -8],
          })

          markersRef.current.push(marker)
        } catch (error) {
          console.error("Error adding marker:", error)
        }
      })
    } catch (error) {
      console.error("Error managing markers:", error)
    }
  }, [courts, setSelectedCourt, isAddingLocation, sportType])

  // Update user location marker
  useEffect(() => {
    // Only run on client side
    if (typeof window === "undefined") return

    // Make sure L and map are defined
    if (!L || !mapRef.current) return

    // Only proceed if we have a user location
    if (!userLocation) return

    try {
      // Remove previous user marker if exists
      if (userMarkerRef.current) {
        userMarkerRef.current.remove()
        userMarkerRef.current = null
      }

      // Create custom user location icon
      const userIcon = L.icon({
        iconUrl: "/user-location.svg",
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      })

      // Add new user marker
      userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon }).addTo(mapRef.current)

      // Pan to user location
      mapRef.current.setView([userLocation.lat, userLocation.lng], 14)
    } catch (error) {
      console.error("Error updating user location:", error)
    }
  }, [userLocation])

  // Handle map click for adding new locations
  useEffect(() => {
    if (!mapRef.current) return

    // Remove existing click handler if it exists
    if (clickHandlerRef.current) {
      mapRef.current.off("click", clickHandlerRef.current)
      clickHandlerRef.current = null
    }

    if (isAddingLocation) {
      // Add cursor style to indicate clickable map
      if (mapContainerRef.current) {
        mapContainerRef.current.style.cursor = "crosshair"
      }

      // Create and add new click handler
      clickHandlerRef.current = (e: L.LeafletMouseEvent) => {
        onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng })
      }

      mapRef.current.on("click", clickHandlerRef.current)
    } else {
      // Reset cursor style
      if (mapContainerRef.current) {
        mapContainerRef.current.style.cursor = ""
      }
    }

    return () => {
      if (mapRef.current && clickHandlerRef.current) {
        mapRef.current.off("click", clickHandlerRef.current)
      }
    }
  }, [isAddingLocation, onMapClick])

  return (
    <div
      ref={mapContainerRef}
      className="h-full w-full rounded-lg"
      style={{ background: "#f0f0f0" }} // Light background while map loads
    />
  )
}

