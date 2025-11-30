import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Client/Login';
import Signup from './components/Client/Signup';
import VerifyEmail from './components/Client/VerifyEmail';
import ForgotPassword from './components/Client/ForgotPassword';
import ResetPassword from './components/Client/ResetPassword';
import Dashboard from './components/Admin/Dashboard';
import UnitDboard from './components/Client/UnitDboard';
import Pdashboard from './components/Pres/Pdashboard';
import Profile from './components/common/Profile';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/unitdboard" element={<UnitDboard />} />
          <Route path="/pdashboard" element={<Pdashboard />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
