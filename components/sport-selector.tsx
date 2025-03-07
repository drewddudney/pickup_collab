'use client';

import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSport } from "@/components/sport-context";
import Image from "next/image";

// Map sport IDs to their image file names
const sportImageMap: Record<string, string> = {
  basketball: "basketball.png",
  pickleball: "pickleball.png",
  tennis: "tennisball.png",
  volleyball: "volleyball.png",
  football: "football.png"
};

export function SportSelector() {
  const { selectedSport, setSelectedSport, sports } = useSport();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-[200px] justify-between">
          <span className="flex items-center gap-2">
            <Image 
              src={`/${sportImageMap[selectedSport.id]}`} 
              alt={`${selectedSport.name} ball`} 
              width={24} 
              height={24} 
              className="object-contain"
            />
            {selectedSport.name}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px]">
        {sports.map((sport) => (
          <DropdownMenuItem
            key={sport.id}
            onClick={() => setSelectedSport(sport)}
            className="justify-between"
          >
            <span className="flex items-center gap-2">
              <Image 
                src={`/${sportImageMap[sport.id]}`} 
                alt={`${sport.name} ball`} 
                width={24} 
                height={24} 
                className="object-contain"
              />
              {sport.name}
            </span>
            {selectedSport.id === sport.id && (
              <Check className="h-4 w-4" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 