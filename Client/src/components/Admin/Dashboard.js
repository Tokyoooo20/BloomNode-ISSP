import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Offices from './Offices';
import Users from './Users';
import ISSP from './ISSP';
import ActivityLog from '../common/ActivityLog';
import Profile from '../common/Profile';
import { API_ENDPOINTS, getAuthHeaders, getFileUrl } from '../../utils/api';

const Dashboard = () => {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [animateReports, setAnimateReports] = useState(false);
  const [selectedYearRange, setSelectedYearRange] = useState('2021-2023');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [chartAnimation, setChartAnimation] = useState(false);
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);
  const [stats, setStats] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userData, setUserData] = useState({ unit: '', username: '', profilePicture: null });

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(API_ENDPOINTS.notifications.list, {
        headers: getAuthHeaders()
      });
      
      const transformedNotifications = response.data.notifications.map(notif => {
        let type = 'rejected';
        if (notif.type === 'request_submitted') {
          type = 'submitted';
        } else if (notif.type === 'approved' || notif.type === 'item_approved' || notif.type === 'issp_approved') {
          type = 'approved';
        } else if (notif.type === 'rejected' || notif.type === 'disapproved' || notif.type === 'item_disapproved' || notif.type === 'issp_rejected') {
          type = 'rejected';
        }
        
        return {
          id: notif._id,
          type: type,
          title: notif.title,
          message: notif.message,
          timestamp: new Date(notif.createdAt).toLocaleString(),
          isNew: !notif.isRead
        };
      });
      
      setNotifications(transformedNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  // Fetch user data
  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(API_ENDPOINTS.auth.me, {
        headers: getAuthHeaders()
      });
      setUserData({
        unit: response.data.unit || '',
        username: response.data.username || '',
        profilePicture: response.data.profilePicture 
          ? getFileUrl(response.data.profilePicture)
          : null
      });
    } catch (error) {
      console.error('Error fetching user data:', error);
      // Fallback to localStorage if API fails
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUserData({
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

  // Fetch dashboard statistics
  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(API_ENDPOINTS.admin.dashboardStats, {
          headers: getAuthHeaders()
        });
        setStats(response.data);
        
        // Set first year range as default if available
        const yearRanges = Object.keys(response.data.yearRangeStats);
        if (yearRanges.length > 0 && selectedYearRange === '2021-2023') {
          setSelectedYearRange(yearRanges[0]);
        }
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
      }
    };
    fetchDashboardStats();
    fetchNotifications();
    fetchUserData();
    
    // Refresh notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Auto-hide notification dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showNotifications && !event.target.closest('.notification-container')) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  useEffect(() => {
    if (activeSection === 'dashboard') {
      setAnimateReports(false);
      const timer = setTimeout(() => setAnimateReports(true), 50);
      return () => clearTimeout(timer);
    } else {
      setAnimateReports(false);
    }
  }, [activeSection]);

  useEffect(() => {
    setChartAnimation(true);
  }, []);

  // Year range data - merge real data with default structure
  const yearRangeData = stats ? Object.keys(stats.yearRangeStats).reduce((acc, yearRange) => {
    const data = stats.yearRangeStats[yearRange];
    const [startYear, endYear] = yearRange.split('-').map(Number);
    const yearCount = endYear - startYear + 1;
    const years = [];
    
    for (let i = 0; i < yearCount; i++) {
      const year = startYear + i;
      const value = Math.floor(data.total / yearCount);
      const percentage = data.total > 0 ? Math.round((value / data.total) * 100) : 0;
      years.push({ year: year.toString(), value, percentage });
    }
    
    acc[yearRange] = {
      total: data.total,
      years: years,
      chartPath1: 'M 0 140 L 100 120 L 200 100 L 300 80 L 400 60 L 500 70 L 600 50 L 700 40 L 800 30 L 800 160 L 0 160 Z',
      chartPath2: 'M 0 120 L 100 100 L 200 80 L 300 90 L 400 70 L 500 85 L 600 75 L 700 65 L 800 60 L 800 160 L 0 160 Z'
    };
    return acc;
  }, {}) : {
    '2021-2023': {
      total: 1000,
      years: [
        { year: '2021', value: 300, percentage: 30 },
        { year: '2022', value: 500, percentage: 50 },
        { year: '2023', value: 200, percentage: 20 }
      ],
      chartPath1: 'M 0 140 L 100 120 L 200 100 L 300 80 L 400 60 L 500 70 L 600 50 L 700 40 L 800 30 L 800 160 L 0 160 Z',
      chartPath2: 'M 0 120 L 100 100 L 200 80 L 300 90 L 400 70 L 500 85 L 600 75 L 700 65 L 800 60 L 800 160 L 0 160 Z'
    },
    '2018-2020': {
      total: 2000,
      years: [
        { year: '2018', value: 800, percentage: 40 },
        { year: '2019', value: 700, percentage: 35 },
        { year: '2020', value: 500, percentage: 25 }
      ],
      chartPath1: 'M 0 120 L 100 110 L 200 90 L 300 70 L 400 50 L 500 60 L 600 40 L 700 30 L 800 20 L 800 160 L 0 160 Z',
      chartPath2: 'M 0 100 L 100 90 L 200 70 L 300 80 L 400 60 L 500 75 L 600 65 L 700 55 L 800 50 L 800 160 L 0 160 Z'
    },
    '2015-2017': {
      total: 1500,
      years: [
        { year: '2015', value: 400, percentage: 27 },
        { year: '2016', value: 600, percentage: 40 },
        { year: '2017', value: 500, percentage: 33 }
      ],
      chartPath1: 'M 0 130 L 100 125 L 200 110 L 300 95 L 400 80 L 500 85 L 600 70 L 700 60 L 800 50 L 800 160 L 0 160 Z',
      chartPath2: 'M 0 110 L 100 105 L 200 90 L 300 100 L 400 85 L 500 95 L 600 85 L 700 75 L 800 70 L 800 160 L 0 160 Z'
    }
  };

  const handleYearRangeChange = (yearRange) => {
    setChartAnimation(false);
    setSelectedYearRange(yearRange);
    setIsDropdownOpen(false);
    setTimeout(() => setChartAnimation(true), 100);
  };

  const currentData = yearRangeData[selectedYearRange] || yearRangeData[Object.keys(yearRangeData)[0]] || {
    total: 0,
    years: [],
    chartPath1: 'M 0 140 L 100 120 L 200 100 L 300 80 L 400 60 L 500 70 L 600 50 L 700 40 L 800 30 L 800 160 L 0 160 Z',
    chartPath2: 'M 0 120 L 100 100 L 200 80 L 300 90 L 400 70 L 500 85 L 600 75 L 700 65 L 800 60 L 800 160 L 0 160 Z'
  };

  const handleLogoutClick = () => {
    setShowLogoutConfirmation(true);
  };

  const handleConfirmLogout = () => {
    setShowLogoutConfirmation(false);
    window.location.href = '/login';
  };

  const handleCancelLogout = () => {
    setShowLogoutConfirmation(false);
  };

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
              {userData.profilePicture ? (
                <img 
                  src={userData.profilePicture} 
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
              onClick={() => {
                setActiveSection('dashboard');
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center px-4 py-3 text-left rounded-lg mb-2 transition-colors tap-target ${
                activeSection === 'dashboard' 
                  ? 'bg-gray-700 text-white' 
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Dashboard
            </button>
            
            <button
              onClick={() => {
                setActiveSection('offices');
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center px-4 py-3 text-left rounded-lg mb-2 transition-colors tap-target ${
                activeSection === 'offices' 
                  ? 'bg-gray-700 text-white' 
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Offices
            </button>

            <button
              onClick={() => {
                setActiveSection('issp');
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center px-4 py-3 text-left rounded-lg mb-2 transition-colors tap-target ${
                activeSection === 'issp' 
                  ? 'bg-gray-700 text-white' 
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              ISSP
            </button>

            
            <button
              onClick={() => {
                setActiveSection('users');
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center px-4 py-3 text-left rounded-lg mb-2 transition-colors tap-target ${
                activeSection === 'users' 
                  ? 'bg-gray-700 text-white' 
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Users
            </button>

            <button
              onClick={() => {
                setActiveSection('logs');
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center px-4 py-3 text-left rounded-lg mb-2 transition-colors tap-target ${
                activeSection === 'logs' 
                  ? 'bg-gray-700 text-white' 
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Activity Log
            </button>

            <button
              onClick={() => {
                setActiveSection('profile');
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center px-4 py-3 text-left rounded-lg mb-2 transition-colors tap-target ${
                activeSection === 'profile' 
                  ? 'bg-gray-700 text-white' 
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
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
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
                {activeSection === 'issp' ? 'ISSP' : activeSection.charAt(0).toUpperCase() + activeSection.slice(1)}
              </h1>
            </div>
            {/* Notification Bell */}
            <div className="relative notification-container">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 2a6 6 0 00-6 6c0 1.887-.454 3.665-1.257 5.234a.75.75 0 00.515 1.076 32.91 32.91 0 003.256.508 1.5 1.5 0 002.972 0 32.91 32.91 0 003.256-.508.75.75 0 00.515-1.076A11.448 11.448 0 0016 8a6 6 0 00-6-6zM8.05 14.943a33.54 33.54 0 003.9 0 .75.75 0 01-.9.417.75.75 0 01-.9-.417z" />
                </svg>
                {notifications.filter(n => n.isNew).length > 0 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-gray-400 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">{notifications.filter(n => n.isNew).length}</span>
                  </div>
                )}
              </button>
              
              {/* Notification Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[calc(100vh-120px)] overflow-hidden flex flex-col">
                  <div className="p-4 border-b border-gray-200">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900">Notifications</h3>
                  </div>
                  
                  <div className="overflow-y-auto flex-1">
                    {notifications.length > 0 ? (
                      notifications.map((notification) => (
                        <div 
                          key={notification.id} 
                          className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                            notification.isNew ? 'bg-gray-50' : ''
                          }`}
                          onClick={async () => {
                            if (notification.isNew) {
                              try {
                                const token = localStorage.getItem('token');
                                await axios.put(API_ENDPOINTS.notifications.markRead(notification.id), {}, {
                                  headers: { 'x-auth-token': token }
                                });
                                fetchNotifications();
                              } catch (error) {
                                console.error('Error marking notification as read:', error);
                              }
                            }
                          }}
                        >
                          <div className="flex items-start space-x-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100">
                              {notification.type === 'submitted' ? (
                                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              ) : notification.type === 'approved' ? (
                                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              ) : (
                                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              )}
                            </div>
                            
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <h4 className="font-medium text-gray-900 text-sm">{notification.title}</h4>
                                {notification.isNew && (
                                  <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                                )}
                              </div>
                              <p className="text-gray-600 text-sm mt-1">{notification.message}</p>
                              <p className="text-gray-500 text-xs mt-2">{notification.timestamp}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-gray-500">
                        <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                        </svg>
                        <p>No notifications yet</p>
                      </div>
                    )}
                  </div>
                  
                  {notifications.length > 0 && (
                    <div className="p-3 border-t border-gray-200">
                      <button 
                        onClick={async () => {
                          try {
                            const token = localStorage.getItem('token');
                            await axios.put(API_ENDPOINTS.notifications.markAllRead, {}, {
                              headers: { 'x-auth-token': token }
                            });
                            fetchNotifications();
                            setShowNotifications(false);
                          } catch (error) {
                            console.error('Error marking notifications as read:', error);
                          }
                        }}
                        className="w-full text-center text-sm text-gray-600 hover:text-gray-800 font-medium"
                      >
                        Mark all as read
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="p-4 sm:p-6">
          {activeSection === 'dashboard' && (
            <div className="space-y-6">
              {/* Sales Chart Section with Goal Completion */}
              <div className="bg-white rounded-lg p-4 sm:p-6 shadow-sm border border-gray-200">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                  {/* Chart Section */}
                  <div className="lg:col-span-2">
                    <div className="mb-4">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-semibold text-gray-800">Year:</h3>
                        <div className="relative">
                          <button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 flex items-center space-x-2"
                          >
                            <span>{selectedYearRange}</span>
                            <svg className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          
                          {isDropdownOpen && (
                            <div className="absolute left-0 mt-2 w-40 sm:w-32 bg-white border border-gray-300 rounded-lg shadow-lg z-10 dropdown-responsive">
                              {Object.keys(yearRangeData).map((yearRange) => (
                                <button
                                  key={yearRange}
                                  onClick={() => handleYearRangeChange(yearRange)}
                                  className={`w-full text-left px-3 sm:px-4 py-2.5 sm:py-2 text-xs sm:text-sm hover:bg-gray-100 first:rounded-t-lg last:rounded-b-lg tap-target ${
                                    selectedYearRange === yearRange ? 'bg-gray-50 text-gray-700' : 'text-gray-700'
                                  }`}
                                >
                                  {yearRange}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Chart Container */}
                    <div className="relative h-64 sm:h-80 bg-gray-50 rounded-lg p-3 sm:p-4 overflow-x-auto">
                      <svg className="w-full h-full" viewBox="0 0 800 160">
                        {/* Grid Lines */}
                        <defs>
                          <linearGradient id="grayAreaGradient1" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" style={{stopColor: '#9CA3AF', stopOpacity: 0.4}} />
                            <stop offset="100%" style={{stopColor: '#9CA3AF', stopOpacity: 0.1}} />
                          </linearGradient>
                          <linearGradient id="grayAreaGradient2" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" style={{stopColor: '#6B7280', stopOpacity: 0.3}} />
                            <stop offset="100%" style={{stopColor: '#6B7280', stopOpacity: 0.1}} />
                          </linearGradient>
                        </defs>
                        
                        {/* Gray Background Area */}
                        <path
                          d={currentData.chartPath2}
                          fill="url(#grayAreaGradient2)"
                          className={`transition-all duration-700 ease-in-out ${chartAnimation ? 'opacity-100' : 'opacity-0'}`}
                        />
                        
                        {/* Gray Area Chart */}
                        <path
                          d={currentData.chartPath1}
                          fill="url(#grayAreaGradient1)"
                          className={`transition-all duration-700 ease-in-out ${chartAnimation ? 'opacity-100' : 'opacity-0'}`}
                        />
                        
                        {/* Gray Line */}
                        <path
                          d={currentData.chartPath1.replace(' L 800 160 L 0 160 Z', '')}
                          fill="none"
                          stroke="#6B7280"
                          strokeWidth="2"
                          className={`transition-all duration-700 ease-in-out ${chartAnimation ? 'opacity-100' : 'opacity-0'}`}
                        />
                        
                        {/* Gray Line */}
                        <path
                          d={currentData.chartPath2.replace(' L 800 160 L 0 160 Z', '')}
                          fill="none"
                          stroke="#9CA3AF"
                          strokeWidth="2"
                          className={`transition-all duration-700 ease-in-out ${chartAnimation ? 'opacity-100' : 'opacity-0'}`}
                        />
                      </svg>
                      
                      {/* Chart Labels */}
                      <div className="absolute bottom-1 left-0 right-0 flex justify-between text-xs text-gray-600 px-2">
                        <span>January</span>
                        <span>February</span>
                        <span>March</span>
                        <span>April</span>
                        <span>May</span>
                        <span>June</span>
                        <span>July</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Goal Completion Section */}
                  <div className="lg:col-span-1 flex flex-col justify-center">
                    
                    <div className="space-y-4">
                      {/* Total */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-gray-600">Total</span>
                          <span className="text-sm text-gray-800 font-semibold">{currentData.total}</span>
                        </div>
                        <div className="w-full bg-gray-300 rounded-full h-2">
                          <div className="bg-gray-600 h-2 rounded-full transition-all duration-700 ease-in-out" style={{width: '100%'}}></div>
                        </div>
                      </div>
                      
                      {currentData.years.map((yearData, index) => {
                        return (
                          <div key={yearData.year}>
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm text-gray-600">{yearData.year}</span>
                              <span className="text-sm text-gray-800 font-semibold">{yearData.value}</span>
                            </div>
                            <div className="w-full bg-gray-300 rounded-full h-2">
                              <div 
                                className="bg-gray-500 h-2 rounded-full transition-all duration-700 ease-in-out" 
                                style={{width: `${yearData.percentage}%`}}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Reports Management Section */}
              <div className="bg-white rounded-lg p-8 shadow-sm border border-gray-200">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Reports Management</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  {/* Request Trends */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Request Trends</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700">Total Requests</span>
                        <span className="text-gray-900 font-semibold">{stats ? stats.totalRequests : 0}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700">Pending</span>
                        <span className="text-gray-900 font-semibold">{stats ? stats.pendingRequests : 0}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700">Submitted</span>
                        <span className="text-gray-700 font-semibold">{stats ? stats.submittedRequests : 0}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
                        <div className="bg-gray-600 h-2 rounded-full transition-all duration-700" style={{width: stats && stats.totalRequests > 0 ? `${(stats.submittedRequests / stats.totalRequests) * 100}%` : '75%'}}></div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Review Status */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Review Status</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700">Approved</span>
                        <span className="text-gray-900 font-semibold">{stats ? stats.approvedRequests : 0}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700">Rejected</span>
                        <span className="text-gray-900 font-semibold">{stats ? stats.rejectedRequests : 0}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700">Awaiting</span>
                        <span className="text-gray-900 font-semibold">{stats ? stats.submittedRequests : 0}</span>
                      </div>
                      <div className="flex justify-between items-center border-t border-gray-300 pt-2">
                        <span className="text-gray-800 font-semibold">Total Reviewed</span>
                        <span className="text-gray-900 font-bold text-lg">{stats ? stats.totalReviewed : 0}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Approve/Reject Chart */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Approve vs Reject</h3>
                    <div className="flex items-center justify-center">
                      <div className="relative w-32 h-32">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                          {/* Approved Circle */}
                          <circle
                            cx="50"
                            cy="50"
                            r="35"
                            fill="none"
                            stroke="#9CA3AF"
                            strokeWidth="15"
                            strokeDasharray={stats ? `${(stats.approvalRate / 100) * 219.8} ${219.8 - (stats.approvalRate / 100) * 219.8}` : "171.1 47.7"}
                            strokeDashoffset={animateReports ? "0" : "218.8"}
                            className="transition-all duration-[1800ms] ease-out"
                          />
                          {/* Rejected Circle */}
                          <circle
                            cx="50"
                            cy="50"
                            r="35"
                            fill="none"
                            stroke="#6B7280"
                            strokeWidth="15"
                            strokeDasharray={stats ? `${(stats.rejectionRate / 100) * 219.8} ${219.8 - (stats.rejectionRate / 100) * 219.8}` : "48.2 170.6"}
                            strokeDashoffset={stats ? (animateReports ? `-${(stats.approvalRate / 100) * 219.8}` : `-${(stats.approvalRate / 100) * 219.8 - 219.8}`) : (animateReports ? "-171.1" : "-122.9")}
                            className="transition-all duration-[1800ms] ease-out"
                            style={{
                              transitionDelay: '400ms'
                            }}
                          />
                        </svg>
                      </div>
                      <div className="ml-4 space-y-2">
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-gray-300 rounded mr-2"></div>
                          <span className="text-gray-800 text-sm font-medium">{stats ? stats.approvalRate : 78}% Approved</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-gray-500 rounded mr-2"></div>
                          <span className="text-gray-800 text-sm font-medium">{stats ? stats.rejectionRate : 22}% Rejected</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {activeSection === 'offices' && (
            <Offices />
          )}

          {activeSection === 'users' && (
            <Users />
          )}

          {activeSection === 'issp' && (
            <ISSP />
          )}


          {activeSection === 'logs' && (
            <ActivityLog title="System Activity (Admin View)" />
          )}

          {activeSection === 'profile' && (
            <Profile />
          )}
          
        </main>
        
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center mr-3">
                <svg className="w-6 h-6 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Confirm Logout</h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              Are you sure you want to logout? You will need to sign in again to access your dashboard.
            </p>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleCancelLogout}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmLogout}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors duration-200"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
