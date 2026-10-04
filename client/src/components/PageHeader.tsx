import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

type PageHeaderProps = {
  title: string;
  /** Page-level actions, aligned to the right of the title. */
  actions?: React.ReactNode;
};

/** The page title and its actions, above the page content. */
export const PageHeader: React.FC<PageHeaderProps> = ({ title, actions }) => (
  <Box
    sx={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 2,
      flexWrap: "wrap",
      mb: 3,
    }}
  >
    <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
      {title}
    </Typography>
    {actions && <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>{actions}</Box>}
  </Box>
);
