'use client';

import { useEffect, useRef } from 'react';

// Map sport IDs to their image file names
const sportImageMap: Record<string, string> = {
  basketball: "basketball.png",
  pickleball: "pickleball.png",
  tennis: "tennisball.png",
  volleyball: "volleyball.png",
  football: "football.png",
  soccer: "football.png" // Use football as fallback for soccer
};

interface Ball {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  type: string;
  rotation: number;
  rotationSpeed: number;
  floatOffset: number;
  floatSpeed: number;
  floatAmount: number;
}

export function AnimatedBalls() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ballsRef = useRef<Ball[]>([]);
  const animationRef = useRef<number>(0);

  // Initialize balls
  useEffect(() => {
    console.log("AnimatedBalls component mounted");
    
    // Make sure we're in the browser environment
    if (typeof window === 'undefined') {
      console.log("Not in browser environment, skipping animation");
      return;
    }
    
    const sportTypes: string[] = [
      'basketball', 'tennis', 'pickleball', 'volleyball', 'football'
    ];
    
    const balls: Ball[] = [];
    
    // Create 3 balls of each type, spread out across the screen
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    
    // Divide the screen into a grid for better distribution
    // We need 15 cells (5 sports × 3 balls each)
    const gridCols = 5;
    const gridRows = 3;
    const cellWidth = screenWidth / gridCols;
    const cellHeight = screenHeight / gridRows;
    
    let cellIndex = 0;
    
    sportTypes.forEach(sportType => {
      for (let i = 0; i < 3; i++) {
        // Calculate grid position
        const gridCol = cellIndex % gridCols;
        const gridRow = Math.floor(cellIndex / gridCols) % gridRows;
        
        // Calculate position within the cell (with some randomness)
        const x = (gridCol * cellWidth) + (cellWidth * 0.2) + (Math.random() * cellWidth * 0.6);
        const y = (gridRow * cellHeight) + (cellHeight * 0.2) + (Math.random() * cellHeight * 0.6);
        
        cellIndex++;
        
        // Size varies by sport type (increased by 10%, basketball by 25%)
        let size;
        switch(sportType) {
          case 'basketball':
            size = (40 + Math.random() * 20) * 1.25; // Basketball 25% larger
            break;
          case 'football':
            size = (35 + Math.random() * 15) * 1.1; // Medium-large, 10% larger
            break;
          case 'volleyball':
            size = (35 + Math.random() * 15) * 1.1; // Medium, 10% larger
            break;
          case 'tennis':
            size = (25 + Math.random() * 10) * 1.1; // Small, 10% larger
            break;
          case 'pickleball':
            size = (20 + Math.random() * 10) * 1.1; // Smallest, 10% larger
            break;
          default:
            size = (30 + Math.random() * 15) * 1.1;
        }
        
        // Much slower, gentler speeds
        const speedFactor = 0.1 + Math.random() * 0.1;
        
        balls.push({
          x,
          y,
          size,
          speedX: (Math.random() > 0.5 ? 1 : -1) * speedFactor,
          speedY: (Math.random() > 0.5 ? 1 : -1) * speedFactor,
          type: sportType,
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 0.2, // Slower rotation
          floatOffset: Math.random() * Math.PI * 2, // Random starting phase
          floatSpeed: 0.005 + Math.random() * 0.005, // Slower float speed
          floatAmount: 0.8 + Math.random() * 1.0 // Gentler float amount
        });
      }
    });
    
    ballsRef.current = balls;
    console.log(`Created ${balls.length} animated balls`);
    
    // Start animation
    startAnimation();
    
    return () => {
      // Clean up animation on unmount
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        console.log("Animation cleaned up");
      }
    };
  }, []);

  // Handle window resize
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
        console.log(`Canvas resized to ${window.innerWidth}x${window.innerHeight}`);
      }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const startAnimation = () => {
    console.log("Starting animation");
    
    if (!canvasRef.current) {
      console.error("Canvas ref is null, cannot start animation");
      return;
    }
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error("Could not get 2D context from canvas");
      return;
    }
    
    // Create image elements for each sport ball
    const sportImages: Record<string, HTMLImageElement> = {} as any;
    
    const sportTypes = ['basketball', 'tennis', 'pickleball', 'volleyball', 'football'];
    
    sportTypes.forEach((sportType) => {
      const img = new Image();
      img.src = `/${sportImageMap[sportType]}`;
      console.log(`Loading image: ${img.src}`);
      sportImages[sportType] = img;
    });
    
    const animate = () => {
      if (!canvas || !ctx) return;
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Update and draw balls
      ballsRef.current.forEach((ball) => {
        // Update position
        ball.x += ball.speedX;
        ball.y += ball.speedY;
        
        // Update rotation
        ball.rotation += ball.rotationSpeed;
        
        // Update float offset
        ball.floatOffset += ball.floatSpeed;
        
        // Calculate floating effect
        const floatY = Math.sin(ball.floatOffset) * ball.floatAmount;
        
        // Simple bounce off edges
        if (ball.x + ball.size/2 > canvas.width) {
          ball.x = canvas.width - ball.size/2;
          ball.speedX = -Math.abs(ball.speedX);
        } else if (ball.x - ball.size/2 < 0) {
          ball.x = ball.size/2;
          ball.speedX = Math.abs(ball.speedX);
        }
        
        if (ball.y + ball.size/2 > canvas.height) {
          ball.y = canvas.height - ball.size/2;
          ball.speedY = -Math.abs(ball.speedY);
        } else if (ball.y - ball.size/2 < 0) {
          ball.y = ball.size/2;
          ball.speedY = Math.abs(ball.speedY);
        }
        
        // Draw ball with shadow
        const img = sportImages[ball.type];
        if (img && img.complete) {
          ctx.save();
          
          // Add shadow
          ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
          ctx.shadowBlur = 15;
          ctx.shadowOffsetX = 3;
          ctx.shadowOffsetY = 3;
          
          // Position with floating effect
          ctx.translate(ball.x, ball.y + floatY);
          ctx.rotate((ball.rotation * Math.PI) / 180);
          
          // Draw the ball image
          ctx.drawImage(img, -ball.size/2, -ball.size/2, ball.size, ball.size);
          
          ctx.restore();
        }
      });
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    // Wait for images to load
    let imagesLoaded = 0;
    const totalImages = Object.keys(sportImages).length;
    console.log(`Waiting for ${totalImages} images to load`);
    
    Object.values(sportImages).forEach(img => {
      if (img.complete) {
        imagesLoaded++;
        console.log(`Image already loaded: ${img.src}, ${imagesLoaded}/${totalImages}`);
        if (imagesLoaded === totalImages) {
          console.log("All images loaded, starting animation");
          animate();
        }
      } else {
        img.onload = () => {
          imagesLoaded++;
          console.log(`Image loaded: ${img.src}, ${imagesLoaded}/${totalImages}`);
          if (imagesLoaded === totalImages) {
            console.log("All images loaded, starting animation");
            animate();
          }
        };
        img.onerror = () => {
          console.error(`Failed to load image: ${img.src}`);
          imagesLoaded++;
          console.log(`Image failed to load: ${img.src}, ${imagesLoaded}/${totalImages}`);
          if (imagesLoaded === totalImages) {
            console.log("All images attempted to load, starting animation");
            animate();
          }
        };
      }
    });
    
    // Start animation anyway after a timeout in case some images fail to load
    setTimeout(() => {
      if (animationRef.current === 0) {
        console.log("Starting animation after timeout");
        animate();
      }
    }, 1000);
  };

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full -z-10 pointer-events-none"
      style={{ opacity: 0.8 }}
    />
  );
} 