import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import { alpha, keyframes, useTheme } from "@mui/material/styles";
import { DragEvent, useRef, useState } from "react";
import type { Project } from "../../state/types/project";
import { downloadCsvTemplate, REQUIRED_CSV_COLUMNS } from "./downloads";
import { riseIn } from "../../components/motion";
import { pickSingleCsvFile } from "./pickSingleCsvFile";
import { ProjectProgress } from "./ProjectProgress";

const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
`;

/** A fanned stack of documents, the front one checked off. */
const StackIllustration: React.FC = () => {
  const { palette } = useTheme();
  const sheet = (x: number, rotate: number, fill: string) => (
    <g transform={`rotate(${rotate} ${x + 40} 110)`}>
      <rect x={x} y={20} width={80} height={100} rx={8} fill={fill} stroke={palette.divider} />
      {[40, 52, 64, 76].map((y, i) => (
        <rect
          key={y}
          x={x + 12}
          y={y}
          width={i === 0 ? 40 : 56 - i * 6}
          height={5}
          rx={2.5}
          fill={i === 0 ? alpha(palette.primary.main, 0.5) : palette.grey[300]}
        />
      ))}
    </g>
  );
  return (
    <Box
      component="svg"
      viewBox="0 0 200 140"
      aria-hidden
      sx={{
        width: 200,
        height: 140,
        animation: `${float} 4s ease-in-out infinite`,
        "@media (prefers-reduced-motion: reduce)": { animation: "none" },
      }}
    >
      {sheet(42, -12, palette.grey[100])}
      {sheet(78, 12, palette.grey[100])}
      {sheet(60, 0, palette.background.paper)}
      <circle cx={136} cy={104} r={18} fill={palette.success.main} />
      <path
        d="M127 104 l6 6 l12 -13"
        fill="none"
        stroke={palette.success.contrastText}
        strokeWidth={3.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M40 30 l3 -8 l3 8 l8 3 l-8 3 l-3 8 l-3 -8 l-8 -3 z"
        fill={alpha(palette.primary.main, 0.6)}
      />
      <circle cx={168} cy={36} r={4} fill={alpha(palette.secondary.main, 0.5)} />
    </Box>
  );
};

type ProjectWelcomeProps = {
  project: Project;
  itemNamePlural: string;
  uploading: boolean;
  onFilesSelected: (files: File[]) => void;
};

/**
 * What a project shows before it has any papers: one thing to do (upload a
 * CSV), what the file needs, and the steps that follow.
 */
export const ProjectWelcome: React.FC<ProjectWelcomeProps> = ({
  project,
  itemNamePlural,
  uploading,
  onFilesSelected,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const screeningTarget = project.screening_target;

  const selectFiles = (files: File[]) => {
    if (uploading) return;
    const csvFile = pickSingleCsvFile(files);
    if (csvFile) onFilesSelected([csvFile]);
  };

  const dragHandlers = {
    onDragOver: (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(true);
    },
    onDragLeave: (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
    },
    onDrop: (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      selectFiles(Array.from(e.dataTransfer.files));
    },
  };

  return (
    <Card
      data-testid="project-welcome"
      sx={{ borderRadius: 3, overflow: "hidden", ...riseIn(0) }}
    >
      <Box
        sx={{
          px: { xs: 3, md: 6 },
          pt: { xs: 4, md: 6 },
          pb: 4,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          background: (theme) =>
            `radial-gradient(ellipse at top, ${alpha(theme.palette.primary.main, 0.1)}, transparent 70%)`,
        }}
      >
        <Box sx={riseIn(1)}>
          <StackIllustration />
        </Box>
        <Typography variant="h4" component="h2" sx={{ fontWeight: 600, mt: 2, ...riseIn(2) }}>
          Let's add your {itemNamePlural}
        </Typography>
        <Typography
          variant="body1"
          color="textSecondary"
          sx={{ mt: 1, maxWidth: 520, ...riseIn(3) }}
        >
          Upload a CSV of the {itemNamePlural} you want to screen. Each one is checked against the
          criteria you set for this project.
        </Typography>

        <Box
          role="button"
          tabIndex={0}
          aria-label={`Upload a CSV of ${itemNamePlural}`}
          aria-busy={uploading}
          data-testid="csv-file-drop-area"
          onClick={() => !uploading && fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (!uploading && (e.key === "Enter" || e.key === " ")) {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          {...dragHandlers}
          sx={{
            mt: 4,
            width: "100%",
            maxWidth: 560,
            py: 5,
            px: 3,
            borderRadius: 3,
            border: 2,
            borderStyle: "dashed",
            borderColor: isDragging ? "primary.main" : "divider",
            bgcolor: (theme) =>
              isDragging ? alpha(theme.palette.primary.main, 0.06) : theme.palette.background.paper,
            transform: isDragging ? "scale(1.02)" : "none",
            transition: "all 200ms ease",
            cursor: uploading ? "progress" : "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 1.5,
            outline: "none",
            "&:hover, &:focus-visible": {
              borderColor: "primary.main",
            },
            ...riseIn(4),
          }}
        >
          {uploading ? (
            <>
              <CircularProgress size={48} />
              <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                Uploading {itemNamePlural}…
              </Typography>
            </>
          ) : (
            <>
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  color: "primary.main",
                  bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                }}
              >
                <CloudUploadOutlinedIcon sx={{ fontSize: 32 }} />
              </Box>
              {/* Phones can't drag files, so they only get the button. */}
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 500, display: { xs: "none", sm: "block" } }}
              >
                {isDragging ? "Drop it here" : "Drag your CSV file here"}
              </Typography>
              <Typography
                variant="body2"
                color="textSecondary"
                sx={{ display: { xs: "none", sm: "block" } }}
              >
                or
              </Typography>
              <Button variant="contained" size="large" tabIndex={-1}>
                Choose file
              </Button>
            </>
          )}
          <input
            type="file"
            data-testid="csv-file-input"
            accept=".csv"
            ref={fileInputRef}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              if (e.target.files) selectFiles(Array.from(e.target.files));
              e.target.value = "";
            }}
            hidden
          />
        </Box>

        <Box
          sx={{
            mt: 3,
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "center",
            gap: 1,
            ...riseIn(5),
          }}
        >
          <Typography variant="body2" color="textSecondary">
            Columns needed:
          </Typography>
          {REQUIRED_CSV_COLUMNS[screeningTarget].map((column) => (
            <Chip
              key={column}
              label={column}
              size="small"
              sx={{ fontFamily: "monospace", bgcolor: "action.hover" }}
            />
          ))}
          <Button
            size="small"
            startIcon={<DownloadOutlinedIcon />}
            onClick={() => downloadCsvTemplate(screeningTarget)}
            data-testid="download-csv-template"
          >
            Download template
          </Button>
        </Box>
      </Box>

      <ProjectProgress
        project={project}
        itemNamePlural={itemNamePlural}
        activeStep={1}
        sx={{ borderTop: 1, borderColor: "divider", ...riseIn(6) }}
      />
    </Card>
  );
};

