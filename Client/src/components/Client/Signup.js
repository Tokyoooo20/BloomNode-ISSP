import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Modal from '../common/Modal';
import { API_ENDPOINTS } from '../../utils/api';

const defaultSuccessMessage =
  'Your account has been created successfully. You can now login with your credentials.';

const phrasesToStrip = [
  
];

const campusOptions = [
  'Main',
  'President',
  'Baganga',
  'Tarragona',
  'Banaybanay',
  'San Isidro'
];

// Faculty and Program data structure for MAIN campus
const MAIN_FACULTIES = {
  'FACULTY OF BUSINESS AND MANAGEMENT': ['BSBA', 'BSHM'],
  'FACULTY OF ADVANCED AND INTERNATIONAL STUDIES': [
    'MAEd Ed. Mgmt.',
    'MAEd-TE',
    'MST-TM',
    'MBA',
    'MBEnvSc',
    'PhD Biology-Biodiversity',
    'EdD-ELM',
    'PHd Env.Sci'
  ],
  'FACULTY OF HUMANITIES, SOCIAL SCIENCES, AND COMMUNACATION': [
    'BA PolSci',
    'BSDevCom',
    'BSPsychology'
  ],
  'FACULTY OF CRIMINAL JUSTICE EDUCATION': ['BSC'],
  'FACULTY OF NURSING AND ALLIED HEALTH SCIENCES': ['BSN'],
  'FACULTY OF COMPUTING, ENGINEERING AND TECHNOLOGY': [
    'BITM',
    'BSCE',
    'BSIT',
    'BSMath'
  ],
  'FACULTY OF AGRICULTURE AND LIFE SCIENCES': [
    'BSAM',
    'BSA',
    'BSBio',
    'BSES'
  ],
  'FACULTY OF TEACHER EDUCATION': [
    'BEED',
    'BCED',
    'BSNED',
    'BPED',
    'BTLED',
    'BSED English',
    'BSED Filipino',
    'BSED Mathematics',
    'BSED Science'
  ]
};

// Programs for Extension Campuses
const EXTENSION_CAMPUS_PROGRAMS = {
  'Baganga': ['BSMath', 'BSIT', 'BSAM', 'BSHM', 'BSES', 'BSA', 'BEED', 'BSA'],
  'Tarragona': ['BSMath', 'BSIT', 'BSAM', 'BSHM', 'BSES', 'BSA', 'BEED', 'BSA'],
  'Banaybanay': ['BAT', 'BSIT', 'BTLED', 'BSA', 'BSBA'],
  'San Isidro': ['BEED', 'BSCrim', 'BSBA', 'BSA']
};

const sanitizeSuccessMessage = (message) => {
  let text = message || defaultSuccessMessage;

  phrasesToStrip.forEach((pattern) => {
    text = text.replace(pattern, '');
  });

  const cleaned = text.replace(/\s{2,}/g, ' ').trim();
  return cleaned || defaultSuccessMessage;
};

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

