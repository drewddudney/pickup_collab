"use client"

import MapContainer from "@/components/map-container"
import { useSport } from "./sport-context"

export default function MapView() {
  const { currentSport } = useSport()

  return (
    <div className="h-full rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm">
      <MapContainer sportType={currentSport} />
    </div>
  )
}

