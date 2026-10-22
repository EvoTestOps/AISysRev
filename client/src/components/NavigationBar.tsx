import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import LogoutIcon from "@mui/icons-material/Logout";
import ManageAccountsOutlinedIcon from "@mui/icons-material/ManageAccountsOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Toolbar from "@mui/material/Toolbar";
import Tooltip from "@mui/material/Tooltip";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import AISysRevLogo from "../assets/images/aisysrev-logo-on-light.svg";
import { EventLogButton } from "./EventLogButton";

// Top-level destinations; everything about the user lives in the account menu.
const DESTINATIONS = [
  {
    label: "Projects",
    href: "/",
    isActive: (path: string) =>
      path === "/" ||
      path.startsWith("/projects") ||
      path.startsWith("/project/") ||
      path === "/create",
  },
  { label: "About", href: "/about", isActive: (path: string) => path.startsWith("/about") },
];

const AccountMenu: React.FC = () => {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const close = () => setAnchor(null);
  return (
    <>
      <Tooltip title="Account">
        <IconButton
          aria-label="Account"
          data-testid="account-menu-button"
          onClick={(e) => setAnchor(e.currentTarget)}
        >
          <AccountCircleOutlinedIcon />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchor}
        open={anchor !== null}
        onClose={close}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <MenuItem component={Link} href="/settings" onClick={close}>
          <ListItemIcon>
            <SettingsOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>LLM settings</ListItemText>
        </MenuItem>
        <MenuItem component={Link} href="/settings/account" onClick={close}>
          <ListItemIcon>
            <ManageAccountsOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Account</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem component="a" href="/api/v1/auth/logout">
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Log out</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};

/** The app bar: logo, top-level destinations and the account menu. */
export const NavigationBar: React.FC = () => {
  const [location] = useLocation();
  const appEnv = import.meta.env.VITE_APP_ENV;
  return (
    <AppBar
      position="static"
      color="inherit"
      elevation={0}
      sx={{ borderBottom: 1, borderColor: "divider" }}
    >
      <Toolbar sx={{ gap: 1 }}>
        <Link to="/" aria-label="AISysRev home" className="flex items-center">
          <img src={AISysRevLogo} alt="AISysRev" className="h-8 w-auto" />
        </Link>
        {appEnv === "dev" && (
          <Chip label="DEV" color="error" size="small" sx={{ fontWeight: 700, ml: 1 }} />
        )}
        <Box sx={{ flexGrow: 1 }} />
        <Box component="nav" aria-label="Main" sx={{ display: "flex", gap: 0.5 }}>
          {DESTINATIONS.map(({ label, href, isActive }) => {
            const active = isActive(location);
            return (
              <Button
                key={href}
                component={Link}
                href={href}
                aria-current={active ? "page" : undefined}
                color={active ? "primary" : "inherit"}
                sx={{ fontWeight: active ? 700 : 500 }}
              >
                {label}
              </Button>
            );
          })}
        </Box>
        {appEnv === "dev" && <EventLogButton />}
        <AccountMenu />
      </Toolbar>
    </AppBar>
  );
};
