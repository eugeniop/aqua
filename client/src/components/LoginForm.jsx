import { useState } from 'react';
import './LoginForm.css';

export default function LoginForm({ onLogin }) {
  const [operator, setOperator] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!operator.trim()) {
      setError('Please enter your name to continue.');
      return;
    }
    setError('');
    onLogin(operator.trim());
  };

  return (
    <div className="login-container">
      <h1>Aqua Monitor</h1>
      <p className="tagline">Capture water production, storage and usage data with confidence.</p>
      <form className="card" onSubmit={handleSubmit}>
        <label htmlFor="operator">Operator name</label>
        <input
          id="operator"
          type="text"
          value={operator}
          onChange={(event) => setOperator(event.target.value)}
          placeholder="e.g. Jane Doe"
          autoComplete="off"
        />
        {error && <p className="error">{error}</p>}
        <button type="submit">Continue</button>
      </form>
    </div>
  );
}
