import React from 'react';

export function SkeletonRows({ cols = 5, rows = 5 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rIdx) => (
        <tr key={rIdx} className="skeleton-row">
          {Array.from({ length: cols }).map((_, cIdx) => (
            <td key={cIdx}>
              <div className="skeleton-box" style={{ width: cIdx === 0 ? '60%' : cIdx === 1 ? '80%' : '70%' }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function EmptyState({ icon = '📋', title = 'No records found', message, action }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <h3 className="empty-state-title">{title}</h3>
      {message && <p className="empty-state-message">{message}</p>}
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  );
}
