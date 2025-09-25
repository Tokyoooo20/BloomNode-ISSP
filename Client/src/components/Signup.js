import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const Signup = () => {
  const [formData, setFormData] = useState({
    unit: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    
    // Validation
    if (formData.password !== formData.confirmPassword) {
      setMessage('Passwords do not match');
      setMessageType('error');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setMessage('Password must be at least 6 characters long');
      setMessageType('error');
      setLoading(false);
      return;
    }
    
    try {
      const response = await fetch('http://localhost:5000/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          unit: formData.unit,
          username: formData.username,
          email: formData.email,
          password: formData.password
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message);
        setMessageType('success');
        // Clear form
        setFormData({
          unit: '',
          username: '',
          email: '',
          password: '',
          confirmPassword: ''
        });
      } else {
        setMessage(data.message || 'Signup failed');
        setMessageType('error');
      }
    } catch (error) {
      setMessage('Network error. Please check if the server is running.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-5 bg-gradient-to-br from-dark-charcoal via-medium-gray to-darker-charcoal relative">
      {/* Background overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-dark-charcoal/40 via-medium-gray/30 to-darker-charcoal/30 pointer-events-none"></div>
      
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-10 w-full max-w-md shadow-2xl border border-white/20 relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-medium-gray to-dark-charcoal bg-clip-text text-transparent mb-2 tracking-tight">
            Create Account
          </h1>
        </div>
        
        {/* Message Display */}
        {message && (
          <div className={`mb-6 p-4 rounded-xl text-sm font-medium ${
            messageType === 'success' 
              ? 'bg-green-100 text-green-800 border border-green-200' 
              : 'bg-red-100 text-red-800 border border-red-200'
          }`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="unit" className="block text-gray-700 text-sm font-semibold mb-2 tracking-wide">
              Unit
            </label>
            <input
              type="text"
              id="unit"
              name="unit"
              value={formData.unit}
              onChange={handleChange}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm transition-all duration-300 bg-white/80 backdrop-blur-sm focus:outline-none focus:border-medium-gray focus:shadow-lg focus:shadow-medium-gray/10 focus:bg-white placeholder-gray-400"
              placeholder="Enter your unit"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="username" className="block text-gray-700 text-sm font-semibold mb-2 tracking-wide">
              Username
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm transition-all duration-300 bg-white/80 backdrop-blur-sm focus:outline-none focus:border-medium-gray focus:shadow-lg focus:shadow-medium-gray/10 focus:bg-white placeholder-gray-400"
              placeholder="Choose a username"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-gray-700 text-sm font-semibold mb-2 tracking-wide">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm transition-all duration-300 bg-white/80 backdrop-blur-sm focus:outline-none focus:border-medium-gray focus:shadow-lg focus:shadow-medium-gray/10 focus:bg-white placeholder-gray-400"
              placeholder="Enter your email"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-gray-700 text-sm font-semibold mb-2 tracking-wide">
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm transition-all duration-300 bg-white/80 backdrop-blur-sm focus:outline-none focus:border-medium-gray focus:shadow-lg focus:shadow-medium-gray/10 focus:bg-white placeholder-gray-400"
              placeholder="Create a password (min 6 characters)"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-gray-700 text-sm font-semibold mb-2 tracking-wide">
              Confirm Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm transition-all duration-300 bg-white/80 backdrop-blur-sm focus:outline-none focus:border-medium-gray focus:shadow-lg focus:shadow-medium-gray/10 focus:bg-white placeholder-gray-400"
              placeholder="Confirm your password"
              required
              disabled={loading}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-gradient-to-r from-medium-gray to-dark-charcoal text-white py-4 px-6 rounded-xl text-base font-semibold transition-all duration-300 shadow-lg shadow-medium-gray/30 hover:shadow-xl hover:shadow-medium-gray/40 hover:-translate-y-0.5 hover:from-light-gray hover:to-darkest-gray active:translate-y-0 mt-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div className="text-center mt-8 pt-6 border-t border-gray-200">
          <p className="text-gray-600 text-sm">
            Already have an account? <Link to="/login" className="text-medium-gray font-semibold hover:text-dark-charcoal transition-colors duration-300 hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
