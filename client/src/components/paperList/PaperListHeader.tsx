import Box from "@mui/material/Box";
import TableSortLabel from "@mui/material/TableSortLabel";
import { SortOption } from "../../helpers/sort";
import { PAPER_LIST_COLUMNS, PAPER_LIST_GUTTER } from "./columns";

type SortColumn = {
  label: React.ReactNode;
  testId: string;
  ascending: SortOption;
  descending: SortOption;
  align: "left" | "right";
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
      label: (
        <>
          <Box component="span" sx={{ display: { xs: "none", md: "inline" } }}>
            {probabilityLabel}
          </Box>
          <Box component="span" sx={{ display: { md: "none" } }} title={probabilityLabel}>
            Incl.
          </Box>
        </>
      ),
      testId: "sort-by-inclusion-probability",
      ascending: "INCLUDE_ASC",
      descending: "INCLUDE_DESC",
      align: "right",
    },
  ];
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: PAPER_LIST_COLUMNS,
        columnGap: { xs: 1, md: 2 },
        alignItems: "center",
        px: PAPER_LIST_GUTTER,
        minHeight: 48,
        position: "sticky",
        top: 0,
        zIndex: 2,
        bgcolor: "background.paper",
        borderTop: 1,
        borderBottom: 1,
        borderColor: "divider",
      }}
    >
      {columns.map((column) => {
        const active = sortOption === column.ascending || sortOption === column.descending;
        return (
          <Box
            key={column.testId}
            sx={{
              minWidth: 0,
              display: "flex",
              justifyContent: column.align === "right" ? "flex-end" : "flex-start",
            }}
          >
            <TableSortLabel
              active={active}
              direction={sortOption === column.descending ? "desc" : "asc"}
              onClick={() =>
                onSortChange(sortOption === column.ascending ? column.descending : column.ascending)
              }
              data-testid={column.testId}
              sx={{
                typography: "subtitle2",
                color: "text.secondary",
                maxWidth: "100%",
                // Numeric columns keep the arrow before the label, so the label lines up with the values.
                flexDirection: column.align === "right" ? "row-reverse" : undefined,
                "&.Mui-active": { color: "text.primary" },
              }}
            >
              {/* Long labels, such as the job page's, wrap rather than truncate. */}
              <Box component="span" sx={{ lineHeight: 1.3, textAlign: column.align, py: 0.5 }}>
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
