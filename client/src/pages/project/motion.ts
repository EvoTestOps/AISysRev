import { keyframes } from "@mui/material/styles";

const rise = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: none; }
`;

/** Fades a block in from slightly below, the nth one a little after the one before. */
export const riseIn = (n: number) => ({
  animation: `${rise} 500ms cubic-bezier(0.2, 0, 0, 1) both`,
  animationDelay: `${n * 90}ms`,
  "@media (prefers-reduced-motion: reduce)": { animation: "none" },
});
