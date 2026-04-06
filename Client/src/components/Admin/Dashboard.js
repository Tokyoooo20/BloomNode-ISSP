import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import Offices from './Offices';
import Users from './Users';
import ISSP from './ISSP';
import ActivityLog from '../common/ActivityLog';
import Profile from '../common/Profile';
import OfficeManagement from './OfficeManagement';
import { API_ENDPOINTS, getAuthHeaders, getFileUrl } from '../../utils/api';

const Dashboard = () => {
  const location = useLocation();
  const [activeSection, setActiveSection] = useState(() => {
    // Check if there's a section in location state
    return location.state?.section || 'dashboard';
  });
  const [animateReports, setAnimateReports] = useState(false);
  const [selectedYearRange, setSelectedYearRange] = useState('2024-2026');
  const [hasInitializedYearRange, setHasInitializedYearRange] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [chartAnimation, setChartAnimation] = useState(false);
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);
  const [stats, setStats] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userData, setUserData] = useState({ unit: '', username: '', profilePicture: null });
  const [priceDistribution, setPriceDistribution] = useState(null);
  const [loadingPriceDistribution, setLoadingPriceDistribution] = useState(false);
  const [activeReportsTab, setActiveReportsTab] = useState('reports'); // 'reports' or 'priceDistribution'
  const [itemYearRangeData, setItemYearRangeData] = useState({}); // Store item-based statistics by year cycle
  const [loadingItemStats, setLoadingItemStats] = useState(false);
  const reviewStatusChartRef = useRef(null);
  const [reviewStatusTooltip, setReviewStatusTooltip] = useState(null); // { x, y, label, value }
  
  // Default year cycles (fallback if database is empty)
  const defaultYearCycles = ['2024-2026', '2027-2029', '2030-2032', '2033-2035'];
  
  // State for year cycles fetched from database - initialize with defaults so they're always visible
  const [availableYearCycles, setAvailableYearCycles] = useState(defaultYearCycles);

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

  // Fetch item-based statistics for chart (same logic as Price Distribution)
  const fetchItemYearRangeStats = useCallback(async () => {
    try {
      setLoadingItemStats(true);
      
      // Guard: if no year cycles available, return empty data
      if (!availableYearCycles || !Array.isArray(availableYearCycles) || availableYearCycles.length === 0) {
        setItemYearRangeData({});
        setLoadingItemStats(false);
        return;
      }
      
      const requestsResponse = await axios.get(API_ENDPOINTS.admin.submittedRequests, {
        headers: getAuthHeaders()
      });

      const requests = Array.isArray(requestsResponse.data) ? requestsResponse.data : [];
      
      // Process all year cycles
      const yearCycleStats = {};
      
      availableYearCycles.forEach(yearCycle => {
        try {
          // Filter requests by year cycle
          const filteredRequests = requests.filter(request => {
            const requestYear = request.year || '';
            return requestYear === yearCycle;
          });
          
          const cycleYears = getYearsFromCycle(yearCycle);
          
          // Skip if cycleYears is empty (invalid year cycle format)
          if (!cycleYears || cycleYears.length === 0) {
            return;
          }
          
          // Group items by normalized item name (same logic as Price Distribution)
          const itemGroups = {}; // Group items by normalized item name
          
          filteredRequests.forEach(request => {
            if (request.items && Array.isArray(request.items)) {
              request.items.forEach(item => {
                // Only process approved items (matching ISSP.js line 3276)
                if (item.item && item.item.trim() !== '' && item.approvalStatus === 'approved') {
                  // Normalize item name: trim, lowercase (matching ISSP.js line 3277)
                  const itemName = item.item.trim().toLowerCase();
                  
                  // Initialize item group if it doesn't exist (ensures each unique item name is counted ONCE)
                  if (!itemGroups[itemName]) {
                    itemGroups[itemName] = {
                      quantities: {},
                      byYear: {} // Track which years this item appears in
                    };
                    cycleYears.forEach(year => {
                      itemGroups[itemName].quantities[year] = 0;
                      itemGroups[itemName].byYear[year] = false;
                    });
                  }
                  
                  // Sum quantities by year (accumulates across ALL requests)
                  const quantityByYear = item.quantityByYear || {};
                  cycleYears.forEach(year => {
                    const yearKey = year.toString();
                    const qty = Number(quantityByYear[yearKey]) || 0;
                    itemGroups[itemName].quantities[year] += qty;
                    // Mark that this item exists in this year if it has quantity OR if it's an approved item
                    if (qty > 0) {
                      itemGroups[itemName].byYear[year] = true;
                    }
                  });
                }
              });
            }
          });
          
          // Calculate item counts by year (matching Price Distribution logic exactly)
          // This matches the logic in Price Distribution lines 354-362
          const years = [];
          const totalUniqueItems = Object.keys(itemGroups).length;
          
          // Initialize year counts (similar to range.byYear[year].count in Price Distribution)
          const yearItemCounts = {};
          cycleYears.forEach(year => {
            yearItemCounts[year] = 0;
          });
          
          // Count items per year (matching Price Distribution line 360: range.byYear[year].count += 1)
          // The condition matches line 359: if ((qty > 0 || totalItemCost === 0) && range.byYear[year])
          // For our case: count item if qty > 0 OR if it's an approved item with no quantities
          Object.keys(itemGroups).forEach(itemName => {
            const itemData = itemGroups[itemName];
            
            // Check if item has any quantities across all years
            const hasAnyQuantity = cycleYears.some(year => (itemData.quantities[year] || 0) > 0);
            
            cycleYears.forEach(year => {
              const qty = itemData.quantities[year] || 0;
              // Count item in this year if it has quantity > 0
              // OR if it's an approved item with no quantities (count in all years to match Price Distribution behavior)
              if (qty > 0) {
                yearItemCounts[year] += 1;
              } else if (!hasAnyQuantity) {
                // Approved item with no quantities - based on third image showing same count per year,
                // count it in all years (this matches the behavior where items with 0 cost are still counted)
                yearItemCounts[year] += 1;
              }
            });
          });
          
          // Build years array
          cycleYears.forEach(year => {
            years.push({
              year: year.toString(),
              value: yearItemCounts[year] || 0,
              percentage: 0 // Will calculate after total is known
            });
          });
          
          // Calculate total: sum of items across all years (not unique items)
          // This ensures: Total = 2024 + 2025 + 2026
          const totalItems = years.reduce((sum, yearData) => sum + (yearData.value || 0), 0);
          
          // Recalculate percentages based on total sum
          years.forEach(yearData => {
            yearData.percentage = totalItems > 0 
              ? Math.round((yearData.value / totalItems) * 100) 
              : 0;
          });
          
          yearCycleStats[yearCycle] = {
            total: totalItems,
            years: years
          };
        } catch (cycleError) {
          console.error(`Error processing year cycle ${yearCycle}:`, cycleError);
          // Continue with other cycles even if one fails
        }
      });
      
      setItemYearRangeData(yearCycleStats);
    } catch (error) {
      console.error('Error fetching item year range stats:', error);
      setItemYearRangeData({});
    } finally {
      setLoadingItemStats(false);
    }
  }, [availableYearCycles]);

  // Fetch price distribution statistics (filtered by selected year cycle)
  const fetchPriceDistribution = useCallback(async () => {
    try {
      setLoadingPriceDistribution(true);
      const token = localStorage.getItem('token');
      
      const requestsResponse = await axios.get(API_ENDPOINTS.admin.submittedRequests, {
        headers: getAuthHeaders()
      });

      const requests = Array.isArray(requestsResponse.data) ? requestsResponse.data : [];
      
      // Filter requests by selected year cycle (same dropdown as Reports Management)
      const filteredRequests = requests.filter(request => {
        const requestYear = request.year || '';
        return requestYear === selectedYearRange;
      });
      
      console.log('[Price Distribution] Filtering for year cycle:', selectedYearRange);
      console.log('[Price Distribution] Total requests:', requests.length);
      console.log('[Price Distribution] Filtered requests:', filteredRequests.length);
      
      // Define price ranges
      const priceRanges = [
        { label: '₱0 - ₱10k', min: 0, max: 10000, color: 'emerald', count: 0, totalValue: 0 },
        { label: '₱10k - ₱50k', min: 10001, max: 50000, color: 'blue', count: 0, totalValue: 0 },
        { label: '₱50k - ₱100k', min: 50001, max: 100000, color: 'indigo', count: 0, totalValue: 0 },
        { label: '₱100k - ₱200k', min: 100001, max: 200000, color: 'purple', count: 0, totalValue: 0 },
        { label: '₱200k+', min: 200001, max: Infinity, color: 'rose', count: 0, totalValue: 0 }
      ];
      
      const cycleYears = getYearsFromCycle(selectedYearRange);
      
      // Initialize byYear for each range
      priceRanges.forEach(range => {
        cycleYears.forEach(year => {
          range.byYear = range.byYear || {};
          range.byYear[year] = { count: 0, totalValue: 0 };
        });
      });
      
      // Process filtered requests and group items by name (like ISSP.js does)
      // This deduplicates items across all requests - matching ISSP.js logic (lines 3273-3304)
      const itemGroups = {}; // Group items by normalized item name
      
      // First pass: Collect all approved items and group by item name (across ALL requests)
      // This ensures each unique item name is counted only ONCE, regardless of how many requests it appears in
      let totalItemsFound = 0;
      let approvedItemsFound = 0;
      const itemNameMap = new Map(); // Track which items we've seen to ensure true deduplication
      
      filteredRequests.forEach(request => {
        if (request.items && Array.isArray(request.items)) {
          request.items.forEach(item => {
            totalItemsFound++;
            // Only process approved items (matching ISSP.js line 3276)
            if (item.item && item.item.trim() !== '' && item.approvalStatus === 'approved') {
              approvedItemsFound++;
              // Normalize item name: trim, lowercase (matching ISSP.js line 3277)
              const itemName = item.item.trim().toLowerCase();
              const adminPrice = Number(item.price) || 0;
              
              // Initialize item group if it doesn't exist (this ensures each unique item name is counted ONCE)
              if (!itemGroups[itemName]) {
                itemGroups[itemName] = {
                  quantities: {},
                  costs: {},
                  price: adminPrice, // Use the admin-set price (0 if not set)
                  requestCount: 0, // Track how many requests this item appears in (for debugging)
                  itemIds: [] // Track item IDs for debugging
                };
                cycleYears.forEach(year => {
                  itemGroups[itemName].quantities[year] = 0;
                  itemGroups[itemName].costs[year] = 0;
                });
              }
              
              // Update price if current item has a higher price (in case prices differ)
              if (adminPrice > 0 && (itemGroups[itemName].price === 0 || adminPrice > itemGroups[itemName].price)) {
                itemGroups[itemName].price = adminPrice;
              }
              
              // Track that this item name appeared in another request
              itemGroups[itemName].requestCount++;
              if (item._id || item.id) {
                itemGroups[itemName].itemIds.push(item._id || item.id);
              }
              
              // Sum quantities and costs by year (matching ISSP.js line 3300: costs[year] += qty * adminPrice)
              // This accumulates across ALL requests - same item name from different requests gets summed
              const quantityByYear = item.quantityByYear || {};
              cycleYears.forEach(year => {
                const yearKey = year.toString();
                const qty = Number(quantityByYear[yearKey]) || 0;
                itemGroups[itemName].quantities[year] += qty;
                // Only calculate cost if price is set
                if (adminPrice > 0) {
                  itemGroups[itemName].costs[year] += qty * adminPrice;
                }
              });
            }
          });
        }
      });
      
      // Second pass: Process each unique item name and categorize by total cost
      Object.keys(itemGroups).forEach(itemNameKey => {
        const itemData = itemGroups[itemNameKey];
        
        // Calculate total cost per unique item: sum of costs across all years
        let totalItemCost = 0;
        let hasQuantities = false;
        cycleYears.forEach(year => {
          totalItemCost += itemData.costs[year] || 0;
          if ((itemData.quantities[year] || 0) > 0) {
            hasQuantities = true;
          }
        });
        
        // If no cost calculated and no quantities, try using the price as fallback
        if (totalItemCost === 0 && !hasQuantities && itemData.price > 0) {
          totalItemCost = itemData.price;
          // Distribute evenly across all years for display purposes
          cycleYears.forEach(year => {
            itemData.costs[year] = itemData.price / cycleYears.length;
            itemData.quantities[year] = 1; // Count as 1 item per year for display
          });
        }
        
        // Include all approved items, even if they have no cost
        // If no cost and no price, assign to lowest range (0-10k) for display
        if (totalItemCost === 0) {
          totalItemCost = 0; // Keep as 0, will be assigned to first range
        }
        
        // Categorize item by TOTAL COST (not unit price) - matching ISSP calculation
        // Items with 0 cost go to the first range (₱0 - ₱10k)
        const range = totalItemCost === 0 
          ? priceRanges[0] // Assign items with no cost to first range
          : priceRanges.find(r => totalItemCost >= r.min && totalItemCost <= r.max);
        
        if (range) {
          range.count++; // Count each unique item name once
          range.totalValue += totalItemCost; // Add total cost (can be 0)
          
          // Count by year - item counts once per year if it has quantity > 0 OR if it exists
          cycleYears.forEach(year => {
            const qty = itemData.quantities[year] || 0;
            const yearCost = itemData.costs[year] || 0;
            // Count item if it has quantity OR if it's an approved item (even with 0 quantity)
            if ((qty > 0 || totalItemCost === 0) && range.byYear[year]) {
              range.byYear[year].count += 1; // Count the ITEM once per year (not the quantity)
              range.byYear[year].totalValue += yearCost; // Year cost (already calculated, can be 0)
            }
          });
        }
      });
      
      const totalUniqueItems = Object.keys(itemGroups).length;
      console.log('[Price Distribution] Debug info:', {
        totalItemsFound,
        approvedItemsFound,
        totalUniqueItems,
        filteredRequestsCount: filteredRequests.length,
        itemGroupNames: Object.keys(itemGroups),
        itemGroupsDetails: Object.keys(itemGroups).map(name => ({
          name,
          totalCost: cycleYears.reduce((sum, year) => sum + (itemGroups[name].costs[year] || 0), 0),
          totalQuantities: cycleYears.reduce((sum, year) => sum + (itemGroups[name].quantities[year] || 0), 0),
          appearsInRequests: itemGroups[name].requestCount, // How many requests this item appears in
          itemIds: itemGroups[name].itemIds.length // How many item instances
        }))
      });
      
      // Calculate totals and percentages
      const totalItems = priceRanges.reduce((sum, range) => sum + range.count, 0);
      const totalValue = priceRanges.reduce((sum, range) => sum + range.totalValue, 0);
      
      // Calculate totals by year
      const totalsByYear = {};
      cycleYears.forEach(year => {
        totalsByYear[year] = {
          count: priceRanges.reduce((sum, range) => sum + (range.byYear[year]?.count || 0), 0),
          totalValue: priceRanges.reduce((sum, range) => sum + (range.byYear[year]?.totalValue || 0), 0)
        };
      });
      
      const distribution = priceRanges.map(range => ({
        ...range,
        percentage: totalItems > 0 ? Math.round((range.count / totalItems) * 100) : 0,
        valuePercentage: totalValue > 0 ? Math.round((range.totalValue / totalValue) * 100) : 0,
        averagePrice: range.count > 0 ? Math.round(range.totalValue / range.count) : 0
      }));
      
      console.log('[Price Distribution] Setting distribution:', {
        totalItems,
        totalValue,
        rangesCount: distribution.length,
        totalUniqueItems,
        itemGroupsCount: Object.keys(itemGroups).length,
        filteredRequestsCount: filteredRequests.length,
        totalsByYear: Object.keys(totalsByYear).map(year => ({
          year,
          count: totalsByYear[year].count,
          totalValue: totalsByYear[year].totalValue
        }))
      });
      
      setPriceDistribution({
        ranges: distribution,
        totalItems,
        totalValue,
        averagePrice: totalItems > 0 ? Math.round(totalValue / totalItems) : 0,
        totalsByYear,
        cycleYears
      });
    } catch (error) {
      console.error('Error fetching price distribution:', error);
      setPriceDistribution(null);
    } finally {
      setLoadingPriceDistribution(false);
    }
  }, [selectedYearRange]);

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

  // Handle location state changes (e.g., when navigating from EditUser)
  useEffect(() => {
    const sectionFromState = location.state?.section;
    if (sectionFromState && sectionFromState !== activeSection) {
      setActiveSection(sectionFromState);
      // Clear the state to prevent it from persisting on refresh
      // Use setTimeout to ensure state is read first
      setTimeout(() => {
        window.history.replaceState({}, document.title, window.location.pathname);
      }, 0);
    }
  }, [location.state]);

  const previousYearCycle = useMemo(() => {
    const idx = Array.isArray(availableYearCycles) ? availableYearCycles.indexOf(selectedYearRange) : -1;
    if (idx > 0) return availableYearCycles[idx - 1];
    return '';
  }, [availableYearCycles, selectedYearRange]);

  // Fetch dashboard statistics (filtered by selected year cycle)
  const fetchDashboardStats = useCallback(async () => {
    try {
      const response = await axios.get(API_ENDPOINTS.admin.dashboardStats, {
        params: { yearCycle: selectedYearRange || undefined, compareYearCycle: previousYearCycle || undefined },
        headers: getAuthHeaders()
      });
      setStats(response.data);
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      setStats(null);
    }
  }, [selectedYearRange, previousYearCycle]);

  useEffect(() => {
    if (activeSection === 'dashboard') {
      fetchDashboardStats();
      fetchNotifications();
      fetchUserData();
      fetchPriceDistribution();
      // Only fetch item stats if year cycles are available
      if (availableYearCycles && availableYearCycles.length > 0) {
        fetchItemYearRangeStats();
      }
      
      // Refresh stats every 30 seconds when dashboard is active
      const interval = setInterval(() => {
        fetchDashboardStats();
        fetchNotifications();
        fetchPriceDistribution();
        if (availableYearCycles && availableYearCycles.length > 0) {
          fetchItemYearRangeStats();
        }
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [activeSection, fetchDashboardStats, fetchPriceDistribution, fetchItemYearRangeStats, availableYearCycles, selectedYearRange]);

  // Ensure default year cycles exist in database
  const ensureDefaultYearCycles = useCallback(async () => {
    try {
      const response = await axios.get(API_ENDPOINTS.organization.yearCycles.list, {
        headers: getAuthHeaders()
      });
      
      const existingCycles = response.data || [];
      const existingNames = existingCycles.map(cycle => cycle.name);
      
      // Find missing default cycles
      const missingCycles = defaultYearCycles.filter(name => !existingNames.includes(name));
      
      // Create missing cycles
      if (missingCycles.length > 0) {
        for (const cycleName of missingCycles) {
          const [startYear, endYear] = cycleName.split('-').map(Number);
          const order = defaultYearCycles.indexOf(cycleName) + 1;
          
          try {
            await axios.post(API_ENDPOINTS.organization.yearCycles.create, {
              name: cycleName,
              startYear,
              endYear,
              isActive: true,
              order
            }, {
              headers: getAuthHeaders()
            });
            console.log(`Created default year cycle: ${cycleName}`);
          } catch (createError) {
            // Ignore if cycle already exists (race condition)
            if (createError.response?.status !== 400 || !createError.response?.data?.message?.includes('already exists')) {
              console.error(`Error creating year cycle ${cycleName}:`, createError);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error ensuring default year cycles:', error);
    }
  }, []);

  // Fetch year cycles from database
  const fetchYearCycles = useCallback(async () => {
    try {
      // First, ensure default cycles exist in database
      await ensureDefaultYearCycles();
      
      // Then fetch all cycles from database
      const response = await axios.get(API_ENDPOINTS.organization.yearCycles.list, {
        headers: getAuthHeaders()
      });
      
      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        // Sort by startYear ascending (oldest to newest)
        const sortedCycles = [...response.data].sort((a, b) => {
          return (a.startYear || 0) - (b.startYear || 0);
        });
        const cycleNames = sortedCycles.map(cycle => cycle.name);
        setAvailableYearCycles(cycleNames);
        
        // Set default selected year range if not set
        if (!selectedYearRange && cycleNames.length > 0) {
          setSelectedYearRange(cycleNames[0]);
        }
      } else {
        // Fallback: use defaults if database is empty (shouldn't happen after ensureDefaultYearCycles)
        setAvailableYearCycles(defaultYearCycles);
        if (!selectedYearRange) {
          setSelectedYearRange(defaultYearCycles[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching year cycles:', error);
      // On error, use default hardcoded cycles as fallback
      setAvailableYearCycles(defaultYearCycles);
      if (!selectedYearRange) {
        setSelectedYearRange(defaultYearCycles[0]);
      }
    }
  }, [ensureDefaultYearCycles]); // Removed selectedYearRange and priceDistributionYearCycle to prevent unnecessary re-creation

  // Fetch year cycles when dashboard section is active
  useEffect(() => {
    if (activeSection === 'dashboard') {
      fetchYearCycles();
    }
  }, [activeSection, fetchYearCycles]);

  // Set default year range when stats are first loaded (only once)
  useEffect(() => {
    if (stats && stats.yearRangeStats && availableYearCycles.length > 0 && !hasInitializedYearRange) {
      // Only initialize once, and only if selectedYearRange is not in availableYearCycles
      // This prevents overriding user's manual selection
      const currentRange = selectedYearRange;
      if (!availableYearCycles.includes(currentRange)) {
        // Find first year range with data, or use first available
        const rangeWithData = availableYearCycles.find(range => stats.yearRangeStats[range]?.total > 0);
        if (rangeWithData) {
          setSelectedYearRange(rangeWithData);
        } else {
          setSelectedYearRange(availableYearCycles[0]);
        }
      }
      setHasInitializedYearRange(true);
    }
  }, [stats, availableYearCycles, hasInitializedYearRange]); // Removed selectedYearRange from dependencies

  // Refetch price distribution when year cycle changes
  useEffect(() => {
    if (activeSection === 'dashboard') {
      fetchPriceDistribution();
    }
  }, [selectedYearRange, activeSection, fetchPriceDistribution]);

  // Refetch item stats when year cycles are available
  useEffect(() => {
    if (activeSection === 'dashboard' && availableYearCycles.length > 0) {
      fetchItemYearRangeStats();
    }
  }, [availableYearCycles, activeSection, fetchItemYearRangeStats]);

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

  // Helper function to generate chart path from data
  const generateChartPath = (years, maxValue, chartHeight = 160) => {
    try {
      if (!years || !Array.isArray(years) || years.length === 0) {
        return `M 0 ${chartHeight} L 800 ${chartHeight} L 800 ${chartHeight} L 0 ${chartHeight} Z`;
      }
      
      const stepX = years.length > 1 ? 800 / (years.length - 1) : 400;
      const values = years.map(y => Number(y?.value) || 0);
      const normalizedMax = Math.max(...values, 1);
      const points = years.map((yearData, index) => {
        const x = index * stepX;
        const normalizedValue = normalizedMax > 0 ? ((Number(yearData?.value) || 0) / normalizedMax) : 0;
        const y = chartHeight - (normalizedValue * (chartHeight - 20)) - 20; // Reserve 20px at bottom
        return `${x} ${y}`;
      });
      
      const pathPoints = points.map((point, index) => index === 0 ? `M ${point}` : `L ${point}`).join(' ');
      return `${pathPoints} L 800 ${chartHeight} L 0 ${chartHeight} Z`;
    } catch (error) {
      console.error('Error generating chart path:', error);
      return `M 0 ${chartHeight} L 800 ${chartHeight} L 800 ${chartHeight} L 0 ${chartHeight} Z`;
    }
  };

  // Year range data - use item-based statistics (same logic as Price Distribution)
  const yearRangeData = useMemo(() => {
    if (!availableYearCycles || !Array.isArray(availableYearCycles) || availableYearCycles.length === 0) {
      return {};
    }
    
    try {
      return availableYearCycles.reduce((acc, yearRange) => {
        try {
          if (!yearRange || typeof yearRange !== 'string') {
            return acc;
          }
          
          const [startYear, endYear] = yearRange.split('-').map(Number);
          if (isNaN(startYear) || isNaN(endYear)) {
            return acc;
          }
          
          const yearCount = endYear - startYear + 1;
          
          // Use item-based statistics if available, otherwise create empty structure
          const itemData = itemYearRangeData && itemYearRangeData[yearRange] ? itemYearRangeData[yearRange] : null;
          let years = [];
          let total = 0;
          
          if (itemData && itemData.years && Array.isArray(itemData.years) && itemData.years.length > 0) {
            // Use item-based data
            years = itemData.years;
            total = itemData.total || 0;
          } else {
            // Create empty structure for years with no data
            for (let i = 0; i < yearCount; i++) {
              const year = startYear + i;
              years.push({ year: year.toString(), value: 0, percentage: 0 });
            }
            total = 0;
          }
          
          // Generate chart paths based on item data
          const maxValue = Math.max(...years.map(y => y.value || 0), 1);
          const chartPath1 = generateChartPath(years, maxValue);
          // For second path, use a slightly different visualization
          const chartPath2 = generateChartPath(
            years.map(y => ({ ...y, value: (y.value || 0) * 0.8 })), 
            maxValue
          );
          
          acc[yearRange] = {
            total: total,
            years: years,
            chartPath1: chartPath1,
            chartPath2: chartPath2
          };
        } catch (error) {
          console.error(`Error processing year range ${yearRange}:`, error);
        }
        return acc;
      }, {});
    } catch (error) {
      console.error('Error calculating yearRangeData:', error);
      return {};
    }
  }, [availableYearCycles, itemYearRangeData]);

  const handleYearRangeChange = (yearRange) => {
    // Update state immediately
    setSelectedYearRange(yearRange);
    setIsDropdownOpen(false);
    setChartAnimation(false);
    setTimeout(() => setChartAnimation(true), 100);
  };

  // Get current year range data or create empty structure
  const currentData = useMemo(() => {
    try {
      if (selectedYearRange && yearRangeData && yearRangeData[selectedYearRange]) {
        return yearRangeData[selectedYearRange];
      }
      
      if (!selectedYearRange) {
        // Return empty structure if no year range selected
        const emptyPath = generateChartPath([], 1);
        return {
          total: 0,
          years: [],
          chartPath1: emptyPath,
          chartPath2: emptyPath
        };
      }
      
      const [startYear, endYear] = selectedYearRange.split('-').map(Number);
      if (isNaN(startYear) || isNaN(endYear)) {
        const emptyPath = generateChartPath([], 1);
        return {
          total: 0,
          years: [],
          chartPath1: emptyPath,
          chartPath2: emptyPath
        };
      }
      
      const yearCount = endYear - startYear + 1;
      const emptyYears = [];
      for (let i = 0; i < yearCount; i++) {
        const year = startYear + i;
        emptyYears.push({ year: year.toString(), value: 0, percentage: 0 });
      }
      const emptyPath = generateChartPath(emptyYears, 1);
      return {
        total: 0,
        years: emptyYears,
        chartPath1: emptyPath,
        chartPath2: emptyPath
      };
    } catch (error) {
      console.error('Error calculating currentData:', error);
      const emptyPath = generateChartPath([], 1);
      return {
        total: 0,
        years: [],
        chartPath1: emptyPath,
        chartPath2: emptyPath
      };
    }
  }, [selectedYearRange, yearRangeData]);

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
                setActiveSection('officeManagement');
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center px-4 py-3 text-left rounded-lg mb-2 transition-colors tap-target ${
                activeSection === 'officeManagement' 
                  ? 'bg-gray-700 text-white' 
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Office Management
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
                {activeSection === 'issp' ? 'ISSP' : 
                 activeSection === 'officeManagement' ? 'Office Management' :
                 activeSection.charAt(0).toUpperCase() + activeSection.slice(1)}
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
                              {availableYearCycles.length === 0 ? (
                                <div className="px-3 sm:px-4 py-2.5 sm:py-2 text-xs sm:text-sm text-gray-500">
                                  No year cycles available
                                </div>
                              ) : (
                                availableYearCycles.map((yearRange) => (
                                  <button
                                    key={yearRange}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleYearRangeChange(yearRange);
                                    }}
                                    className={`w-full text-left px-3 sm:px-4 py-2.5 sm:py-2 text-xs sm:text-sm hover:bg-gray-100 first:rounded-t-lg last:rounded-b-lg tap-target ${
                                      selectedYearRange === yearRange ? 'bg-gray-50 text-gray-700' : 'text-gray-700'
                                    }`}
                                  >
                                    {yearRange}
                                  </button>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Chart Container */}
                    <div className="relative h-64 sm:h-80 bg-gray-50 rounded-lg p-3 sm:p-4 overflow-x-auto">
                      <svg className="w-full h-full" viewBox="0 0 800 160" role="img" aria-label="Monthly comparison bar chart">
                        {(() => {
                          const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
                          const thisYearValues = (stats && stats.monthlyRequestCounts && Array.isArray(stats.monthlyRequestCounts.thisCycleByMonth))
                            ? stats.monthlyRequestCounts.thisCycleByMonth.map(n => Number(n) || 0)
                            : Array(12).fill(0);
                          const lastYearValues = (stats && stats.monthlyRequestCounts && Array.isArray(stats.monthlyRequestCounts.lastCycleByMonth))
                            ? stats.monthlyRequestCounts.lastCycleByMonth.map(n => Number(n) || 0)
                            : Array(12).fill(0);
                          const hasLastCycle = !!(stats && stats.monthlyRequestCounts && stats.monthlyRequestCounts.lastCycle);
                          const maxValue = Math.max(1, ...thisYearValues, ...lastYearValues);

                          const baselineY = 140;
                          const chartTop = 18;
                          const chartHeight = baselineY - chartTop;
                          const leftPad = 40;
                          const rightPad = 20;
                          const width = 800 - leftPad - rightPad;
                          const groupW = width / months.length;
                          const barW = Math.max(10, groupW * 0.22);
                          const gap = Math.max(6, groupW * 0.08);
                          const scale = chartHeight / maxValue;

                          return (
                            <>
                              {/* Baseline */}
                              <line x1={leftPad} y1={baselineY} x2={800 - rightPad} y2={baselineY} stroke="#e5e7eb" strokeWidth="2" />

                              {months.map((label, i) => {
                                const vThis = thisYearValues[i];
                                const vLast = lastYearValues[i];
                                const hThis = vThis * scale;
                                const hLast = vLast * scale;
                                const xCenter = leftPad + i * groupW + groupW / 2;
                                const xThis = xCenter - (barW + gap / 2);
                                const xLast = xCenter + (gap / 2);

                                return (
                                  <g key={label}>
                                    <rect
                                      x={xThis}
                                      y={baselineY - hThis}
                                      width={barW}
                                      height={hThis}
                                      rx="2"
                                      fill="#0B74FF"
                                      className={`transition-all duration-700 ease-out ${chartAnimation ? 'opacity-100' : 'opacity-0'}`}
                                    />
                                    {hasLastCycle && (
                                      <rect
                                        x={xLast}
                                        y={baselineY - hLast}
                                        width={barW}
                                        height={hLast}
                                        rx="2"
                                        fill="#D1D5DB"
                                        className={`transition-all duration-700 ease-out ${chartAnimation ? 'opacity-100' : 'opacity-0'}`}
                                      />
                                    )}
                                    <text x={xCenter} y={156} textAnchor="middle" fontSize="12" fill="#374151">
                                      {label}
                                    </text>
                                  </g>
                                );
                              })}
                            </>
                          );
                        })()}
                      </svg>

                      {/* Legend (match reference style) */}
                      <div className="absolute bottom-3 right-3 bg-white/80 backdrop-blur rounded-md px-3 py-2 border border-gray-200 flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: '#0B74FF' }} />
                          <span className="text-xs text-gray-800 font-medium">This cycle</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="inline-block w-3 h-3 rounded-sm bg-gray-400" />
                          <span className="text-xs text-gray-800 font-medium">Last cycle</span>
                        </div>
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
                      
                      {currentData.years && Array.isArray(currentData.years) && currentData.years.length > 0 ? (
                        currentData.years.map((yearData, index) => {
                          return (
                            <div key={yearData?.year || index}>
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-sm text-gray-600">{yearData?.year || ''}</span>
                                <span className="text-sm text-gray-800 font-semibold">{yearData?.value || 0}</span>
                              </div>
                              <div className="w-full bg-gray-300 rounded-full h-2">
                                <div 
                                  className="bg-gray-500 h-2 rounded-full transition-all duration-700 ease-in-out" 
                                  style={{width: `${yearData?.percentage || 0}%`}}
                                ></div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-sm text-gray-500">No data available</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Tab Navigation for Reports and Price Distribution */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
                <nav className="flex border-b border-gray-200">
                  <button
                    onClick={() => setActiveReportsTab('reports')}
                    className={`flex-1 px-4 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap text-center ${
                      activeReportsTab === 'reports'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Reports Management
                  </button>
                  <button
                    onClick={() => setActiveReportsTab('priceDistribution')}
                    className={`flex-1 px-4 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap text-center ${
                      activeReportsTab === 'priceDistribution'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Price Distribution
                  </button>
                </nav>
              </div>

              {/* Tab Content */}
              {activeReportsTab === 'reports' && (
                <div className="bg-white rounded-lg p-8 shadow-sm border border-gray-200">
                  <h2 className="text-2xl font-bold text-gray-800 mb-6">Reports Management</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {/* Request Trends - Top 3 most requested items */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">Request Trends</h3>
                      {(stats && stats.topRequestedItems && stats.topRequestedItems.length > 0) ? (
                        <>
                          <div className="space-y-3">
                            {stats.topRequestedItems.map((entry, index) => (
                              <div key={`${entry.name}-${index}`} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                                <span className="text-gray-700 font-medium">
                                  <span className="mr-2 text-gray-500">{index + 1}.</span>
                                  {entry.name}
                                </span>
                                <span className="text-gray-900 font-semibold">{entry.count} request{entry.count !== 1 ? 's' : ''}</span>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <p className="text-gray-500">No request items yet.</p>
                      )}
                    </div>
                    
                    {/* Review status chart (Approved / Rejected / Pending) */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">Review Status</h3>
                        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mb-6">
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-3 bg-gray-400 rounded-sm shrink-0" />
                            <span className="text-gray-700 text-sm">Approved</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-3 bg-gray-600 rounded-sm shrink-0" />
                            <span className="text-gray-700 text-sm">Rejected</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-3 bg-gray-200 rounded-sm shrink-0" />
                            <span className="text-gray-700 text-sm">Pending</span>
                          </div>
                        </div>
                        <div className="flex justify-center">
                          <div className="relative w-36 h-36">
                            <div ref={reviewStatusChartRef} className="relative">
                              {reviewStatusTooltip && (
                                <div
                                  className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md bg-gray-900 px-2 py-1 text-xs text-white shadow"
                                  style={{ left: reviewStatusTooltip.x, top: reviewStatusTooltip.y }}
                                >
                                  {reviewStatusTooltip.label}: {reviewStatusTooltip.value}%
                                </div>
                              )}
                              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                              <circle cx="50" cy="50" r="35" fill="none" stroke="#e5e7eb" strokeWidth="14" />
                              {/* Approved segment */}
                              <circle
                                cx="50" cy="50" r="35"
                                fill="none"
                                stroke="#9CA3AF"
                                strokeWidth="14"
                                strokeDasharray={stats && (stats.approvedRequests + stats.rejectedRequests + (stats.pendingUnits || 0)) > 0 ? `${((stats.approvalRate || 0) / 100) * 219.8} ${219.8 - ((stats.approvalRate || 0) / 100) * 219.8}` : "0 219.8"}
                                strokeDashoffset={animateReports ? "0" : "218.8"}
                                className="transition-all duration-[1800ms] ease-out"
                                style={{ cursor: 'crosshair' }}
                                onMouseMove={(e) => {
                                  const rect = reviewStatusChartRef.current?.getBoundingClientRect();
                                  if (!rect) return;
                                  setReviewStatusTooltip({
                                    x: e.clientX - rect.left,
                                    y: e.clientY - rect.top,
                                    label: 'Approved',
                                    value: stats ? (stats.approvalRate || 0) : 0
                                  });
                                }}
                                onMouseLeave={() => setReviewStatusTooltip(null)}
                              />
                              {/* Rejected segment */}
                              <circle
                                cx="50" cy="50" r="35"
                                fill="none"
                                stroke="#6B7280"
                                strokeWidth="14"
                                strokeDasharray={stats && (stats.approvedRequests + stats.rejectedRequests + (stats.pendingUnits || 0)) > 0 ? `${((stats.rejectionRate || 0) / 100) * 219.8} ${219.8 - ((stats.rejectionRate || 0) / 100) * 219.8}` : "0 219.8"}
                                strokeDashoffset={stats && (stats.approvedRequests + stats.rejectedRequests + (stats.pendingUnits || 0)) > 0 ? (animateReports ? `-${((stats.approvalRate || 0) / 100) * 219.8}` : `-${((stats.approvalRate || 0) / 100) * 219.8 - 219.8}`) : "0"}
                                className="transition-all duration-[1800ms] ease-out"
                                style={{ transitionDelay: '400ms' }}
                                onMouseMove={(e) => {
                                  const rect = reviewStatusChartRef.current?.getBoundingClientRect();
                                  if (!rect) return;
                                  setReviewStatusTooltip({
                                    x: e.clientX - rect.left,
                                    y: e.clientY - rect.top,
                                    label: 'Rejected',
                                    value: stats ? (stats.rejectionRate || 0) : 0
                                  });
                                }}
                                onMouseLeave={() => setReviewStatusTooltip(null)}
                              />
                              {/* Pending segment */}
                              <circle
                                cx="50" cy="50" r="35"
                                fill="none"
                                stroke="#D1D5DB"
                                strokeWidth="14"
                                strokeDasharray={stats && (stats.approvedRequests + stats.rejectedRequests + (stats.pendingUnits || 0)) > 0 ? `${((stats.pendingRate || 0) / 100) * 219.8} ${219.8 - ((stats.pendingRate || 0) / 100) * 219.8}` : "0 219.8"}
                                strokeDashoffset={stats && (stats.approvedRequests + stats.rejectedRequests + (stats.pendingUnits || 0)) > 0 ? (animateReports ? `-${(((stats.approvalRate || 0) + (stats.rejectionRate || 0)) / 100) * 219.8}` : `-${(((stats.approvalRate || 0) + (stats.rejectionRate || 0)) / 100) * 219.8 - 219.8}`) : "0"}
                                className="transition-all duration-[1800ms] ease-out"
                                style={{ transitionDelay: '800ms' }}
                                onMouseMove={(e) => {
                                  const rect = reviewStatusChartRef.current?.getBoundingClientRect();
                                  if (!rect) return;
                                  setReviewStatusTooltip({
                                    x: e.clientX - rect.left,
                                    y: e.clientY - rect.top,
                                    label: 'Pending',
                                    value: stats ? (stats.pendingRate || 0) : 0
                                  });
                                }}
                                onMouseLeave={() => setReviewStatusTooltip(null)}
                              />
                              </svg>
                            </div>
                          </div>
                        </div>
                    </div>
                  </div>
                </div>
              )}

              {activeReportsTab === 'priceDistribution' && (
                <div className="bg-white rounded-lg p-8 shadow-sm border border-gray-200">
                <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-1">Price Distribution Analysis</h2>
                  </div>
                </div>
                
                {loadingPriceDistribution ? (
                  <div className="p-4 rounded-lg border bg-gray-50 border-gray-200">
                    <p className="text-sm text-gray-600">Loading price distribution...</p>
                  </div>
                ) : priceDistribution && priceDistribution.totalItems > 0 ? (
                  <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Donut Chart */}
                      <div className="flex items-center justify-center">
                        <div className="relative w-56 h-56">
                          <svg className="transform -rotate-90 w-56 h-56">
                            {priceDistribution.ranges.map((range, index) => {
                              const circumference = 2 * Math.PI * 70;
                              const previousPercentages = priceDistribution.ranges
                                .slice(0, index)
                                .reduce((sum, r) => sum + r.percentage, 0);
                              const offset = circumference * (previousPercentages / 100);
                              const dashArray = `${circumference * (range.percentage / 100)} ${circumference}`;
                              
                              const colorClasses = {
                                emerald: 'text-emerald-600',
                                blue: 'text-blue-600',
                                indigo: 'text-indigo-600',
                                purple: 'text-purple-600',
                                rose: 'text-rose-600'
                              };
                              
                              return (
                                <circle
                                  key={range.label}
                                  cx="112"
                                  cy="112"
                                  r="70"
                                  stroke="currentColor"
                                  strokeWidth="16"
                                  fill="transparent"
                                  strokeDasharray={dashArray}
                                  strokeDashoffset={-offset}
                                  className={`${colorClasses[range.color]} transition-all duration-500`}
                                  strokeLinecap="round"
                                />
                              );
                            })}
                            {/* Background circle */}
                            <circle
                              cx="112"
                              cy="112"
                              r="70"
                              stroke="currentColor"
                              strokeWidth="16"
                              fill="transparent"
                              className="text-gray-200"
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center">
                              <p className="text-4xl font-bold text-gray-900">{priceDistribution.totalItems}</p>
                              <p className="text-sm text-gray-500">Total Items</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Legend with Year Breakdown */}
                      <div className="space-y-4">
                        {/* Summary by Year */}
                        {priceDistribution.cycleYears && priceDistribution.cycleYears.length > 0 && (
                          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 mb-4">
                            <h4 className="text-sm font-semibold text-gray-700 mb-3">Summary by Year</h4>
                            <div className="space-y-2">
                              {priceDistribution.cycleYears.map((year) => {
                                const yearData = priceDistribution.totalsByYear[year];
                                const maxCount = Math.max(...priceDistribution.cycleYears.map(y => priceDistribution.totalsByYear[y].count), 1);
                                const percentage = maxCount > 0 ? Math.round((yearData.count / maxCount) * 100) : 0;
                                
                                return (
                                  <div key={year}>
                                    <div className="flex justify-between items-center mb-1">
                                      <span className="text-sm text-gray-700 font-medium">{year}</span>
                                      <span className="text-sm text-gray-900 font-semibold">{yearData.count} items</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                      <div
                                        className="bg-gray-600 h-2 rounded-full transition-all duration-500"
                                        style={{ width: `${percentage}%` }}
                                      ></div>
                                    </div>
                                  </div>
                                );
                              })}
                              <div className="pt-2 border-t border-gray-300 mt-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm font-semibold text-gray-800">Total</span>
                                  <span className="text-sm font-bold text-gray-900">{priceDistribution.totalItems} items</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Price Range Details */}
                        <div className="flex flex-col space-y-3">
                          {priceDistribution.ranges.map((range) => {
                            const colorClasses = {
                              emerald: 'bg-emerald-600',
                              blue: 'bg-blue-600',
                              indigo: 'bg-indigo-600',
                              purple: 'bg-purple-600',
                              rose: 'bg-rose-600'
                            };
                            
                            return (
                              <div key={range.label} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="flex items-center space-x-3">
                                  <div className={`w-5 h-5 rounded ${colorClasses[range.color]}`}></div>
                                  <span className="text-base font-medium text-gray-700">{range.label}</span>
                                </div>
                                <div className="text-right">
                                  <p className="text-base font-bold text-gray-900">{range.count} items</p>
                                  <p className="text-sm text-gray-500">{range.percentage}%</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-lg border border-dashed border-gray-300 bg-gray-50">
                    <p className="text-sm text-gray-500">No price distribution data available yet.</p>
                  </div>
                )}
                </div>
              )}

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

          {activeSection === 'officeManagement' && (
            <OfficeManagement />
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
