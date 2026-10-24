export const EASE = "power3.out"; // GSAP match for --ease-ink
export const DURATION = { fast: 0.4, base: 0.7, slow: 1.2 };
export const STAGGER = 0.06; // between letters or rows

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const hasFinePointer = () =>
  typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches;
