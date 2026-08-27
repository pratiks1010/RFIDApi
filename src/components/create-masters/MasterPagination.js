import React from 'react';

const MasterPagination = ({
  from = 0,
  to = 0,
  total = 0,
  page = 1,
  totalPages = 1,
  onPageChange,
}) => (
  <div className="cm-pagination">
    <p className="cm-pagination-meta">
      {total === 0 ? 'No records' : `Showing ${from}–${to} of ${total}`}
    </p>
    <div className="cm-pagination-controls">
      <button
        type="button"
        className="ui-btn ui-btn--secondary cm-page-btn"
        onClick={() => onPageChange?.(Math.max(1, page - 1))}
        disabled={page <= 1}
      >
        Prev
      </button>
      <span className="cm-page-indicator">
        {page} / {Math.max(1, totalPages)}
      </span>
      <button
        type="button"
        className="ui-btn ui-btn--secondary cm-page-btn"
        onClick={() => onPageChange?.(Math.min(totalPages, page + 1))}
        disabled={page >= totalPages}
      >
        Next
      </button>
    </div>
  </div>
);

export default MasterPagination;
