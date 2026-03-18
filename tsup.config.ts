import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/cli.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  splitting: true,
  sourcemap: true,
  target: "node20",
  banner: ({ format }) => {
    // Add shebang only to cli.js
    return {};
  },
  esbuildOptions(options) {
    options.banner = {
      js: "",
    };
  },
});
