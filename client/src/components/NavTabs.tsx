import Chip from "@mui/material/Chip";
import Skeleton from "@mui/material/Skeleton";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import { Link } from "wouter";

export type NavTab = {
  label: React.ReactNode;
  href: string;
  /** Shown after the label, e.g. how many papers the tab lists. */
  count?: number;
  /** The count is still loading: a placeholder stands in for it. */
  countLoading?: boolean;
};

type NavTabsProps = {
  tabs: NavTab[];
  /** The href of the tab for the current page. */
  active: string;
  "aria-label": string;
};

/** Tabs that switch between related pages, e.g. a project's tasks and papers. */
export const NavTabs: React.FC<NavTabsProps> = ({ tabs, active, ...rest }) => (
  <Tabs value={active} sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }} {...rest}>
    {tabs.map((tab) => (
      <Tab
        key={tab.href}
        value={tab.href}
        label={
          tab.count === undefined && !tab.countLoading ? (
            tab.label
          ) : (
            <span className="flex items-center gap-2">
              {tab.label}
              {tab.count === undefined ? (
                <Skeleton variant="rounded" width={32} height={24} sx={{ borderRadius: 4 }} />
              ) : (
                <Chip label={tab.count} size="small" data-testid="nav-tab-count" />
              )}
            </span>
          )
        }
        component={Link}
        href={tab.href}
        sx={{ fontWeight: 600 }}
      />
    ))}
  </Tabs>
);
