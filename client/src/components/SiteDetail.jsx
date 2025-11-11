import { useEffect, useMemo, useState } from 'react';
import TankCard from './TankCard.jsx';
import FlowmeterCard from './FlowmeterCard.jsx';
import WellCard from './WellCard.jsx';
import Modal from './Modal.jsx';
import './SiteDetail.css';

const defaultTimestamp = () => new Date().toISOString().slice(0, 16);

const typeLabels = {
  well: 'Well',
  tank: 'Tank',
  flowmeter: 'Flowmeter'
};

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
  const [createModal, setCreateModal] = useState(null);
  const [createForm, setCreateForm] = useState({});
  const [createError, setCreateError] = useState('');
  const [createSubmitting, setCreateSubmitting] = useState(false);

  const [recordModal, setRecordModal] = useState(null);
  const [recordForm, setRecordForm] = useState({});
  const [recordError, setRecordError] = useState('');
  const [recordSubmitting, setRecordSubmitting] = useState(false);

  useEffect(() => {
    setCreateModal(null);
    setRecordModal(null);
    setCreateForm({});
    setRecordForm({});
    setCreateError('');
    setRecordError('');
    setCreateSubmitting(false);
    setRecordSubmitting(false);
  }, [site?.id]);

  const features = useMemo(() => {
    if (!site) {
      return [];
    }

    const grouped = [
      ...site.wells.map((well) => ({ type: 'well', data: well })),
      ...site.tanks.map((tank) => ({ type: 'tank', data: tank })),
      ...site.flowmeters.map((flowmeter) => ({ type: 'flowmeter', data: flowmeter }))
    ];

    const order = { well: 0, tank: 1, flowmeter: 2 };

    return grouped.sort((a, b) => {
      if (order[a.type] !== order[b.type]) {
        return order[a.type] - order[b.type];
      }
      return a.data.name.localeCompare(b.data.name);
    });
  }, [site]);

  if (!site) {
    return (
      <div className="site-detail empty-state">
        <h2>Select a site</h2>
        <p>Choose a site from the list to begin capturing data.</p>
      </div>
    );
  }

  const openCreateModal = (type) => {
    setCreateModal(type);
    setCreateError('');
    if (type === 'well') {
      setCreateForm({ name: '', location: '' });
    } else if (type === 'tank') {
      setCreateForm({ name: '', capacity: '' });
    } else if (type === 'flowmeter') {
      setCreateForm({ name: '', location: '' });
    }
  };

  const openRecordModal = (type, feature) => {
    setRecordModal({ type, feature });
    setRecordError('');
    if (type === 'well') {
      setRecordForm({ depth: '', comment: '', recordedAt: defaultTimestamp() });
    } else if (type === 'tank') {
      setRecordForm({ level: '', comment: '', recordedAt: defaultTimestamp() });
    } else if (type === 'flowmeter') {
      setRecordForm({
        instantaneousFlow: '',
        totalizedVolume: '',
        comment: '',
        recordedAt: defaultTimestamp()
      });
    }
  };

  const closeCreateModal = () => {
    if (createSubmitting) {
      return;
    }
    setCreateModal(null);
    setCreateError('');
    setCreateForm({});
  };

  const closeRecordModal = () => {
    if (recordSubmitting) {
      return;
    }
    setRecordModal(null);
    setRecordError('');
    setRecordForm({});
  };

  const handleCreateChange = (field) => (event) => {
    setCreateForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleRecordChange = (field) => (event) => {
    setRecordForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleCreateSubmit = async (event) => {
    event.preventDefault();
    if (!createModal) {
      return;
    }

    if (createModal === 'well') {
      if (!createForm.name?.trim()) {
        setCreateError('Well name is required.');
        return;
      }
      try {
        setCreateSubmitting(true);
        await onAddWell(site.id, {
          name: createForm.name.trim(),
          location: createForm.location?.trim() || undefined
        });
        setCreateModal(null);
        setCreateError('');
        setCreateForm({});
        return;
      } catch (error) {
        setCreateError(error.message || 'Unable to save well.');
      } finally {
        setCreateSubmitting(false);
      }
    }

    if (createModal === 'tank') {
      const capacityValue = Number(createForm.capacity);
      if (!createForm.name?.trim() || Number.isNaN(capacityValue)) {
        setCreateError('Tank name and capacity are required.');
        return;
      }

      try {
        setCreateSubmitting(true);
        await onAddTank(site.id, {
          name: createForm.name.trim(),
          capacity: capacityValue
        });
        setCreateModal(null);
        setCreateError('');
        setCreateForm({});
        return;
      } catch (error) {
        setCreateError(error.message || 'Unable to save tank.');
      } finally {
        setCreateSubmitting(false);
      }
    }

    if (createModal === 'flowmeter') {
      if (!createForm.name?.trim()) {
        setCreateError('Flowmeter name is required.');
        return;
      }

      try {
        setCreateSubmitting(true);
        await onAddFlowmeter(site.id, {
          name: createForm.name.trim(),
          location: createForm.location?.trim() || undefined
        });
        setCreateModal(null);
        setCreateError('');
        setCreateForm({});
        return;
      } catch (error) {
        setCreateError(error.message || 'Unable to save flowmeter.');
      } finally {
        setCreateSubmitting(false);
      }
    }
  };

  const handleRecordSubmit = async (event) => {
    event.preventDefault();
    if (!recordModal) {
      return;
    }

    const { type, feature } = recordModal;

    if (type === 'well') {
      if (!recordForm.depth) {
        setRecordError('Depth is required.');
        return;
      }

      try {
        setRecordSubmitting(true);
        await onRecordWell(feature.id, {
          depth: Number(recordForm.depth),
          comment: recordForm.comment?.trim() || undefined,
          recordedAt: recordForm.recordedAt ? new Date(recordForm.recordedAt).toISOString() : undefined,
          operator
        });
        setRecordModal(null);
        setRecordError('');
        setRecordForm({});
        return;
      } catch (error) {
        setRecordError(error.message || 'Unable to save measurement.');
      } finally {
        setRecordSubmitting(false);
      }
    }

    if (type === 'tank') {
      if (!recordForm.level) {
        setRecordError('Level is required.');
        return;
      }

      try {
        setRecordSubmitting(true);
        await onRecordTank(feature.id, {
          level: Number(recordForm.level),
          comment: recordForm.comment?.trim() || undefined,
          recordedAt: recordForm.recordedAt ? new Date(recordForm.recordedAt).toISOString() : undefined,
          operator
        });
        setRecordModal(null);
        setRecordError('');
        setRecordForm({});
        return;
      } catch (error) {
        setRecordError(error.message || 'Unable to save reading.');
      } finally {
        setRecordSubmitting(false);
      }
    }

    if (type === 'flowmeter') {
      if (!recordForm.instantaneousFlow || !recordForm.totalizedVolume) {
        setRecordError('Both flow values are required.');
        return;
      }

      try {
        setRecordSubmitting(true);
        await onRecordFlowmeter(feature.id, {
          instantaneousFlow: Number(recordForm.instantaneousFlow),
          totalizedVolume: Number(recordForm.totalizedVolume),
          comment: recordForm.comment?.trim() || undefined,
          recordedAt: recordForm.recordedAt ? new Date(recordForm.recordedAt).toISOString() : undefined,
          operator
        });
        setRecordModal(null);
        setRecordError('');
        setRecordForm({});
        return;
      } catch (error) {
        setRecordError(error.message || 'Unable to save reading.');
      } finally {
        setRecordSubmitting(false);
      }
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

      <section className="site-actions">
        <h2>Quick actions</h2>
        <p className="actions-help">Add new assets directly from here.</p>
        <div className="site-actions-buttons">
          <button type="button" onClick={() => openCreateModal('well')}>
            Add well
          </button>
          <button type="button" onClick={() => openCreateModal('tank')}>
            Add tank
          </button>
          <button type="button" onClick={() => openCreateModal('flowmeter')}>
            Add flowmeter
          </button>
        </div>
      </section>

      <section className="feature-summary">
        <h2>Feature summary</h2>
        {features.length === 0 ? (
          <p className="empty">No features recorded for this site yet.</p>
        ) : (
          <div className="asset-grid">
            {features.map((feature) => {
              if (feature.type === 'well') {
                return (
                  <WellCard
                    key={`well-${feature.data.id}`}
                    well={feature.data}
                    onAddMeasurement={(well) => openRecordModal('well', well)}
                    onAddWell={() => openCreateModal('well')}
                  />
                );
              }
              if (feature.type === 'tank') {
                return (
                  <TankCard
                    key={`tank-${feature.data.id}`}
                    tank={feature.data}
                    onAddReading={(tank) => openRecordModal('tank', tank)}
                    onAddTank={() => openCreateModal('tank')}
                  />
                );
              }
              return (
                <FlowmeterCard
                  key={`flowmeter-${feature.data.id}`}
                  flowmeter={feature.data}
                  onAddReading={(flowmeter) => openRecordModal('flowmeter', flowmeter)}
                  onAddFlowmeter={() => openCreateModal('flowmeter')}
                />
              );
            })}
          </div>
        )}
      </section>

      {createModal && (
        <Modal
          title={`Add ${typeLabels[createModal]}`}
          onClose={closeCreateModal}
          dismissDisabled={createSubmitting}
          actions={
            <>
              <button
                type="button"
                className="secondary"
                onClick={closeCreateModal}
                disabled={createSubmitting}
              >
                Cancel
              </button>
              <button type="submit" form="create-feature-form" disabled={createSubmitting}>
                {createSubmitting ? 'Saving…' : 'Save'}
              </button>
            </>
          }
        >
          <form id="create-feature-form" className="modal-form" onSubmit={handleCreateSubmit}>
            <label>
              Name
              <input
                type="text"
                value={createForm.name}
                onChange={handleCreateChange('name')}
                required
              />
            </label>
            {createModal === 'tank' && (
              <label>
                Capacity (L)
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={createForm.capacity}
                  onChange={handleCreateChange('capacity')}
                  required
                />
              </label>
            )}
            {createModal !== 'tank' && (
              <label>
                Location (optional)
                <input
                  type="text"
                  value={createForm.location}
                  onChange={handleCreateChange('location')}
                />
              </label>
            )}
            {createError && <p className="form-error">{createError}</p>}
          </form>
        </Modal>
      )}

      {recordModal && (
        <Modal
          title={`Add ${typeLabels[recordModal.type]} ${
            recordModal.type === 'well' ? 'measurement' : 'reading'
          }`}
          onClose={closeRecordModal}
          dismissDisabled={recordSubmitting}
          actions={
            <>
              <button
                type="button"
                className="secondary"
                onClick={closeRecordModal}
                disabled={recordSubmitting}
              >
                Cancel
              </button>
              <button type="submit" form="record-feature-form" disabled={recordSubmitting}>
                {recordSubmitting ? 'Saving…' : 'Save'}
              </button>
            </>
          }
        >
          <form id="record-feature-form" className="modal-form" onSubmit={handleRecordSubmit}>
            {recordModal.type === 'well' && (
              <label>
                Depth to water (m)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={recordForm.depth}
                  onChange={handleRecordChange('depth')}
                  required
                />
              </label>
            )}
            {recordModal.type === 'tank' && (
              <label>
                Level (L)
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={recordForm.level}
                  onChange={handleRecordChange('level')}
                  required
                />
              </label>
            )}
            {recordModal.type === 'flowmeter' && (
              <>
                <label>
                  Instantaneous flow (L/min)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={recordForm.instantaneousFlow}
                    onChange={handleRecordChange('instantaneousFlow')}
                    required
                  />
                </label>
                <label>
                  Totalized volume (L)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={recordForm.totalizedVolume}
                    onChange={handleRecordChange('totalizedVolume')}
                    required
                  />
                </label>
              </>
            )}
            <label>
              Date &amp; time
              <input
                type="datetime-local"
                value={recordForm.recordedAt}
                onChange={handleRecordChange('recordedAt')}
              />
            </label>
            <label>
              Comment (optional)
              <textarea
                rows="2"
                value={recordForm.comment}
                onChange={handleRecordChange('comment')}
                placeholder="Add any notes"
              />
            </label>
            <p className="operator-reminder">Logged in as {operator}</p>
            {recordError && <p className="form-error">{recordError}</p>}
          </form>
        </Modal>
      )}
    </div>
  );
}
