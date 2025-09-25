import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Signup from './components/Signup';
import Dashboard from './components/Dashboard';
import UnitDboard from './components/UnitDboard';
import Pdashboard from './components/Pdashboard';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/unitdboard" element={<UnitDboard />} />
          <Route path="/pdashboard" element={<Pdashboard />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
