import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { Layout } from "../components/Layout";
import { fetchResultFromBackend } from "../services/resultService";
import { Paper as Ppr } from "../state/types";
import * as React from 'react';
import Box from '@mui/material/Box';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';

// Row component for each paper
function Row({ paper }: { paper: Ppr; }) {
	const [open, setOpen] = React.useState(false);
	return (
		<React.Fragment>
			<TableRow>
				<TableCell>
					<IconButton size="small" onClick={() => setOpen(!open)}>
						{open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
					</IconButton>
				</TableCell>
				<TableCell>{paper.title}</TableCell>
				<TableCell>
					<a
						href={paper.doi}
						target="_blank"
						rel="noopener noreferrer"
						style={{ color: "#1976d2", textDecoration: "underline" }}
					>
						{paper.doi}
					</a>
				</TableCell>
				<TableCell sx={{ fontWeight: 'bold' }}>{paper.human_result ?? "—"}</TableCell>
			</TableRow>
			<TableRow>
				<TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
					<Collapse in={open} timeout="auto" unmountOnExit>
						<Box sx={{ margin: 1 }}>
							<Typography variant="body1" fontWeight={"bold"} gutterBottom>
								Abstract
							</Typography>
							<Typography variant="body2" gutterBottom>
								{paper.abstract}
							</Typography>
						</Box>
					</Collapse>
				</TableCell>
			</TableRow>
		</React.Fragment>
	);
}

export const ResultPage = () => {
  const params = useParams<{ uuid: string }>();
  const projectUuid = params.uuid;

  const [result, setResult] = useState<Result[]>([]);

  useEffect(() => {
    const fetchData = async () => {

      const res: Result[] = await fetchResultFromBackend(projectUuid);
      setResult(res);
    };
    fetchData();
  }, [projectUuid]);

	return (
		<Layout title="Results">
			<TableContainer component={Paper}>
				<Table>
					<TableHead>
						<TableRow>
							<TableCell />
							<TableCell>
								<Typography variant="body2" fontWeight={"bold"} gutterBottom>
									Title
								</Typography>
							</TableCell>
							<TableCell>
								<Typography variant="body2" fontWeight={"bold"} gutterBottom>
									DOI
								</Typography>
							</TableCell>
							<TableCell>
								<Typography variant="body2" fontWeight={"bold"}>
									Human Result
								</Typography>
							</TableCell>
						</TableRow>
					</TableHead>
          <TableBody>
            {result.map((result) => {
              return (
                <Row key={result.title} paper={result} />
              );
            })}
          </TableBody>
				</Table>
			</TableContainer>
		</Layout>
	);
};