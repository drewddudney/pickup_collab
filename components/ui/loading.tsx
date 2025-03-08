import { Loader2 } from "lucide-react";

interface LoadingProps {
  fullScreen?: boolean;
  message?: string;
  size?: "sm" | "md" | "lg";
}

export function Loading({ 
  fullScreen = false, 
  message = "Loading...", 
  size = "md" 
}: LoadingProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12"
  };

  const containerClasses = fullScreen 
    ? "fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50" 
    : "flex flex-col items-center justify-center p-4";

  return (
    <div className={containerClasses}>
      <div className="flex flex-col items-center gap-2">
        <Loader2 className={`${sizeClasses[size]} animate-spin text-primary`} />
        {message && (
          <p className="text-sm text-muted-foreground">{message}</p>
        )}
      </div>
    </div>
  );
} 