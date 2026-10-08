import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { Layout } from "../components/Layout";
import { fadeIn, riseIn } from "../components/motion";
import { fetchResultFromBackend } from "../services/resultService";
import { Result, ScreeningTarget } from "../state/types";
import * as React from "react";
import Box from "@mui/material/Box";
import Collapse from "@mui/material/Collapse";
import IconButton from "@mui/material/IconButton";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import { useTypedStoreState } from "../state/store";

function Row({
  paper,
  modelColumns,
  isGithubScreening,
}: {
  paper: Result;
  modelColumns: string[];
  isGithubScreening: boolean;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  return (
    <>
      <TableRow>
        <TableCell>
          <IconButton size="small" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell>{paper.title}</TableCell>
        <TableCell>
          {paper.doi && (
            <a
              href={
                isGithubScreening
                  ? /^https?:\/\//i.test(paper.doi)
                    ? paper.doi
                    : undefined
                  : `https://doi.org/${paper.doi}`
              }
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#1976d2", textDecoration: "underline" }}
            >
              {paper.doi}
            </a>
          )}
        </TableCell>
        <TableCell sx={{ fontWeight: "bold" }}>{paper.human_result ?? "—"}</TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={4}>
          <Collapse in={isOpen} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 1 }}>
              <Typography variant="body1" gutterBottom sx={{ fontWeight: "bold" }}>
                Model Results
              </Typography>
              {modelColumns
                .filter((c) => c !== "notes")
                .map((model) => (
                  <Typography key={model} variant="body2">
                    {model}: <b>{paper[model]}</b>
                  </Typography>
                ))}
              <Typography variant="body1" gutterBottom sx={{ fontWeight: "bold", mt: 2 }}>
                {isGithubScreening ? "README" : "Abstract"}
              </Typography>
              <Typography variant="body2" gutterBottom>
                {paper.abstract}
              </Typography>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

const SKELETON_TITLE_WIDTHS = ["78%", "62%", "86%", "70%", "55%", "74%"];

/** Stands in for the result rows while they load. */
const SkeletonRows = () => (
  <>
    {SKELETON_TITLE_WIDTHS.map((width, i) => (
      <TableRow key={i} aria-hidden>
        <TableCell>
          <Skeleton variant="circular" width={28} height={28} />
        </TableCell>
        <TableCell>
          <Skeleton width={width} />
        </TableCell>
        <TableCell>
          <Skeleton width={120} />
        </TableCell>
        <TableCell>
          <Skeleton width={64} />
        </TableCell>
      </TableRow>
    ))}
  </>
);

export const ResultPage = () => {
  const params = useParams<{ uuid: string }>();
  const { uuid } = params;
  const getProjectByUuid = useTypedStoreState((state) => state.getProjectByUuid);
  const project = getProjectByUuid(uuid);
  const screeningTarget = project?.screening_target ?? ScreeningTarget.PAPER;
  const isGithubScreening = screeningTarget === ScreeningTarget.GITHUB_REPOSITORY;
  const [result, setResult] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res: Result[] = await fetchResultFromBackend(uuid);
        setResult(res);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [uuid]);

  const fixedColumns = ["title", "abstract", "doi", "human_result"];
  const modelColumns =
    result.length > 0 ? Object.keys(result[0]).filter((key) => !fixedColumns.includes(key)) : [];

  return (
    <Layout title="Results">
      <TableContainer component={Paper} sx={riseIn(0)}>
        <Table aria-busy={loading}>
          <TableHead>
            <TableRow>
              <TableCell />
              <TableCell>{isGithubScreening ? "Repository" : "Title"}</TableCell>
              <TableCell>{isGithubScreening ? "Repository URL" : "DOI"}</TableCell>
              <TableCell>Human Result</TableCell>
            </TableRow>
          </TableHead>
          {/* Remounts when the rows arrive, so they fade in. */}
          <TableBody key={loading ? "loading" : "rows"} sx={loading ? undefined : fadeIn}>
            {loading ? (
              <SkeletonRows />
            ) : (
              result.map((paper, i) => (
                <Row
                  key={`${paper.title}_${i}`}
                  paper={paper}
                  modelColumns={modelColumns}
                  isGithubScreening={isGithubScreening}
                />
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Layout>
  );
};
