import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { getApiError } from '../services/api';
import useAuth from '../hooks/useAuth';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Alert from '../components/ui/Alert';

const FactoryRegister = () => {
  const [formData, setFormData] = useState({ email: '', password: '', companyName: '', contactPerson: '', contactPhone: '' });
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
      const response = await api.post('/auth/register/factory', formData);
      const { user, factory, token } = response.data.data;
      login(user, token, factory);
      navigate('/dashboard/factory', { replace: true });
    } catch (requestError) {
      setError(getApiError(requestError, 'Registration failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="registration-panel" aria-labelledby="factory-register-title">
        <div className="auth-intro">
          <span className="eyebrow">Factory account</span>
          <h1 id="factory-register-title">Bring maintenance response into focus.</h1>
          <p>Report breakdowns, find verified specialists, and follow repairs from request to completion.</p>
        </div>
        <Card title="Register your factory">
          <form onSubmit={handleSubmit} className="form-grid">
            {error && <div className="form-span"><Alert type="error">{error}</Alert></div>}
            <Input label="Work email" id="email" name="email" type="email" autoComplete="email" value={formData.email} onChange={handleChange} required />
            <Input label="Password" id="password" name="password" type="password" minLength="6" autoComplete="new-password" value={formData.password} onChange={handleChange} required />
            <Input label="Company name" id="companyName" name="companyName" value={formData.companyName} onChange={handleChange} required />
            <Input label="Contact person" id="contactPerson" name="contactPerson" autoComplete="name" value={formData.contactPerson} onChange={handleChange} required />
            <Input label="Contact phone" id="contactPhone" name="contactPhone" type="tel" autoComplete="tel" value={formData.contactPhone} onChange={handleChange} required />
            <div className="form-actions form-span"><Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creating account…' : 'Create factory account'}</Button></div>
          </form>
          <p className="auth-footer">Already registered? <Link to="/login">Sign in</Link></p>
        </Card>
      </section>
    </main>
  );
};

export default FactoryRegister;
