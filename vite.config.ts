/// <reference types="vitest/config" />
import { crx } from "@crxjs/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import manifest from "./src/manifest";

export default defineConfig({
	plugins: [react(), crx({ manifest })],
	test: {
		globals: true,
		environment: "jsdom",
		setupFiles: ["./tests/setup.ts"],
	},
});
