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
  
  // Configure the build to skip pre-rendering for specific pages
  webpack: (config, { isServer }) => {
    if (isServer) {
      // When building the server bundle, mark the map page as external
      // This prevents the server from trying to render it
      config.externals = [...(config.externals || []), 
        (context, request, callback) => {
          if (request.includes('map-view') || request.includes('map-page-content')) {
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
