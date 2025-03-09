'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { trackEvent, AnalyticsEvents } from '@/lib/analytics';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, Eye, EyeOff, AlertCircle, XCircle } from 'lucide-react';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface LoginFormProps {
  onForgotPassword?: () => void;
}

export function LoginForm({ onForgotPassword }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [errorType, setErrorType] = useState<'credentials' | 'network' | 'other' | ''>('');
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const { user, signInWithGoogle, signInWithEmail, isAuthenticating } = useAuth();
  const router = useRouter();

  // Clear error when inputs change
  useEffect(() => {
    if (error) {
      setError('');
      setErrorType('');
    }
  }, [email, password, error]);

  // Redirect if user is already logged in
  useEffect(() => {
    if (user) {
      console.log('User already logged in, redirecting...');
      // Use URL parameter-based navigation
      const url = new URL(window.location.href);
      url.searchParams.set('appTab', 'home');
      // Remove any auth-related params
      url.searchParams.delete('tab');
      url.searchParams.delete('view');
      window.history.pushState({}, '', url);
      // Then navigate to home
      router.push('/?appTab=home');
    }
  }, [user, router]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAuthenticating || isRedirecting) return;
    
    setError('');
    setErrorType('');
    
    // Validate inputs
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }
    
    if (!password) {
      setError('Please enter your password');
      return;
    }
    
    try {
      console.log('Attempting login with email:', email);
      await signInWithEmail(email, password);
      console.log('Login successful, tracking event...');
      trackEvent(AnalyticsEvents.LOGIN, { method: 'email' });
      
      // Reset login attempts on success
      setLoginAttempts(0);
      
      setIsRedirecting(true);
      console.log('Redirecting to home...');
      router.push('/');
    } catch (error: any) {
      console.error('Login failed:', error);
      // Increment login attempts
      setLoginAttempts(prev => prev + 1);
      
      // Format Firebase error messages to be more user-friendly
      if (error.code === 'auth/user-not-found') {
        setError('No account exists with this email address');
        setErrorType('credentials');
      } else if (error.code === 'auth/wrong-password') {
        setError('Incorrect password. Please try again');
        setErrorType('credentials');
      } else if (error.code === 'auth/invalid-credential') {
        setError('Invalid email or password. Please check your credentials and try again');
        setErrorType('credentials');
      } else if (error.code === 'auth/too-many-requests') {
        setError('Too many failed login attempts. Please try again later or reset your password');
        setErrorType('other');
      } else if (error.code === 'auth/network-request-failed') {
        setError('Network error. Please check your internet connection and try again');
        setErrorType('network');
      } else {
        setError(error.message || 'Login failed. Please try again');
        setErrorType('other');
      }
    }
  };

  const handleGoogleLogin = async () => {
    if (isAuthenticating || isRedirecting) return;
    
    setError('');
    setErrorType('');
    
    try {
      console.log('Attempting login with Google...');
      await signInWithGoogle();
      console.log('Google login successful, tracking event...');
      trackEvent(AnalyticsEvents.LOGIN_WITH_GOOGLE);
      
      setIsRedirecting(true);
      console.log('Redirecting to home...');
      router.push('/');
    } catch (error: any) {
      console.error('Google login failed:', error);
      
      if (error.code === 'auth/popup-closed-by-user') {
        setError('Login canceled. Please try again');
      } else if (error.code === 'auth/network-request-failed') {
        setError('Network error. Please check your internet connection and try again');
        setErrorType('network');
      } else {
        setError(error.message || 'Google login failed. Please try again');
        setErrorType('other');
      }
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const isLoading = isAuthenticating || isRedirecting;

  // Suggest password reset after multiple failed attempts
  const shouldSuggestPasswordReset = loginAttempts >= 2 && errorType === 'credentials';

  return (
    <Card className="w-[350px] mx-auto mt-8">
      <CardHeader>
        <CardTitle>Login</CardTitle>
        <CardDescription>Sign in to your account</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>
              {errorType === 'credentials' ? 'Invalid Credentials' : 
               errorType === 'network' ? 'Network Error' : 'Error'}
            </AlertTitle>
            <AlertDescription>
              {error}
              {shouldSuggestPasswordReset && (
                <div className="mt-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={onForgotPassword}
                    className="text-xs"
                  >
                    Reset Password
                  </Button>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}
        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div className="space-y-2">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              required
              className={errorType === 'credentials' ? "border-red-500 focus-visible:ring-red-500" : ""}
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
                className={errorType === 'credentials' ? "border-red-500 focus-visible:ring-red-500" : ""}
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
              {onForgotPassword ? (
                <Button 
                  variant="link" 
                  type="button"
                  className="p-0 h-auto text-sm text-primary hover:underline"
                  onClick={onForgotPassword}
                >
                  Forgot password?
                </Button>
              ) : (
                <Link 
                  href="/forgot-password" 
                  className="text-sm text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              )}
            </div>
          </div>
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
    </Card>
  );
} 