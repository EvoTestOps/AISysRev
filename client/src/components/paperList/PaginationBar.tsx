import ReactPaginateModule from "react-paginate";
import { Card } from "../Card";

// react-paginate is CJS-only with an __esModule default; Vite 8 interop returns module.exports for it
const ReactPaginate =
  (ReactPaginateModule as unknown as { default?: typeof ReactPaginateModule }).default ??
  ReactPaginateModule;

type PaginationBarProps = {
  /** 1-based. */
  currentPage: number;
  pageCount: number;
  onPageChange: (page: number) => void;
};

/** Page links for a paginated list; hidden when everything fits on one page. */
export const PaginationBar: React.FC<PaginationBarProps> = ({
  currentPage,
  pageCount,
  onPageChange,
}) => {
  if (pageCount <= 1) {
    return null;
  }
  return (
    <Card
      className="flex shadow-lg bg-slate-800 justify-center mt-12 sticky bottom-6"
      data-testid="pagination-card"
    >
      <ReactPaginate
        data-testid="pagination-card-child-react-paginate"
        onPageChange={(item) => onPageChange(item.selected + 1)}
        breakLabel="..."
        nextLabel=">"
        previousLabel="<"
        pageRangeDisplayed={5}
        pageCount={pageCount}
        renderOnZeroPageCount={null}
        containerClassName="flex items-center gap-2 items-center content-center justify-center select-none"
        pageClassName="text-white flex items-center justify-center rounded-full w-10 h-10 border border-white hover:bg-slate-600 hover:cursor-pointer"
        pageLinkClassName="flex items-center justify-center w-full h-full"
        activeClassName="bg-slate-600 hover:cursor-normal"
        previousClassName="flex items-center justify-center rounded-full w-10 h-10 border border-white text-white hover:bg-slate-600 hover:cursor-pointer"
        previousLinkClassName="flex items-center justify-center w-full h-full"
        nextClassName="flex items-center justify-center rounded-full w-10 h-10 border border-white text-white hover:bg-slate-600 hover:cursor-pointer"
        nextLinkClassName="flex items-center justify-center w-full h-full"
        breakClassName="flex items-center justify-center w-10 h-10 text-white hover:cursor-pointer"
        breakLinkClassName="flex items-center justify-center w-full h-full"
        forcePage={currentPage - 1}
      />
    </Card>
  );
};
