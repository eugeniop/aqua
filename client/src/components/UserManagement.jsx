import { useMemo, useState } from 'react';
import { DEFAULT_TIME_ZONE } from '../constants/timeZones.js';
import { useTranslation } from '../i18n/LocalizationProvider.jsx';
import TimeZoneSelect from './TimeZoneSelect.jsx';
import './UserManagement.css';

const roleOptions = [
  { value: 'admin', labelKey: 'Admin' },
  { value: 'field-operator', labelKey: 'Field operator' },
  { value: 'analyst', labelKey: 'Analyst' }
];

export default function UserManagement({
  users = [],
  loading = false,
  error = '',
  onCreate,
  onToggle,
  onChangeRole,
  onInvite,
  notice = '',
  currentUserId,
  onUpdatePreferences
}) {
  const { t, formatDateTime, timeZone: appTimeZone, language } = useTranslation();
  const buildEmptyForm = () => ({
    name: '',
    email: '',
    phone: '',
    enabled: true,
    role: 'analyst',
    preferredLanguage: language || 'en',
    preferredTimeZone: appTimeZone || DEFAULT_TIME_ZONE
  });
  const [form, setForm] = useState(buildEmptyForm);
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
      setForm(buildEmptyForm());
    } catch (err) {
      setFormError(err.message || t('Unable to save user.'));
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleLabel = (roleValue) => {
    const option = roleOptions.find((item) => item.value === roleValue);
    return option ? t(option.labelKey) : roleValue;
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

  const renderActions = (user) => {
    const showInvite = typeof onInvite === 'function' && user.id !== currentUserId;

    return (
      <div className="action-buttons">
        {showInvite && (
          <button type="button" className="link" onClick={() => onInvite(user)}>
            {t('Invite')}
          </button>
        )}
        {renderStatusToggle(user)}
      </div>
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
      {notice && <div className="banner success">{notice}</div>}

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
          <label>
            {t('Assigned role')}
            <select name="role" value={form.role} onChange={handleChange}>
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(option.labelKey)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t('Preferred language')}
            <select name="preferredLanguage" value={form.preferredLanguage} onChange={handleChange}>
              <option value="en">{t('english')}</option>
              <option value="sw">{t('swahili')}</option>
            </select>
          </label>
          <label>
            {t('Preferred time zone')}
            <TimeZoneSelect
              value={form.preferredTimeZone}
              onChange={(value) => setForm((prev) => ({ ...prev, preferredTimeZone: value }))}
              placeholder={t('Search time zones…')}
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
                  <th>{t('Role')}</th>
                  <th>{t('Language')}</th>
                  <th>{t('Time zone')}</th>
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
                      {user.id === currentUserId && user.role === 'superadmin' ? (
                        <span>{getRoleLabel(user.role)}</span>
                      ) : (
                        <select
                          value={user.role || 'analyst'}
                          onChange={(event) => onChangeRole(user.id, event.target.value)}
                        >
                          {roleOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {t(option.labelKey)}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td>
                      <select
                        value={user.preferredLanguage || 'en'}
                        onChange={(event) =>
                          typeof onUpdatePreferences === 'function'
                            ? onUpdatePreferences(user.id, {
                                preferredLanguage: event.target.value
                              })
                            : undefined
                        }
                      >
                        <option value="en">{t('english')}</option>
                        <option value="sw">{t('swahili')}</option>
                      </select>
                    </td>
                    <td>
                      <TimeZoneSelect
                        value={user.preferredTimeZone || DEFAULT_TIME_ZONE}
                        onChange={(value) =>
                          typeof onUpdatePreferences === 'function'
                            ? onUpdatePreferences(user.id, { preferredTimeZone: value })
                            : undefined
                        }
                        className="compact"
                        placeholder={t('Search time zones…')}
                      />
                    </td>
                    <td>
                      <span className={`status-pill ${user.enabled ? 'success' : 'muted'}`}>
                        {user.enabled ? t('Enabled') : t('Disabled')}
                      </span>
                    </td>
                    <td>{formatDateTime(user.createdAt)}</td>
                    <td>{renderActions(user)}</td>
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
