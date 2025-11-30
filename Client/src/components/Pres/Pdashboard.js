import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PresISSP from './PresISSP';
import ActivityLog from '../common/ActivityLog';
import Profile from '../common/Profile';

const API_BASE_URL = (process.env.REACT_APP_API_URL || 'http://localhost:5000').replace(/\/$/, '');

const statusStyles = {
  draft: 'bg-gray-50 text-gray-700',
  pending: 'bg-gray-50 text-gray-700',
  approved: 'bg-gray-50 text-gray-700',
  rejected: 'bg-gray-50 text-gray-700',
};

const formatStatusLabel = (status = '') =>
  status.replace(/[-_]/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()) || 'Unknown';

const formatDate = (input) => {
  if (!input) return '—';
  try {
    return new Date(input).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch (error) {
    return '—';
  }
};

const aggregateItemSummary = (requests = []) => {
  const summary = requests.reduce((acc, request) => {
    if (!Array.isArray(request.items)) {
      return acc;
    }
    request.items.forEach((item) => {
      const label = (item?.item || 'Unspecified Item').trim() || 'Unspecified Item';
      const quantity = Number(item?.quantity) || 0;
      acc[label] = (acc[label] || 0) + quantity;
    });
    return acc;
  }, {});

  return Object.entries(summary)
    .map(([name, quantity]) => ({ name, quantity }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 6);
};

const Pdashboard = () => {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [recentRequests, setRecentRequests] = useState([]);
  const [topItems, setTopItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userData, setUserData] = useState({ unit: '', username: '', profilePicture: null });
  const [approvedISSPDocument, setApprovedISSPDocument] = useState(null);
  const [loadingApprovedISSP, setLoadingApprovedISSP] = useState(false);
  const [dictApprovalStatus, setDictApprovalStatus] = useState(null);
  const [itemStatistics, setItemStatistics] = useState(null);
  const [loadingItemStats, setLoadingItemStats] = useState(false);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/api/notifications`, {
        headers: { 'x-auth-token': token }
      });
      
      const transformedNotifications = response.data.notifications.map(notif => {
        let type = 'rejected';
        if (notif.type === 'issp_submitted_for_review') {
          type = 'submitted';
        } else if (notif.type === 'approved' || notif.type === 'issp_approved') {
          type = 'approved';
        } else if (notif.type === 'rejected' || notif.type === 'issp_rejected') {
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
      const response = await axios.get(`${API_BASE_URL}/api/auth/me`, {
        headers: { 'x-auth-token': token }
      });
      setUserData({
        unit: response.data.unit || '',
        username: response.data.username || '',
        profilePicture: response.data.profilePicture 
          ? `${API_BASE_URL}/${response.data.profilePicture}` 
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

  // Fetch approved ISSP document and DICT approval status
  const fetchApprovedISSP = async () => {
    try {
      setLoadingApprovedISSP(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/api/issp/approved-document`, {
        headers: { 'x-auth-token': token }
      });
      setApprovedISSPDocument(response.data.dictApprovedISSPDocument || null);
      setDictApprovalStatus(response.data.dictApproval || null);
    } catch (error) {
      console.error('Error fetching approved ISSP:', error);
      setApprovedISSPDocument(null);
      setDictApprovalStatus(null);
    } finally {
      setLoadingApprovedISSP(false);
    }
  };

  // Fetch item statistics by unit
  const fetchItemStatistics = async () => {
    try {
      setLoadingItemStats(true);
      const token = localStorage.getItem('token');
      
      // Fetch both requests and office stats to get all units
      const [requestsResponse, officeStatsResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/admin/submitted-requests`, {
          headers: { 'x-auth-token': token }
        }),
        axios.get(`${API_BASE_URL}/api/admin/office/stats`, {
          headers: { 'x-auth-token': token }
        }).catch(() => ({ data: { unitTracking: { units: [] } } })) // Fallback if endpoint fails
      ]);

      const requests = Array.isArray(requestsResponse.data) ? requestsResponse.data : [];
      
      // Get all unique units from office stats (all units in the system)
      const allUnitsFromStats = officeStatsResponse.data?.unitTracking?.units || [];
      const allUnitsSet = new Set();
      
      // Add all units from office stats
      allUnitsFromStats.forEach(unitStat => {
        if (unitStat.unit) {
          allUnitsSet.add(unitStat.unit);
        }
      });
      
      // Also add units from requests (in case some units aren't in stats)
      requests.forEach(request => {
        const unitName = (request.userId && typeof request.userId === 'object' && request.userId.unit) 
          ? request.userId.unit 
          : null;
        if (unitName) {
          allUnitsSet.add(unitName);
        }
      });
      
      // Initialize statistics for all units
      const unitStats = {};
      allUnitsSet.forEach(unit => {
        unitStats[unit] = {
          unit: unit,
          totalItems: 0,
          purchased: 0,
          notPurchased: 0,
          received: 0,
          notReceived: 0,
          prCreated: 0
        };
      });
      
      // Process requests and aggregate statistics by unit
      requests.forEach(request => {
        const unitName = (request.userId && typeof request.userId === 'object' && request.userId.unit) 
          ? request.userId.unit 
          : null;
        
        if (!unitName || !unitStats[unitName]) {
          return; // Skip requests without valid unit
        }

        if (request.items && Array.isArray(request.items)) {
          request.items.forEach(item => {
            // Only count approved items
            if (item.approvalStatus === 'approved') {
              unitStats[unitName].totalItems++;
              
              // Check purchase status
              if (item.itemStatus === 'purchased') {
                unitStats[unitName].purchased++;
              } else {
                unitStats[unitName].notPurchased++;
              }
              
              // Check received status
              if (item.itemStatus === 'received') {
                unitStats[unitName].received++;
              } else if (item.itemStatus && item.itemStatus !== 'received') {
                unitStats[unitName].notReceived++;
              } else {
                unitStats[unitName].notReceived++;
              }
              
              // Check PR created status
              if (item.itemStatus === 'pr_created') {
                unitStats[unitName].prCreated++;
              }
            }
          });
        }
      });

      // Aggregate all units into one overall statistic
      const overallStats = Object.values(unitStats).reduce((acc, stat) => {
        acc.totalItems += stat.totalItems;
        acc.purchased += stat.purchased;
        acc.notPurchased += stat.notPurchased;
        acc.received += stat.received;
        acc.notReceived += stat.notReceived;
        acc.prCreated += stat.prCreated;
        return acc;
      }, {
        totalItems: 0,
        purchased: 0,
        notPurchased: 0,
        received: 0,
        notReceived: 0,
        prCreated: 0
      });

      // Calculate overall percentages
      const purchasedPercent = overallStats.totalItems > 0 
        ? Math.round((overallStats.purchased / overallStats.totalItems) * 100) 
        : 0;
      const notPurchasedPercent = overallStats.totalItems > 0 
        ? Math.round((overallStats.notPurchased / overallStats.totalItems) * 100) 
        : 0;
      const receivedPercent = overallStats.totalItems > 0 
        ? Math.round((overallStats.received / overallStats.totalItems) * 100) 
        : 0;
      const notReceivedPercent = overallStats.totalItems > 0 
        ? Math.round((overallStats.notReceived / overallStats.totalItems) * 100) 
        : 0;
      const prPercent = overallStats.totalItems > 0 
        ? Math.round((overallStats.prCreated / overallStats.totalItems) * 100) 
        : 0;

      setItemStatistics({
        ...overallStats,
        purchasedPercent,
        notPurchasedPercent,
        receivedPercent,
        notReceivedPercent,
        prPercent
      });
    } catch (error) {
      console.error('Error fetching item statistics:', error);
      setItemStatistics([]);
    } finally {
      setLoadingItemStats(false);
    }
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Authentication required. Please sign in again.');
        }

        const headers = { 'x-auth-token': token };

        const [statsResponse, reviewResponse, requestsResponse] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/admin/dashboard/stats`, { headers }),
          axios.get(`${API_BASE_URL}/api/issp/review/list`, { headers }),
          axios.get(`${API_BASE_URL}/api/admin/submitted-requests`, { headers })
        ]);

        const statsData = statsResponse.data;
        const reviewData = Array.isArray(reviewResponse.data) ? reviewResponse.data : [];
        const requestsData = Array.isArray(requestsResponse.data) ? requestsResponse.data : [];

        setDashboardStats(statsData);
        setRecentRequests(reviewData);
        setTopItems(aggregateItemSummary(requestsData));
      } catch (err) {
        console.error('Error loading president dashboard data:', err);
        const message = err.response?.data?.message || err.message || 'Failed to load dashboard data.';
        setError(message);
        setDashboardStats(null);
        setRecentRequests([]);
        setTopItems([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
    fetchNotifications();
    fetchUserData();
    fetchApprovedISSP();
    fetchItemStatistics();
    
    // Refresh notifications every 30 seconds
    const interval = setInterval(() => {
      fetchNotifications();
      fetchApprovedISSP();
      fetchItemStatistics();
    }, 30000);
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

  const visibleRequests = recentRequests.slice(0, 5);
  const topItemsMaxQuantity =
    topItems.reduce((max, item) => Math.max(max, item.quantity), 0) || 1;
  const topItemsTotal = topItems.reduce((sum, item) => sum + item.quantity, 0);

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
    <div className="flex h-screen bg-gray-100">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-900/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed w-64 h-screen bg-gray-800 text-white overflow-y-auto z-50 transform transition-transform duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0`}>
        {/* User Info */}
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
                <span className="text-white font-semibold text-sm">
                  {(userData.unit || userData.username || 'P').charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm">
                {userData.unit || userData.username || 'President'}
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
                setActiveSection('reports');
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center px-4 py-3 text-left rounded-lg mb-2 transition-colors tap-target ${
                activeSection === 'reports' 
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
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-64">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-4 sm:px-6 py-4 flex-shrink-0">
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
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">President Dashboard</h2>
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
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-200 rounded-full flex items-center justify-center">
                    <span className="text-red-700 text-xs font-bold">{notifications.filter(n => n.isNew).length}</span>
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
                                await axios.put(`${API_BASE_URL}/api/notifications/${notification.id}/read`, {}, {
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
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              notification.type === 'submitted' 
                                ? 'bg-blue-50' 
                                : notification.type === 'approved'
                                ? 'bg-green-50'
                                : 'bg-red-50'
                            }`}>
                              {notification.type === 'submitted' ? (
                                <svg className="w-5 h-5 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              ) : notification.type === 'approved' ? (
                                <svg className="w-5 h-5 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              ) : (
                                <svg className="w-5 h-5 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                            await axios.put(`${API_BASE_URL}/api/notifications/mark-all-read`, {}, {
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
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {activeSection === 'dashboard' && (
            <div className="space-y-4 sm:space-y-6">
              {loading && (
                <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600 shadow-sm">
                  Fetching the latest dashboard data…
                </div>
              )}
              {/* Status Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-gray-400">
                  <p className="text-sm text-gray-600 font-medium">Approved</p>
                  <h3 className="text-2xl font-semibold text-gray-900 mt-1">
                    {dashboardStats?.approvedRequests ?? 0}
                  </h3>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-gray-400">
                  <p className="text-sm text-gray-600 font-medium">Rejected</p>
                  <h3 className="text-2xl font-semibold text-gray-900 mt-1">
                    {dashboardStats?.rejectedRequests ?? 0}
                  </h3>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-gray-400">
                  <p className="text-sm text-gray-600 font-medium">Pending</p>
                  <h3 className="text-2xl font-semibold text-gray-900 mt-1">
                    {dashboardStats?.pendingRequests ?? 0}
                  </h3>
                </div>
              </div>

              {/* Item Statistics by Unit */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-base font-bold text-gray-900">ITEM STATISTICS BY UNIT</h3>
                  </div>
                </div>
                {loadingItemStats ? (
                  <div className="p-4 rounded-lg border bg-gray-50 border-gray-200">
                    <p className="text-sm text-gray-600">Loading statistics...</p>
                  </div>
                ) : itemStatistics && itemStatistics.totalItems > 0 ? (
                  <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200 p-5 shadow-sm">
                    <div className="mb-4 pb-3 border-b border-gray-200">
                      <h4 className="text-xl font-bold text-gray-900 mb-1">Overall Statistics</h4>
                      <p className="text-xs text-gray-500">Combined data from all units</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      {/* Purchase Status Chart */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="text-sm font-semibold text-gray-700">Purchase Status</h5>
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{itemStatistics.totalItems} items</span>
                        </div>
                        <div className="relative">
                          {/* Bar Chart */}
                          <div className="flex items-end gap-2.5 h-32">
                            <div className="flex-1 flex flex-col items-center">
                              <div className="w-full bg-gray-200 rounded-t-lg relative" style={{ height: '100%' }}>
                                <div 
                                  className="absolute bottom-0 w-full bg-emerald-700 rounded-t-lg transition-all duration-500"
                                  style={{ height: `${itemStatistics.purchasedPercent}%` }}
                                ></div>
                              </div>
                              <div className="mt-2 text-center">
                                <p className="text-base font-bold text-emerald-800">{itemStatistics.purchasedPercent}%</p>
                                <p className="text-xs text-gray-600 font-medium">Purchased</p>
                                <p className="text-xs text-gray-400">{itemStatistics.purchased} items</p>
                              </div>
                            </div>
                            <div className="flex-1 flex flex-col items-center">
                              <div className="w-full bg-gray-200 rounded-t-lg relative" style={{ height: '100%' }}>
                                <div 
                                  className="absolute bottom-0 w-full bg-red-600 rounded-t-lg transition-all duration-500"
                                  style={{ height: `${itemStatistics.notPurchasedPercent}%` }}
                                ></div>
                              </div>
                              <div className="mt-2 text-center">
                                <p className="text-base font-bold text-red-700">{itemStatistics.notPurchasedPercent}%</p>
                                <p className="text-xs text-gray-600 font-medium">Not Purchased</p>
                                <p className="text-xs text-gray-400">{itemStatistics.notPurchased} items</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Receipt Status Chart */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="text-sm font-semibold text-gray-700">Receipt Status</h5>
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{itemStatistics.totalItems} items</span>
                        </div>
                        <div className="relative">
                          {/* Bar Chart */}
                          <div className="flex items-end gap-2.5 h-32">
                            <div className="flex-1 flex flex-col items-center">
                              <div className="w-full bg-gray-200 rounded-t-lg relative" style={{ height: '100%' }}>
                                <div 
                                  className="absolute bottom-0 w-full bg-indigo-700 rounded-t-lg transition-all duration-500"
                                  style={{ height: `${itemStatistics.receivedPercent}%` }}
                                ></div>
                              </div>
                              <div className="mt-2 text-center">
                                <p className="text-base font-bold text-indigo-800">{itemStatistics.receivedPercent}%</p>
                                <p className="text-xs text-gray-600 font-medium">Received</p>
                                <p className="text-xs text-gray-400">{itemStatistics.received} items</p>
                              </div>
                            </div>
                            <div className="flex-1 flex flex-col items-center">
                              <div className="w-full bg-gray-200 rounded-t-lg relative" style={{ height: '100%' }}>
                                <div 
                                  className="absolute bottom-0 w-full bg-amber-600 rounded-t-lg transition-all duration-500"
                                  style={{ height: `${itemStatistics.notReceivedPercent}%` }}
                                ></div>
                              </div>
                              <div className="mt-2 text-center">
                                <p className="text-base font-bold text-amber-700">{itemStatistics.notReceivedPercent}%</p>
                                <p className="text-xs text-gray-600 font-medium">Not Received</p>
                                <p className="text-xs text-gray-400">{itemStatistics.notReceived} items</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* PR Created Chart */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="text-sm font-semibold text-gray-700">PR Created</h5>
                        </div>
                        <div className="relative">
                          {/* Donut Chart using SVG */}
                          <div className="flex items-center justify-center">
                            <div className="relative w-32 h-32">
                              <svg className="transform -rotate-90 w-32 h-32">
                                <circle
                                  cx="64"
                                  cy="64"
                                  r="56"
                                  stroke="currentColor"
                                  strokeWidth="14"
                                  fill="transparent"
                                  className="text-gray-200"
                                />
                                <circle
                                  cx="64"
                                  cy="64"
                                  r="56"
                                  stroke="currentColor"
                                  strokeWidth="14"
                                  fill="transparent"
                                  strokeDasharray={`${2 * Math.PI * 56}`}
                                  strokeDashoffset={`${2 * Math.PI * 56 * (1 - itemStatistics.prPercent / 100)}`}
                                  className="text-violet-700 transition-all duration-500"
                                  strokeLinecap="round"
                                />
                              </svg>
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-center">
                                  <p className="text-2xl font-bold text-gray-900">{itemStatistics.prPercent}%</p>
                                  <p className="text-xs text-gray-500">PR Created</p>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="mt-2 text-center">
                            <p className="text-xs text-gray-600">
                              <span className="font-semibold text-gray-900">{itemStatistics.prCreated}</span> of <span className="font-semibold text-gray-900">{itemStatistics.totalItems}</span> items
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-lg border border-dashed border-gray-300 bg-gray-50">
                    <p className="text-sm text-gray-500">No item statistics available yet.</p>
                  </div>
                )}
              </div>

              {/* Main Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* Recent ISSP Requests */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-gray-900">ISSP Review Queue</h3>
                  </div>
                  
                  {/* Request List */}
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {loading && recentRequests.length === 0 ? (
                      <div className="p-4 border border-gray-200 rounded-lg text-sm text-gray-600">
                        Loading submissions…
                      </div>
                    ) : recentRequests.length > 0 ? (
                      visibleRequests.map((entry) => {
                        const unitName =
                          typeof entry.userId === 'object' && entry.userId !== null
                            ? entry.userId.unit || entry.userId.username || 'Unnamed unit'
                            : 'Unnamed unit';
                        const status = entry.review?.status || 'draft';
                        const submittedAt = entry.review?.submittedAt;
                        const decidedAt = entry.review?.decidedAt;
                        return (
                        <div
                          key={entry._id || entry.id}
                          className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900 text-sm">
                                {unitName}
                              </h4>
                              <p className="text-xs text-gray-500 mt-1">
                                Submitted on {formatDate(submittedAt)}
                              </p>
                              {status !== 'pending' && decidedAt && (
                                <p className="text-xs text-gray-500">
                                  Decision on {formatDate(decidedAt)}
                                </p>
                              )}
                            </div>
                            <span
                              className={`px-3 py-1 text-xs font-medium rounded-full ${
                                statusStyles[status] || 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {formatStatusLabel(status)}
                            </span>
                          </div>
                        </div>
                        );
                      })
                    ) : (
                      <div className="p-4 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500">
                        No ISSP submissions yet.
                      </div>
                    )}
                  </div>
                </div>

                {/* Most Requested Items */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">Most Requested Items</h3>
                    <span className="text-sm text-gray-500">
                      Total Items: {topItemsTotal}
                    </span>
                  </div>
                  
                  <div className="space-y-4">
                    {loading && topItems.length === 0 ? (
                      <p className="text-sm text-gray-600">Compiling item statistics…</p>
                    ) : topItems.length > 0 ? (
                      topItems.map((item, index) => {
                        const width = Math.round((item.quantity / topItemsMaxQuantity) * 100);
                        return (
                          <div key={`${item.name}-${index}`}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-gray-700">{item.name}</span>
                              <span className="text-sm font-semibold text-gray-700">
                                {item.quantity} {item.quantity === 1 ? 'request' : 'requests'}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                              <div
                                className="bg-gray-600 h-2.5 rounded-full transition-all duration-700 ease-in-out"
                                style={{ width: `${Math.min(100, Math.max(8, width))}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-sm text-gray-500">No request data available yet.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Approved ISSP Document */}
              {approvedISSPDocument && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-base font-bold text-gray-900">APPROVED ISSP DOCUMENT</h3>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <svg className="w-8 h-8 text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {approvedISSPDocument.split('/').pop()}
                      </p>
                      <p className="text-xs text-gray-500">Approved ISSP</p>
                    </div>
                    <a
                      href={`${API_BASE_URL}/${approvedISSPDocument}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 text-sm font-medium text-white bg-gray-700 rounded-md hover:bg-gray-800 transition-colors flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View Document
                    </a>
                  </div>
                </div>
              )}

              {/* DICT Approval Status */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold text-gray-900">DICT APPROVAL STATUS</h3>
                  </div>
                </div>
                {loadingApprovedISSP ? (
                  <div className="p-4 rounded-lg border bg-gray-50 border-gray-200">
                    <p className="text-sm text-gray-600">Loading status...</p>
                  </div>
                ) : dictApprovalStatus && dictApprovalStatus.status ? (
                  <div className={`p-5 rounded-lg border-2 ${
                    dictApprovalStatus.status === 'approved_by_dict' ? 'bg-emerald-50 border-emerald-300' :
                    dictApprovalStatus.status === 'revision_from_dict' ? 'bg-red-50 border-red-300' :
                    dictApprovalStatus.status === 'approve_for_dict' ? 'bg-yellow-50 border-yellow-300' :
                    dictApprovalStatus.status === 'collation_compilation' ? 'bg-purple-50 border-purple-300' :
                    'bg-gray-50 border-gray-300'
                  }`}>
                    <div className="flex items-center gap-4 mb-4">
                      <div className={`text-base font-bold px-5 py-2.5 rounded-full inline-block ${
                        dictApprovalStatus.status === 'approved_by_dict' ? 'bg-emerald-200 text-emerald-800 border-2 border-emerald-400' :
                        dictApprovalStatus.status === 'revision_from_dict' ? 'bg-red-200 text-red-800 border-2 border-red-400' :
                        dictApprovalStatus.status === 'approve_for_dict' ? 'bg-yellow-200 text-yellow-800 border-2 border-yellow-400' :
                        dictApprovalStatus.status === 'collation_compilation' ? 'bg-purple-200 text-purple-800 border-2 border-purple-400' :
                        'bg-gray-200 text-gray-800 border-2 border-gray-400'
                      }`}>
                        {dictApprovalStatus.status === 'approved_by_dict' ? '✓ Approved by DICT' :
                         dictApprovalStatus.status === 'revision_from_dict' ? 'Revision from DICT' :
                         dictApprovalStatus.status === 'approve_for_dict' ? '→ Approve for DICT' :
                         dictApprovalStatus.status === 'collation_compilation' ? '📋 Collation/Compilation' :
                         'Pending'}
                      </div>
                    </div>
                    {dictApprovalStatus.updatedAt && (
                      <p className="text-sm text-gray-700 mb-3 font-medium">
                        Last Updated: {new Date(dictApprovalStatus.updatedAt).toLocaleString()}
                      </p>
                    )}
                    {dictApprovalStatus.notes && (
                      <div className="mt-4 pt-4 border-t-2 border-gray-300">
                        <p className="text-sm font-semibold text-gray-800 mb-2">Admin Notes:</p>
                        <p className="text-base text-gray-900 bg-white p-3 rounded border border-gray-200">{dictApprovalStatus.notes}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-5 rounded-lg border-2 bg-gray-50 border-gray-300">
                    <div className="flex items-center gap-4 mb-3">
                      <span className="text-base font-bold px-5 py-2.5 rounded-full inline-block bg-gray-200 text-gray-800 border-2 border-gray-400">
                        Pending
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">
                      DICT approval status has not been set yet by the administrator.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSection === 'reports' && (
            <PresISSP />
          )}

          {activeSection === 'logs' && (
            <ActivityLog title="System Activity (President View)" />
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

export default Pdashboard;
