export interface Sport {
  id: string;
  name: string;
  icon: string; // Icon name from lucide-react
  ballColor: string; // Tailwind color
  secondaryColor: string; // CSS color for non-Tailwind usage
  courtType: string;
}

export const SPORTS: Sport[] = [
  {
    id: 'basketball',
    name: 'Basketball',
    icon: 'CircleDot',
    ballColor: 'orange-500',
    secondaryColor: '#f97316', // Orange
    courtType: 'Basketball Court'
  },
  {
    id: 'pickleball',
    name: 'Pickleball',
    icon: 'Circle',
    ballColor: 'yellow-300',
    secondaryColor: '#fef08a', // Neon yellow
    courtType: 'Pickleball Court'
  },
  {
    id: 'tennis',
    name: 'Tennis',
    icon: 'CircleDot',
    ballColor: 'lime-300',
    secondaryColor: '#bef264', // Neon green
    courtType: 'Tennis Court'
  },
  {
    id: 'volleyball',
    name: 'Volleyball',
    icon: 'Circle',
    ballColor: 'white',
    secondaryColor: '#ffffff', // White
    courtType: 'Volleyball Court'
  },
  {
    id: 'football',
    name: 'Football',
    icon: 'Circle',
    ballColor: 'brown-500',
    secondaryColor: '#92400e', // Brown
    courtType: 'Football Field'
  }
]; 