import './AssetCards.css';

const formatDate = (value) => (value ? new Date(value).toLocaleString() : '—');

export default function WellCard({ well, onAddMeasurement, onAddWell, onViewHistory }) {
  return (
    <div className="asset-card">
      <header>
        <div>
          <h3>{well.name}</h3>
          <p className="asset-type">Well</p>
          {well.location && <p className="meta">Location: {well.location}</p>}
        </div>
      </header>
      <section className="latest">
        <h4>Latest measurement</h4>
        {well.latestMeasurement ? (
          <ul>
            <li>Depth to water: {Number(well.latestMeasurement.depth).toFixed(2)} m</li>
            <li>Recorded: {formatDate(well.latestMeasurement.recordedAt)}</li>
            <li>Operator: {well.latestMeasurement.operator}</li>
            {well.latestMeasurement.comment && <li>Notes: {well.latestMeasurement.comment}</li>}
          </ul>
        ) : (
          <p className="empty">No measurements yet.</p>
        )}
      </section>
      <div className="card-actions">
        <button type="button" onClick={() => onAddMeasurement(well)}>
          Add measurement
        </button>
        <button type="button" className="ghost" onClick={() => onViewHistory(well)}>
          View measurements
        </button>
        <button type="button" className="secondary" onClick={onAddWell}>
          Add well
        </button>
      </div>
    </div>
  );
}
