import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import Modal from './Modal';
import { API_ENDPOINTS, getAuthHeaders, getFileUrl } from '../../utils/api';

const Profile = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarUserData, setSidebarUserData] = useState({ unit: '', username: '', profilePicture: null });
  const [profileForm, setProfileForm] = useState({
    username: '',
    unit: '',
    newEmail: '',
    confirmEmail: '',
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
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Fetch user data on component mount and when location changes
  useEffect(() => {
    // Always fetch user data when component mounts or pathname changes
    fetchUserData();
    
    // Only fetch sidebar data and reset sidebar state if on standalone profile route
    if (location.pathname === '/profile') {
      fetchSidebarUserData();
      // Reset sidebar state when navigating to profile
      setSidebarOpen(false);
      // Reset active tab to default
      setActiveTab('profile');
    }
  }, [location.pathname]);

  // Fetch admin user data for sidebar
  const fetchSidebarUserData = async () => {
    try {
      const response = await axios.get(API_ENDPOINTS.auth.me, {
        headers: getAuthHeaders()
      });
      setSidebarUserData({
        unit: response.data.unit || '',
        username: response.data.username || '',
        profilePicture: response.data.profilePicture 
          ? getFileUrl(response.data.profilePicture)
          : null
      });
    } catch (error) {
      console.error('Error fetching sidebar user data:', error);
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setSidebarUserData({
            unit: parsedUser.unit || '',
            username: parsedUser.username || '',
            profilePicture: null
          });
        } catch (parseError) {
          console.error('Error parsing stored user data:', parseError);
        }
      }
    }
  };

  const handleLogoutClick = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleSidebarNavigation = (section) => {
    // Close sidebar on mobile
    setSidebarOpen(false);
    // Navigate to dashboard with section state
    navigate('/dashboard', { 
      state: { section },
      replace: false
    });
  };

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
        unit: response.data.unit || '',
        newEmail: '',
        confirmEmail: '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
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

  const handleCancelEditProfile = () => {
    setProfileForm({
      username: userData?.username || '',
      unit: userData?.unit || '',
      newEmail: '',
      confirmEmail: '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setProfilePicturePreview(userData?.profilePicture ? getFileUrl(userData.profilePicture) : null);
    setProfilePicture(null);
    setIsEditingProfile(false);
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const promises = [];
      let updatedProfileData = null;

      // 1. Profile Info (Username, Profile Picture)
      if (profileForm.username !== userData.username || profilePicture) {
        const formData = new FormData();
        formData.append('username', profileForm.username);
        if (profilePicture) {
          formData.append('profilePicture', profilePicture);
        }
        
        promises.push(
          axios.put(API_ENDPOINTS.auth.profile, formData, {
            headers: { 'x-auth-token': token, 'Content-Type': 'multipart/form-data' }
          }).then(res => { updatedProfileData = res.data; })
        );
      }

      // 2. Email Change
      if (profileForm.newEmail) {
        if (profileForm.newEmail !== profileForm.confirmEmail) {
          throw new Error('New email and confirmation email do not match.');
        }
        if (!profileForm.currentPassword) {
          throw new Error('Please enter your current password to change your email.');
        }
        
        promises.push(
          axios.put(API_ENDPOINTS.auth.changeEmail, {
            newEmail: profileForm.newEmail,
            password: profileForm.currentPassword
          }, { headers: { 'x-auth-token': token } })
        );
      }

      // 3. Password Change
      if (profileForm.newPassword) {
        if (profileForm.newPassword !== profileForm.confirmPassword) {
          throw new Error('New password and confirmation password do not match.');
        }
        if (profileForm.newPassword.length < 6) {
          throw new Error('New password must be at least 6 characters long.');
        }
        if (!profileForm.currentPassword) {
          throw new Error('Please enter your current password to change your password.');
        }
        
        promises.push(
          axios.put(API_ENDPOINTS.auth.changePassword, {
            currentPassword: profileForm.currentPassword,
            newPassword: profileForm.newPassword
          }, { headers: { 'x-auth-token': token } })
        );
      }

      if (promises.length === 0) {
         setIsEditingProfile(false);
         setLoading(false);
         return;
      }

      await Promise.all(promises);

      // Refresh data
      if (profileForm.newEmail) {
        await fetchUserData(); // Updates userData and resets form implicitly
      } else {
        if (updatedProfileData) {
          setUserData(updatedProfileData);
          if (updatedProfileData.profilePicture) {
            setProfilePicturePreview(getFileUrl(updatedProfileData.profilePicture));
          } else {
            setProfilePicturePreview(null);
          }
        }
        setProfileForm(prev => ({
          ...prev,
          newEmail: '',
          confirmEmail: '',
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        }));
      }
      
      setProfilePicture(null);
      setAlertModal({
        show: true,
        variant: 'success',
        title: 'Profile Updated',
        message: 'Your profile has been successfully updated!'
      });
      setIsEditingProfile(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      setAlertModal({
        show: true,
        variant: 'danger',
        title: 'Update Failed',
        message: error.response?.data?.message || error.message || 'Failed to update profile.'
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
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  // Check if we're on the standalone /profile route or embedded in Dashboard
  const isStandaloneProfile = location.pathname === '/profile';

  // Content to render (without sidebar wrapper)
  const profileContent = (
    <>
      {/* Content */}
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">

        <div className="max-w-6xl mx-auto">
          {!isEditingProfile ? (
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow duration-300">
              <div className="px-6 sm:px-8 py-6 border-b border-gray-100 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 bg-gray-50/80">
                <div>
                  <h3 className="text-xl leading-6 font-bold text-gray-900">Personal Information</h3>
                  <p className="mt-2 max-w-2xl text-sm text-gray-500">Personal details and application settings.</p>
                </div>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setIsEditingProfile(true);
                  }}
                  className="inline-flex items-center justify-center px-4 py-2.5 border border-gray-300 shadow-sm text-sm font-semibold rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                >
                  <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Edit Profile
                </button>
              </div>
              <div className="px-6 sm:px-8 py-6">
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8">
                  <div className="col-span-1 group">
                    <dt className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Full name</dt>
                    <dd className="mt-1 text-base font-medium text-gray-900 bg-gray-50 px-4 py-3 rounded-lg border border-gray-100 group-hover:bg-gray-100 transition-colors">{userData?.username}</dd>
                  </div>
                  <div className="col-span-1 group">
                    <dt className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Email address</dt>
                    <dd className="mt-1 text-base font-medium text-gray-900 bg-gray-50 px-4 py-3 rounded-lg border border-gray-100 group-hover:bg-gray-100 transition-colors">{userData?.email}</dd>
                  </div>
                  <div className="col-span-1 group">
                    <dt className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Role</dt>
                    <dd className="mt-1 text-base font-medium text-gray-900 bg-gray-50 px-4 py-3 rounded-lg border border-gray-100 group-hover:bg-gray-100 transition-colors">{userData?.role}</dd>
                  </div>
                  <div className="col-span-1 group">
                    <dt className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Unit / Department</dt>
                    <dd className="mt-1 text-base font-medium text-gray-900 bg-gray-50 px-4 py-3 rounded-lg border border-gray-100 group-hover:bg-gray-100 transition-colors">{userData?.unit || 'N/A'}</dd>
                  </div>
                </dl>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 sm:p-8 hover:shadow-lg transition-shadow duration-300">
              <div className="flex items-center space-x-2 mb-6 border-b border-gray-100 pb-4">
                <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <h2 className="text-lg font-bold text-gray-900">Edit Profile Details</h2>
              </div>
              
              <form onSubmit={handleUpdateProfile} className="space-y-5">
                {/* Profile Picture */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6 mb-6">
                  <div className="shrink-0 relative group">
                    {profilePicturePreview ? (
                      <img
                        src={profilePicturePreview}
                        alt="Preview"
                        className="w-24 h-24 rounded-full object-cover border border-gray-200 shadow-sm"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200 shadow-sm">
                        <span className="text-gray-500 text-3xl font-semibold">
                          {getInitials(profileForm.username)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-1">Profile Picture</h3>
                    <p className="text-sm text-gray-500 mb-3">Upload a new avatar. Recommended square image.</p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleProfilePictureChange}
                      className="hidden"
                      id="profile-picture-upload"
                    />
                    <label
                      htmlFor="profile-picture-upload"
                      className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-md cursor-pointer transition-colors duration-200 text-sm font-medium shadow-sm"
                    >
                      <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Change Photo
                    </label>
                    <p className="text-xs text-gray-400 mt-2">JPG, PNG or GIF. Max 5MB.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
                  {/* Full Name */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      name="username"
                      value={profileForm.username}
                      onChange={handleProfileChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900 transition-colors shadow-sm"
                      placeholder="Enter your full name"
                      required
                    />
                  </div>

                  {/* Unit/Department */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Unit/Department
                    </label>
                    <input
                      type="text"
                      value={profileForm.unit}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm cursor-not-allowed text-gray-500 shadow-sm"
                      disabled
                    />
                    <p className="text-xs text-gray-500 mt-1 flex items-center">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      Contact admin to change
                    </p>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-100 mt-8">
                  <h3 className="text-lg font-bold text-gray-900 mb-5">Change Email Address <span className="text-sm font-normal text-gray-500">(Optional)</span></h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        New Email Address
                      </label>
                      <input
                        type="email"
                        name="newEmail"
                        value={profileForm.newEmail}
                        onChange={handleProfileChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900 transition-colors shadow-sm"
                        placeholder="your.new@email.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Confirm New Email
                      </label>
                      <input
                        type="email"
                        name="confirmEmail"
                        value={profileForm.confirmEmail}
                        onChange={handleProfileChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900 transition-colors shadow-sm"
                        placeholder="Confirm your new email"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-100 mt-8">
                  <h3 className="text-lg font-bold text-gray-900 mb-5">Change Password <span className="text-sm font-normal text-gray-500">(Optional)</span></h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        New Password
                      </label>
                      <input
                        type="password"
                        name="newPassword"
                        value={profileForm.newPassword}
                        onChange={handleProfileChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900 transition-colors shadow-sm"
                        placeholder="Enter new password"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        name="confirmPassword"
                        value={profileForm.confirmPassword}
                        onChange={handleProfileChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900 transition-colors shadow-sm"
                        placeholder="Confirm new password"
                      />
                    </div>
                  </div>
                </div>

                {(profileForm.newEmail || profileForm.newPassword) && (
                  <div className="pt-6 border-t border-gray-100 mt-8">
                    <div className="bg-blue-50/50 p-5 rounded-lg border border-blue-100">
                      <label className="block text-sm font-bold text-blue-900 mb-1">
                        Current Password (Required)
                      </label>
                      <p className="text-xs text-blue-700 mb-2">Please enter your current password to authorize changes to your email or password.</p>
                      <input
                        type="password"
                        name="currentPassword"
                        value={profileForm.currentPassword}
                        onChange={handleProfileChange}
                        className="w-full max-w-sm px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900 transition-colors shadow-sm"
                        placeholder="Verify with your current password"
                        required={(profileForm.newEmail || profileForm.newPassword) ? true : false}
                      />
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-8 mt-8 border-t border-gray-200 flex flex-col-reverse sm:flex-row sm:justify-end gap-3 sm:gap-4 sm:space-x-0">
                  <button
                    type="button"
                    onClick={handleCancelEditProfile}
                    disabled={loading}
                    className="w-full sm:w-auto px-6 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-semibold transition-colors duration-200 disabled:opacity-50 shadow-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors duration-200 disabled:bg-blue-400 disabled:cursor-not-allowed shadow-sm flex items-center justify-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{loading ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

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
      </div>
    </>
  );

  // If embedded in Dashboard, return just the content
  if (!isStandaloneProfile) {
    return profileContent;
  }

  // If standalone /profile route, return with sidebar
  return (
    <div className="min-h-screen bg-gray-900 flex">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-900/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed w-64 h-screen bg-gray-800 shadow-lg overflow-y-auto z-50 transform transition-transform duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0`}>
        {/* User Profile */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-medium-gray to-dark-charcoal rounded-full flex items-center justify-center overflow-hidden">
              {sidebarUserData.profilePicture ? (
                <img 
                  src={sidebarUserData.profilePicture} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white font-semibold text-sm">A</span>
              )}
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm">
                ADMIN
              </h3>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-6">
          <div className="px-4">
            <button
              onClick={() => handleSidebarNavigation('dashboard')}
              className="w-full flex items-center px-4 py-3 text-left rounded-lg mb-2 transition-colors tap-target text-gray-300 hover:bg-gray-700 hover:text-white"
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Dashboard
            </button>
            
            <button
              onClick={() => handleSidebarNavigation('offices')}
              className="w-full flex items-center px-4 py-3 text-left rounded-lg mb-2 transition-colors tap-target text-gray-300 hover:bg-gray-700 hover:text-white"
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Offices
            </button>

            <button
              onClick={() => handleSidebarNavigation('issp')}
              className="w-full flex items-center px-4 py-3 text-left rounded-lg mb-2 transition-colors tap-target text-gray-300 hover:bg-gray-700 hover:text-white"
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              ISSP
            </button>

            <button
              onClick={() => handleSidebarNavigation('users')}
              className="w-full flex items-center px-4 py-3 text-left rounded-lg mb-2 transition-colors tap-target text-gray-300 hover:bg-gray-700 hover:text-white"
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Users
            </button>

            <button
              onClick={() => handleSidebarNavigation('logs')}
              className="w-full flex items-center px-4 py-3 text-left rounded-lg mb-2 transition-colors tap-target text-gray-300 hover:bg-gray-700 hover:text-white"
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Activity Log
            </button>

            <button
              onClick={() => {
                setSidebarOpen(false);
                navigate('/profile');
              }}
              className="w-full flex items-center px-4 py-3 text-left rounded-lg mb-2 transition-colors tap-target bg-gray-700 text-white"
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Profile
            </button>
          </div>
        </nav>
        
        {/* Logout Button */}
        <div className="absolute bottom-4 sm:bottom-6 left-2 sm:left-4 right-2 sm:right-auto">
          <button 
            onClick={handleLogoutClick}
            className="bg-red-500 text-white py-2.5 sm:py-2 px-4 sm:px-20 w-full sm:w-56 rounded-lg font-medium transition-all duration-300 hover:bg-red-600 shadow-lg tap-target"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-gray-100 lg:ml-64">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-4 sm:px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              {/* Hamburger Menu Button */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors tap-target"
                aria-label="Toggle menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Profile</h1>
            </div>
          </div>
        </header>

        {profileContent}
      </div>
    </div>
  );
};

export default Profile;

