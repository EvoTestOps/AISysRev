import Box from "@mui/material/Box";
import TableSortLabel from "@mui/material/TableSortLabel";
import { SortOption } from "../../helpers/sort";
import { PAPER_LIST_COLUMNS } from "./columns";

type SortColumn = {
  label: string;
  testId: string;
  ascending: SortOption;
  descending: SortOption;
  align: "left" | "center";
};

type PaperListHeaderProps = {
  sortOption: SortOption;
  onSortChange: (option: SortOption) => void;
  probabilityLabel?: string;
};

/** The sticky, sortable header of a list of papers (ID, Name, probability). */
export const PaperListHeader: React.FC<PaperListHeaderProps> = ({
  sortOption,
  onSortChange,
  probabilityLabel = "Probability of inclusion",
}) => {
  const columns: SortColumn[] = [
    {
      label: "ID",
      testId: "sort-by-id",
      ascending: "ID_ASC",
      descending: "ID_DESC",
      align: "left",
    },
    {
      label: "Name",
      testId: "sort-by-name",
      ascending: "NAME_ASC",
      descending: "NAME_DESC",
      align: "left",
    },
    {
      label: probabilityLabel,
      testId: "sort-by-inclusion-probability",
      ascending: "INCLUDE_ASC",
      descending: "INCLUDE_DESC",
      align: "center",
    },
  ];
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: PAPER_LIST_COLUMNS,
        alignItems: "center",
        px: 2,
        minHeight: 56,
        borderRadius: 2,
        bgcolor: "#1e293b",
        color: "common.white",
        position: "sticky",
        top: 8,
        zIndex: 2,
      }}
    >
      {columns.map((column) => {
        const active = sortOption === column.ascending || sortOption === column.descending;
        return (
          <Box key={column.testId} sx={{ minWidth: 0, textAlign: column.align }}>
            <TableSortLabel
              active={active}
              direction={sortOption === column.descending ? "desc" : "asc"}
              onClick={() =>
                onSortChange(sortOption === column.ascending ? column.descending : column.ascending)
              }
              data-testid={column.testId}
              sx={{
                fontWeight: 700,
                color: "inherit",
                maxWidth: "100%",
                "&:hover, &:focus, &.Mui-active": { color: "inherit" },
                "& .MuiTableSortLabel-icon": { color: "inherit !important" },
              }}
            >
              <Box
                component="span"
                sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
              >
                {column.label}
              </Box>
            </TableSortLabel>
          </Box>
        );
      })}
      <Box />
    </Box>
  );
};
