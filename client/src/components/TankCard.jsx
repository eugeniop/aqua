import './AssetCards.css';

const formatDate = (value) => (value ? new Date(value).toLocaleString() : '—');

export default function TankCard({ tank, onAddReading, onAddTank, onViewHistory }) {
  return (
    <div className="asset-card">
      <header>
        <div>
          <h3>{tank.name}</h3>
          <p className="asset-type">Tank</p>
          <p className="meta">Capacity: {tank.capacity?.toLocaleString()} L</p>
          {tank.location && <p className="meta">Location: {tank.location}</p>}
        </div>
      </header>
      <section className="latest">
        <h4>Latest reading</h4>
        {tank.latestReading ? (
          <ul>
            <li>Level: {tank.latestReading.level} L</li>
            <li>Recorded: {formatDate(tank.latestReading.recordedAt)}</li>
            <li>Operator: {tank.latestReading.operator}</li>
            {tank.latestReading.comment && <li>Notes: {tank.latestReading.comment}</li>}
          </ul>
        ) : (
          <p className="empty">No readings yet.</p>
        )}
      </section>
      <div className="card-actions">
        <button type="button" onClick={() => onAddReading(tank)}>
          Add reading
        </button>
        <button type="button" className="ghost" onClick={() => onViewHistory(tank)}>
          View readings
        </button>
        <button type="button" className="secondary" onClick={onAddTank}>
          Add tank
        </button>
      </div>
    </div>
  );
}
