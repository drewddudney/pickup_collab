import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import MapView from "@/components/map-view"
import ScheduleView from "@/components/schedule-view"
import { Header } from "@/components/header"
import { Suspense } from "react"
import { SportProvider } from "@/components/sport-context"

export default function Home() {
  return (
    <SportProvider>
      <main className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="map" className="h-full flex flex-col">
            <div className="container mx-auto px-4 py-2">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="map">Map View</TabsTrigger>
                <TabsTrigger value="schedule">Schedule</TabsTrigger>
              </TabsList>
            </div>
            <div className="flex-1 overflow-auto">
              <TabsContent value="map" className="h-full">
                <Suspense fallback={<div className="flex items-center justify-center h-full p-6">Loading map...</div>}>
                  <MapView />
                </Suspense>
              </TabsContent>
              <TabsContent value="schedule" className="h-full">
                <ScheduleView />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </main>
    </SportProvider>
  )
}

