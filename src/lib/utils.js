import { clsx } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// Teach tailwind-merge the design-system type scale (tailwind.config.js fontSize). Without this
// it reads `text-heading` as a colour and drops it (or the real colour) when both are present.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: ['caption', 'small', 'body', 'lesson', 'heading', 'title'] }],
    },
  },
})

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}


export const isIframe = window.self !== window.top;
