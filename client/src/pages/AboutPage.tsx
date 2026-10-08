import AccountBalanceOutlinedIcon from "@mui/icons-material/AccountBalanceOutlined";
import ApiOutlinedIcon from "@mui/icons-material/ApiOutlined";
import CodeOutlinedIcon from "@mui/icons-material/CodeOutlined";
import DataObjectOutlinedIcon from "@mui/icons-material/DataObjectOutlined";
import GitHubIcon from "@mui/icons-material/GitHub";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import PsychologyOutlinedIcon from "@mui/icons-material/PsychologyOutlined";
import SmartToyOutlinedIcon from "@mui/icons-material/SmartToyOutlined";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Link from "@mui/material/Link";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import { Fragment } from "react";
import { Layout } from "../components/Layout";
import { riseIn } from "../components/motion";

const SOURCE_URL = "https://github.com/EvoTestOps/AISysRev";
const ORGANISATION_URL = "https://github.com/EvoTestOps";

/** Opens in a new tab, without giving the page access to this one. */
const external = { target: "_blank", rel: "noopener noreferrer" } as const;

type Publication = {
  authors: string;
  year: number;
  title: string;
  venue: string;
  pages?: string;
  doi: string;
};

const PUBLICATIONS: Publication[] = [
  {
    authors: "Huotala, A., Kuutila, M., Turtio, O.-P., Sipilä, S., & Mäntylä, M.",
    year: 2026,
    title: "AISysRev – LLM-based Tool for Title-abstract Screening",
    venue:
      "FSE '26: Companion Proceedings of the 34th ACM Symposium on the Foundations of Software Engineering",
    doi: "10.1145/3803437.3806408",
  },
  {
    authors: "Huotala, A., Kuutila, M., & Mäntylä, M.",
    year: 2025,
    title:
      "SESR-Eval: Dataset for Evaluating LLMs in the Title-Abstract Screening of Systematic Reviews",
    venue:
      "ESEM '25: Proceedings of the 19th ACM/IEEE International Symposium on Empirical Software Engineering and Measurement",
    doi: "10.48550/arXiv.2507.19027",
  },
  {
    authors: "Huotala, A., Kuutila, M., Ralph, P., & Mäntylä, M.",
    year: 2024,
    title:
      "The promise and challenges of using LLMs to accelerate the screening process of systematic reviews",
    venue:
      "Proceedings of the 28th International Conference on Evaluation and Assessment in Software Engineering",
    pages: "262–271",
    doi: "10.1145/3661167.3661172",
  },
];

const PROVIDERS = ["OpenRouter", "OpenAI", "Local (OpenAI SDK)", "TypeSafe Jev"];

/** A tinted icon in a circle, leading a card's title. */
const IconAvatar: React.FC<{ children: React.ReactNode; size?: number }> = ({
  children,
  size = 40,
}) => (
  <Avatar
    sx={{
      width: size,
      height: size,
      bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
      color: "primary.main",
    }}
  >
    {children}
  </Avatar>
);

type InfoCardProps = {
  icon: React.ReactNode;
  title: string;
  /** Its place in the page's stagger of blocks rising in. */
  index: number;
  children: React.ReactNode;
};

/** A short fact about the tool, e.g. its license, with an icon and a title. */
const InfoCard: React.FC<InfoCardProps> = ({ icon, title, index, children }) => (
  <Card component="section" sx={{ borderRadius: 2, height: "100%", ...riseIn(index) }}>
    <CardContent sx={{ p: 3, "&:last-child": { pb: 3 } }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 2 }}>
        <IconAvatar>{icon}</IconAvatar>
        <Typography variant="h6" component="h2">
          {title}
        </Typography>
      </Stack>
      {children}
    </CardContent>
  </Card>
);

const PublicationItem: React.FC<{ publication: Publication }> = ({ publication }) => {
  const { authors, year, title, venue, pages, doi } = publication;
  return (
    <ListItem sx={{ px: 3, py: 2, display: "block" }}>
      <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 600, lineHeight: 1.4 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
        {authors} ({year})
      </Typography>
      <Typography variant="body2" color="textSecondary">
        <Box component="cite" sx={{ fontStyle: "italic" }}>
          {venue}
        </Box>
        {pages && `, ${pages}`}
      </Typography>
      <Link
        href={`https://doi.org/${doi}`}
        {...external}
        variant="body2"
        underline="hover"
        sx={{ mt: 1, display: "inline-flex", alignItems: "center", gap: 0.5 }}
      >
        doi.org/{doi}
        <OpenInNewIcon sx={{ fontSize: 16 }} />
      </Link>
    </ListItem>
  );
};

