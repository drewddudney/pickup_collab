'use client';

import { LoginForm } from "@/components/auth/LoginForm";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { AuthLayout } from "@/app/auth-layout";

export default function LoginPage() {
  const { user, loading, authInitialized } = useAuth();
  const router = useRouter();

  // Redirect if already logged in
  useEffect(() => {
    if (authInitialized && user && !loading) {
      console.log("User already logged in, redirecting from login page");
      router.push("/");
    }
  }, [user, loading, authInitialized, router]);

  // Show loading state
  if (loading && !authInitialized) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
      </main>
    );
  }

  return (
    <AuthLayout>
      <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-24">
        <div className="w-full max-w-[400px] mx-auto">
          <LoginForm />
        </div>
      </main>
    </AuthLayout>
  );
} 