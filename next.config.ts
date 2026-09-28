import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dashboard reads data/*.json at request time; without this, Vercel's
  // serverless bundle omits them and the page renders with empty fallbacks.
  outputFileTracingIncludes: {
    "/": ["./data/**/*"],
  },
};

export default nextConfig;