export const AboutPage = () => (
  <Layout title="About">
    <Stack spacing={3}>
      <Card sx={{ borderRadius: 2, overflow: "hidden", ...riseIn(0) }}>
        <Box
          sx={{
            p: { xs: 3, md: 5 },
            background: (theme) =>
              `radial-gradient(ellipse at top left, ${alpha(theme.palette.primary.main, 0.1)}, transparent 70%)`,
          }}
        >
          <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
            <IconAvatar size={56}>
              <PsychologyOutlinedIcon fontSize="large" />
            </IconAvatar>
            {/* On a phone the version wraps below the name, not below the icon. */}
            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                columnGap: 1.5,
                rowGap: 0.5,
              }}
            >
              <Typography variant="h4" component="h2" sx={{ fontWeight: 600 }}>
                AISysRev
              </Typography>
              <Chip
                size="small"
                variant="outlined"
                label={`Version ${import.meta.env.VITE_APP_VERSION ?? "dev"}`}
              />
            </Box>
          </Stack>
          <Typography variant="body1" sx={{ mt: 2, maxWidth: "70ch" }}>
            An AI research tool for systematic reviews, screening papers by title and abstract or
            full text, and GitHub repositories.
          </Typography>
          <Stack direction="row" sx={{ mt: 3, flexWrap: "wrap", gap: 1 }}>
            <Button variant="contained" startIcon={<GitHubIcon />} href={SOURCE_URL} {...external}>
              Source code
            </Button>
            <Button variant="outlined" startIcon={<ApiOutlinedIcon />} href="/docs" {...external}>
              API docs (Swagger UI)
            </Button>
            <Button
              variant="outlined"
              startIcon={<DataObjectOutlinedIcon />}
              href="/openapi.json"
              {...external}
            >
              OpenAPI spec
            </Button>
          </Stack>
        </Box>
      </Card>

      <Card component="section" sx={{ borderRadius: 2, ...riseIn(1) }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", px: 3, pt: 3, pb: 1 }}>
          <IconAvatar>
            <MenuBookOutlinedIcon />
          </IconAvatar>
          <Box>
            <Typography variant="h6" component="h2">
              Research
            </Typography>
            <Typography variant="body2" color="textSecondary">
              The tool is based on these publications.
            </Typography>
          </Box>
        </Stack>
        <List disablePadding sx={{ pb: 1 }}>
          {PUBLICATIONS.map((publication, i) => (
            <Fragment key={publication.doi}>
              {i > 0 && <Divider component="li" sx={{ mx: 3 }} />}
              <PublicationItem publication={publication} />
            </Fragment>
          ))}
        </List>
      </Card>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "repeat(3, minmax(0, 1fr))" },
          gap: 3,
        }}
      >
        <InfoCard index={2} icon={<SmartToyOutlinedIcon />} title="Supported models">
          <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1, mb: 2 }}>
            {PROVIDERS.map((provider) => (
              <Chip key={provider} label={provider} size="small" />
            ))}
          </Stack>
          <Typography variant="body2" color="textSecondary">
            Models must support structured JSON responses and the temperature, seed and top_p
            parameters. TypeSafe Jev runs through OpenRouter and returns probabilities only, without
            reasoning or a Likert scale.
          </Typography>
        </InfoCard>

        <InfoCard index={3} icon={<CodeOutlinedIcon />} title="Open source">
          <Typography variant="body2" color="textSecondary">
            Released under the MIT License. The source code is on{" "}
            <Link href={SOURCE_URL} {...external} underline="hover">
              GitHub
            </Link>
            .
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1.5 }}>
            For contributors, see the{" "}
            <Link href={ORGANISATION_URL} {...external} underline="hover">
              EvoTestOps
            </Link>{" "}
            GitHub homepage.
          </Typography>
        </InfoCard>

        <InfoCard index={4} icon={<AccountBalanceOutlinedIcon />} title="Funding">
          <Typography variant="body2" color="textSecondary">
            This research has been funded by the Strategic Research Council of the Research Council
            of Finland (Grant ID 358471).
          </Typography>
        </InfoCard>
      </Box>
    </Stack>
  </Layout>
);
