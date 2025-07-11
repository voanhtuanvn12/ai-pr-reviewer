import { defineConfig } from "tsup";

export default defineConfig({
    // GitHub Action build
    entry: ["src/action.ts"],
    format: ["cjs"],
    target: "node20",
    platform: "node",
    sourcemap: false,
    minify: false,
    outDir: "./dist",
    outExtension: () => ({ js: '.cjs' }),
});