// import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import react from "@vitejs/plugin-react";
// import babel from "@rolldown/plugin-babel";
import { defineConfig } from "vite";

import path from "path";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
	plugins: [react(), tailwindcss()],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
	base: "./",

	// build: {
	// 	rollupOptions: {
	// 		output: { format: "iife", inlineDynamicImports: true },
	// 	},
	// },
});

// babel({ presets: [reactCompilerPreset()] })
