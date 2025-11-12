import './AssetCards.css';

const formatDate = (value) => (value ? new Date(value).toLocaleString() : '—');

export default function FlowmeterCard({ flowmeter, onViewHistory }) {
  return (
    <div className="asset-card">
      <header>
        <div>
          <h3>{flowmeter.name}</h3>
          <p className="asset-type">Flowmeter</p>
          {flowmeter.location && <p className="meta">Location: {flowmeter.location}</p>}
        </div>
      </header>
      <section className="latest">
        <h4>Latest reading</h4>
        {flowmeter.latestReading ? (
          <ul>
            <li>Instantaneous: {flowmeter.latestReading.instantaneousFlow} L/min</li>
            <li>Totalized volume: {flowmeter.latestReading.totalizedVolume} L</li>
            <li>Recorded: {formatDate(flowmeter.latestReading.recordedAt)}</li>
            <li>Operator: {flowmeter.latestReading.operator}</li>
            {flowmeter.latestReading.comment && <li>Notes: {flowmeter.latestReading.comment}</li>}
          </ul>
        ) : (
          <p className="empty">No readings yet.</p>
        )}
      </section>
      <div className="card-actions">
        <button type="button" className="ghost" onClick={() => onViewHistory(flowmeter)}>
          View readings
        </button>
      </div>
    </div>
  );
}
