import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { basketballCourts } from "@/data/basketball-courts"
import { MapPin, Navigation } from "lucide-react"

export default function FallbackMap() {
  return (
    <div className="p-4 md:p-8 bg-muted/40 min-h-[calc(100vh-64px)]">
      <div className="max-w-4xl mx-auto">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Austin Basketball Courts</CardTitle>
            <CardDescription>Map loading failed. Here's a list of all basketball courts in Austin.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">
              We're having trouble loading the Google Maps API. This could be due to an API key configuration issue. In
              the meantime, here's a list of all the basketball courts in Austin.
            </p>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {basketballCourts.map((court) => (
            <Card key={court.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{court.name}</CardTitle>
                <CardDescription className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {court.address}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="font-medium">Hoops:</span> {court.hoops}
                  </div>
                  <div>
                    <span className="font-medium">Surface:</span> {court.surface}
                  </div>
                  <div className="col-span-2">
                    <span className="font-medium">Lights:</span> {court.lights ? "Yes" : "No"}
                  </div>
                  <div className="col-span-2 mt-2">
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${court.lat},${court.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <Navigation className="h-3 w-3" /> Get Directions
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

