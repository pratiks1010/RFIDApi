import React, { useMemo } from 'react';
import { FaInbox, FaSpinner } from 'react-icons/fa';
import StatusBadge from './StatusBadge';

const isBlank = (value) => value == null || value === '' || value === '—';

const toInitials = (text) => {
  const parts = String(text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return '•';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const shouldBadge = (col, value) => {
  if (col.badge) return true;
  if (['Status', 'IsRfidTagged', 'BranchType'].includes(col.key)) return true;
  const lower = String(value ?? '').trim().toLowerCase();
  return ['active', 'inactive', 'tagged', 'not tagged'].includes(lower);
};

const renderDefaultCell = (col, value) => {
  if (isBlank(value) && col.key !== 'srNo') {
    return <span className="cm-muted">—</span>;
  }
  if (shouldBadge(col, value)) {
    return <StatusBadge value={value} />;
  }
  return value;
};

const MasterResponsiveTable = ({
  columns = [],
  rows = [],
  loading = false,
  emptyMessage = 'No records found.',
  getRowId,
  getCellValue,
  renderCell,
  renderActions,
  startIndex = 0,
}) => {
  const items = useMemo(() => (
    (rows || []).map((row, idx) => {
      const id = getRowId ? getRowId(row, idx) : (row.Id ?? row.id ?? idx);
      const cells = columns.map((col) => {
        let value;
        if (col.key === 'srNo') value = startIndex + idx + 1;
        else if (getCellValue) value = getCellValue(row, col);
        else value = row[col.key];
        const content = renderCell
          ? renderCell(row, col, value)
          : renderDefaultCell(col, value);
        return { col, value, content };
      });
      const primary = cells.find((c) => c.col.primary) || cells.find((c) => c.col.key !== 'srNo');
      const sr = cells.find((c) => c.col.key === 'srNo');
      return { id, row, idx, cells, primary, sr };
    })
  ), [rows, columns, getRowId, getCellValue, renderCell, startIndex]);

  if (loading) {
    return (
      <div className="cm-state">
        <FaSpinner className="cm-spin" size={16} />
        <span>Loading records…</span>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="cm-state cm-state--empty">
        <span className="cm-state-icon"><FaInbox size={22} /></span>
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="cm-table-shell">
      <div className="cm-table-scroll">
        <table className="cm-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={col.width ? { width: col.width } : undefined}
                  className={col.primary ? 'cm-th-primary' : undefined}
                >
                  {col.label}
                </th>
              ))}
              {renderActions ? <th className="cm-th-actions">Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={String(item.id)} className="cm-table-row">
                {item.cells.map((cell) => (
                  <td
                    key={cell.col.key}
                    data-label={cell.col.label}
                    className={cell.col.primary ? 'cm-td-primary' : undefined}
                    title={typeof cell.value === 'string' ? cell.value : undefined}
                  >
                    {cell.col.primary ? (
                      <span className="cm-primary-cell">
                        <span className="cm-avatar" aria-hidden="true">{toInitials(cell.value)}</span>
                        <span className="cm-primary-text">{cell.content}</span>
                      </span>
                    ) : cell.content}
                  </td>
                ))}
                {renderActions ? (
                  <td className="cm-td-actions" data-label="Actions">
                    <div className="cm-actions">{renderActions(item.row, item.idx)}</div>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="cm-cards" role="list">
        {items.map((item) => (
          <article key={String(item.id)} className="cm-card" role="listitem">
            <header className="cm-card-head">
              <span className="cm-avatar cm-avatar--lg" aria-hidden="true">
                {toInitials(item.primary?.value)}
              </span>
              <div className="cm-card-titles">
                <div className="cm-card-title-row">
                  {item.sr ? <span className="cm-sr-chip">#{item.sr.value}</span> : null}
                  <h4 className="cm-card-title">{isBlank(item.primary?.value) ? 'Untitled' : String(item.primary.value)}</h4>
                </div>
                {item.cells
                  .filter((c) => shouldBadge(c.col, c.value) && c.col.key !== item.primary?.col.key)
                  .map((c) => (
                    <span key={c.col.key} className="cm-card-badge-row">{c.content}</span>
                  ))}
              </div>
            </header>
            <dl className="cm-card-meta">
              {item.cells
                .filter((c) => (
                  c.col.key !== 'srNo'
                  && c.col.key !== item.primary?.col.key
                  && !shouldBadge(c.col, c.value)
                ))
                .map((c) => (
                  <div key={c.col.key} className="cm-card-field">
                    <dt>{c.col.label}</dt>
                    <dd>{c.content}</dd>
                  </div>
                ))}
            </dl>
            {renderActions ? (
              <footer className="cm-card-actions">
                {renderActions(item.row, item.idx)}
              </footer>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
};

export default MasterResponsiveTable;
