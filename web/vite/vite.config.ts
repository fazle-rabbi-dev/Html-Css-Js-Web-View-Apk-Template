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
			"@": path.resolve(import.meta.dirname, "./src"),
		},
	},
	base: "./",
});

// babel({ presets: [reactCompilerPreset()] })
