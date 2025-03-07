'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Calendar, Users } from "lucide-react";
import Link from "next/link";

export function HomeView() {
  return (
    <div className="container mx-auto p-6 pb-20 space-y-8">
      <div className="grid gap-6 md:grid-cols-3">
        {/* Map Summary Card */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Nearby Courts
            </CardTitle>
            <CardDescription>Find courts in your area</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Discover basketball courts, volleyball courts, and more near you. 
              View real-time availability and court conditions.
            </p>
          </CardContent>
        </Card>

        {/* Schedule Summary Card */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Upcoming Games
            </CardTitle>
            <CardDescription>Your scheduled matches</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              View and manage your upcoming games. Join open games or create your own pickup matches.
            </p>
          </CardContent>
        </Card>

        {/* Teammates Summary Card */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Team Network
            </CardTitle>
            <CardDescription>Your sports community</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Connect with other players, find teammates, and build your sports network.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Section */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest updates from your network</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <p className="text-sm">New pickup game scheduled at Pan Am Courts - Tomorrow at 6 PM</p>
            </div>
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="h-2 w-2 rounded-full bg-blue-500" />
              <p className="text-sm">3 courts available now at Zilker Park</p>
            </div>
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="h-2 w-2 rounded-full bg-orange-500" />
              <p className="text-sm">2 players looking for a game at Austin Recreation Center</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 