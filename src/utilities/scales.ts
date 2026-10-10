export const SPACE = {
  "0": "0px",
  "px": "1px",
  "1": "0.25rem",
  "2": "0.5rem",
  "3": "0.75rem",
  "4": "1rem",
  "5": "1.25rem",
  "6": "1.5rem",
  "8": "2rem",
  "10": "2.5rem",
  "12": "3rem",
  "16": "4rem",
  "20": "5rem",
  "24": "6rem",
  "32": "8rem",
  "40": "10rem",
  "48": "12rem",
  "64": "16rem",
  "80": "20rem",
  "96": "24rem",
} as const;

export const FRACTION = {
  "1/2": "50%",
  "1/3": "33.333333%",
  "2/3": "66.666667%",
  "1/4": "25%",
  "3/4": "75%",
  full: "100%",
} as const;

export const MAX_WIDTH = {
  sm: "24rem",
  md: "28rem",
  lg: "32rem",
  xl: "36rem",
  "2xl": "42rem",
  "3xl": "48rem",
  "4xl": "56rem",
  "5xl": "64rem",
  "6xl": "72rem",
  "7xl": "80rem",
} as const;

export const TEXT = {
  xs: ["0.75rem", "1rem"],
  sm: ["0.875rem", "1.25rem"],
  base: ["1rem", "1.5rem"],
  lg: ["1.125rem", "1.75rem"],
  xl: ["1.25rem", "1.75rem"],
  "2xl": ["1.5rem", "2rem"],
  "3xl": ["1.875rem", "2.25rem"],
} as const;

export const LEADING = {
  none: "1",
  tight: "1.25",
  snug: "1.375",
  normal: "1.5",
  relaxed: "1.625",
  loose: "2",
  "3": "0.75rem",
  "4": "1rem",
  "5": "1.25rem",
  "6": "1.5rem",
  "7": "1.75rem",
  "8": "2rem",
  "9": "2.25rem",
  "10": "2.5rem",
} as const;

export const TRACKING = {
  tighter: "-0.05em",
  tight: "-0.025em",
  normal: "0em",
  wide: "0.025em",
  wider: "0.05em",
  widest: "0.1em",
} as const;

export const RADIUS = {
  none: "0px",
  sm: "0.25rem",
  md: "0.375rem",
  lg: "0.5rem",
  xl: "0.75rem",
  "2xl": "1rem",
  full: "9999px",
} as const;

export const SHADOW = {
  xs: "0 1px 2px rgb(0 0 0 / 0.05)",
  sm: "0 1px 3px rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
  md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
  lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
} as const;

export const BLUR = {
  none: "none",
  xs: "blur(4px)",
  sm: "blur(8px)",
  md: "blur(12px)",
  lg: "blur(16px)",
  xl: "blur(24px)",
} as const;

export const DURATION = ["0", "75", "100", "150", "200", "300", "500", "700", "1000"] as const;

export const EASE = {
  linear: "linear",
  in: "cubic-bezier(0.4, 0, 1, 1)",
  out: "cubic-bezier(0, 0, 0.2, 1)",
  "in-out": "cubic-bezier(0.4, 0, 0.2, 1)",
} as const;

/** Opacity and color alpha steps: 0, 5, 10, … 100. */
export const ALPHA = Array.from({ length: 21 }, (_, step) => String(step * 5));

export const BREAKPOINT = {
  sm: "40rem",
  md: "48rem",
  lg: "64rem",
  xl: "80rem",
  "2xl": "96rem",
} as const;

export type Space = keyof typeof SPACE;
export type MaxWidth = keyof typeof MAX_WIDTH;
export type TextSize = keyof typeof TEXT;
export type Radius = keyof typeof RADIUS;
export type Shadow = keyof typeof SHADOW;
export type Breakpoint = keyof typeof BREAKPOINT;
