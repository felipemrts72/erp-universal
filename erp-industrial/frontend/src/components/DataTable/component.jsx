import './style.css';

export default function DataTable({
  columns,
  rows,
  emptyText = 'Sem dados para exibir.',
  onRowContextMenu,
}) {
  return (
    <div className="data-table">
      <table className="data-table__table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row, rowIndex) => (
              <tr
                key={row.id || rowIndex}
                onContextMenu={(event) => {
                  if (typeof onRowContextMenu === 'function') {
                    onRowContextMenu(event, row, rowIndex);
                  }
                }}
              >
                {columns.map((col) => (
                  <td key={col.key}>
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="data-table__empty">
                {emptyText}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
