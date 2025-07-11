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
    bundle: true,
    // Keep Node.js built-ins as external
    external: ["crypto", "https", "http", "fs", "path", "os", "util"],
    // Bundle all npm dependencies
    noExternal: ["@actions/core", "@actions/github", "@octokit/rest", "node-fetch"],
});