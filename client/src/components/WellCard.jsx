import { useState } from 'react';
import './AssetCards.css';

const defaultTimestamp = () => new Date().toISOString().slice(0, 16);
const formatDate = (value) => (value ? new Date(value).toLocaleString() : '—');

export default function WellCard({ well, operator, onRecord }) {
  const [form, setForm] = useState({ depth: '', comment: '', recordedAt: defaultTimestamp() });
  const [message, setMessage] = useState(null);

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!form.depth) {
      setMessage({ type: 'error', text: 'Depth is required.' });
      return;
    }

    try {
      await onRecord(well.id, {
        depth: Number(form.depth),
        comment: form.comment.trim() || undefined,
        recordedAt: form.recordedAt ? new Date(form.recordedAt).toISOString() : undefined,
        operator
      });
      setMessage({ type: 'success', text: 'Measurement saved.' });
      setForm({ depth: '', comment: '', recordedAt: defaultTimestamp() });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Unable to save measurement.' });
    }
  };

  return (
    <div className="asset-card">
      <header>
        <div>
          <h3>{well.name}</h3>
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
      <form onSubmit={submit} className="entry-form">
        <h4>Log depth to water</h4>
        <label>
          Depth (m)
          <input type="number" min="0" step="0.01" value={form.depth} onChange={handleChange('depth')} />
        </label>
        <label>
          Date &amp; time
          <input
            type="datetime-local"
            value={form.recordedAt}
            onChange={handleChange('recordedAt')}
          />
        </label>
        <label>
          Comment
          <textarea rows="2" value={form.comment} onChange={handleChange('comment')} placeholder="Optional notes" />
        </label>
        {message && <p className={`status ${message.type}`}>{message.text}</p>}
        <button type="submit">Save measurement</button>
      </form>
    </div>
  );
}
