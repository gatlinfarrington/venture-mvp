/** Mid-backfill sidebar crop for How it works step 02 (in-house illustration). */
export function BackfillFrame() {
  const rows = [
    { id: "LS-3102", product: "Demo SaaS · Pro", amount: "$29.00" },
    { id: "LS-3101", product: "Demo SaaS · Team", amount: "$19.00" },
    { id: "LS-3100", product: "Template Kit", amount: "$9.00" },
    { id: "LS-3099", product: "Example Course", amount: "$49.00" },
  ];

  return (
    <div className="backfill-frame" aria-hidden="true">
      <div className="backfill-head">
        <p className="backfill-title mono">Backfilling Lemon Squeezy</p>
        <p className="backfill-meta muted">
          2,431 of 3,120 orders · Apr 2023 to today
        </p>
        <div className="backfill-bar" role="presentation">
          <i style={{ width: "78%" }} />
        </div>
      </div>
      <ul className="backfill-rows">
        {rows.map((row) => (
          <li key={row.id}>
            <span className="mono">{row.id}</span>
            <span>{row.product}</span>
            <span className="mono n">{row.amount}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
