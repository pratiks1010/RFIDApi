import React from 'react';

const BranchAccessPanel = ({
  branchMode,
  onModeChange,
  branches,
  selectedBranchIds,
  onToggleBranch,
  title = 'Branch access',
}) => (
  <div className="rfid-branch-section">
    <div className="rfid-section-header">
      <div>
        <h3 className="rfid-section-title">{title}</h3>
        <p className="rfid-section-desc">Limit which store branches this employee can view and operate on.</p>
      </div>
    </div>
    <div className="rfid-segmented">
      <button
        type="button"
        className={`rfid-segment${branchMode === 'all' ? ' active' : ''}`}
        onClick={() => onModeChange('all')}
      >
        All branches
      </button>
      <button
        type="button"
        className={`rfid-segment${branchMode === 'selected' ? ' active' : ''}`}
        onClick={() => onModeChange('selected')}
      >
        Selected only
      </button>
    </div>
    {branchMode === 'all' ? (
      <div className="rfid-branch-all-note">
        Full access to every branch linked to your account.
      </div>
    ) : (
      <div className="rfid-table-wrap rfid-branch-table">
        <table className="rfid-table">
          <thead>
            <tr>
              <th style={{ width: 48 }} aria-label="Select" />
              <th>Branch</th>
              <th>Code</th>
            </tr>
          </thead>
          <tbody>
            {branches.map((b) => {
              const id = b.Id ?? b.id ?? b.BranchId ?? b.branchId;
              const name = b.BranchName ?? b.branchName ?? b.Name ?? '—';
              const code = b.BranchCode ?? b.branchCode ?? b.Code ?? '—';
              const checked = selectedBranchIds.includes(Number(id));
              return (
                <tr
                  key={id}
                  className={`rfid-branch-row${checked ? ' selected' : ''}`}
                  onClick={() => onToggleBranch(id)}
                >
                  <td onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggleBranch(id)}
                    />
                  </td>
                  <td>{name}</td>
                  <td><span className="rfid-code">{code}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {branches.length === 0 && (
          <p className="rfid-empty rfid-empty-sm">No branches loaded for client.</p>
        )}
      </div>
    )}
  </div>
);

export default BranchAccessPanel;
