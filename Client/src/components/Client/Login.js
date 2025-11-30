import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Modal from '../common/Modal';
import { API_ENDPOINTS } from '../../utils/api';

const Login = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: location.state?.email || '',
    password: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'
  const [showModal, setShowModal] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: '',
    message: '',
    variant: 'brand',
    confirmLabel: 'Continue',
  });

  // Show message from location state (e.g., from verify email page)
  useEffect(() => {
    if (location.state?.message) {
      setMessage(location.state.message);
      setMessageType('success');
      // Clear location state
      window.history.replaceState({}, document.title);
    }
  }, [location]);

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
      const response = await fetch(API_ENDPOINTS.auth.login, {
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
        
        // Show success modal
        setModalConfig({
          title: 'Login Successfully',
          message: `Welcome back! You will be redirected to your ${data.user.role} dashboard.`,
          variant: 'brand',
          confirmLabel: 'Proceed'
        });
        setShowModal(true);
        
        // Redirect based on user role
        setTimeout(() => {
          if (data.user.role === 'admin') {
            window.location.href = '/dashboard';
          } else if (data.user.role === 'president' || data.user.role === 'Executive') {
            // Accept both 'president' and 'Executive' as president role
            window.location.href = '/pdashboard';
          } else {
            window.location.href = '/unitdboard';
          }
        }, 2000);
      } else {
        // Check if email verification is required
        if (data.requiresVerification) {
          // Redirect to verification page
          navigate('/verify-email', { 
            state: { 
              email: formData.email 
            } 
          });
        } else {
          setMessage(data.message || 'Login failed');
          setMessageType('error');
        }
      }
    } catch (error) {
      setMessage('Network error. Please check if the server is running.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleModalConfirm = () => {
    setShowModal(false);
  };

  return (
    <>
      <Modal
        isOpen={showModal}
        variant={modalConfig.variant}
        title={modalConfig.title}
        message={modalConfig.message}
        confirmLabel={modalConfig.confirmLabel}
        cancelLabel={null}
        onClose={() => setShowModal(false)}
        onConfirm={handleModalConfirm}
        closeOnOverlay={false}
      />
      
      <div className="min-h-screen flex items-center justify-center padding-responsive bg-gradient-to-br from-dark-charcoal via-medium-gray to-darker-charcoal">
        <div className="w-full max-w-md">
          <div className="bg-white/95 backdrop-blur-xl rounded-xl sm:rounded-2xl padding-responsive shadow-lg border border-white/10">
            <div className="text-center mb-6 sm:mb-8">
              <div className="text-xs font-semibold tracking-[0.35em] text-gray-400 uppercase mb-3">
                BloomNode
              </div>
              <h1 className="text-responsive-xl font-semibold text-gray-900 mb-2 tracking-tight">
                Sign in
              </h1>
              <p className="text-gray-500 text-responsive-sm">
                Use your email and password to continue
              </p>
            </div>
        
            {/* Message Display */}
            {message && (
              <div
                className={`mb-4 sm:mb-6 rounded-lg px-4 py-3 text-responsive-sm font-medium ${
                  messageType === 'success'
                    ? 'bg-green-50 text-green-800 border border-green-100'
                    : 'bg-red-50 text-red-800 border border-red-100'
                }`}
              >
                {message}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              <div className="form-group-responsive">
                <label
                  htmlFor="email"
                  className="block text-gray-700 text-responsive-sm font-medium mb-1.5"
                >
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="input-responsive tap-target"
                  placeholder="you@example.com"
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group-responsive">
                <label
                  htmlFor="password"
                  className="block text-gray-700 text-responsive-sm font-medium mb-1.5"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="input-responsive tap-target pr-12"
                    placeholder="Enter your password"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600 tap-target select-none-mobile"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 sm:h-4 sm:w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="flex justify-end items-center mt-1">
                <Link
                  to="/forgot-password"
                  className="text-medium-gray text-xs sm:text-sm font-medium hover:text-dark-charcoal transition-colors duration-200 tap-target"
                >
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-responsive w-full bg-gradient-to-r from-medium-gray to-dark-charcoal text-white hover:from-light-gray hover:to-darkest-gray disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </button>
            </form>

            <div className="text-center mt-6 pt-4 border-t border-gray-100">
              <p className="text-gray-600 text-responsive-sm">
                Don't have an account?{' '}
                <Link
                  to="/signup"
                  className="text-medium-gray font-semibold hover:text-dark-charcoal transition-colors duration-200"
                >
                  Sign up
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;
