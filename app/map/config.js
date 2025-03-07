// This file configures the map page to only render on the client side
// These export options tell Next.js not to pre-render this page on the server
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';
export const preferredRegion = 'auto';

// Most importantly, disable static generation for this route
export const generateStaticParams = () => {
  return [];
};

// Disable static optimization
export const unstable_skipMiddlewareUrlNormalize = true;

// Force client-side rendering
export const unstable_runtimeJS = true; 