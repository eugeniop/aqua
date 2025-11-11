import { useEffect, useState } from 'react';
import TankCard from './TankCard.jsx';
import FlowmeterCard from './FlowmeterCard.jsx';
import WellCard from './WellCard.jsx';
import './SiteDetail.css';

export default function SiteDetail({
  site,
  operator,
  onAddWell,
  onAddTank,
  onAddFlowmeter,
  onRecordTank,
  onRecordFlowmeter,
  onRecordWell
}) {
  const [wellForm, setWellForm] = useState({ name: '', location: '' });
  const [tankForm, setTankForm] = useState({ name: '', capacity: '' });
  const [flowmeterForm, setFlowmeterForm] = useState({ name: '', location: '' });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setWellForm({ name: '', location: '' });
    setTankForm({ name: '', capacity: '' });
    setFlowmeterForm({ name: '', location: '' });
    setErrors({});
  }, [site?.id]);

  if (!site) {
    return (
      <div className="site-detail empty-state">
        <h2>Select a site</h2>
        <p>Choose a site from the list to begin capturing data.</p>
      </div>
    );
  }

  const submit = async (type, payload) => {
    try {
      if (type === 'well') {
        await onAddWell(site.id, payload);
        setWellForm({ name: '', location: '' });
      } else if (type === 'tank') {
        await onAddTank(site.id, payload);
        setTankForm({ name: '', capacity: '' });
      } else if (type === 'flowmeter') {
        await onAddFlowmeter(site.id, payload);
        setFlowmeterForm({ name: '', location: '' });
      }
      setErrors((prev) => ({ ...prev, [type]: '' }));
    } catch (error) {
      setErrors((prev) => ({ ...prev, [type]: error.message || 'Unable to save.' }));
    }
  };

  const handleSubmit = (event, type) => {
    event.preventDefault();
    if (type === 'well') {
      if (!wellForm.name.trim()) {
        setErrors((prev) => ({ ...prev, well: 'Well name is required.' }));
        return;
      }
      submit('well', { name: wellForm.name.trim(), location: wellForm.location.trim() || undefined });
    }
    if (type === 'tank') {
      if (!tankForm.name.trim() || !tankForm.capacity) {
        setErrors((prev) => ({ ...prev, tank: 'Name and capacity are required.' }));
        return;
      }
      submit('tank', {
        name: tankForm.name.trim(),
        capacity: Number(tankForm.capacity)
      });
    }
    if (type === 'flowmeter') {
      if (!flowmeterForm.name.trim()) {
        setErrors((prev) => ({ ...prev, flowmeter: 'Flowmeter name is required.' }));
        return;
      }
      submit('flowmeter', {
        name: flowmeterForm.name.trim(),
        location: flowmeterForm.location.trim() || undefined
      });
    }
  };

  return (
    <div className="site-detail">
      <header className="site-header">
        <div>
          <h1>{site.name}</h1>
          {site.location && <p className="meta">{site.location}</p>}
        </div>
        <div className="operator-chip">
          Logged in as <strong>{operator}</strong>
        </div>
      </header>

      <section className="asset-section">
        <h2>Wells</h2>
        <form className="inline-form" onSubmit={(event) => handleSubmit(event, 'well')}>
          <input
            type="text"
            placeholder="Well name"
            value={wellForm.name}
            onChange={(event) => setWellForm((prev) => ({ ...prev, name: event.target.value }))}
          />
          <input
            type="text"
            placeholder="Location (optional)"
            value={wellForm.location}
            onChange={(event) => setWellForm((prev) => ({ ...prev, location: event.target.value }))}
          />
          <button type="submit">Add well</button>
        </form>
        {errors.well && <p className="error">{errors.well}</p>}
        <div className="asset-grid">
          {site.wells.length === 0 ? (
            <p className="empty">No wells yet.</p>
          ) : (
            site.wells.map((well) => (
              <WellCard key={well.id} well={well} operator={operator} onRecord={onRecordWell} />
            ))
          )}
        </div>
      </section>

      <section className="asset-section">
        <h2>Tanks</h2>
        <form className="inline-form" onSubmit={(event) => handleSubmit(event, 'tank')}>
          <input
            type="text"
            placeholder="Tank name"
            value={tankForm.name}
            onChange={(event) => setTankForm((prev) => ({ ...prev, name: event.target.value }))}
          />
          <input
            type="number"
            min="0"
            step="1"
            placeholder="Capacity (L)"
            value={tankForm.capacity}
            onChange={(event) => setTankForm((prev) => ({ ...prev, capacity: event.target.value }))}
          />
          <button type="submit">Add tank</button>
        </form>
        {errors.tank && <p className="error">{errors.tank}</p>}
        <div className="asset-grid">
          {site.tanks.length === 0 ? (
            <p className="empty">No tanks yet.</p>
          ) : (
            site.tanks.map((tank) => (
              <TankCard key={tank.id} tank={tank} operator={operator} onRecord={onRecordTank} />
            ))
          )}
        </div>
      </section>

      <section className="asset-section">
        <h2>Flowmeters</h2>
        <form className="inline-form" onSubmit={(event) => handleSubmit(event, 'flowmeter')}>
          <input
            type="text"
            placeholder="Flowmeter name"
            value={flowmeterForm.name}
            onChange={(event) =>
              setFlowmeterForm((prev) => ({ ...prev, name: event.target.value }))
            }
          />
          <input
            type="text"
            placeholder="Location (optional)"
            value={flowmeterForm.location}
            onChange={(event) =>
              setFlowmeterForm((prev) => ({ ...prev, location: event.target.value }))
            }
          />
          <button type="submit">Add flowmeter</button>
        </form>
        {errors.flowmeter && <p className="error">{errors.flowmeter}</p>}
        <div className="asset-grid">
          {site.flowmeters.length === 0 ? (
            <p className="empty">No flowmeters yet.</p>
          ) : (
            site.flowmeters.map((flowmeter) => (
              <FlowmeterCard
                key={flowmeter.id}
                flowmeter={flowmeter}
                operator={operator}
                onRecord={onRecordFlowmeter}
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
}
