import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [react(), tsconfigPaths(), nodePolyfills()],
	resolve: {
		conditions: ['source'],
	},
	define: {
		'process.browser': JSON.stringify(true),
	},
});