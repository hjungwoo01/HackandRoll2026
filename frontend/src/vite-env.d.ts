/// <reference types="vite/client" />

declare module 'canvas-confetti' {
  export default function confetti(options?: {
    particleCount?: number;
    spread?: number;
    origin?: { x?: number; y?: number };
  }): void;
}
