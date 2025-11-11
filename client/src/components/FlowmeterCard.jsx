import { useState } from 'react';
import './AssetCards.css';

const defaultTimestamp = () => new Date().toISOString().slice(0, 16);
const formatDate = (value) => (value ? new Date(value).toLocaleString() : '—');

export default function FlowmeterCard({ flowmeter, operator, onRecord }) {
  const [form, setForm] = useState({
    instantaneousFlow: '',
    totalizedVolume: '',
    comment: '',
    recordedAt: defaultTimestamp()
  });
  const [message, setMessage] = useState(null);

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!form.instantaneousFlow || !form.totalizedVolume) {
      setMessage({ type: 'error', text: 'Both flow values are required.' });
      return;
    }

    try {
      await onRecord(flowmeter.id, {
        instantaneousFlow: Number(form.instantaneousFlow),
        totalizedVolume: Number(form.totalizedVolume),
        comment: form.comment.trim() || undefined,
        recordedAt: form.recordedAt ? new Date(form.recordedAt).toISOString() : undefined,
        operator
      });
      setMessage({ type: 'success', text: 'Reading saved.' });
      setForm({ instantaneousFlow: '', totalizedVolume: '', comment: '', recordedAt: defaultTimestamp() });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Unable to save reading.' });
    }
  };

  return (
    <div className="asset-card">
      <header>
        <div>
          <h3>{flowmeter.name}</h3>
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
      <form onSubmit={submit} className="entry-form">
        <h4>Log flow</h4>
        <label>
          Instantaneous flow (L/min)
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.instantaneousFlow}
            onChange={handleChange('instantaneousFlow')}
          />
        </label>
        <label>
          Totalized volume (L)
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.totalizedVolume}
            onChange={handleChange('totalizedVolume')}
          />
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
        <button type="submit">Save reading</button>
      </form>
    </div>
  );
}
