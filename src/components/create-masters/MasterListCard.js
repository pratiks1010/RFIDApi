import React from 'react';
import { FaSearch } from 'react-icons/fa';
import MasterResponsiveTable from './MasterResponsiveTable';
import MasterPagination from './MasterPagination';

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

const MasterListCard = ({
  title,
  accent = '#0d9488',
  className = '',
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search…',
  searchAriaLabel,
  total = 0,
  pageSize = 10,
  onPageSizeChange,
  page = 1,
  totalPages = 1,
  onPageChange,
  columns,
  rows,
  loading,
  emptyMessage,
  getRowId,
  getCellValue,
  renderCell,
  renderActions,
  startIndex = 0,
}) => {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <section
      className={`cm-list-card create-masters-list-card ${className}`.trim()}
      style={{ ['--cm-accent']: accent }}
    >
      <div className="cm-list-head">
        <div className="cm-list-title-row">
          <h3 className="cm-list-title">{title}</h3>
          <span className="cm-count-chip">
            {total} {total === 1 ? 'record' : 'records'}
          </span>
        </div>
        <div className="cm-list-toolbar">
          <label className="cm-search">
            <FaSearch className="cm-search-icon" size={12} aria-hidden="true" />
            <input
              type="search"
              value={searchValue}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchAriaLabel || searchPlaceholder}
            />
          </label>
          <label className="cm-pagesize">
            <span>Rows</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
              aria-label="Rows per page"
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="cm-list-body">
        <MasterResponsiveTable
          columns={columns}
          rows={rows}
          loading={loading}
          emptyMessage={emptyMessage}
          getRowId={getRowId}
          getCellValue={getCellValue}
          renderCell={renderCell}
          renderActions={renderActions}
          startIndex={startIndex}
        />
      </div>

      <MasterPagination
        from={from}
        to={to}
        total={total}
        page={page}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
    </section>
  );
};

export default MasterListCard;
