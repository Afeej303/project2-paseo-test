import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { getApiError } from '../services/api';
import useAuth from '../hooks/useAuth';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Alert from '../components/ui/Alert';

const TechnicianRegister = () => {
  const [formData, setFormData] = useState({ email: '', password: '', firstName: '', lastName: '', phone: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (event) => {
    setFormData((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      const response = await api.post('/auth/register/technician', formData);
      const { user, technician, token } = response.data.data;
      login(user, token, technician);
      navigate('/dashboard/technician/profile', { replace: true });
    } catch (requestError) {
      setError(getApiError(requestError, 'Registration failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="registration-panel" aria-labelledby="technician-register-title">
        <div className="auth-intro">
          <span className="eyebrow">Technician account</span>
          <h1 id="technician-register-title">Put your industrial expertise to work.</h1>
          <p>Configure your specialties and service area, then manage repair jobs from one clear queue.</p>
        </div>
        <Card title="Register as a technician">
          <form onSubmit={handleSubmit} className="form-grid">
            {error && <div className="form-span"><Alert type="error">{error}</Alert></div>}
            <Input label="Email" id="email" name="email" type="email" autoComplete="email" value={formData.email} onChange={handleChange} required />
            <Input label="Password" id="password" name="password" type="password" minLength="6" autoComplete="new-password" value={formData.password} onChange={handleChange} required />
            <Input label="First name" id="firstName" name="firstName" autoComplete="given-name" value={formData.firstName} onChange={handleChange} required />
            <Input label="Last name" id="lastName" name="lastName" autoComplete="family-name" value={formData.lastName} onChange={handleChange} required />
            <Input label="Phone" id="phone" name="phone" type="tel" autoComplete="tel" value={formData.phone} onChange={handleChange} required />
            <div className="form-actions form-span"><Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creating account…' : 'Create technician account'}</Button></div>
          </form>
          <p className="auth-footer">Already registered? <Link to="/login">Sign in</Link></p>
        </Card>
      </section>
    </main>
  );
};

export default TechnicianRegister;
