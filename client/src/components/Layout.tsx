import Box from "@mui/material/Box";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import { PropsWithChildren } from "react";
import { Helmet } from "react-helmet-async";
import { twMerge } from "tailwind-merge";
import { NavigationBar } from "./NavigationBar";
import { PageHeader } from "./PageHeader";

type LayoutProps = {
  title: string;
  className?: string;
  /** Page-level actions, shown next to the title. */
  headerActions?: React.ReactNode;
  hideNavbar?: boolean;
};

// Content and footer share the same column.
const CONTENT_WIDTH = "w-full px-6 lg:px-0 lg:w-4xl xl:w-6xl 2xl:w-7xl mx-auto";

const FOOTER_LINKS = [
  { label: "Terms and Conditions", href: "/terms-and-conditions" },
  { label: "Register and Privacy Policy", href: "/register-and-privacy-policy" },
];

export const Layout = ({
  title,
  children,
  className,
  headerActions,
  hideNavbar,
}: PropsWithChildren<LayoutProps>) => {
  return (
    <div className="flex flex-col min-h-screen">
      <Helmet>
        <title>{title}</title>
      </Helmet>

      {!hideNavbar && <NavigationBar />}

      <div className={twMerge(CONTENT_WIDTH, "mt-8 mb-12", className)}>
        {!hideNavbar && <PageHeader title={title} actions={headerActions} />}
        {children}
      </div>
      <Box component="footer" sx={{ mt: "auto", borderTop: 1, borderColor: "divider" }}>
        <Box
          className={CONTENT_WIDTH}
          sx={{
            py: 2,
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: { xs: "center", sm: "space-between" },
            gap: { xs: 1, sm: 3 },
          }}
        >
          <Typography variant="body2" color="text.secondary">
            © AISysRev
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 3 }}>
            {FOOTER_LINKS.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                target="_blank"
                rel="noreferrer"
                variant="body2"
                color="text.secondary"
                underline="hover"
              >
                {label}
              </Link>
            ))}
          </Box>
        </Box>
      </Box>
    </div>
  );
};
