'use client';

import { CircleDot } from "lucide-react";

interface MarkerProps {
  className?: string;
}

export const SportMarkers = {
  basketball: BasketballMarker,
  pickleball: PickleballMarker,
  tennis: TennisMarker,
  volleyball: VolleyballMarker,
  football: FootballMarker,
};

export function BasketballMarker({ className }: MarkerProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`text-orange-500 ${className || ''}`}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M4.93 4.93c4.08 4.08 6.1 10.06 6.1 10.06s-5.98-2.02-10.06-6.1" />
      <path d="M19.07 4.93c-4.08 4.08-6.1 10.06-6.1 10.06s5.98-2.02 10.06-6.1" />
      <path d="M4.93 19.07c4.08-4.08 10.06-6.1 10.06-6.1s-2.02 5.98-6.1 10.06" />
      <path d="M19.07 19.07c-4.08-4.08-10.06-6.1-10.06-6.1s2.02 5.98 6.1 10.06" />
    </svg>
  );
}

export function PickleballMarker({ className }: MarkerProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`text-yellow-400 ${className || ''}`}
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

export function TennisMarker({ className }: MarkerProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`text-yellow-300 ${className || ''}`}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M18 12a6 6 0 0 0-12 0" />
      <path d="M6 12a6 6 0 0 0 12 0" />
    </svg>
  );
}

export function VolleyballMarker({ className }: MarkerProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`text-white ${className || ''}`}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a10 10 0 0 0-6.88 17.28" />
      <path d="M12 2a10 10 0 0 1 6.88 17.28" />
      <path d="M12 12a10 10 0 0 1 0 10" />
    </svg>
  );
}

export function FootballMarker({ className }: MarkerProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`text-brown-500 ${className || ''}`}
    >
      <ellipse cx="12" cy="12" rx="8" ry="10" />
      <path d="M7 12h10" />
      <path d="M12 7v10" />
    </svg>
  );
} 