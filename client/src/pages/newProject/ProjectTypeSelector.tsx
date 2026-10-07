import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import GitHubIcon from "@mui/icons-material/GitHub";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import Link from "@mui/material/Link";
import Radio from "@mui/material/Radio";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { ScreeningTarget } from "../../state/types";

type ProjectTypeOption = {
  value: ScreeningTarget;
  icon: React.ReactNode;
  title: string;
  description: string;
  testId: string;
};

const OPTIONS: ProjectTypeOption[] = [
  {
    value: ScreeningTarget.PAPER,
    icon: <ArticleOutlinedIcon />,
    title: "Literature review",
    description:
      "Title-abstract screening of research papers, optionally with their full texts (PDFs).",
    testId: "project-type-paper",
  },
  {
    value: ScreeningTarget.GITHUB_REPOSITORY,
    icon: <GitHubIcon />,
    title: "GitHub repository review",
    description:
      "Screening of software repositories by their name, description and README instead of a title and abstract.",
    testId: "project-type-github",
  },
];

type ProjectTypeSelectorProps = {
  value: ScreeningTarget;
  onChange: (value: ScreeningTarget) => void;
};

/** What the project screens: papers or GitHub repositories. */
export const ProjectTypeSelector: React.FC<ProjectTypeSelectorProps> = ({ value, onChange }) => (
  <Stack spacing={1.5}>
    <Box
      role="radiogroup"
      aria-label="Project type"
      sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}
    >
      {OPTIONS.map((option) => {
        const selected = option.value === value;
        return (
          <Card
            key={option.value}
            variant="outlined"
            sx={{
              borderColor: selected ? "primary.main" : "divider",
              borderWidth: selected ? 2 : 1,
              bgcolor: selected ? "action.hover" : "background.paper",
            }}
          >
            <CardActionArea
              role="radio"
              aria-checked={selected}
              data-testid={option.testId}
              onClick={() => onChange(option.value)}
              sx={{ p: 2, height: "100%", display: "flex", alignItems: "flex-start", gap: 1.5 }}
            >
              <Box sx={{ color: selected ? "primary.main" : "text.secondary", mt: 0.25 }}>
                {option.icon}
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {option.title}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {option.description}
                </Typography>
              </Box>
              <Radio
                checked={selected}
                tabIndex={-1}
                size="small"
                sx={{ p: 0 }}
                slotProps={{ input: { "aria-hidden": true } }}
              />
            </CardActionArea>
          </Card>
        );
      })}
    </Box>
    {value === ScreeningTarget.GITHUB_REPOSITORY && (
      <Typography variant="body2" color="textSecondary">
        Upload a CSV of repositories with the expected columns, e.g. one made with the{" "}
        <Link
          href="https://github.com/EvoTestOps/github-query-tool/tree/main"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub Query Tool
        </Link>
        .
      </Typography>
    )}
  </Stack>
);
