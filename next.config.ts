import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    reactCompiler: true,
    serverExternalPackages: ["sharp", "onnxruntime-node"],
};

export default nextConfig;
