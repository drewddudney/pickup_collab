"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { MapPin } from "lucide-react"

// Default images for each sport type
const DEFAULT_IMAGES = {
  basketball: "/images/basketball-court.jpg",
  tennis: "/images/tennis-court.jpg",
  volleyball: "/images/volleyball-court.jpg",
  pickleball: "/images/pickleball-court.jpg",
  football: "/images/football-court.jpg",
  default: "/images/default-court.jpg"
}

// Sport colors for the fallback
const SPORT_COLORS = {
  basketball: "#FF6B35",
  tennis: "#4CB944",
  volleyball: "#3A86FF",
  pickleball: "#8338EC",
  football: "#FB5607",
  default: "#6C757D"
}

interface CourtImageProps {
  sportId: string
  sportName: string
  locations?: any[]
  className?: string
}

export function CourtImage({ sportId, sportName, locations = [], className = "" }: CourtImageProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [error, setError] = useState(false)
  
  // Set the image source based on sport type
  useEffect(() => {
    const sportImage = DEFAULT_IMAGES[sportId as keyof typeof DEFAULT_IMAGES] || DEFAULT_IMAGES.default
    setImageSrc(sportImage)
    setImageLoaded(false)
    setError(false)
  }, [sportId])

  // Get background color for fallback
  const bgColor = SPORT_COLORS[sportId as keyof typeof SPORT_COLORS] || SPORT_COLORS.default

  return (
    <div className={`relative h-40 w-full overflow-hidden ${className}`}>
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/80 z-10"></div>
      
      {/* Fallback colored background */}
      <div 
        className="absolute inset-0 flex items-center justify-center"
        style={{ backgroundColor: error ? bgColor + "33" : bgColor + "15" }}
      >
        {error && (
          <div className="text-center">
            <div className="font-medium text-lg">{sportName}</div>
            <div className="text-sm text-muted-foreground">Find courts near you</div>
          </div>
        )}
      </div>
      
      {/* Actual image */}
      {imageSrc && !error && (
        <Image 
          src={imageSrc}
          alt={`${sportName} court`}
          className="object-cover transition-opacity duration-300"
          style={{ opacity: imageLoaded ? 1 : 0 }}
          fill
          priority
          onLoad={() => setImageLoaded(true)}
          onError={() => {
            // Try default image if sport-specific image fails
            if (imageSrc !== DEFAULT_IMAGES.default) {
              setImageSrc(DEFAULT_IMAGES.default)
            } else {
              // If default also fails, show colored background
              setError(true)
              setImageSrc(null)
            }
          }}
        />
      )}
      
      {/* Location information overlay */}
      {locations.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 p-4 z-20">
          <div className="text-sm font-medium">Nearby locations:</div>
          <div className="flex flex-col gap-1 mt-1">
            {locations.slice(0, 2).map((location) => (
              <div key={location.id} className="flex items-center text-sm">
                <MapPin className="h-3 w-3 mr-1 text-primary" />
                <span className="truncate">{location.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
} 