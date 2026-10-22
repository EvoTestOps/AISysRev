import Box, { BoxProps } from "@mui/material/Box";
import { fadeIn } from "./motion";

/**
 * Fades a page's content in when it mounts, e.g. when it replaces the page's
 * skeleton. Inside, `riseIn` staggers the content's main blocks.
 */
export const FadeIn: React.FC<BoxProps> = ({ sx, ...props }) => (
  <Box sx={[fadeIn, ...(Array.isArray(sx) ? sx : [sx])]} {...props} />
);
