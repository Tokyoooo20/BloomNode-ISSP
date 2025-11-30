import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { API_ENDPOINTS } from '../../utils/api';

const VerifyEmail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || '';

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    // Redirect to signup if no email provided
    if (!email) {
      navigate('/signup');
    }
  }, [email, navigate]);

  // Countdown timer for resend button
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (code.length !== 6) {
      setMessage('Please enter a 6-digit verification code');
      setMessageType('error');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(API_ENDPOINTS.auth.verifyEmail, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, code }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Email verified successfully! Redirecting to login...');
        setMessageType('success');
        
        // Redirect to login after 2 seconds
        setTimeout(() => {
          navigate('/login', { 
            state: { 
              message: 'Email verified! Your account is pending admin approval. Please wait for approval before logging in.',
              email: email
            } 
          });
        }, 2000);
      } else {
        setMessage(data.message || 'Verification failed');
        setMessageType('error');
      }
    } catch (error) {
      setMessage('Network error. Please check if the server is running.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setResending(true);
    setMessage('');

    try {
      const response = await fetch(API_ENDPOINTS.auth.resendVerification, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Verification code sent! Check your email.');
        setMessageType('success');
        setCountdown(60); // 60 second cooldown
      } else {
        setMessage(data.message || 'Failed to resend code');
        setMessageType('error');
      }
    } catch (error) {
      setMessage('Network error. Please try again.');
      setMessageType('error');
    } finally {
      setResending(false);
    }
  };

  const handleCodeChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(value);
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
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h1 className="text-responsive-xl font-semibold text-gray-900 mb-2 tracking-tight">
              Verify Your Email
            </h1>
            <p className="text-gray-500 text-responsive-sm">
              We sent a 6-digit code to
            </p>
            <p className="text-gray-700 font-medium text-responsive-sm mt-1 break-words">
              {email}
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

          {/* Verification Form */}
          <form onSubmit={handleVerify} className="space-y-5 sm:space-y-6">
            <div className="form-group-responsive">
              <label
                htmlFor="code"
                className="block text-gray-700 text-responsive-sm font-medium mb-2"
              >
                Verification Code
              </label>
              <input
                type="text"
                id="code"
                value={code}
                onChange={handleCodeChange}
                className="w-full px-3 py-3 sm:px-4 border border-gray-300 rounded-lg text-center text-xl sm:text-2xl font-mono tracking-widest bg-white focus:outline-none focus:ring-2 focus:ring-medium-gray focus:border-transparent placeholder-gray-400 transition-all tap-target"
                placeholder="000000"
                maxLength="6"
                required
                disabled={loading}
                autoFocus
              />
              <p className="text-xs sm:text-sm text-gray-500 mt-2 text-center">
                Enter the 6-digit code from your email
              </p>
            </div>

              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="btn-responsive w-full bg-gradient-to-r from-medium-gray to-dark-charcoal text-white hover:from-light-gray hover:to-darkest-gray disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
              >
                {loading ? 'Verifying...' : 'Verify Email'}
              </button>
          </form>

          {/* Resend Code */}
          <div className="mt-6 text-center">
            <p className="text-gray-600 text-responsive-sm mb-3">
              Didn't receive the code?
            </p>
            <button
              type="button"
              onClick={handleResendCode}
              disabled={resending || countdown > 0}
              className="text-medium-gray font-semibold text-responsive-sm hover:text-dark-charcoal disabled:text-gray-400 disabled:cursor-not-allowed transition-colors duration-200 tap-target"
            >
              {resending
                ? 'Sending...'
                : countdown > 0
                ? `Resend in ${countdown}s`
                : 'Resend Code'}
            </button>
          </div>

          {/* Additional Info */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-start space-x-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-medium-gray flex-shrink-0 mt-0.5"
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
                <p className="font-medium text-gray-800 mb-1">What's next?</p>
                <p>
                  After verifying your email, your account will be pending admin approval. 
                  You'll receive an email notification once approved. You can then log in to access your account.
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-6 pt-4 border-t border-gray-100">
            <p className="text-gray-600 text-responsive-sm">
              Wrong email?{' '}
              <Link
                to="/signup"
                className="text-medium-gray font-semibold hover:text-dark-charcoal transition-colors duration-200"
              >
                Sign up again
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;

