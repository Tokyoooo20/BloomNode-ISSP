import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { API_ENDPOINTS } from '../../utils/api';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch(API_ENDPOINTS.auth.forgotPassword, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message);
        setMessageType('success');
        setEmailSent(true);
      } else {
        setMessage(data.message || 'Failed to send reset email');
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
              Forgot Password?
            </h1>
            <p className="text-gray-500 text-responsive-sm">
              {emailSent
                ? 'Check your email for the reset link'
                : "No worries, we'll send you reset instructions"}
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

          {!emailSent ? (
            <>
              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
                <div className="form-group-responsive">
                  <label
                    htmlFor="email"
                    className="block text-gray-700 text-responsive-sm font-medium mb-2"
                  >
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-responsive tap-target"
                    placeholder="Enter your email address"
                    required
                    disabled={loading}
                    autoFocus
                  />
                  <p className="text-xs sm:text-sm text-gray-500 mt-2">
                    We'll send you a password reset link
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-responsive w-full bg-gradient-to-r from-medium-gray to-dark-charcoal text-white hover:from-light-gray hover:to-darkest-gray disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
            </>
          ) : (
            <>
              {/* Success State */}
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-start space-x-3">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6 text-gray-600 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <div className="text-responsive-sm text-gray-800">
                      <p className="font-medium mb-1">Email Sent!</p>
                      <p className="break-words">
                        Check your inbox at <strong>{email}</strong> for the password reset link.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="text-responsive-sm text-gray-600 space-y-2">
                  <p>📧 Check your spam folder if you don't see the email</p>
                  <p>⏰ The reset link expires in 1 hour</p>
                </div>

                <button
                  onClick={() => {
                    setEmailSent(false);
                    setEmail('');
                    setMessage('');
                  }}
                  className="w-full text-medium-gray font-semibold text-responsive-sm hover:text-dark-charcoal py-2 transition-colors duration-200 tap-target"
                >
                  Try a different email
                </button>
              </div>
            </>
          )}

          {/* Footer */}
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

          {/* Additional Help */}
          {!emailSent && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-100">
              <div className="flex items-start space-x-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-gray-600 flex-shrink-0 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                  <p className="font-medium text-gray-800 mb-1">Need help?</p>
                  <p>
                    If you don't have access to your email or continue having issues, please contact your administrator.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;

