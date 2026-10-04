export const ITEMS_PER_PAGE = 25;

/**
 * The items on a 1-based page of `items`. A page past the end shows the last
 * page, e.g. after a filter shrinks the list.
 */
export const paginate = <T>(items: T[], currentPage: number, perPage = ITEMS_PER_PAGE) => {
  const pageCount = Math.ceil(items.length / perPage);
  const page = Math.min(Math.max(currentPage, 1), Math.max(pageCount, 1));
  const offset = (page - 1) * perPage;
  return { pageItems: items.slice(offset, offset + perPage), pageCount, page };
};
