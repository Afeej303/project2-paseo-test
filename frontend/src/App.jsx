import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import { AuthProvider } from './context/AuthContext';

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<h2>Home Page</h2>} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
