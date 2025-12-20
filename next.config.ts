import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    reactCompiler: true,
    serverExternalPackages: ["sharp", "onnxruntime-node"],
    typescript: {
        ignoreBuildErrors: true,
    },
};

export default nextConfig;
