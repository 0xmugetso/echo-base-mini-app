import type { Config } from "tailwindcss";

/**
 * Tailwind CSS Configuration
 * 
 * This configuration centralizes all theme colors for the mini app.
 * To change the app's color scheme, simply update the 'primary' color value below.
 * 
 * Example theme changes:
 * - Blue theme: primary: "#3182CE"
 * - Green theme: primary: "#059669" 
 * - Red theme: primary: "#DC2626"
 * - Orange theme: primary: "#EA580C"
 */
export default {
	darkMode: "media",
	content: [
		"./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
		"./src/components/**/*.{js,ts,jsx,tsx,mdx}",
		"./src/app/**/*.{js,ts,jsx,tsx,mdx}",
	],
	theme: {
		extend: {
			colors: {
				// Main theme color - change this to update the entire app's color scheme
				primary: "#0000FF", // Pure Blue
				"primary-light": "#3333FF", // Lighter Blue
				"primary-dark": "#0000CC", // Darker Blue

				// Secondary colors for backgrounds and text
				secondary: "#ffffff", // White
				"secondary-dark": "#000000", // Black

				// Retro Palette
				"retro-blue": "#0000FF",
				"retro-gray": "#C0C0C0",
				"retro-bg": "#000000",

				// Legacy CSS variables for backward compatibility
				background: 'var(--background)',
				foreground: 'var(--foreground)'
			},
			borderRadius: {
				lg: '0px',
				md: '0px',
				sm: '0px'
			},
			// Custom spacing for consistent layout
			spacing: {
				'18': '4.5rem',
				'88': '22rem',
			},
			fontFamily: {
				pixel: ['var(--font-pixel)', 'monospace'],
			},
			// Custom container sizes
			maxWidth: {
				'xs': '20rem',
				'sm': '24rem',
				'md': '28rem',
				'lg': '32rem',
				'xl': '36rem',
				'2xl': '42rem',
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
