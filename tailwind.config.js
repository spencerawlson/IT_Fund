/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
  	extend: {
  		borderRadius: {
  			// Design system: controls (buttons, inputs, rows) and cards. Pills use rounded-full.
  			control: '12px',
  			card: '20px',
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		// Design system type scale. Nothing smaller than caption (12px).
  		fontSize: {
  			caption: ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.01em' }],
  			small: ['0.875rem', { lineHeight: '1.25rem' }],
  			body: ['1rem', { lineHeight: '1.6rem' }],
  			lesson: ['1.0625rem', { lineHeight: '1.8rem' }],
  			heading: ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.01em', fontWeight: '600' }],
  			title: ['clamp(1.75rem, 1.45rem + 1vw, 2rem)', { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '700' }],
  		},
  		maxWidth: {
  			reading: '70ch',
  		},
  		colors: {
  			ink: {
  				1: 'rgb(var(--ink-1-rgb) / <alpha-value>)',
  				2: 'rgb(var(--ink-2-rgb) / <alpha-value>)',
  				3: 'rgb(var(--ink-3-rgb) / <alpha-value>)',
  			},
  			action: {
  				DEFAULT: 'rgb(var(--action-rgb) / <alpha-value>)',
  				hover: 'rgb(var(--action-hover-rgb) / <alpha-value>)',
  				ink: 'rgb(var(--action-ink-rgb) / <alpha-value>)',
  			},
  			focus: 'rgb(var(--focus-rgb) / <alpha-value>)',
  			success: 'rgb(var(--success-rgb) / <alpha-value>)',
  			warning: 'rgb(var(--warning-rgb) / <alpha-value>)',
  			danger: 'rgb(var(--danger-rgb) / <alpha-value>)',
  			info: 'rgb(var(--info-rgb) / <alpha-value>)',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
  		fontFamily: {
  			heading: ['var(--font-heading)'],
  			body: ['var(--font-body)'],
  			display: ['var(--font-display)'],
  			mono: ['var(--font-mono)']
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
}
