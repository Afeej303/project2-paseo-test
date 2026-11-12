import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Alert from '../components/ui/Alert';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      const res = await api.post('/auth/login', formData);
      const { token, user } = res.data.data;
      localStorage.setItem('token', token);
      navigate(`/${user.role}/dashboard`);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-container">
      <Card title="Login">
        <form onSubmit={handleSubmit}>
          {error && <Alert type="error">{error}</Alert>}
          <Input
            label="Email"
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
          <Input
            label="Password"
            id="password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            required
          />
          <Button type="submit" disabled={isSubmitting}>
            Login
          </Button>
        </form>
        <div className="auth-links">
          <p>Don't have an account?</p>
          <div className="auth-options">
            <button onClick={() => navigate('/register/factory')} className="link-button">
              Factory Registration
            </button>
            <button onClick={() => navigate('/register/technician')} className="link-button">
              Technician Registration
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Login;