const Signup = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    unit: '',
    campus: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'
  const [showModal, setShowModal] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: '',
    message: '',
    variant: 'brand',
    confirmLabel: 'Great'
  });
  const [selectedFaculty, setSelectedFaculty] = useState('');
  const [isSelectingProgram, setIsSelectingProgram] = useState(false);

  // Get the current display value for the dropdown
  const getUnitDisplayValue = () => {
    if (!formData.unit) return '';
    
    // For President campus, always show "Executive"
    if (formData.campus === 'President') {
      return 'Executive';
    }
    
    if (formData.campus === 'Main') {
      // If unit is a faculty name, return empty to show programs
      if (Object.keys(MAIN_FACULTIES).includes(formData.unit)) {
        return '';
      }
      // Otherwise, it's a program name (final value)
      return formData.unit;
    }
    
    return formData.unit;
  };

  // Generate unit options based on selected campus and current selection state
  const getUnitOptions = () => {
    if (!formData.campus) return [];
    
    // For President campus, return Executive as the only option
    if (formData.campus === 'President') {
      return ['Executive'];
    }
    
    if (formData.campus === 'Main') {
      // Check if unit value is a faculty name (user just selected a faculty)
      const isFacultySelected = Object.keys(MAIN_FACULTIES).includes(formData.unit);
      
      // Check if unit is a program name (find which faculty it belongs to)
      let programFaculty = null;
      if (formData.unit && !isFacultySelected) {
        // Find which faculty contains this program
        for (const [faculty, programs] of Object.entries(MAIN_FACULTIES)) {
          if (programs.includes(formData.unit)) {
            programFaculty = faculty;
            break;
          }
        }
      }
      
      // If a faculty is selected but program not yet selected, show programs
      if ((selectedFaculty && isSelectingProgram) || isFacultySelected) {
        const faculty = selectedFaculty || formData.unit;
        return MAIN_FACULTIES[faculty] || [];
      }
      
      // If unit is a program (final value), show that faculty's programs so it's visible
      if (programFaculty) {
        return MAIN_FACULTIES[programFaculty] || [];
      }
      
      // Otherwise, show all faculties
      return Object.keys(MAIN_FACULTIES);
    } else {
      // For Extension campuses: just the programs
      return EXTENSION_CAMPUS_PROGRAMS[formData.campus] || [];
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // If campus changes, reset unit and selection state (but preserve username, email, password)
    if (name === 'campus') {
      // If switching to President, auto-set unit to Executive
      if (value === 'President') {
        setFormData({
          ...formData, // Preserve username, email, password, confirmPassword
          campus: value,
          unit: 'Executive' // Auto-set unit for President
        });
      } else {
        // For other campuses, reset unit but preserve other fields
        setFormData({
          ...formData, // Preserve username, email, password, confirmPassword
          campus: value,
          unit: ''
        });
      }
      setSelectedFaculty('');
      setIsSelectingProgram(false);
    } else if (name === 'unit') {
      // Handle unit selection with cascading logic for Main campus
      if (formData.campus === 'Main') {
        // Check if the selected value is a faculty name
        const isFaculty = Object.keys(MAIN_FACULTIES).includes(value);
        
        // Check if current unit is a faculty (user is selecting a program now)
        const currentUnitIsFaculty = Object.keys(MAIN_FACULTIES).includes(formData.unit);
        
        if (isFaculty) {
          // User selected a faculty - store it and show programs next
          setSelectedFaculty(value);
          setIsSelectingProgram(true);
          setFormData({
            ...formData,
            unit: value // Keep faculty name so we know which one was selected
          });
        } else if (currentUnitIsFaculty || (selectedFaculty && isSelectingProgram)) {
          // User selected a program - store just the program name as final value
          setFormData({
            ...formData,
            unit: value // Just the program name (e.g., "BSBA")
          });
          // Reset selection state for next time
          setSelectedFaculty('');
          setIsSelectingProgram(false);
        }
      } else {
        // For Extension campuses, just set the program
        setFormData({
          ...formData,
          unit: value
        });
      }
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    
    // Validation
    if (!formData.unit || formData.unit.trim() === '') {
      setMessage('Please select your unit');
      setMessageType('error');
      setLoading(false);
      return;
    }
    
    // For President campus, ensure unit is Executive
    if (formData.campus === 'President' && formData.unit !== 'Executive') {
      setMessage('Invalid unit selection for President');
      setMessageType('error');
      setLoading(false);
      return;
    }
    
    // For Main campus, ensure a program is selected (not just a faculty)
    // Skip this check for President campus
    if (formData.campus === 'Main' && Object.keys(MAIN_FACULTIES).includes(formData.unit)) {
      setMessage('Please select a program');
      setMessageType('error');
      setLoading(false);
      return;
    }
    
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
      const response = await fetch(API_ENDPOINTS.auth.signup, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          unit: formData.unit,
          campus: formData.campus,
          username: formData.username,
          email: formData.email,
          password: formData.password
        }),
      });

      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        // If response is not JSON, handle as text error
        const textError = await response.text();
        setMessage(textError || 'Signup failed. Please try again.');
        setMessageType('error');
        setLoading(false);
        return;
      }

      if (response.ok) {
        // Check if email verification is required
        if (data.requiresVerification) {
          // Redirect to verification page
          navigate('/verify-email', { 
            state: { 
              email: formData.email 
            } 
          });
        } else {
          // Old flow - show success modal (fallback)
          setModalConfig({
            title: 'Registration Successful!',
            message: sanitizeSuccessMessage(data.message),
            variant: 'brand',
            confirmLabel: 'Got it'
          });
          setShowModal(true);
          
          // Clear form
          setFormData({
            unit: '',
            campus: '',
            username: '',
            email: '',
            password: '',
            confirmPassword: ''
          });
          setSelectedFaculty('');
          setIsSelectingProgram(false);
        }
      } else {
        setMessage(data.message || data.error || 'Signup failed. Please try again.');
        setMessageType('error');
      }
    } catch (error) {
      console.error('Signup error:', error);
      setMessage(error.message || 'Network error. Please check if the server is running.');
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
                Create account
              </h1>
              <p className="text-gray-500 text-responsive-sm">
                Set up your BloomNode profile in a few simple steps
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
              {/* Top row: Campus + Unit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="form-group-responsive">
                  <label
                    htmlFor="campus"
                    className="block text-gray-700 text-responsive-sm font-medium mb-1.5"
                  >
                    Campus
                  </label>
                  <select
                    id="campus"
                    name="campus"
                    value={formData.campus}
                    onChange={handleChange}
                    className="input-responsive tap-target"
                    required
                    disabled={loading}
                  >
                    <option value="">Select a campus</option>
                    {campusOptions.map((campus) => (
                      <option key={campus} value={campus}>
                        {campus}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group-responsive">
                  <label
                    htmlFor="unit"
                    className="block text-gray-700 text-responsive-sm font-medium mb-1.5"
                  >
                    Unit
                  </label>
                  <select
                    id="unit"
                    name="unit"
                    value={getUnitDisplayValue()}
                    onChange={handleChange}
                    className="input-responsive tap-target"
                    required
                    disabled={loading || !formData.campus || formData.campus === 'President'}
                  >
                    <option value="">
                      {formData.campus === 'Main' && Object.keys(MAIN_FACULTIES).includes(formData.unit) 
                        ? `Select Program for ${formData.unit}` 
                        : formData.campus === 'President'
                        ? 'Executive (Auto-selected)'
                        : 'Select Unit'}
                    </option>
                    {getUnitOptions().map((option, index) => (
                      <option key={`${option}-${index}`} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Username */}
              <div className="form-group-responsive">
                <label
                  htmlFor="username"
                  className="block text-gray-700 text-responsive-sm font-medium mb-1.5"
                >
                  Username
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="input-responsive tap-target"
                  placeholder="Choose a username"
                  required
                  disabled={loading}
                />
              </div>

              {/* Middle: Email full width */}
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

              {/* Bottom row: Password + Confirm password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      className="input-responsive tap-target pr-10"
                      placeholder="Create a password (min 12 characters)"
                      required
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-0 top-0 bottom-0 flex items-center justify-center w-10 text-gray-400 hover:text-gray-600 tap-target select-none-mobile"
                      tabIndex={-1}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
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
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
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
                      )}
                    </button>
                  </div>
                </div>

                <div className="form-group-responsive">
                  <label
                    htmlFor="confirmPassword"
                    className="block text-gray-700 text-responsive-sm font-medium mb-1.5"
                  >
                    Confirm password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="input-responsive tap-target pr-10"
                      placeholder="Confirm your password"
                      required
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute right-0 top-0 bottom-0 flex items-center justify-center w-10 text-gray-400 hover:text-gray-600 tap-target select-none-mobile"
                      tabIndex={-1}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? (
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
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
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
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-responsive w-full bg-gradient-to-r from-medium-gray to-dark-charcoal text-white hover:from-light-gray hover:to-darkest-gray disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>

            <div className="text-center mt-6 pt-4 border-t border-gray-100">
              <p className="text-gray-600 text-responsive-sm">
                Already have an account?{' '}
                <Link
                  to="/login"
                  className="text-medium-gray font-semibold hover:text-dark-charcoal transition-colors duration-200"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Signup;
