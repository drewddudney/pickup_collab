'use client';

import { LoginForm } from "@/components/auth/LoginForm";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loading } from "@/components/ui/loading";
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
    return <Loading fullScreen />;
  }

  return (
    <AuthLayout>
      <div className="flex min-h-screen flex-col items-center justify-center">
        <div className="w-[90%] max-w-[400px] px-4 py-8 md:px-8 md:py-12">
          <LoginForm />
        </div>
      </div>
    </AuthLayout>
  );
} 