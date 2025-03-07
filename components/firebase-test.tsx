'use client';

import { useEffect, useState } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

export function FirebaseTest() {
  const { toast } = useToast();
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState<string>('Checking...');

  useEffect(() => {
    // Check auth status
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setAuthStatus(`Authenticated as: ${user.email}`);
      } else {
        setAuthStatus('Not authenticated');
      }
    });

    return () => unsubscribe();
  }, []);

  const testFirebase = async () => {
    setStatus('loading');
    setError(null);

    try {
      // Log auth state
      console.log('Current user:', auth.currentUser);
      
      if (!auth.currentUser) {
        setError('Not authenticated. Please sign in first.');
        setStatus('error');
        return;
      }

      // Force token refresh
      await auth.currentUser.getIdToken(true);
      
      // Try to get a list of collections
      const collectionsSnapshot = await getDocs(collection(db, 'locations'));
      console.log('Collections test:', collectionsSnapshot.size);
      
      setStatus('success');
      toast({
        title: 'Firebase Test Successful',
        description: `Found ${collectionsSnapshot.size} locations`,
      });
    } catch (err: any) {
      console.error('Firebase test error:', err);
      setError(err.message || 'Unknown error');
      setStatus('error');
      toast({
        title: 'Firebase Test Failed',
        description: err.message || 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="p-4 border rounded-md">
      <h3 className="text-lg font-medium mb-2">Firebase Connection Test</h3>
      <p className="mb-2">Auth Status: {authStatus}</p>
      
      <Button 
        onClick={testFirebase} 
        disabled={status === 'loading'}
        className="mb-2"
      >
        {status === 'loading' ? 'Testing...' : 'Test Firebase Connection'}
      </Button>
      
      {status === 'success' && (
        <p className="text-green-500">Connection successful!</p>
      )}
      
      {status === 'error' && (
        <p className="text-red-500">Error: {error}</p>
      )}
    </div>
  );
} 