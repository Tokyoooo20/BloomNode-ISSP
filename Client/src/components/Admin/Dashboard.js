import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import Offices from './Offices';
import Users from './Users';
import ISSP from './ISSP';
import ActivityLog from '../common/ActivityLog';
import Profile from '../common/Profile';
import OfficeManagement from './OfficeManagement';
import IsspRequestTracking from './IsspRequestTracking';
import { API_ENDPOINTS, getAuthHeaders, getFileUrl } from '../../utils/api';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels);

const ACADEMIC_YEAR_COLORS = ['#0B74FF', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4'];
const DONUT_CUTOUT_PERCENT = 25;

/** Bar chart CSS height — matches Chart.js doughnut `animation.duration` (700ms) */
const BAR_ANIMATION_MS = 700;
const barHeightTransition = `height ${BAR_ANIMATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`;
const barLabelTransition = `bottom ${BAR_ANIMATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1), opacity 220ms ease-out`;

const AcademicYearDistributionDonut = ({ years, total, chartAnimation }) => {
  const rows = Array.isArray(years)
    ? years.map((y) => ({
        year: String(y?.year ?? ''),
        value: Number(y?.value) || 0,
        percentage: Number(y?.percentage) || 0
      }))
    : [];

  const sum = rows.reduce((a, b) => a + b.value, 0);
  const computedTotal = typeof total === 'number' ? total : sum;

  const percentages = rows.map((row) => {
    if (row.percentage > 0) return row.percentage;
    if (computedTotal > 0) return (row.value / computedTotal) * 100;
    return 0;
  });

  const chartData = useMemo(
    () => ({
      labels: rows.map((r) => r.year),
      datasets: [
        {
          data: rows.map((r) => r.value),
          backgroundColor: rows.map((_, i) => ACADEMIC_YEAR_COLORS[i % ACADEMIC_YEAR_COLORS.length]),
          borderColor: '#ffffff',
          borderWidth: 2,
          hoverOffset: 4
        }
      ]
    }),
    [rows]
  );

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      cutout: `${DONUT_CUTOUT_PERCENT}%`,
      animation: {
        duration: chartAnimation ? 700 : 0,
        animateRotate: true,
        animateScale: false
      },
      plugins: {
        legend: { display: false },
            tooltip: {
          callbacks: {
            label: (ctx) => {
              const v = Number(ctx.raw) || 0;
              const t = ctx.dataset.data.reduce((a, b) => a + Number(b), 0);
              const pct = t > 0 ? Math.round((v / t) * 100) : 0;
              const u = v === 1 ? 'unit' : 'units';
              return ` ${ctx.label}: ${v} ${u} (${pct}%)`;
            }
          }
        },
        datalabels: {
          color: '#ffffff',
          font: { weight: '700', size: 10 },
          textStrokeColor: 'rgba(0,0,0,0.2)',
          textStrokeWidth: 2,
          formatter: (value, ctx) => {
            const t = ctx.dataset.data.reduce((a, b) => a + Number(b), 0);
            if (!t || !value) return '';
            const pct = Math.round((Number(value) / t) * 100);
            return pct >= 7 ? `${pct}%` : '';
          }
        }
      }
    }),
    [chartAnimation]
  );

  if (!rows.length || computedTotal === 0) {
    return (
      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-8 lg:gap-10 w-full">
        <div className="relative h-44 w-44 sm:h-48 sm:w-48 shrink-0 rounded-full border border-gray-200 bg-gray-50 flex items-center justify-center">
          <span className="text-sm text-gray-400">No data</span>
        </div>
        <div className="text-sm text-gray-500 text-center sm:text-left">No reports to show for this academic year range.</div>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col lg:flex-row items-center justify-center lg:justify-between gap-8 lg:gap-10 w-full transition-opacity duration-700 ease-out ${chartAnimation ? 'opacity-100' : 'opacity-0'}`}
    >
      <div className="relative aspect-square w-40 h-40 sm:w-44 sm:h-44 shrink-0 mx-auto lg:mx-0 max-w-full">
        <Doughnut data={chartData} options={chartOptions} />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className="rounded-full bg-white flex flex-col items-center justify-center shadow-[0_1px_2px_rgba(0,0,0,0.04)] aspect-square h-auto max-h-full"
            style={{ width: `${DONUT_CUTOUT_PERCENT}%` }}
          >
            <div className="text-sm sm:text-base font-bold text-gray-900 leading-none tracking-tight tabular-nums">
              {computedTotal}
            </div>
          </div>
        </div>
      </div>

      <div className="w-full min-w-0 flex-1 flex flex-col justify-center">
        <ul className="list-none m-0 p-0 w-full">
          {rows.map((row, index) => {
            const pct = percentages[index] || 0;
            const color = ACADEMIC_YEAR_COLORS[index % ACADEMIC_YEAR_COLORS.length];
            return (
              <li
                key={row.year}
                className="flex items-start gap-2.5 sm:gap-3 pt-4 first:pt-0 pb-4 border-b border-gray-100 last:border-b-0"
              >
                <span
                  className="mt-1.5 w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                  aria-hidden
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs sm:text-sm font-bold text-slate-900 tabular-nums tracking-tight">{row.year}</span>
                    <span className="text-xs sm:text-sm font-bold tabular-nums shrink-0 text-right" style={{ color }}>
                      {Math.round(pct)}%
                    </span>
                  </div>
                  <p className="text-xs leading-snug text-slate-500 font-normal mt-1.5 mb-0">
                    {row.value} unit{row.value !== 1 ? 's' : ''} approved this calendar year
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const location = useLocation();
  const [activeSection, setActiveSection] = useState(() => {
    // Check if there's a section in location state
    return location.state?.section || 'dashboard';
  });
  const [selectedYearRange, setSelectedYearRange] = useState('2024-2026');
  const [hasInitializedYearRange, setHasInitializedYearRange] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [chartAnimation, setChartAnimation] = useState(false);
  /** Staged with chartAnimation so bar heights animate from 0 → target (same cadence as pie chart) */
  const [priceBarAnim, setPriceBarAnim] = useState(false);
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);
  const [stats, setStats] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userData, setUserData] = useState({ unit: '', username: '', profilePicture: null });
  const [priceDistribution, setPriceDistribution] = useState(null);
  const [loadingPriceDistribution, setLoadingPriceDistribution] = useState(false);
  const [itemYearRangeData, setItemYearRangeData] = useState({}); // Store item-based statistics by year cycle
  const [loadingItemStats, setLoadingItemStats] = useState(false);
  
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
          
          // Group items by normalized name; only count explicit quantityByYear / quantity (no implicit +1)
          const itemGroups = {};

          filteredRequests.forEach((request) => {
            if (request.items && Array.isArray(request.items)) {
              request.items.forEach((item) => {
                if (item.item && item.item.trim() !== '' && item.approvalStatus === 'approved') {
                  const itemName = item.item.trim().toLowerCase();
                  if (!itemGroups[itemName]) {
                    itemGroups[itemName] = { quantities: {}, byYear: {} };
                    cycleYears.forEach((year) => {
                      itemGroups[itemName].quantities[year] = 0;
                      itemGroups[itemName].byYear[year] = false;
                    });
                  }
                  const quantityByYear = item.quantityByYear || {};
                  let lineSum = 0;
                  cycleYears.forEach((year) => {
                    const yearKey = year.toString();
                    const qty = Number(quantityByYear[yearKey] ?? quantityByYear[year] ?? 0) || 0;
                    itemGroups[itemName].quantities[year] += qty;
                    lineSum += qty;
                    if (qty > 0) {
                      itemGroups[itemName].byYear[year] = true;
                    }
                  });
                  if (lineSum === 0) {
                    const q = Number(item.quantity) || 0;
                    if (q > 0) {
                      const firstY = cycleYears[0];
                      itemGroups[itemName].quantities[firstY] += q;
                    }
                  }
                }
              });
            }
          });

          const years = [];
          // Sum approved quantities per calendar year (not count of distinct item names)
          const yearQuantityTotals = {};
          cycleYears.forEach((year) => {
            yearQuantityTotals[year] = 0;
          });

          Object.keys(itemGroups).forEach((itemName) => {
            const itemData = itemGroups[itemName];
            cycleYears.forEach((year) => {
              const qty = itemData.quantities[year] || 0;
              yearQuantityTotals[year] += qty;
            });
          });

          cycleYears.forEach((year) => {
            years.push({
              year: year.toString(),
              value: yearQuantityTotals[year] || 0,
              percentage: 0
            });
          });

          const totalItems = years.reduce((sum, yearData) => sum + (yearData.value || 0), 0);
          years.forEach((yearData) => {
            yearData.percentage =
              totalItems > 0 ? Math.round((yearData.value / totalItems) * 100) : 0;
          });

          yearCycleStats[yearCycle] = {
            total: totalItems,
            years
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

  const [isspOfficeStats, setIsspOfficeStats] = useState(null);
  const [loadingIsspOfficeStats, setLoadingIsspOfficeStats] = useState(true);

  const fetchIsspOfficeStats = useCallback(async () => {
    try {
      setLoadingIsspOfficeStats(true);
      const params = {};
      if (selectedYearRange && String(selectedYearRange).trim()) {
        params.yearCycle = String(selectedYearRange).trim();
      }
      const response = await axios.get(API_ENDPOINTS.admin.officeStats, {
        headers: getAuthHeaders(),
        params
      });
      setIsspOfficeStats(response.data);
    } catch (err) {
      console.error('Error fetching office stats (ISSP tracking):', err);
      setIsspOfficeStats(null);
    } finally {
      setLoadingIsspOfficeStats(false);
    }
  }, [selectedYearRange]);

  const isspTrackingSummary = useMemo(() => {
    const s = isspOfficeStats?.unitTracking?.summary;
    return {
      total: typeof s?.total === 'number' ? s.total : 0,
      submitted: typeof s?.submitted === 'number' ? s.submitted : 0,
      pending: typeof s?.notSubmitted === 'number' ? s.notSubmitted : 0
    };
  }, [isspOfficeStats]);

  useEffect(() => {
    if (activeSection === 'dashboard') {
      fetchDashboardStats();
      fetchNotifications();
      fetchUserData();
      fetchPriceDistribution();
      fetchIsspOfficeStats();
      // Only fetch item stats if year cycles are available
      if (availableYearCycles && availableYearCycles.length > 0) {
        fetchItemYearRangeStats();
      }
      
      // Refresh stats every 30 seconds when dashboard is active
      const interval = setInterval(() => {
        fetchDashboardStats();
        fetchNotifications();
        fetchPriceDistribution();
        fetchIsspOfficeStats();
        if (availableYearCycles && availableYearCycles.length > 0) {
          fetchItemYearRangeStats();
        }
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [activeSection, fetchDashboardStats, fetchPriceDistribution, fetchIsspOfficeStats, fetchItemYearRangeStats, availableYearCycles, selectedYearRange]);

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

  // Auto-hide notification and year-cycle dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showNotifications && !event.target.closest('.notification-container')) {
        setShowNotifications(false);
      }
      if (isDropdownOpen && !event.target.closest('.year-cycle-dropdown')) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications, isDropdownOpen]);

  useEffect(() => {
    if (activeSection !== 'dashboard') {
      setIsDropdownOpen(false);
    }
  }, [activeSection]);

  /** Replay pie + bar “grow” animation every time the admin opens the Dashboard section */
  useEffect(() => {
    if (activeSection !== 'dashboard') {
      setChartAnimation(false);
      return;
    }
    setChartAnimation(false);
    const t = setTimeout(() => setChartAnimation(true), 100);
    return () => clearTimeout(t);
  }, [activeSection]);

  useEffect(() => {
    if (!chartAnimation) {
      setPriceBarAnim(false);
      return;
    }
    setPriceBarAnim(false);
    const t = setTimeout(() => setPriceBarAnim(true), 50);
    return () => clearTimeout(t);
  }, [chartAnimation]);

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
          const itemData = itemYearRangeData && itemYearRangeData[yearRange] ? itemYearRangeData[yearRange] : null;
          let years = [];
          let total = 0;

          if (itemData && itemData.years && Array.isArray(itemData.years) && itemData.years.length > 0) {
            years = itemData.years;
            total = itemData.total || 0;
          } else {
            for (let i = 0; i < yearCount; i++) {
              const year = startYear + i;
              years.push({ year: year.toString(), value: 0, percentage: 0 });
            }
            total = 0;
          }

          acc[yearRange] = {
            total,
            years
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

  const currentData = useMemo(() => {
    try {
      if (selectedYearRange && yearRangeData && yearRangeData[selectedYearRange]) {
        return yearRangeData[selectedYearRange];
      }

      if (!selectedYearRange) {
        return { total: 0, years: [] };
      }

      const [startYear, endYear] = selectedYearRange.split('-').map(Number);
      if (isNaN(startYear) || isNaN(endYear)) {
        return { total: 0, years: [] };
      }

      const yearCount = endYear - startYear + 1;
      const emptyYears = [];
      for (let i = 0; i < yearCount; i++) {
        const year = startYear + i;
        emptyYears.push({ year: year.toString(), value: 0, percentage: 0 });
      }
      return { total: 0, years: emptyYears };
    } catch (error) {
      console.error('Error calculating currentData:', error);
      return { total: 0, years: [] };
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
      <div className="flex flex-col flex-1 min-w-0 min-h-screen bg-slate-100 lg:ml-64">
        {/* Header */}
        <header className="flex-shrink-0 bg-white shadow-sm border-b border-gray-200 px-4 sm:px-6 py-4 relative z-30">
          <div className="flex justify-between items-center gap-3 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
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
            <div className="flex items-center gap-3 sm:gap-4 ml-auto shrink-0">
              {activeSection === 'dashboard' && (
                <div className="flex items-center gap-2 year-cycle-dropdown">
                  <span className="text-sm font-semibold text-gray-800 whitespace-nowrap">Year:</span>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="bg-white border border-gray-300 rounded-lg px-3 sm:px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 flex items-center gap-2"
                    >
                      <span>{selectedYearRange}</span>
                      <svg className={`w-4 h-4 shrink-0 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {isDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-40 sm:w-36 bg-white border border-gray-300 rounded-lg shadow-lg z-50 dropdown-responsive">
                        {availableYearCycles.length === 0 ? (
                          <div className="px-3 sm:px-4 py-2.5 sm:py-2 text-xs sm:text-sm text-gray-500">
                            No year cycles available
                          </div>
                        ) : (
                          availableYearCycles.map((yearRange) => (
                            <button
                              key={yearRange}
                              type="button"
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
              )}
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
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-6">
          {activeSection === 'dashboard' && (
            <div className="space-y-6">
              {/* ISSP unit tracking summary (same cycle as Year in header; data from office stats API) */}
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
                          {loadingIsspOfficeStats && isspOfficeStats === null ? (
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

              {/* Unified 2×2 dashboard tiles — reference layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-stretch">
                  <div className="min-w-0 flex flex-col h-full bg-white rounded-xl p-5 sm:p-6 shadow-md border border-gray-200/90">
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-4">
                      Price Distribution
                    </h3>
                    <div className="min-w-0 flex-1 flex flex-col">
                  {loadingPriceDistribution ? (
                    <div className="p-4 rounded-xl border bg-gray-50 border-gray-200 flex-1 flex items-center justify-center min-h-[240px]">
                      <p className="text-sm text-gray-600">Loading price distribution...</p>
                    </div>
                  ) : priceDistribution && priceDistribution.totalItems > 0 ? (
                    (() => {
                      const ranges = priceDistribution.ranges;
                      const maxCount = Math.max(...ranges.map((r) => r.count), 0);
                      const yMax = Math.max(5, Math.ceil(maxCount * 1.15) || 5);
                      const tickCount = 5;
                      const ticks = Array.from({ length: tickCount + 1 }, (_, i) =>
                        Math.round((yMax * (tickCount - i)) / tickCount)
                      );
                      const barsAnimated = chartAnimation && priceBarAnim;
                      /* Reference palette: emerald, blue, indigo/purple, purple, coral */
                      const barColorClasses = {
                        emerald: 'bg-emerald-500',
                        blue: 'bg-[#0B74FF]',
                        indigo: 'bg-indigo-600',
                        purple: 'bg-purple-600',
                        rose: 'bg-[#F87171]'
                      };
                      return (
                        <div className="rounded-lg border border-gray-100 bg-slate-50/40 p-3 sm:p-4 flex-1 flex flex-col min-h-[260px]">
                          <div className="flex gap-2 sm:gap-3 flex-1 min-h-[220px]">
                            <div className="flex items-center justify-center w-7 sm:w-8 shrink-0 pt-2 pb-8">
                              <span
                                className="text-[11px] sm:text-xs font-medium text-slate-600 whitespace-nowrap"
                                style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                              >
                                Number of Items
                              </span>
                            </div>
                            <div className="flex flex-1 min-w-0 gap-1 sm:gap-2">
                              <div className="flex flex-col justify-between text-[10px] sm:text-xs text-slate-500 font-medium text-right pr-1 w-5 sm:w-6 shrink-0 pt-0 pb-7">
                                {ticks.map((t) => (
                                  <span key={`tick-${t}`} className="leading-none tabular-nums">
                                    {t}
                                  </span>
                                ))}
                              </div>
                              <div className="flex-1 flex flex-col min-w-0">
                                <div className="relative flex-1 min-h-[140px] sm:min-h-[160px] border-l border-b border-slate-300 pl-1 pr-1">
                                  <div
                                    className="absolute inset-0 pointer-events-none flex flex-col justify-between"
                                    aria-hidden
                                  >
                                    {[0, 1, 2, 3, 4, 5].map((i) => (
                                      <div key={`grid-${i}`} className="w-full border-t border-dotted border-slate-200" />
                                    ))}
                                  </div>
                                  <div className="relative z-[1] h-full flex items-stretch justify-between gap-1 sm:gap-2 pt-2">
                                    {ranges.map((range) => {
                                      const hPct = yMax > 0 ? Math.min(100, (range.count / yMax) * 100) : 0;
                                      const animatedPct = barsAnimated ? hPct : 0;
                                      return (
                                        <div
                                          key={range.label}
                                          className="relative flex-1 min-w-0 h-full"
                                        >
                                          {/* Bar: animates from 0 → height (synced with pie chart timing) */}
                                          <div
                                            className={`absolute left-1/2 bottom-0 w-full max-w-[48px] -translate-x-1/2 rounded-t-sm ${barColorClasses[range.color] || 'bg-slate-400'}`}
                                            style={{
                                              height: `${animatedPct}%`,
                                              minHeight: barsAnimated && range.count > 0 ? 4 : 0,
                                              transition: barHeightTransition
                                            }}
                                          />
                                          {/* Value on top of bar — omit when bucket is empty */}
                                          {range.count > 0 && (
                                            <span
                                              className="absolute left-1/2 -translate-x-1/2 text-xs sm:text-sm font-bold text-slate-900 tabular-nums leading-none whitespace-nowrap"
                                              style={{
                                                bottom: `calc(${animatedPct}% + 3px)`,
                                                opacity: barsAnimated ? 1 : 0,
                                                transition: barLabelTransition
                                              }}
                                            >
                                              {range.count}
                                            </span>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                                <div className="flex justify-between gap-1 sm:gap-2 mt-2 pt-1 border-t border-transparent">
                                  {ranges.map((range) => (
                                    <div
                                      key={`xl-${range.label}`}
                                      className="flex-1 text-center min-w-0 px-0.5"
                                    >
                                      <span className="text-[9px] sm:text-[10px] leading-tight text-slate-600 font-medium block break-words">
                                        {range.label}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="p-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 flex-1 flex items-center justify-center min-h-[240px]">
                      <p className="text-sm text-gray-500">No price distribution data available yet.</p>
                    </div>
                  )}
                    </div>
                  </div>
                  <div className="min-w-0 flex flex-col h-full bg-white rounded-xl p-5 sm:p-6 shadow-md border border-gray-200/90">
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-4">
                      Approved ISSP Items by Year
                    </h3>
                    <div className="min-w-0 flex-1 flex flex-col px-0 sm:px-1">
                      {loadingItemStats ? (
                        <div className="text-sm text-gray-500 text-center flex-1 flex items-center justify-center min-h-[240px]">
                          Loading chart…
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col justify-center min-h-[260px] py-1">
                          <AcademicYearDistributionDonut
                            years={currentData.years}
                            total={currentData.total}
                            chartAnimation={chartAnimation}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                {/* Reports Management */}
                <div className="min-w-0 flex flex-col h-full bg-white rounded-xl p-5 sm:p-6 shadow-md border border-gray-200/90">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-4">Reports Management</h3>
                  <div className="rounded-lg border border-gray-200 bg-gray-50/90 p-4 sm:p-5 flex-1 flex flex-col min-h-[200px]">
                    <h4 className="text-sm font-semibold text-gray-800 mb-3">Top Requested Items</h4>
                    {(stats && stats.topRequestedItems && stats.topRequestedItems.length > 0) ? (
                      <div className="space-y-0 flex-1">
                        {stats.topRequestedItems.map((entry, index) => {
                          const n = entry.total != null ? entry.total : entry.count;
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
                      <p className="text-sm text-gray-500">No request items yet.</p>
                    )}
                  </div>
                </div>

                {/* ISSP Request Tracking */}
                <div className="min-w-0 flex flex-col h-full bg-white rounded-xl p-5 sm:p-6 shadow-md border border-gray-200/90">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-4">ISSP Request Tracking</h3>
                  <IsspRequestTracking
                    yearCycle={selectedYearRange}
                    officeStats={isspOfficeStats}
                    officeStatsLoading={loadingIsspOfficeStats}
                    hideTitle
                    embedded
                  />
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
