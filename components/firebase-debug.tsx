"use client"

import { useState } from "react"
import { auth, db } from "@/lib/firebase"
import { collection, getDocs, doc, getDoc, setDoc } from "firebase/firestore"
import { getStorage, ref, listAll } from "firebase/storage"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"

export function FirebaseDebug() {
  const { toast } = useToast()
  const [results, setResults] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)

  const testFirestore = async () => {
    setIsLoading(true)
    setResults("")
    let output = ""

    try {
      // Check authentication
      const user = auth.currentUser
      output += `Authentication: ${user ? "Authenticated as " + user.email : "Not authenticated"}\n\n`

      if (!user) {
        setResults(output)
        setIsLoading(false)
        return
      }

      // Test users collection
      try {
        output += "Testing users collection...\n"
        const userDoc = await getDoc(doc(db, `users/${user.uid}`))
        output += `User document exists: ${userDoc.exists()}\n`
        if (userDoc.exists()) {
          output += `User data: ${JSON.stringify(userDoc.data(), null, 2)}\n`
        }
      } catch (error: any) {
        output += `Error accessing users collection: ${error.message}\n`
      }

      // Test locations collection
      try {
        output += "\nTesting locations collection...\n"
        const locationsSnapshot = await getDocs(collection(db, "locations"))
        output += `Locations found: ${locationsSnapshot.size}\n`
        if (locationsSnapshot.size > 0) {
          output += "Location IDs:\n"
          locationsSnapshot.forEach(doc => {
            output += `- ${doc.id}\n`
          })
        }
      } catch (error: any) {
        output += `Error accessing locations collection: ${error.message}\n`
      }

      // Test games collection
      try {
        output += "\nTesting games collection...\n"
        const gamesSnapshot = await getDocs(collection(db, "games"))
        output += `Games found: ${gamesSnapshot.size}\n`
        if (gamesSnapshot.size > 0) {
          output += "Game IDs:\n"
          gamesSnapshot.forEach(doc => {
            output += `- ${doc.id}\n`
          })
        }
      } catch (error: any) {
        output += `Error accessing games collection: ${error.message}\n`
      }

      // Test storage
      try {
        output += "\nTesting storage access...\n"
        const storage = getStorage()
        const profilePicsRef = ref(storage, "profile-pictures")
        const profilePics = await listAll(profilePicsRef)
        output += `Profile pictures found: ${profilePics.items.length}\n`
        if (profilePics.items.length > 0) {
          output += "Profile picture paths:\n"
          profilePics.items.forEach(item => {
            output += `- ${item.fullPath}\n`
          })
        }
      } catch (error: any) {
        output += `Error accessing storage: ${error.message}\n`
      }

      setResults(output)
      toast({
        title: "Firebase Debug Complete",
        description: "Check the results below",
      })
    } catch (error: any) {
      setResults(`General error: ${error.message}`)
      toast({
        title: "Firebase Debug Failed",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Firebase Debug</CardTitle>
        <CardDescription>Test Firebase permissions and access</CardDescription>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={testFirestore} 
          disabled={isLoading}
          className="mb-4"
        >
          {isLoading ? "Testing..." : "Run Firebase Tests"}
        </Button>
        
        {results && (
          <pre className="p-4 bg-muted rounded-md overflow-auto max-h-96 text-sm">
            {results}
          </pre>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <p className="text-sm text-muted-foreground">
          Use this tool to diagnose Firebase permission issues
        </p>
      </CardFooter>
    </Card>
  )
} 