type SummaryTileProps = {
  label: string;
  value: number;
  description: string;
};

export function SummaryTile({ label, value, description }: SummaryTileProps) {
  return (
    <article className="dashboard-summary-tile">
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{description}</p>
    </article>
  );
}
