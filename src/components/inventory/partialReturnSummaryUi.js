import React from 'react';

const formatSummaryWeight = (value) => {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n.toFixed(3) : '0.000';
};

const formatSummaryPieces = (value) => {
  const n = parseFloat(value);
  if (!Number.isFinite(n)) return '0';
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
};

const PartialReturnSummaryRow = ({ label, data, rowStyle }) => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: 'minmax(120px, 1.4fr) repeat(4, minmax(72px, 1fr))',
      gap: '8px 12px',
      alignItems: 'center',
      padding: '10px 12px',
      borderRadius: 10,
      ...rowStyle,
    }}
  >
    <div style={{ fontSize: 12, fontWeight: 800, color: '#334155', lineHeight: 1.3 }}>{label}</div>
    <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
      {data?.items ?? 0} Item{(data?.items ?? 0) === 1 ? '' : 's'}
    </div>
    <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
      {formatSummaryPieces(data?.pieces)} Pcs
    </div>
    <div style={{ fontSize: 13, fontWeight: 700, color: '#15803d', fontVariantNumeric: 'tabular-nums' }}>
      {formatSummaryWeight(data?.gross)}
    </div>
    <div style={{ fontSize: 13, fontWeight: 700, color: '#dc2626', fontVariantNumeric: 'tabular-nums' }}>
      {formatSummaryWeight(data?.net)}
    </div>
  </div>
);

export const PartialReturnApiItemsTable = ({ items, title, maxHeight = 220, emptyText }) => {
  if (!Array.isArray(items) || !items.length) {
    if (!emptyText) return null;
    return (
      <div style={{ marginTop: 10 }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 800,
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: 6,
          }}
        >
          {title}
        </div>
        <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>{emptyText}</p>
      </div>
    );
  }
  return (
    <div style={{ marginTop: 10 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          marginBottom: 6,
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 800,
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          {title}
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8' }}>{items.length} item(s)</span>
      </div>
      <div
        style={{
          overflow: 'auto',
          maxHeight,
          borderRadius: 8,
          border: '1px solid #e2e8f0',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, minWidth: 480 }}>
          <thead>
            <tr style={{ background: '#f8fafc', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1 }}>
              {['Item', 'Design', 'RFID', 'Pcs', 'Gross', 'Net'].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: '6px 8px',
                    fontWeight: 800,
                    color: '#64748b',
                    borderBottom: '1px solid #e2e8f0',
                    whiteSpace: 'nowrap',
                    background: '#f8fafc',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.lotItemId ?? `${item.itemCode}-${idx}`}>
                <td style={{ padding: '6px 8px', fontWeight: 800, color: '#0f4c81' }}>{item.itemCode}</td>
                <td style={{ padding: '6px 8px', color: '#475569' }}>{item.designName}</td>
                <td style={{ padding: '6px 8px', color: '#475569', fontVariantNumeric: 'tabular-nums' }}>
                  {item.rfidCode}
                </td>
                <td style={{ padding: '6px 8px', fontVariantNumeric: 'tabular-nums' }}>{item.pcs}</td>
                <td style={{ padding: '6px 8px', color: '#15803d', fontVariantNumeric: 'tabular-nums' }}>
                  {item.grossWt}
                </td>
                <td style={{ padding: '6px 8px', color: '#dc2626', fontVariantNumeric: 'tabular-nums' }}>
                  {item.netWt}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const PartialReturnSummaryPanel = ({
  summary,
  loading = false,
  error = '',
  showRemaining = true,
  remainingLabel = 'Remaining out',
  compact = false,
  hideSummaryTable = false,
  hideReturningItemsTable = false,
  hideSummaryMessage = false,
  returningTableMaxHeight = 220,
  remainingTableMaxHeight = 180,
}) => {
  if (loading) {
    return (
      <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#64748b' }}>
        Loading return summary…
      </p>
    );
  }
  if (error) {
    return (
      <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#b45309' }}>{error}</p>
    );
  }
  if (!summary) return null;

  const isFullReturn = showRemaining && (summary.remainingOut?.items ?? 0) === 0;
  const returningCount = summary.returning?.items ?? summary.returningItems?.length ?? 0;
  const remainingCount = summary.remainingOut?.items ?? summary.remainingOutItems?.length ?? 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 8 : 10 }}>
      {!hideSummaryMessage && summary.summaryMessage ? (
        <p
          style={{
            margin: 0,
            fontSize: 12,
            fontWeight: 600,
            color: '#475569',
            lineHeight: 1.5,
            wordBreak: 'break-word',
          }}
        >
          {summary.summaryMessage}
        </p>
      ) : null}
      {hideSummaryTable ? (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px 14px',
            alignItems: 'center',
            padding: '8px 10px',
            borderRadius: 8,
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            fontSize: 12,
            fontWeight: 700,
            color: '#334155',
          }}
        >
          <span>
            Returning{' '}
            <strong style={{ color: '#047857' }}>{returningCount}</strong>
          </span>
          {showRemaining && !isFullReturn ? (
            <>
              <span style={{ color: '#cbd5e1' }}>·</span>
              <span>
                {remainingLabel}{' '}
                <strong style={{ color: '#b45309' }}>{remainingCount}</strong>
              </span>
            </>
          ) : null}
          {summary.returning ? (
            <>
              <span style={{ color: '#cbd5e1' }}>·</span>
              <span style={{ fontVariantNumeric: 'tabular-nums', color: '#64748b', fontWeight: 600 }}>
                Gr {formatSummaryWeight(summary.returning.gross)} · Net{' '}
                {formatSummaryWeight(summary.returning.net)}
              </span>
            </>
          ) : null}
        </div>
      ) : (
        <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid #e2e8f0' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(120px, 1.4fr) repeat(4, minmax(72px, 1fr))',
              gap: '8px 12px',
              alignItems: 'center',
              padding: '8px 12px',
              borderBottom: '1px solid #eef2f7',
              background: '#f8fafc',
              minWidth: 520,
            }}
          >
            <div />
            <div style={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Items</div>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Pcs</div>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Gross</div>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Net</div>
          </div>
          <div style={{ minWidth: 520 }}>
            <PartialReturnSummaryRow
              label="Lot total summary"
              data={summary.lotOutTotal}
              rowStyle={{ background: '#fafcff', borderBottom: '1px solid #eef2f7' }}
            />
            <PartialReturnSummaryRow
              label="Returning"
              data={summary.returning}
              rowStyle={{ background: '#f0fdf4', borderBottom: '1px solid #eef2f7' }}
            />
            {showRemaining && !isFullReturn ? (
              <PartialReturnSummaryRow
                label={remainingLabel}
                data={summary.remainingOut}
                rowStyle={{ background: '#fffbeb' }}
              />
            ) : null}
          </div>
        </div>
      )}
      {!hideReturningItemsTable ? (
        <PartialReturnApiItemsTable
          items={summary.returningItems}
          title="Returning items"
          maxHeight={returningTableMaxHeight}
        />
      ) : null}
      {showRemaining && !isFullReturn ? (
        <PartialReturnApiItemsTable
          items={summary.remainingOutItems}
          title={remainingLabel}
          maxHeight={remainingTableMaxHeight}
          emptyText="No items remain out after this return."
        />
      ) : null}
    </div>
  );
};
