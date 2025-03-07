'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { trackEvent, AnalyticsEvents } from '@/lib/analytics';
import { useRouter } from 'next/navigation';
import { Loader2, Eye, EyeOff, Check, X } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Progress } from '@/components/ui/progress';

export function SignUpForm() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const { user, signUpWithEmail, signInWithGoogle, isAuthenticating } = useAuth();
  const router = useRouter();

  // Clear error when inputs change
  useEffect(() => {
    if (error) setError('');
  }, [firstName, lastName, email, password, confirmPassword, error]);

  // Calculate password strength
  useEffect(() => {
    if (!password) {
      setPasswordStrength(0);
      return;
    }

    let strength = 0;
    
    // Length check
    if (password.length >= 8) strength += 20;
    
    // Contains lowercase
    if (/[a-z]/.test(password)) strength += 20;
    
    // Contains uppercase
    if (/[A-Z]/.test(password)) strength += 20;
    
    // Contains number
    if (/[0-9]/.test(password)) strength += 20;
    
    // Contains special character
    if (/[^A-Za-z0-9]/.test(password)) strength += 20;
    
    setPasswordStrength(strength);
  }, [password]);

  // Redirect if user is already logged in
  useEffect(() => {
    if (user) {
      console.log('User already logged in, redirecting...');
      router.push('/');
    }
  }, [user, router]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAuthenticating || isRedirecting) return;
    
    setError('');

    if (!firstName.trim() || !lastName.trim()) {
      setError('First name and last name are required');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password should be at least 8 characters');
      return;
    }

    if (passwordStrength < 60) {
      setError('Please create a stronger password');
      return;
    }

    try {
      await signUpWithEmail(email, password, firstName, lastName);
      console.log('Signup successful, tracking event...');
      trackEvent(AnalyticsEvents.SIGNUP, { method: 'email' });
      
      setIsRedirecting(true);
      console.log('Redirecting to home...');
      router.push('/');
    } catch (error: any) {
      console.error('Signup failed:', error);
      // Format Firebase error messages to be more user-friendly
      if (error.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists');
      } else if (error.code === 'auth/invalid-email') {
        setError('Invalid email address');
      } else if (error.code === 'auth/weak-password') {
        setError('Password should be at least 8 characters');
      } else {
        setError(error.message || 'Failed to create account');
      }
    }
  };

  const handleGoogleSignUp = async () => {
    if (isAuthenticating || isRedirecting) return;
    
    setError('');
    try {
      await signInWithGoogle();
      console.log('Google signup successful, tracking event...');
      trackEvent(AnalyticsEvents.SIGNUP, { method: 'google' });
      
      setIsRedirecting(true);
      console.log('Redirecting to home...');
      router.push('/');
    } catch (error: any) {
      console.error('Google signup failed:', error);
      if (error.code === 'auth/popup-closed-by-user') {
        setError('Signup canceled. Please try again.');
      } else {
        setError(error.message || 'Google signup failed');
      }
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength === 0) return '';
    if (passwordStrength < 40) return 'Weak';
    if (passwordStrength < 80) return 'Medium';
    return 'Strong';
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength < 40) return 'bg-red-500';
    if (passwordStrength < 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const isLoading = isAuthenticating || isRedirecting;

  return (
    <Card className="w-[350px] mx-auto mt-8">
      <CardHeader>
        <CardTitle>Sign Up</CardTitle>
        <CardDescription>Create a new account</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSignUp} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Input
                type="text"
                placeholder="First Name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
            <div>
              <Input
                type="text"
                placeholder="Last Name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
          </div>
          <div>
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>
          <div className="space-y-1">
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
            {password && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Progress value={passwordStrength} className="h-1" />
                  <span className="text-xs ml-2">{getPasswordStrengthText()}</span>
                </div>
                <ul className="text-xs space-y-1 mt-1">
                  <li className="flex items-center">
                    {password.length >= 8 ? 
                      <Check size={12} className="text-green-500 mr-1" /> : 
                      <X size={12} className="text-red-500 mr-1" />}
                    At least 8 characters
                  </li>
                  <li className="flex items-center">
                    {/[A-Z]/.test(password) ? 
                      <Check size={12} className="text-green-500 mr-1" /> : 
                      <X size={12} className="text-red-500 mr-1" />}
                    Contains uppercase letter
                  </li>
                  <li className="flex items-center">
                    {/[0-9]/.test(password) ? 
                      <Check size={12} className="text-green-500 mr-1" /> : 
                      <X size={12} className="text-red-500 mr-1" />}
                    Contains number
                  </li>
                  <li className="flex items-center">
                    {/[^A-Za-z0-9]/.test(password) ? 
                      <Check size={12} className="text-green-500 mr-1" /> : 
                      <X size={12} className="text-red-500 mr-1" />}
                    Contains special character
                  </li>
                </ul>
              </div>
            )}
          </div>
          <div>
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : (
              'Sign Up with Email'
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
            onClick={handleGoogleSignUp}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : (
              <>
                <Image 
                  src="/google-logo.svg" 
                  alt="Google" 
                  width={18} 
                  height={18} 
                />
                Sign up with Google
              </>
            )}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link 
            href="/login" 
            className="text-primary hover:underline font-medium"
          >
            Sign in here
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
} 