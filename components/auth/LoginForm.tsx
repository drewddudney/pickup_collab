'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { trackEvent, AnalyticsEvents } from '@/lib/analytics';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import Image from 'next/image';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { user, signInWithGoogle, signInWithEmail, isAuthenticating } = useAuth();
  const router = useRouter();

  // Clear error when inputs change
  useEffect(() => {
    if (error) setError('');
  }, [email, password, error]);

  // Redirect if user is already logged in
  useEffect(() => {
    if (user) {
      console.log('User already logged in, redirecting...');
      router.push('/');
    }
  }, [user, router]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAuthenticating || isRedirecting) return;
    
    setError('');
    try {
      await signInWithEmail(email, password);
      console.log('Login successful, tracking event...');
      trackEvent(AnalyticsEvents.LOGIN, { method: 'email' });
      
      setIsRedirecting(true);
      console.log('Redirecting to home...');
      router.push('/');
    } catch (error: any) {
      console.error('Login failed:', error);
      // Format Firebase error messages to be more user-friendly
      if (error.code === 'auth/user-not-found') {
        setError('No account exists with this email');
      } else if (error.code === 'auth/wrong-password') {
        setError('Incorrect password');
      } else if (error.code === 'auth/invalid-credential') {
        setError('Invalid email or password');
      } else if (error.code === 'auth/too-many-requests') {
        setError('Too many failed login attempts. Please try again later.');
      } else {
        setError(error.message || 'Login failed');
      }
    }
  };

  const handleGoogleLogin = async () => {
    if (isAuthenticating || isRedirecting) return;
    
    setError('');
    try {
      await signInWithGoogle();
      console.log('Google login successful, tracking event...');
      trackEvent(AnalyticsEvents.LOGIN_WITH_GOOGLE);
      
      setIsRedirecting(true);
      console.log('Redirecting to home...');
      router.push('/');
    } catch (error: any) {
      console.error('Google login failed:', error);
      if (error.code === 'auth/popup-closed-by-user') {
        setError('Login canceled. Please try again.');
      } else {
        setError(error.message || 'Google login failed');
      }
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const isLoading = isAuthenticating || isRedirecting;

  return (
    <Card className="w-[350px] mx-auto mt-8">
      <CardHeader>
        <CardTitle>Login</CardTitle>
        <CardDescription>Sign in to your account</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div className="space-y-2">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>
          <div className="space-y-2">
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
              />
              <button 
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                onClick={togglePasswordVisibility}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <div className="text-right">
              <Link 
                href="/forgot-password" 
                className="text-sm text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="space-y-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in with Email'
              )}
            </Button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">Or continue with</span>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full flex items-center justify-center gap-2"
              onClick={handleGoogleLogin}
              disabled={isLoading}
            >
              {isLoading && isRedirecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <Image 
                    src="/google-logo.svg" 
                    alt="Google" 
                    width={18} 
                    height={18} 
                  />
                  Sign in with Google
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-muted-foreground">
          New to pickup?{' '}
          <Link 
            href="/signup" 
            className="text-primary hover:underline font-medium"
          >
            Sign up here
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
} 