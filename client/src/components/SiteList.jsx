import { useEffect, useState } from 'react';
import './SiteList.css';

export default function SiteList({ sites, selectedSiteId, onSelect, onCreate, canCreate = false }) {
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState({ name: '', location: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    if (!canCreate) {
      setIsCreating(false);
      setForm({ name: '', location: '' });
      setError('');
    }
  }, [canCreate]);

  const toggleCreate = () => {
    if (!canCreate) {
      return;
    }
    setIsCreating((value) => !value);
    setForm({ name: '', location: '' });
    setError('');
  };

  const submitNewSite = async (event) => {
    event.preventDefault();
    if (!canCreate) {
      return;
    }
    if (!form.name.trim()) {
      setError('Site name is required.');
      return;
    }

    try {
      await onCreate({ name: form.name.trim(), location: form.location.trim() || undefined });
      toggleCreate();
    } catch (err) {
      setError(err.message || 'Unable to create site');
    }
  };

  return (
    <div className="site-panel">
      <div className="panel-header">
        <h2>Sites</h2>
        {canCreate && (
          <button type="button" onClick={toggleCreate} className="link-btn">
            {isCreating ? 'Cancel' : 'Add site'}
          </button>
        )}
      </div>
      {isCreating && canCreate && (
        <form className="site-form" onSubmit={submitNewSite}>
          <label>
            Name
            <input
              type="text"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="e.g. North Field"
            />
          </label>
          <label>
            Location
            <input
              type="text"
              value={form.location}
              onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))}
              placeholder="Optional"
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button type="submit">Save site</button>
        </form>
      )}
      <ul className="site-list">
        {sites.length === 0 ? (
          <li className="empty">No sites yet.</li>
        ) : (
          sites.map((site) => (
            <li key={site.id}>
              <button
                type="button"
                className={site.id === selectedSiteId ? 'active' : ''}
                onClick={() => onSelect(site.id)}
              >
                <span className="site-name">{site.name}</span>
                {site.location && <span className="site-location">{site.location}</span>}
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
