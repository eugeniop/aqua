import { useMemo, useState } from 'react';
import { useTranslation } from '../i18n/LocalizationProvider.jsx';
import './UserManagement.css';

const emptyForm = { name: '', email: '', phone: '', enabled: true };

export default function UserManagement({
  users = [],
  loading = false,
  error = '',
  onCreate,
  onToggle,
  currentUserId
}) {
  const { t, formatDateTime } = useTranslation();
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => (a.name || '').localeCompare(b.name || '')),
    [users]
  );

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');
    if (!form.name.trim() || !form.email.trim()) {
      setFormError(t('Please provide a name and email.'));
      return;
    }

    try {
      setSubmitting(true);
      await onCreate({ ...form });
      setForm(emptyForm);
    } catch (err) {
      setFormError(err.message || t('Unable to save user.'));
    } finally {
      setSubmitting(false);
    }
  };

  const renderStatusToggle = (user) => {
    const targetState = !user.enabled;
    const label = user.enabled ? t('Disable') : t('Enable');
    const disabled = user.id === currentUserId && targetState === false;

    return (
      <button
        type="button"
        className="link"
        onClick={() => onToggle(user.id, targetState)}
        disabled={disabled}
      >
        {label}
      </button>
    );
  };

  return (
    <section className="user-management">
      <div className="header-row">
        <div>
          <div className="eyebrow">{t('Access control')}</div>
          <h2>{t('User management')}</h2>
          <p className="description">{t('Create users and enable or disable access for the Aqua app.')}</p>
        </div>
      </div>

      {error && <div className="banner error">{error}</div>}

      <div className="grid">
        <form className="card" onSubmit={handleSubmit}>
          <div className="card-header">{t('Add user')}</div>
          <label>
            {t('Name')}
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder={t('e.g. Jane Doe')}
              required
            />
          </label>
          <label>
            {t('Email')}
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="user@example.com"
              required
            />
          </label>
          <label>
            {t('Phone (optional)')}
            <input
              type="tel"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder=""
            />
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              name="enabled"
              checked={form.enabled}
              onChange={handleChange}
            />
            <span>{t('Enabled on create')}</span>
          </label>
          {formError && <div className="form-error">{formError}</div>}
          <button type="submit" disabled={submitting}>
            {submitting ? t('Saving…') : t('Create user')}
          </button>
        </form>

        <div className="card user-list">
          <div className="card-header">{t('Existing users')}</div>
          {loading ? (
            <div className="loading muted">{t('Loading users…')}</div>
          ) : !sortedUsers.length ? (
            <div className="muted">{t('No users found')}</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>{t('Name')}</th>
                  <th>{t('Email')}</th>
                  <th>{t('Phone')}</th>
                  <th>{t('Status')}</th>
                  <th>{t('Added')}</th>
                  <th>{t('Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {sortedUsers.map((user) => (
                  <tr key={user.id} className={!user.enabled ? 'muted' : ''}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>{user.phone || '—'}</td>
                    <td>
                      <span className={`status-pill ${user.enabled ? 'success' : 'muted'}`}>
                        {user.enabled ? t('Enabled') : t('Disabled')}
                      </span>
                    </td>
                    <td>{formatDateTime(user.createdAt)}</td>
                    <td>{renderStatusToggle(user)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </section>
  );
}
