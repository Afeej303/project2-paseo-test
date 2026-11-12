import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api, { getApiError } from '../services/api';
import { getRoleHome } from '../services/navigation';
import useAuth from '../hooks/useAuth';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Alert from '../components/ui/Alert';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const handleChange = (event) => {
    setFormData((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      const response = await api.post('/auth/login', formData);
      const { token, user, profile } = response.data.data;
      login(user, token, profile);
      const requestedPath = location.state?.from;
      navigate(requestedPath || getRoleHome(user.role), { replace: true });
    } catch (requestError) {
      setError(getApiError(requestError, 'Login failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-panel" aria-labelledby="login-title">
        <div className="auth-intro">
          <span className="eyebrow">Industrial maintenance network</span>
          <h1 id="login-title">Get equipment running again.</h1>
          <p>Coordinate faults, technicians, repair visits, and job progress in one workspace.</p>
        </div>
        <Card title="Sign in to RepairLink">
          <form onSubmit={handleSubmit} className="form-stack">
            {error && <Alert type="error">{error}</Alert>}
            <Input label="Email" id="email" name="email" type="email" autoComplete="email" value={formData.email} onChange={handleChange} required />
            <Input label="Password" id="password" name="password" type="password" autoComplete="current-password" value={formData.password} onChange={handleChange} required />
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Signing in…' : 'Sign in'}</Button>
          </form>
          <div className="auth-links">
            <span>New to the platform?</span>
            <Link to="/register/factory">Register a factory</Link>
            <Link to="/register/technician">Register as a technician</Link>
          </div>
        </Card>
      </section>
    </main>
  );
};

export default Login;
