/** @type {import('next').NextConfig} */
module.exports = {
  eslint: { ignoreDuringBuilds: true },
  // Allow @imgly/background-removal WASM worker to load from unpkg CDN
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
        ],
      },
    ];
  },
  // Tell Next.js not to bundle @imgly/background-removal on the server — it's
  // browser-only (WASM + CDN) and its peer deps (onnxruntime-web) are not
  // installed. Dynamic import in lib/studio.ts already guards browser-only usage.
  // NOTE: Next.js 14 uses experimental.serverComponentsExternalPackages
  experimental: {
    serverComponentsExternalPackages: ['@imgly/background-removal'],
  },
  webpack(config) {
    // onnxruntime-web/webgpu is an optional sub-entry that doesn't ship as a
    // standalone package entrypoint — stub it so webpack doesn't error.
    // onnxruntime-web itself is now properly installed as a peer dep.
    config.resolve.alias = {
      ...config.resolve.alias,
      'onnxruntime-web/webgpu': false,
    };
    return config;
  },
};

