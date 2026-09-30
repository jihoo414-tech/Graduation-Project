type PaginationProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav className="pagination" aria-label="분석 결과 페이지">
      <button type="button" onClick={() => onPageChange(page - 1)} disabled={page === 1}>
        이전
      </button>
      <span>{page} / {totalPages}</span>
      <button type="button" onClick={() => onPageChange(page + 1)} disabled={page === totalPages}>
        다음
      </button>
    </nav>
  );
}
