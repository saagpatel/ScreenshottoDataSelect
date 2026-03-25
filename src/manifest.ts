import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
	manifest_version: 3,
	name: "Screenshot to DataSelect",
	version: "0.1.0",
	description:
		"Select any table or chart on a webpage, extract structured data with AI vision",
	icons: {
		"16": "public/icons/icon16.png",
		"32": "public/icons/icon32.png",
		"48": "public/icons/icon48.png",
		"128": "public/icons/icon128.png",
	},
	action: {
		default_popup: "src/popup/index.html",
		default_icon: {
			"16": "public/icons/icon16.png",
			"32": "public/icons/icon32.png",
		},
		default_title: "Screenshot to DataSelect",
	},
	background: {
		service_worker: "src/background/service-worker.ts",
		type: "module",
	},
	permissions: [
		"activeTab",
		"scripting",
		"storage",
		"contextMenus",
		"offscreen",
	],
	commands: {
		"start-selection": {
			suggested_key: {
				default: "Ctrl+Shift+S",
				mac: "Command+Shift+S",
			},
			description: "Start table selection",
		},
	},
	content_security_policy: {
		extension_pages:
			"script-src 'self'; object-src 'self'; connect-src https://api.anthropic.com",
	},
});
