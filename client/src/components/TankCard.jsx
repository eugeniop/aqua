import { useState } from 'react';
import './AssetCards.css';

const defaultTimestamp = () => new Date().toISOString().slice(0, 16);

const formatDate = (value) => (value ? new Date(value).toLocaleString() : '—');

export default function TankCard({ tank, operator, onRecord }) {
  const [form, setForm] = useState({
    level: '',
    comment: '',
    recordedAt: defaultTimestamp()
  });
  const [message, setMessage] = useState(null);

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!form.level) {
      setMessage({ type: 'error', text: 'Level is required.' });
      return;
    }

    try {
      await onRecord(tank.id, {
        level: Number(form.level),
        comment: form.comment.trim() || undefined,
        recordedAt: form.recordedAt ? new Date(form.recordedAt).toISOString() : undefined,
        operator
      });
      setMessage({ type: 'success', text: 'Reading saved.' });
      setForm({ level: '', comment: '', recordedAt: defaultTimestamp() });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Unable to save reading.' });
    }
  };

  return (
    <div className="asset-card">
      <header>
        <div>
          <h3>{tank.name}</h3>
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
      <form onSubmit={submit} className="entry-form">
        <h4>Log level</h4>
        <label>
          Level (L)
          <input type="number" min="0" step="1" value={form.level} onChange={handleChange('level')} />
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
          <textarea
            rows="2"
            value={form.comment}
            onChange={handleChange('comment')}
            placeholder="Optional notes"
          />
        </label>
        {message && <p className={`status ${message.type}`}>{message.text}</p>}
        <button type="submit">Save reading</button>
      </form>
    </div>
  );
}
