import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Request from './Request';
import Inventory from './Inventory';
import History from './History';
import ActivityLog from '../common/ActivityLog';
import Profile from '../common/Profile';

// Custom scrollbar-hiding styles
const hideScrollbarStyles = `
  .hide-scrollbar {
    -ms-overflow-style: none;  /* IE and Edge */
    scrollbar-width: none;     /* Firefox */
  }
  .hide-scrollbar::-webkit-scrollbar {
    display: none;            /* Chrome, Safari and Opera */
  }
`;

const UnitDboard = () => {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [chartAnimation, setChartAnimation] = useState(false);
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [requests, setRequests] = useState([]);
  const [statusCounts, setStatusCounts] = useState({
    approved: 0,
    rejected: 0,
    pending: 0,
    'in-review': 0,
    submitted: 0
  });
  const [loading, setLoading] = useState(true);
  const [mostRequestedItems, setMostRequestedItems] = useState([]);
  const [userData, setUserData] = useState({ unit: '', username: '', profilePicture: null });
  const [approvedISSPDocument, setApprovedISSPDocument] = useState(null);
  const [loadingApprovedISSP, setLoadingApprovedISSP] = useState(false);
  const [dictApprovalStatus, setDictApprovalStatus] = useState(null);

  // Fetch notifications from the backend
  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/notifications', {
        headers: { 'x-auth-token': token }
      });
      
      // Transform backend notifications to frontend format
      const transformedNotifications = response.data.notifications.map(notif => ({
        id: notif._id,
        type: notif.type === 'approved' || notif.type === 'item_approved' ? 'approved' : 'rejected',
        title: notif.title,
        message: notif.message,
        timestamp: new Date(notif.createdAt).toLocaleString(),
        isNew: !notif.isRead
      }));
      
      setNotifications(transformedNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  // Fetch requests from the backend
  const fetchRequests = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/requests', {
        headers: { 'x-auth-token': token }
      });
      
      const fetchedRequests = response.data;
      setRequests(fetchedRequests);
      
      // Calculate status counts
      const counts = {
        approved: 0,
        rejected: 0,
        pending: 0,
        'in-review': 0,
        submitted: 0
      };
      
      fetchedRequests.forEach(request => {
        if (counts[request.status] !== undefined) {
          counts[request.status]++;
        }
      });
      
      setStatusCounts(counts);
      
      // Calculate most requested items
      const itemCounts = {};
      fetchedRequests.forEach(request => {
        if (request.items && Array.isArray(request.items)) {
          request.items.forEach(item => {
            const itemName = item.item || 'Unknown Item';
            if (itemCounts[itemName]) {
              itemCounts[itemName].count += 1;
              itemCounts[itemName].totalQuantity += Number(item.quantity) || 0;
            } else {
              itemCounts[itemName] = {
                name: itemName,
                count: 1,
                totalQuantity: Number(item.quantity) || 0
              };
            }
          });
        }
      });
      
      // Convert to array and sort by count
      const sortedItems = Object.values(itemCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 6); // Get top 6 items
      
      setMostRequestedItems(sortedItems);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch user data
  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/auth/me', {
        headers: { 'x-auth-token': token }
      });
      setUserData({
        unit: response.data.unit || '',
        username: response.data.username || '',
        profilePicture: response.data.profilePicture 
          ? `http://localhost:5000/${response.data.profilePicture}` 
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
      const response = await axios.get('http://localhost:5000/api/issp/approved-document', {
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

  useEffect(() => {
    setChartAnimation(true);
    fetchRequests();
    fetchNotifications();
    fetchUserData();
    fetchApprovedISSP();
    
    // Refresh data every 30 seconds for real-time updates
    const interval = setInterval(() => {
      fetchRequests();
      fetchNotifications();
      fetchApprovedISSP();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Refresh data when switching to dashboard
  useEffect(() => {
    if (activeSection === 'dashboard') {
      fetchRequests();
    }
  }, [activeSection]);

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

  // Static data for the dashboard
  const dashboardData = {
    total: 1000,
    years: [
      { year: '2021', value: 300, percentage: 30 },
      { year: '2022', value: 500, percentage: 50 },
      { year: '2023', value: 200, percentage: 20 }
    ],
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
    <div className="flex min-h-screen bg-gray-50">
      <style>{hideScrollbarStyles}</style>
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-900/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed w-64 h-screen bg-gradient-to-b from-dark-charcoal to-darker-charcoal text-white overflow-y-auto z-50 transform transition-transform duration-300 ease-in-out ${
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
                  {(userData.unit || userData.username || 'U').charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm">
                {userData.unit || userData.username || 'User Name'}
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
                setActiveSection('request');
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center px-4 py-3 text-left rounded-lg mb-2 transition-colors tap-target ${
                activeSection === 'request' 
                  ? 'bg-gray-700 text-white' 
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Request
            </button>

            <button
              onClick={() => {
                setActiveSection('inventory');
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center px-4 py-3 text-left rounded-lg mb-2 transition-colors tap-target ${
                activeSection === 'inventory' 
                  ? 'bg-gray-700 text-white' 
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              Inventory
            </button>

            <button
              onClick={() => {
                setActiveSection('history');
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center px-4 py-3 text-left rounded-lg mb-2 transition-colors tap-target ${
                activeSection === 'history' 
                  ? 'bg-gray-700 text-white' 
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              History
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
      <div className="flex-1 flex flex-col min-h-screen overflow-y-auto lg:ml-64">
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
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">UNIT DASHBOARD</h2>
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
                                await axios.put(`http://localhost:5000/api/notifications/${notification.id}/read`, {}, {
                                  headers: { 'x-auth-token': token }
                                });
                                fetchNotifications(); // Refresh notifications
                              } catch (error) {
                                console.error('Error marking notification as read:', error);
                              }
                            }
                          }}
                        >
                          <div className="flex items-start space-x-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100">
                              {notification.type === 'approved' ? (
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
                            await axios.put('http://localhost:5000/api/notifications/mark-all-read', {}, {
                              headers: { 'x-auth-token': token }
                            });
                            fetchNotifications(); // Refresh notifications
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
            <div className="space-y-4 sm:space-y-6">
              {/* Quick Status Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white p-4 rounded-lg border-l-4 border-gray-400 shadow-sm">
                  <p className="text-sm text-gray-600 font-medium">Total Requests</p>
                  <h3 className="text-2xl font-semibold text-gray-900 mt-1">
                    {loading ? '...' : requests.length}
                  </h3>
                </div>
                <div className="bg-white p-4 rounded-lg border-l-4 border-gray-400 shadow-sm">
                  <p className="text-sm text-gray-600 font-medium">Approved</p>
                  <h3 className="text-2xl font-semibold text-gray-900 mt-1">
                    {loading ? '...' : statusCounts.approved}
                  </h3>
                </div>
                <div className="bg-white p-4 rounded-lg border-l-4 border-gray-400 shadow-sm">
                  <p className="text-sm text-gray-600 font-medium">Rejected</p>
                  <h3 className="text-2xl font-semibold text-gray-900 mt-1">
                    {loading ? '...' : statusCounts.rejected}
                  </h3>
                </div>
                <div className="bg-white p-4 rounded-lg border-l-4 border-gray-400 shadow-sm">
                  <p className="text-sm text-gray-600 font-medium">Pending</p>
                  <h3 className="text-2xl font-semibold text-gray-900 mt-1">
                    {loading ? '...' : statusCounts.pending}
                  </h3>
                </div>
              </div>

              {/* Dashboard Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                {/* Recent ISSP Requests List */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="mb-4">
                    <h3 className="text-base font-bold text-gray-900">RECENT ISSP REQUESTS</h3>
                  </div>
                  
                  {/* Request List */}
                  <div className="space-y-3 max-h-80 overflow-y-auto hide-scrollbar">
                    {loading ? (
                      <div className="text-center py-8 text-gray-500">
                        <p>Loading requests...</p>
                      </div>
                    ) : requests.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p>No requests found</p>
                      </div>
                    ) : (
                      requests.slice(0, 10).map((request) => (
                        <div key={request._id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900 text-sm">{request.requestTitle}</h4>
                              <p className="text-xs text-gray-500 mt-1">
                                Requested on {new Date(request.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </p>
                              <p className="text-xs text-gray-600 mt-1">{request.items.length} item(s)</p>
                            </div>
                            <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                              request.status === 'approved' ? 'bg-gray-200 text-gray-700' :
                              request.status === 'rejected' ? 'bg-gray-200 text-gray-700' :
                              request.status === 'pending' ? 'bg-gray-200 text-gray-700' :
                              request.status === 'in-review' ? 'bg-gray-200 text-gray-700' :
                              request.status === 'submitted' ? 'bg-gray-200 text-gray-700' :
                              'bg-gray-200 text-gray-700'
                            }`}>
                              {request.status.charAt(0).toUpperCase() + request.status.slice(1).replace('-', ' ')}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Most Requested Items */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-gray-900">MOST REQUESTED ITEMS</h3>
                    <span className="text-sm text-gray-500">Times Requested</span>
                  </div>
                  
                  {/* Items List with Bars */}
                  <div className="space-y-4">
                    {loading ? (
                      <div className="text-center py-8 text-gray-500">
                        <p>Loading items...</p>
                      </div>
                    ) : mostRequestedItems.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                        <p>No items requested yet</p>
                      </div>
                    ) : (
                      mostRequestedItems.map((item, index) => {
                        // Calculate percentage based on max count
                        const maxCount = mostRequestedItems[0]?.count || 1;
                        const percentage = (item.count / maxCount) * 100;
                        
                        return (
                          <div key={index}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-gray-700 truncate flex-1 mr-2">
                                {item.name}
                              </span>
                              <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                                {item.count} {item.count === 1 ? 'request' : 'requests'}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="w-full bg-gray-200 rounded-full h-2.5">
                                <div 
                                  className="bg-gray-400 h-2.5 rounded-full transition-all duration-500" 
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                              <span className="text-xs text-gray-500 whitespace-nowrap">
                                Qty: {item.totalQuantity}
                              </span>
                            </div>
                          </div>
                        );
                      })
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
                      href={`http://localhost:5000/${approvedISSPDocument}`}
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

          {activeSection === 'request' && (
            <Request onRequestUpdate={fetchRequests} />
          )}

          {activeSection === 'inventory' && (
            <Inventory setActiveSection={setActiveSection} />
          )}

          {activeSection === 'history' && (
            <History setActiveSection={setActiveSection} />
          )}

          {activeSection === 'logs' && (
            <ActivityLog title="System Activity (Unit View)" />
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
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

export default UnitDboard;
