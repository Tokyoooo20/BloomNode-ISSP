import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Modal from './Modal';
import { API_ENDPOINTS, getAuthHeaders, getFileUrl } from '../../utils/api';

const Profile = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState(null);
  const [profileForm, setProfileForm] = useState({
    username: '',
    unit: ''
  });
  const [emailForm, setEmailForm] = useState({
    currentEmail: '',
    newEmail: '',
    confirmEmail: '',
    password: ''
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [profilePicture, setProfilePicture] = useState(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState(null);
  const [alertModal, setAlertModal] = useState({ 
    show: false, 
    variant: 'default', 
    title: '', 
    message: '' 
  });

  // Fetch user data on component mount
  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(API_ENDPOINTS.auth.me, {
        headers: getAuthHeaders()
      });
      
      setUserData(response.data);
      setProfileForm({
        username: response.data.username || '',
        unit: response.data.unit || ''
      });
      setEmailForm({
        currentEmail: response.data.email || '',
        newEmail: '',
        confirmEmail: '',
        password: ''
      });
      // Set profile picture preview with full URL
      if (response.data.profilePicture) {
        const profilePictureUrl = getFileUrl(response.data.profilePicture);
        setProfilePicturePreview(profilePictureUrl);
      } else {
        setProfilePicturePreview(null);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      setAlertModal({
        show: true,
        variant: 'danger',
        title: 'Error',
        message: 'Failed to load user data. Please refresh the page.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileForm(prev => ({ ...prev, [name]: value }));
  };

  const handleEmailChange = (e) => {
    const { name, value } = e.target;
    setEmailForm(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({ ...prev, [name]: value }));
  };

  const handleProfilePictureChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setAlertModal({
          show: true,
          variant: 'danger',
          title: 'File Too Large',
          message: 'Profile picture must be less than 5MB.'
        });
        return;
      }

      setProfilePicture(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicturePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const formData = new FormData();
      
      formData.append('username', profileForm.username);
      
      if (profilePicture) {
        formData.append('profilePicture', profilePicture);
      }

      const response = await axios.put(
        API_ENDPOINTS.auth.profile,
        formData,
        {
          headers: { 
            'x-auth-token': token,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      setUserData(response.data);
      setProfilePicture(null);
      
      // Update profile picture preview with the new image from server
      if (response.data.profilePicture) {
        // Construct full URL to the profile picture
        const profilePictureUrl = getFileUrl(response.data.profilePicture);
        setProfilePicturePreview(profilePictureUrl);
      } else {
        setProfilePicturePreview(null);
      }
      
      setAlertModal({
        show: true,
        variant: 'success',
        title: 'Profile Updated',
        message: 'Your profile has been updated successfully!'
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      setAlertModal({
        show: true,
        variant: 'danger',
        title: 'Update Failed',
        message: error.response?.data?.message || 'Failed to update profile.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangeEmail = async (e) => {
    e.preventDefault();
    
    if (emailForm.newEmail !== emailForm.confirmEmail) {
      setAlertModal({
        show: true,
        variant: 'danger',
        title: 'Email Mismatch',
        message: 'New email and confirmation email do not match.'
      });
      return;
    }

    if (!emailForm.password) {
      setAlertModal({
        show: true,
        variant: 'danger',
        title: 'Password Required',
        message: 'Please enter your current password to change your email.'
      });
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      await axios.put(
        API_ENDPOINTS.auth.changeEmail,
        {
          newEmail: emailForm.newEmail,
          password: emailForm.password
        },
        {
          headers: { 'x-auth-token': token }
        }
      );

      setAlertModal({
        show: true,
        variant: 'success',
        title: 'Email Updated',
        message: 'Your email has been updated successfully!'
      });

      // Reset form and refresh user data
      setEmailForm({
        currentEmail: emailForm.newEmail,
        newEmail: '',
        confirmEmail: '',
        password: ''
      });
      await fetchUserData();
    } catch (error) {
      console.error('Error changing email:', error);
      setAlertModal({
        show: true,
        variant: 'danger',
        title: 'Email Change Failed',
        message: error.response?.data?.message || 'Failed to change email.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setAlertModal({
        show: true,
        variant: 'danger',
        title: 'Password Mismatch',
        message: 'New password and confirmation password do not match.'
      });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setAlertModal({
        show: true,
        variant: 'danger',
        title: 'Weak Password',
        message: 'Password must be at least 6 characters long.'
      });
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      await axios.put(
        API_ENDPOINTS.auth.changePassword,
        {
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        },
        {
          headers: { 'x-auth-token': token }
        }
      );

      setAlertModal({
        show: true,
        variant: 'success',
        title: 'Password Updated',
        message: 'Your password has been changed successfully!'
      });

      // Reset form
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      console.error('Error changing password:', error);
      setAlertModal({
        show: true,
        variant: 'danger',
        title: 'Password Change Failed',
        message: error.response?.data?.message || 'Failed to change password.'
      });
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading && !userData) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-xl shadow-lg p-8 mb-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
          <div className="relative">
            {profilePicturePreview ? (
              <img
                src={profilePicturePreview}
                alt="Profile"
                className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center border-4 border-white shadow-lg">
                <span className="text-gray-700 text-2xl font-bold">
                  {getInitials(userData?.username)}
                </span>
              </div>
            )}
            <div className="absolute bottom-0 right-0 w-6 h-6 bg-green-500 rounded-full border-2 border-white"></div>
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-2xl font-bold text-white mb-1">{userData?.username || 'User'}</h1>
            <p className="text-gray-200 text-sm mb-2">{userData?.email}</p>
            <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
              <span className="inline-flex items-center px-3 py-1 bg-white/20 backdrop-blur-sm text-white rounded-full text-xs font-semibold uppercase tracking-wide">
                {userData?.role === 'Program head' ? 'Program Head' : userData?.role}
              </span>
              <span className="inline-flex items-center px-3 py-1 bg-white/10 backdrop-blur-sm text-white rounded-full text-xs font-medium">
                {userData?.unit || 'No Unit'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 overflow-hidden">
        <nav className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 px-6 py-4 text-sm font-semibold transition-all duration-200 relative ${
              activeTab === 'profile'
                ? 'text-gray-900 bg-white'
                : 'text-gray-600 hover:text-gray-900 bg-gray-50'
            }`}
          >
            <span className="flex items-center justify-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>Profile & Security</span>
            </span>
            {activeTab === 'profile' && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab('account')}
            className={`flex-1 px-6 py-4 text-sm font-semibold transition-all duration-200 relative ${
              activeTab === 'account'
                ? 'text-gray-900 bg-white'
                : 'text-gray-600 hover:text-gray-900 bg-gray-50'
            }`}
          >
            <span className="flex items-center justify-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Account Info</span>
            </span>
            {activeTab === 'account' && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700"></div>
            )}
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Profile Information Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-2 mb-6">
              <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="text-lg font-bold text-gray-900">Profile Information</h2>
            </div>
            
            <form onSubmit={handleUpdateProfile} className="space-y-5">
              {/* Profile Picture */}
              <div className="bg-gray-50 rounded-lg p-6 text-center">
                <div className="flex flex-col items-center">
                  {profilePicturePreview ? (
                    <img
                      src={profilePicturePreview}
                      alt="Preview"
                      className="w-32 h-32 rounded-full object-cover border-4 border-gray-300 shadow-md mb-4"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center border-4 border-gray-300 shadow-md mb-4">
                      <span className="text-white text-3xl font-bold">
                        {getInitials(profileForm.username)}
                      </span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePictureChange}
                    className="hidden"
                    id="profile-picture-upload"
                  />
                  <label
                    htmlFor="profile-picture-upload"
                    className="inline-flex items-center px-4 py-2 bg-gray-700 hover:bg-gray-800 text-white rounded-lg cursor-pointer transition-colors duration-200 text-sm font-medium shadow-sm"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Change Photo
                  </label>
                  <p className="text-xs text-gray-500 mt-2">JPG, PNG or GIF. Max 5MB</p>
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  name="username"
                  value={profileForm.username}
                  onChange={handleProfileChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent text-gray-900 transition-all"
                  placeholder="Enter your full name"
                  required
                />
              </div>

              {/* Unit/Department */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Unit/Department
                </label>
                <input
                  type="text"
                  value={profileForm.unit}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed text-gray-600"
                  disabled
                />
                <p className="text-xs text-gray-500 mt-1.5 flex items-center">
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  Contact admin to change unit
                </p>
              </div>

              {/* Save Button */}
              <div className="pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-6 py-3 bg-gray-700 hover:bg-gray-800 text-white rounded-lg font-semibold transition-all duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed shadow-md hover:shadow-lg flex items-center justify-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{loading ? 'Saving Changes...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Security Settings Card */}
          <div className="space-y-6">
            {/* Change Email Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-2 mb-6">
                <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <h2 className="text-lg font-bold text-gray-900">Change Email</h2>
              </div>
              
              <form onSubmit={handleChangeEmail} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Current Email
                  </label>
                  <input
                    type="email"
                    value={emailForm.currentEmail}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed text-gray-600"
                    disabled
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    New Email Address
                  </label>
                  <input
                    type="email"
                    name="newEmail"
                    value={emailForm.newEmail}
                    onChange={handleEmailChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent text-gray-900 transition-all"
                    placeholder="your.new@email.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Confirm New Email
                  </label>
                  <input
                    type="email"
                    name="confirmEmail"
                    value={emailForm.confirmEmail}
                    onChange={handleEmailChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent text-gray-900 transition-all"
                    placeholder="Confirm your new email"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Current Password
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={emailForm.password}
                    onChange={handleEmailChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent text-gray-900 transition-all"
                    placeholder="Verify with your password"
                    required
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all duration-200 disabled:bg-blue-400 disabled:cursor-not-allowed shadow-md hover:shadow-lg flex items-center justify-center space-x-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span>{loading ? 'Updating Email...' : 'Update Email'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Change Password Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-2 mb-6">
                <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <h2 className="text-lg font-bold text-gray-900">Change Password</h2>
              </div>
              
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Current Password
                  </label>
                  <input
                    type="password"
                    name="currentPassword"
                    value={passwordForm.currentPassword}
                    onChange={handlePasswordChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent text-gray-900 transition-all"
                    placeholder="Enter current password"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    name="newPassword"
                    value={passwordForm.newPassword}
                    onChange={handlePasswordChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent text-gray-900 transition-all"
                    placeholder="Enter new password"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1.5 flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    Must be at least 6 characters
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={passwordForm.confirmPassword}
                    onChange={handlePasswordChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent text-gray-900 transition-all"
                    placeholder="Confirm new password"
                    required
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full px-6 py-3 bg-gray-700 hover:bg-gray-800 text-white rounded-lg font-semibold transition-all duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed shadow-md hover:shadow-lg flex items-center justify-center space-x-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span>{loading ? 'Changing Password...' : 'Change Password'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Account Info Tab */}
      {activeTab === 'account' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="flex items-center space-x-2 mb-6">
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-xl font-bold text-gray-900">Account Information</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Account ID
              </label>
              <p className="text-gray-900 font-mono text-sm break-all">{userData?._id}</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Role
              </label>
              <p className="text-gray-900 font-medium">{userData?.role}</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Unit/Department
              </label>
              <p className="text-gray-900 font-medium">{userData?.unit || 'N/A'}</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <p className="text-gray-900 font-medium break-all">{userData?.email}</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Account Created
              </label>
              <p className="text-gray-900 font-medium">{formatDate(userData?.createdAt)}</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Last Updated
              </label>
              <p className="text-gray-900 font-medium">{formatDate(userData?.updatedAt)}</p>
            </div>
          </div>

          {userData?.emailVerified !== undefined && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className={`inline-flex items-center px-4 py-2 rounded-lg ${
                userData.emailVerified 
                  ? 'bg-green-50 text-green-800' 
                  : 'bg-yellow-50 text-yellow-800'
              }`}>
                {userData.emailVerified ? (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-semibold">Email Verified</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span className="text-sm font-semibold">Email Not Verified</span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Alert Modal */}
      <Modal
        isOpen={alertModal.show}
        variant={alertModal.variant}
        title={alertModal.title}
        message={alertModal.message}
        confirmLabel="OK"
        cancelLabel={null}
        onConfirm={() => setAlertModal({ show: false, variant: 'default', title: '', message: '' })}
        onClose={() => setAlertModal({ show: false, variant: 'default', title: '', message: '' })}
      />
    </div>
  );
};

export default Profile;

