import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import ActivityLog from '../common/ActivityLog';
import Profile from '../common/Profile';
import { API_ENDPOINTS, getAuthHeaders, getFileUrl } from '../../utils/api';
import { connectSocket, disconnectSocket, subscribe, unsubscribe } from '../../utils/socket';

const statusStyles = {
  draft: 'bg-gray-100 text-gray-700 border border-gray-200',
  pending: 'bg-blue-100 text-blue-700 border border-blue-200',
  approved: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  rejected: 'bg-red-100 text-red-700 border border-red-200',
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
  /** Mirrors Admin Dashboard KPIs — from office stats API (`unitTracking.summary`), not ISSP review list. */
  const [isspOfficeStats, setIsspOfficeStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userData, setUserData] = useState({ unit: '', username: '', profilePicture: null });
  const [approvedISSPDocument, setApprovedISSPDocument] = useState(null);
  const [loadingApprovedISSP, setLoadingApprovedISSP] = useState(false);
  const [itemStatistics, setItemStatistics] = useState(null);
  const [loadingItemStats, setLoadingItemStats] = useState(false);
  const [priceDistribution, setPriceDistribution] = useState(null);
  const [loadingPriceDistribution, setLoadingPriceDistribution] = useState(false);
  const [priceDistributionYearCycle, setPriceDistributionYearCycle] = useState('2024-2026');
  const [priceDistributionDropdownOpen, setPriceDistributionDropdownOpen] = useState(false);
  const [downloadingIsspId, setDownloadingIsspId] = useState(null);

  const isspTrackingSummary = useMemo(() => {
    const s = isspOfficeStats?.unitTracking?.summary;
    return {
      total: typeof s?.total === 'number' ? s.total : 0,
      submitted: typeof s?.submitted === 'number' ? s.submitted : 0,
      pending: typeof s?.notSubmitted === 'number' ? s.notSubmitted : 0
    };
  }, [isspOfficeStats]);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(API_ENDPOINTS.notifications.list, {
        headers: getAuthHeaders()
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

  // Fetch approved ISSP document and DICT approval status
  const fetchApprovedISSP = async () => {
    try {
      setLoadingApprovedISSP(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(API_ENDPOINTS.issp.approvedDocument, {
        headers: getAuthHeaders()
      });
      setApprovedISSPDocument(response.data.dictApprovedISSPDocument || null);
    } catch (error) {
      console.error('Error fetching approved ISSP:', error);
      setApprovedISSPDocument(null);
    } finally {
      setLoadingApprovedISSP(false);
    }
  };

  // Helper function to extract years from cycle (e.g., "2024-2026" → [2024, 2025, 2026])
  const getYearsFromCycle = (cycle) => {
    if (!cycle || typeof cycle !== 'string') return [];
    const parts = cycle.split('-');
    if (parts.length !== 2) return [];
    const startYear = parseInt(parts[0], 10);
    const endYear = parseInt(parts[1], 10);
    if (isNaN(startYear) || isNaN(endYear)) return [];
    const years = [];
    for (let year = startYear; year <= endYear; year++) {
      years.push(year);
    }
    return years;
  };

  // Fetch price distribution statistics
  const fetchPriceDistribution = useCallback(async () => {
    try {
      setLoadingPriceDistribution(true);
      const token = localStorage.getItem('token');
      
      const requestsResponse = await axios.get(API_ENDPOINTS.admin.submittedRequests, {
        headers: getAuthHeaders()
      });

      const requests = Array.isArray(requestsResponse.data) ? requestsResponse.data : [];
      
      console.log('[Price Distribution] Total requests:', requests.length);
      console.log('[Price Distribution] Selected year cycle:', priceDistributionYearCycle);
      
      // Filter requests by selected year cycle
      const filteredRequests = requests.filter(request => {
        const requestYear = request.year || '';
        const matches = requestYear === priceDistributionYearCycle;
        if (matches) {
          console.log('[Price Distribution] Matching request:', request._id, 'Year:', requestYear);
        }
        return matches;
      });
      
      console.log('[Price Distribution] Filtered requests:', filteredRequests.length);
      
      // Define price ranges
      const priceRanges = [
        { label: '₱0 - ₱10k', min: 0, max: 10000, color: 'emerald', count: 0 },
        { label: '₱10k - ₱50k', min: 10001, max: 50000, color: 'blue', count: 0 },
        { label: '₱50k - ₱100k', min: 50001, max: 100000, color: 'indigo', count: 0 },
        { label: '₱100k - ₱200k', min: 100001, max: 200000, color: 'purple', count: 0 },
        { label: '₱200k+', min: 200001, max: Infinity, color: 'rose', count: 0 }
      ];
      
      // Process filtered requests and count items by price range
      filteredRequests.forEach(request => {
        if (request.items && Array.isArray(request.items)) {
          request.items.forEach(item => {
            // Only count approved items
            if (item.approvalStatus === 'approved' && item.price) {
              const price = Number(item.price) || 0;
              
              // Find which range this price belongs to
              const range = priceRanges.find(r => price >= r.min && price <= r.max);
              if (range) {
                range.count++;
              }
            }
          });
        }
      });
      
      // Calculate total and percentages
      const totalItems = priceRanges.reduce((sum, range) => sum + range.count, 0);
      
      const distribution = priceRanges.map(range => ({
        ...range,
        percentage: totalItems > 0 ? Math.round((range.count / totalItems) * 100) : 0
      }));
      
      setPriceDistribution({
        ranges: distribution,
        totalItems
      });
    } catch (error) {
      console.error('Error fetching price distribution:', error);
      setPriceDistribution(null);
    } finally {
      setLoadingPriceDistribution(false);
    }
  }, [priceDistributionYearCycle]);

  // Fetch item statistics by unit
  const fetchItemStatistics = useCallback(async () => {
    try {
      setLoadingItemStats(true);
      const token = localStorage.getItem('token');
      
      // Fetch both requests and office stats to get all units
      const officeStatsParams =
        priceDistributionYearCycle && String(priceDistributionYearCycle).trim()
          ? { yearCycle: String(priceDistributionYearCycle).trim() }
          : {};

      const [requestsResponse, officeStatsResponse] = await Promise.all([
        axios.get(API_ENDPOINTS.admin.submittedRequests, {
          headers: getAuthHeaders()
        }),
        axios.get(API_ENDPOINTS.admin.officeStats, {
          headers: getAuthHeaders(),
          params: officeStatsParams
        }).catch(() => ({ data: { unitTracking: { units: [] } } })) // Fallback if endpoint fails
      ]);

      setIsspOfficeStats(officeStatsResponse?.data ?? null);

      let requests = Array.isArray(requestsResponse.data) ? requestsResponse.data : [];
      
      console.log('[Item Statistics] Total requests:', requests.length);
      console.log('[Item Statistics] Selected year cycle:', priceDistributionYearCycle);
      
      // Filter requests by selected year cycle
      requests = requests.filter(request => {
        const requestYear = request.year || '';
        const matches = requestYear === priceDistributionYearCycle;
        if (matches && request.items && request.items.length > 0) {
          console.log('[Item Statistics] Matching request:', request._id, 'Year:', requestYear, 'Items:', request.items.length);
        }
        return matches;
      });
      
      console.log('[Item Statistics] Filtered requests:', requests.length);
      
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
      setIsspOfficeStats(null);
      setItemStatistics([]);
    } finally {
      setLoadingItemStats(false);
    }
  }, [priceDistributionYearCycle]);

  // Refetch dashboard data function (extracted for reuse)
  const refetchDashboardData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return;
      }

      const [statsResponse, reviewResponse, requestsResponse] = await Promise.all([
        axios.get(API_ENDPOINTS.admin.dashboardStats, { headers: getAuthHeaders() }),
        axios.get(API_ENDPOINTS.issp.reviewList, { headers: getAuthHeaders() }),
        axios.get(API_ENDPOINTS.admin.submittedRequests, { headers: getAuthHeaders() })
      ]);

      const statsData = statsResponse.data;
      let reviewData = Array.isArray(reviewResponse.data) ? reviewResponse.data : [];
      let requestsData = Array.isArray(requestsResponse.data) ? requestsResponse.data : [];

      // Filter requests by selected year cycle (for top items display)
      requestsData = requestsData.filter(request => {
        const requestYear = request.year || '';
        return requestYear === priceDistributionYearCycle;
      });
      
      // Filter review data by selected year cycle (for ISSP Review Queue display only)
      // Note: Stats are calculated from ALL ISSPs above, not filtered ones
      const filteredReviewData = reviewData.filter(review => {
        // If ISSP has a year field, filter by it; otherwise include it
        const reviewYear = review.year || '';
        return !reviewYear || reviewYear === priceDistributionYearCycle;
      });

      setDashboardStats(statsData);
      setRecentRequests(filteredReviewData);
      setTopItems(aggregateItemSummary(requestsData));
    } catch (err) {
      console.error('Error loading president dashboard data:', err);
    }
  }, [priceDistributionYearCycle]);

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
          axios.get(API_ENDPOINTS.admin.dashboardStats, { headers: getAuthHeaders() }),
          axios.get(API_ENDPOINTS.issp.reviewList, { headers: getAuthHeaders() }),
          axios.get(API_ENDPOINTS.admin.submittedRequests, { headers: getAuthHeaders() })
        ]);

        const statsData = statsResponse.data;
        let reviewData = Array.isArray(reviewResponse.data) ? reviewResponse.data : [];
        let requestsData = Array.isArray(requestsResponse.data) ? requestsResponse.data : [];

        // Filter requests by selected year cycle (for top items display)
        requestsData = requestsData.filter(request => {
          const requestYear = request.year || '';
          return requestYear === priceDistributionYearCycle;
        });
        
        // Filter review data by selected year cycle (for ISSP Review Queue display only)
        // Note: Stats are calculated from ALL ISSPs above, not filtered ones
        const filteredReviewData = reviewData.filter(review => {
          // If ISSP has a year field, filter by it; otherwise include it
          const reviewYear = review.year || '';
          return !reviewYear || reviewYear === priceDistributionYearCycle;
        });

        setDashboardStats(statsData);
        setRecentRequests(filteredReviewData);
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
    fetchPriceDistribution();
    
    // Refresh notifications every 30 seconds
    const interval = setInterval(() => {
      fetchNotifications();
      fetchApprovedISSP();
      fetchItemStatistics();
      fetchPriceDistribution();
    }, 30000);
    return () => clearInterval(interval);
  }, [priceDistributionYearCycle, refetchDashboardData]);

  // Socket.io real-time updates
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (!token || !userStr) {
      return;
    }

    try {
      const user = JSON.parse(userStr);
      connectSocket(token, user.id, user.role);

      // Listen for ISSP sent from admin
      const handleIsspSent = (data) => {
        console.log('ISSP sent event received in dashboard:', data);
        // Refresh all dashboard data
        refetchDashboardData();
        fetchItemStatistics();
        fetchNotifications();
        fetchApprovedISSP();
      };

      subscribe('issp_sent', handleIsspSent);

      return () => {
        unsubscribe('issp_sent', handleIsspSent);
        // Don't disconnect socket here - other components might be using it
      };
    } catch (error) {
      console.error('Error setting up Socket.io:', error);
    }
  }, [refetchDashboardData, fetchItemStatistics]);

  // Refetch all data when year cycle changes
  useEffect(() => {
    if (activeSection === 'dashboard') {
      fetchPriceDistribution();
      fetchItemStatistics();
      refetchDashboardData();
    }
  }, [priceDistributionYearCycle, activeSection, fetchPriceDistribution, fetchItemStatistics, refetchDashboardData]);

  // Auto-hide notification dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showNotifications && !event.target.closest('.notification-container')) {
        setShowNotifications(false);
      }
      if (priceDistributionDropdownOpen && !event.target.closest('.price-distribution-dropdown')) {
        setPriceDistributionDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications, priceDistributionDropdownOpen]);

  const visibleRequests = recentRequests.slice(0, 5);

  const handleDashboardIsspDownload = async (issp) => {
    if (!issp?._id || downloadingIsspId) {
      return;
    }

    const userId =
      typeof issp.userId === 'object' && issp.userId !== null ? issp.userId._id : issp.userId;
    const unitName =
      typeof issp.userId === 'object' && issp.userId !== null
        ? issp.userId.unit || issp.userId.username || 'issp'
        : 'issp';
    const yearCycle = (priceDistributionYearCycle || '2024-2027').trim();

    try {
      setDownloadingIsspId(issp._id);
      const response = await axios.get(API_ENDPOINTS.issp.generate, {
        headers: getAuthHeaders(),
        params: { userId, yearCycle },
        responseType: 'blob'
      });

      const blobUrl = window.URL.createObjectURL(
        new Blob([response.data], { type: 'application/pdf' })
      );
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', `ISSP-${unitName}-${yearCycle}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (downloadError) {
      console.error('Error downloading ISSP from dashboard:', downloadError);
      setError(
        downloadError.response?.data?.message ||
          downloadError.message ||
          'Failed to download ISSP PDF.'
      );
    } finally {
      setDownloadingIsspId(null);
    }
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
    <div className="flex min-h-screen bg-slate-100">
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

      {/* Main Content — aligned with Admin dashboard shell */}
      <div className="flex flex-col flex-1 min-w-0 min-h-screen overflow-hidden bg-slate-100 lg:ml-64">
        {/* Header */}
        <header className="flex-shrink-0 bg-white shadow-sm border-b border-gray-200 px-4 sm:px-6 py-4 relative z-30">
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
                                await axios.put(API_ENDPOINTS.notifications.markRead(notification.id), {}, {
                                  headers: getAuthHeaders()
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
                            await axios.put(API_ENDPOINTS.notifications.markAllRead, {}, {
                              headers: getAuthHeaders()
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
        <main className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-6">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {activeSection === 'dashboard' && (
            <div className="space-y-6">
              {loading && (
                <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600 shadow-sm">
                  Fetching the latest dashboard data…
                </div>
              )}
              
              {/* ISSP unit tracking summary — same data + labels as Admin Dashboard (office stats API / selected cycle) */}
              <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {[
                    {
                      label: 'Total units',
                      value: isspTrackingSummary.total,
                      iconBg: 'bg-slate-100',
                      valueClass: 'text-slate-900',
                      icon: (
                        <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      )
                    },
                    {
                      label: 'Submitted',
                      value: isspTrackingSummary.submitted,
                      iconBg: 'bg-emerald-100',
                      valueClass: 'text-emerald-700',
                      icon: (
                        <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )
                    },
                    {
                      label: 'Pending',
                      value: isspTrackingSummary.pending,
                      iconBg: 'bg-orange-100',
                      valueClass: 'text-orange-700',
                      icon: (
                        <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )
                    }
                  ].map((card) => (
                    <div
                      key={card.label}
                      className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 sm:p-5 flex gap-4"
                    >
                      <div className={`shrink-0 w-12 h-12 rounded-lg ${card.iconBg} flex items-center justify-center`}>
                        {card.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{card.label}</p>
                        <p className={`mt-1 text-2xl sm:text-3xl font-bold tabular-nums ${card.valueClass}`}>
                          {loadingItemStats && isspOfficeStats === null ? (
                            <span className="inline-block h-8 w-14 bg-gray-100 rounded animate-pulse" aria-hidden />
                          ) : (
                            card.value
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Unified 2× tile row — parallel to Admin Dashboard charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-stretch">
                {/* Reports Management — Top Requested Items (same UI as Admin Dashboard) */}
                <div className="min-w-0 flex flex-col h-full bg-white rounded-xl p-5 sm:p-6 shadow-md border border-gray-200/90">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-4">Reports Management</h3>
                  <div className="rounded-lg border border-gray-200 bg-gray-50/90 p-4 sm:p-5 flex-1 flex flex-col min-h-[200px]">
                    <h4 className="text-sm font-semibold text-gray-800 mb-3">Top Requested Items</h4>
                    {topItems && topItems.length > 0 ? (
                      <div className="space-y-0 flex-1">
                        {topItems.map((entry, index) => {
                          const n = entry.quantity;
                          return (
                            <div
                              key={`${entry.name}-${index}`}
                              className="flex justify-between items-center gap-4 py-3 border-b border-gray-200/80 last:border-b-0"
                            >
                              <span className="text-gray-800 font-medium text-sm min-w-0">
                                <span className="mr-2 text-gray-500 shrink-0">{index + 1}.</span>
                                <span className="break-words">{entry.name}</span>
                              </span>
                              <span className="text-gray-900 font-semibold text-sm tabular-nums shrink-0">
                                {n} items
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">
                        {loading ? 'Compiling item statistics…' : 'No request items yet.'}
                      </p>
                    )}
                  </div>
                </div>

                {/* Approved ISSP Document */}
                <div className="min-w-0 flex flex-col h-full bg-white rounded-xl p-5 sm:p-6 shadow-md border border-gray-200/90">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-4">Approved ISSP Document</h3>
                  <div className="rounded-lg border border-gray-100 bg-slate-50/50 p-4 sm:p-5 flex-1 flex flex-col min-h-[200px] justify-center">
                    {loadingApprovedISSP ? (
                      <p className="text-sm text-gray-600 text-center">Loading document…</p>
                    ) : approvedISSPDocument ? (
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-white rounded-lg border border-gray-200">
                        <svg className="w-10 h-10 text-gray-600 flex-shrink-0 mx-auto sm:mx-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <div className="flex-1 min-w-0 text-center sm:text-left">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {approvedISSPDocument.split('/').pop()}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">Approved ISSP file</p>
                        </div>
                        <a
                          href={getFileUrl(approvedISSPDocument)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-slate-700 rounded-md hover:bg-slate-800 transition-colors shrink-0"
                        >
                          View Document
                        </a>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 text-center px-2">
                        No approved ISSP document uploaded yet.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* ISSP quick access cards directly on dashboard */}
              <div className="bg-white rounded-xl p-5 sm:p-6 shadow-md border border-gray-200/90 lg:w-[calc(50%-1rem)]">
                <div className="mb-4">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900">ISSP Review Quick Access</h3>
                  </div>
                </div>

                {visibleRequests.length > 0 ? (
                  <div
                    className={`grid grid-cols-1 gap-6 ${
                      visibleRequests.length > 1 ? 'lg:grid-cols-2' : ''
                    }`}
                  >
                    {visibleRequests.map((issp) => {
                      const id = issp?._id || Math.random().toString(36);
                      const unitName =
                        typeof issp.userId === 'object' && issp.userId !== null
                          ? issp.userId.unit || issp.userId.username || 'Unnamed unit'
                          : 'Unnamed unit';
                      const submittedBy =
                        typeof issp.userId === 'object' && issp.userId !== null
                          ? issp.userId.username || issp.userId.email || 'Unknown user'
                          : 'Unknown user';
                      const reviewStatus = issp.review?.status || 'draft';
                      const statusClass = statusStyles[reviewStatus] || statusStyles.draft;
                      const isDownloading = downloadingIsspId === issp._id;

                      return (
                        <div
                          key={id}
                          className="min-w-0 flex flex-col h-full bg-white rounded-xl p-5 sm:p-6 shadow-md border border-gray-200/90"
                        >
                          <div className="flex items-start justify-between gap-3 min-h-[72px]">
                            <div className="min-w-0">
                              <p className="text-base font-semibold text-gray-900 truncate">{unitName}</p>
                              <p className="text-sm text-gray-500 truncate mt-1">Prepared by: {submittedBy}</p>
                              <p className="text-sm text-gray-500 mt-1">
                                Submitted: {formatDate(issp.review?.submittedAt)}
                              </p>
                            </div>
                            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${statusClass}`}>
                              {formatStatusLabel(reviewStatus)}
                            </span>
                          </div>
                          <div className="mt-5">
                            <button
                              onClick={() => handleDashboardIsspDownload(issp)}
                              disabled={isDownloading}
                              className={`w-full px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                                isDownloading
                                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                  : 'bg-gray-700 text-white hover:bg-gray-800'
                              }`}
                            >
                              {isDownloading ? 'Preparing PDF…' : `Download PDF (${priceDistributionYearCycle})`}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No ISSP submissions found for quick access yet.</p>
                )}
              </div>
            </div>
          )}

          {activeSection === 'logs' && (
            <ActivityLog title="System Activity (President View)" filterByCurrentUser={true} />
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
