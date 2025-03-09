let userConfig = undefined
try {
  userConfig = await import('./v0-user-next.config')
} catch (e) {
  // ignore error
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    // Use the built-in Next.js image optimization
    unoptimized: false,
    // Configure image domains for external images
    domains: [
      'unpkg.com', 
      'lh3.googleusercontent.com',
      'firebasestorage.googleapis.com',
      'pickup-ba57f.firebasestorage.app'
    ],
    // Set image formats
    formats: ['image/webp', 'image/avif'],
    // Configure image sizes for responsive images
    deviceSizes: [360, 480, 640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Minimize image size in development
    minimumCacheTTL: 60,
    // Don't dangerously allow SVG
    dangerouslyAllowSVG: false,
    // Content security policy
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  // Optimize assets
  compress: true,
  poweredByHeader: false,
  // External packages that should be transpiled
  transpilePackages: ['leaflet', 'react-leaflet'],
  // Explicitly disable Babel to ensure SWC is used
  experimental: {
    forceSwcTransforms: true
  }
}

mergeConfig(nextConfig, userConfig)

function mergeConfig(nextConfig, userConfig) {
  if (!userConfig) {
    return
  }

  for (const key in userConfig) {
    // Skip swcMinify as it's deprecated in Next.js 15.1.0
    if (key === 'swcMinify') continue;
    
    if (
      typeof nextConfig[key] === 'object' &&
      !Array.isArray(nextConfig[key])
    ) {
      nextConfig[key] = {
        ...nextConfig[key],
        ...userConfig[key],
      }
    } else {
      nextConfig[key] = userConfig[key]
    }
  }
}

export default nextConfig
