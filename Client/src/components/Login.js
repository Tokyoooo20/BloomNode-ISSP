import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
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
    
    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store JWT token in localStorage
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        setMessage('Login successful! Redirecting...');
        setMessageType('success');
        
        // Redirect based on user role
        setTimeout(() => {
          if (data.user.role === 'admin') {
            window.location.href = '/dashboard';
          } else if (data.user.role === 'president') {
            window.location.href = '/pdashboard';
          } else {
            window.location.href = '/unitdboard';
          }
        }, 1000);
      } else {
        setMessage(data.message || 'Login failed');
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
            Welcome Back
          </h1>
          <p className="text-gray-500 text-base">Sign in to your BloomNode account</p>
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
        
        <form onSubmit={handleSubmit} className="space-y-5">
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
              placeholder="Enter your password"
              required
              disabled={loading}
            />
          </div>

          <div className="flex justify-between items-center my-4">
            <label className="flex items-center text-sm text-gray-600 cursor-pointer select-none">
              <input 
                type="checkbox" 
                className="mr-2 w-4 h-4 text-medium-gray bg-gray-100 border-gray-300 rounded focus:ring-medium-gray focus:ring-2"
                disabled={loading}
              />
              Remember me
            </label>
            <a href="#" className="text-medium-gray text-sm font-medium hover:text-dark-charcoal transition-colors duration-300">
              Forgot password?
            </a>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-gradient-to-r from-medium-gray to-dark-charcoal text-white py-4 px-6 rounded-xl text-base font-semibold transition-all duration-300 shadow-lg shadow-medium-gray/30 hover:shadow-xl hover:shadow-medium-gray/40 hover:-translate-y-0.5 hover:from-light-gray hover:to-darkest-gray active:translate-y-0 mt-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="text-center mt-8 pt-6 border-t border-gray-200">
          <p className="text-gray-600 text-sm">
            Don't have an account? <Link to="/signup" className="text-medium-gray font-semibold hover:text-dark-charcoal transition-colors duration-300 hover:underline">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
