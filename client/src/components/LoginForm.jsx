import { useState } from 'react';
import { useTranslation } from '../i18n/LocalizationProvider.jsx';
import './LoginForm.css';

export default function LoginForm({ onLogin }) {
  const [operator, setOperator] = useState('');
  const [role, setRole] = useState('field-operator');
  const [error, setError] = useState('');
  const { t } = useTranslation();

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!operator.trim()) {
      setError(t('Please enter your name to continue.'));
      return;
    }
    setError('');
    onLogin({ name: operator.trim(), role });
  };

  return (
    <div className="login-container">
      <h1>{t('Aqua Monitor')}</h1>
      <p className="tagline">{t('Capture water production, storage and usage data with confidence.')}</p>
      <form className="card" onSubmit={handleSubmit}>
        <label htmlFor="operator">{t('Operator name')}</label>
        <input
          id="operator"
          type="text"
          value={operator}
          onChange={(event) => setOperator(event.target.value)}
          placeholder={t('e.g. Jane Doe')}
          autoComplete="off"
        />
        <label htmlFor="role">{t('Role')}</label>
        <select
          id="role"
          value={role}
          onChange={(event) => setRole(event.target.value)}
        >
          <option value="admin">{t('Admin')}</option>
          <option value="field-operator">{t('Field operator')}</option>
          <option value="analyst">{t('Analyst')}</option>
        </select>
        {error && <p className="error">{error}</p>}
        <button type="submit">{t('Continue')}</button>
      </form>
    </div>
  );
}
