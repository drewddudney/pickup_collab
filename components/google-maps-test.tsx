"use client"

import { useEffect, useState } from 'react'
import { useLoadScript } from '@react-google-maps/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'

const libraries: ["places"] = ["places"]

export function GoogleMapsTest() {
  const [testResult, setTestResult] = useState<string | null>(null)
  const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [address, setAddress] = useState('')
  const [geocodeResult, setGeocodeResult] = useState<string | null>(null)

  // Load Google Maps API
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  })

  // Test the API key
  useEffect(() => {
    console.log("Google Maps API Key (masked):", 
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY 
        ? `${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.substring(0, 8)}...` 
        : 'Not set')
    
    if (loadError) {
      console.error("Google Maps API loading error:", loadError)
      setTestResult(`Error loading Google Maps API: ${loadError.message}`)
      setTestStatus('error')
    } else if (isLoaded) {
      setTestResult("Google Maps API loaded successfully!")
      setTestStatus('success')
    }
  }, [isLoaded, loadError])

  // Test geocoding
  const testGeocoding = async () => {
    if (!address) {
      setGeocodeResult("Please enter an address")
      return
    }

    setTestStatus('loading')
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
      )
      const data = await response.json()
      
      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const result = data.results[0]
        setGeocodeResult(
          `Found: ${result.formatted_address}\nLat: ${result.geometry.location.lat}, Lng: ${result.geometry.location.lng}`
        )
        setTestStatus('success')
      } else {
        setGeocodeResult(`Error: ${data.status} - ${data.error_message || 'No results found'}`)
        setTestStatus('error')
      }
    } catch (error: any) {
      setGeocodeResult(`Error: ${error.message}`)
      setTestStatus('error')
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Google Maps API Test</CardTitle>
        <CardDescription>
          Test if your Google Maps API key is working correctly
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 rounded-md bg-muted">
          <h3 className="font-medium mb-2">API Status:</h3>
          {!isLoaded && !loadError && (
            <div className="flex items-center text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading Google Maps API...
            </div>
          )}
          {testResult && (
            <div className={`text-sm ${testStatus === 'error' ? 'text-destructive' : 'text-green-600'}`}>
              {testResult}
            </div>
          )}
        </div>

        {isLoaded && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address">Test Geocoding</Label>
              <div className="flex gap-2">
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter an address to geocode"
                />
                <Button 
                  onClick={testGeocoding}
                  disabled={testStatus === 'loading' || !address}
                >
                  {testStatus === 'loading' ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    'Test'
                  )}
                </Button>
              </div>
            </div>

            {geocodeResult && (
              <div className="p-4 rounded-md bg-muted whitespace-pre-line">
                <h3 className="font-medium mb-2">Geocoding Result:</h3>
                <div className={`text-sm ${geocodeResult.startsWith('Error') ? 'text-destructive' : 'text-green-600'}`}>
                  {geocodeResult}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
} 