import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { API_ENDPOINTS } from '../../utils/api';

// Strong password validation function
const validateStrongPassword = (password) => {
  const minLength = 12;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  if (password.length < minLength) {
    return { isValid: false, message: 'Password must be at least 12 characters long' };
  }
  if (!hasUpperCase) {
    return { isValid: false, message: 'Password must contain at least one uppercase letter' };
  }
  if (!hasLowerCase) {
    return { isValid: false, message: 'Password must contain at least one lowercase letter' };
  }
  if (!hasNumber) {
    return { isValid: false, message: 'Password must contain at least one number' };
  }
  if (!hasSpecialChar) {
    return { isValid: false, message: 'Password must contain at least one special character (!@#$%^&* etc.)' };
  }

  return { isValid: true, message: '' };
};

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  // Verify token on mount
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setMessage('Invalid reset link. Please request a new password reset.');
        setMessageType('error');
        setVerifying(false);
        return;
      }

      try {
        const response = await fetch(API_ENDPOINTS.auth.verifyResetToken, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (response.ok && data.valid) {
          setTokenValid(true);
        } else {
          setMessage(data.message || 'Invalid or expired reset link');
          setMessageType('error');
        }
      } catch (error) {
        setMessage('Network error. Please try again.');
        setMessageType('error');
      } finally {
        setVerifying(false);
      }
    };

    verifyToken();
  }, [token]);

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

    // Strong password validation
    const passwordValidation = validateStrongPassword(formData.password);
    if (!passwordValidation.isValid) {
      setMessage(passwordValidation.message);
      setMessageType('error');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(API_ENDPOINTS.auth.resetPassword, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          newPassword: formData.password
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message);
        setMessageType('success');
        setResetSuccess(true);

        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login', {
            state: {
              message: 'Password reset successful! You can now log in with your new password.'
            }
          });
        }, 3000);
      } else {
        setMessage(data.message || 'Password reset failed');
        setMessageType('error');
      }
    } catch (error) {
      setMessage('Network error. Please check if the server is running.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center padding-responsive bg-gradient-to-br from-dark-charcoal via-medium-gray to-darker-charcoal">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-responsive-sm">Verifying reset link...</p>
        </div>
      </div>
    );
  }

  // Invalid token state
  if (!tokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center padding-responsive bg-gradient-to-br from-dark-charcoal via-medium-gray to-darker-charcoal">
        <div className="w-full max-w-md">
          <div className="bg-white/95 backdrop-blur-xl rounded-xl sm:rounded-2xl padding-responsive shadow-lg border border-white/10 text-center">
            <div className="mx-auto w-14 h-14 sm:w-16 sm:h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-7 w-7 sm:h-8 sm:w-8 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h1 className="text-responsive-xl font-semibold text-gray-900 mb-2">Invalid Reset Link</h1>
            <p className="text-gray-600 mb-6 text-responsive-sm">{message}</p>
            <Link
              to="/forgot-password"
              className="inline-block btn-responsive bg-gradient-to-r from-medium-gray to-dark-charcoal text-white hover:from-light-gray hover:to-darkest-gray transition-all duration-200"
            >
              Request New Reset Link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Reset password form
  return (
    <div className="min-h-screen flex items-center justify-center padding-responsive bg-gradient-to-br from-dark-charcoal via-medium-gray to-darker-charcoal">
      <div className="w-full max-w-md">
        <div className="bg-white/95 backdrop-blur-xl rounded-xl sm:rounded-2xl padding-responsive shadow-lg border border-white/10">
          {/* Header */}
          <div className="text-center mb-6 sm:mb-8">
            <div className="mx-auto w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-medium-gray to-dark-charcoal rounded-full flex items-center justify-center mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-7 w-7 sm:h-8 sm:w-8 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                />
              </svg>
            </div>
            <h1 className="text-responsive-xl font-semibold text-gray-900 mb-2 tracking-tight">
              {resetSuccess ? 'Password Reset!' : 'Reset Your Password'}
            </h1>
            <p className="text-gray-500 text-responsive-sm">
              {resetSuccess ? 'Redirecting you to login...' : 'Choose a strong password for your account'}
            </p>
          </div>

          {/* Message Display */}
          {message && (
            <div
              className={`mb-4 sm:mb-6 rounded-lg px-4 py-3 text-responsive-sm font-medium ${
                messageType === 'success'
                  ? 'bg-gray-50 text-gray-800 border border-gray-200'
                  : 'bg-gray-100 text-gray-900 border border-gray-300'
              }`}
            >
              {message}
            </div>
          )}

          {!resetSuccess && (
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              {/* New Password */}
              <div className="form-group-responsive">
                <label
                  htmlFor="password"
                  className="block text-gray-700 text-responsive-sm font-medium mb-1.5"
                >
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="input-responsive tap-target pr-12"
                    placeholder="Enter new password (min 12 characters)"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600 tap-target select-none-mobile"
                    tabIndex={-1}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 sm:h-4 sm:w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="form-group-responsive">
                <label
                  htmlFor="confirmPassword"
                  className="block text-gray-700 text-responsive-sm font-medium mb-1.5"
                >
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="input-responsive tap-target pr-12"
                    placeholder="Confirm your new password"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600 tap-target select-none-mobile"
                    tabIndex={-1}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 sm:h-4 sm:w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Password Requirements */}
              <div className="p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-xs sm:text-sm font-medium text-gray-700 mb-2">Password Requirements:</p>
                <ul className="text-xs sm:text-sm text-gray-600 space-y-1">
                  <li>• At least 12 characters long</li>
                  <li>• Contains uppercase and lowercase letters</li>
                  <li>• Includes at least one number</li>
                  <li>• Has at least one special character (!@#$%^&*)</li>
                </ul>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-responsive w-full bg-gradient-to-r from-medium-gray to-dark-charcoal text-white hover:from-light-gray hover:to-darkest-gray disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
              >
                {loading ? 'Resetting Password...' : 'Reset Password'}
              </button>
            </form>
          )}

          {/* Footer */}
          {!resetSuccess && (
            <div className="text-center mt-6 pt-4 border-t border-gray-100">
              <p className="text-gray-600 text-responsive-sm">
                Remember your password?{' '}
              <Link
                to="/login"
                className="text-medium-gray font-semibold hover:text-dark-charcoal transition-colors duration-200"
              >
                Back to login
              </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;

