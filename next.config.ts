import consola from "consola";
import type { NextConfig } from "next";

consola.level = 999;

const nextConfig: NextConfig = {
    reactCompiler: true,
    serverExternalPackages: ["sharp", "onnxruntime-node"],
    typescript: {
        ignoreBuildErrors: true,
    },
};

export default nextConfig;
