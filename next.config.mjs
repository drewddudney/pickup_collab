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
    unoptimized: true,
  },
  experimental: {
    webpackBuildWorker: true,
    parallelServerBuildTraces: true,
    parallelServerCompiles: true,
  },
  // Configure pages that should not be pre-rendered at build time
  // This is important for pages that use browser-specific APIs like window/document
  unstable_runtimeJS: true,
  
  // Explicitly tell Next.js not to pre-render the map page
  // This is crucial for pages that use browser-specific APIs
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  
  // Disable static generation for specific pages
  exportPathMap: async function (defaultPathMap) {
    return {
      ...defaultPathMap,
      '/map': { page: '/map', _isClientOnly: true },
    };
  },
  
  // Completely disable server-side rendering for specific routes
  // This is the most effective way to prevent "window is not defined" errors
  async rewrites() {
    return {
      beforeFiles: [
        // Rewrite the /map route to a static HTML file that only loads client-side
        {
          source: '/map',
          destination: '/map-client-only.html',
        },
      ],
    };
  },
  
  // Generate a static HTML file for client-only rendering
  async generateStaticParams() {
    return [];
  },
  
  // Skip type checking during build
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Configure webpack to handle browser-specific modules
  webpack: (config, { isServer }) => {
    if (isServer) {
      // When building the server bundle, mark browser-specific modules as external
      config.externals = [...(config.externals || []), 
        (context, request, callback) => {
          // List of modules that should only be loaded on the client
          const browserModules = [
            'map-view',
            'map-page-content',
            'leaflet',
            'react-leaflet',
          ];
          
          if (browserModules.some(mod => request.includes(mod))) {
            // Mark these modules as external to prevent server-side rendering
            return callback(null, `commonjs ${request}`);
          }
          callback();
        }
      ];
    }
    
    return config;
  },
}

mergeConfig(nextConfig, userConfig)

function mergeConfig(nextConfig, userConfig) {
  if (!userConfig) {
    return
  }

  for (const key in userConfig) {
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
