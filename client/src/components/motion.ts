import { keyframes } from "@mui/material/styles";

const rise = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: none; }
`;

const fade = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const reducedMotion = { "@media (prefers-reduced-motion: reduce)": { animation: "none" } };

/** Fades a block in from slightly below, the nth one a little after the one before. */
export const riseIn = (n: number) => ({
  animation: `${rise} 500ms cubic-bezier(0.2, 0, 0, 1) both`,
  animationDelay: `${n * 90}ms`,
  ...reducedMotion,
});

/** Fades an element in when it mounts, for elements that can't be wrapped in FadeIn. */
export const fadeIn = {
  animation: `${fade} 400ms ease-out both`,
  ...reducedMotion,
};
