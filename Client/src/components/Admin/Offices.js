import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import axios from 'axios';
import Modal from '../common/Modal';
import { API_ENDPOINTS, getAuthHeaders } from '../../utils/api';
const Offices = () => {
  const [animate, setAnimate] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // Track pending reviews before saving
  const [pendingReviews, setPendingReviews] = useState({}); // { itemKey: { decision, reason } }
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [selectedYearCycle, setSelectedYearCycle] = useState('2024-2026');
  const [selectedUnitGroup, setSelectedUnitGroup] = useState(null); // { unitName, year, requests }
  const [searchQuery, setSearchQuery] = useState('');
  const latestFetchTokenRef = useRef(0);
  // Pagination for Items for Review table
  const [itemsCurrentPage, setItemsCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Return disapproved items modal state
  const [returnDisapprovedModal, setReturnDisapprovedModal] = useState({ 
    show: false, 
    reason: '' 
  });
  
  // Track requests being returned to prevent duplicate returns
  const [returningRequests, setReturningRequests] = useState(new Set());
  
  // Modal state for confirmation dialogs
  const [modalState, setModalState] = useState({
    isOpen: false,
    variant: 'default',
    title: '',
    message: '',
    confirmLabel: null,
    cancelLabel: null,
    onConfirm: null,
    onCancel: null,
    children: null,
    closeOnOverlay: true,
    showCloseButton: true
  });

  // Alert state for success/error messages
  const [alertState, setAlertState] = useState({
    isOpen: false,
    variant: 'default',
    title: '',
    message: '',
    confirmLabel: null,
    cancelLabel: null,
    onConfirm: null,
    onClose: null,
    children: null,
    closeOnOverlay: true,
    showCloseButton: true,
    autoCloseDelay: null
  });

  // Modal and Alert helper functions
  const closeModal = useCallback(() => {
    setModalState((prevState) => ({
      ...prevState,
      isOpen: false
    }));
  }, []);

  const openModal = useCallback((config) => {
    setModalState({
      isOpen: true,
      variant: 'default',
      title: '',
      message: '',
      confirmLabel: null,
      cancelLabel: null,
      onConfirm: null,
      onCancel: null,
      children: null,
      closeOnOverlay: true,
      showCloseButton: true,
      ...config
    });
  }, []);

  const closeAlert = useCallback(() => {
    setAlertState((prevState) => ({
      ...prevState,
      isOpen: false
    }));
  }, []);

  const showAlert = useCallback((config) => {
    setAlertState({
      isOpen: true,
      variant: 'default',
      title: '',
      message: '',
      confirmLabel: null,
      cancelLabel: null,
      onConfirm: null,
      onClose: null,
      children: null,
      closeOnOverlay: true,
      showCloseButton: true,
      autoCloseDelay: null,
      ...config
    });

    if (config.autoCloseDelay) {
      setTimeout(() => {
        closeAlert();
      }, config.autoCloseDelay);
    }
  }, [closeAlert]);

  const handleModalClose = useCallback(() => {
    if (typeof modalState.onCancel === 'function') {
      modalState.onCancel();
    }
    closeModal();
  }, [modalState.onCancel, closeModal]);

  const handleModalConfirm = useCallback(async () => {
    if (typeof modalState.onConfirm === 'function') {
      await modalState.onConfirm();
    }
    closeModal();
  }, [modalState.onConfirm, closeModal]);

  const handleAlertClose = useCallback(() => {
    if (typeof alertState.onClose === 'function') {
      alertState.onClose();
    }
    closeAlert();
  }, [alertState.onClose, closeAlert]);

  const handleAlertConfirm = useCallback(async () => {
    if (typeof alertState.onConfirm === 'function') {
      await alertState.onConfirm();
    }
    closeAlert();
  }, [alertState.onConfirm, closeAlert]);

  const ITEM_KEY_DELIMITER = '::';

  const makeItemKey = (requestId, itemId) => `${requestId}${ITEM_KEY_DELIMITER}${itemId}`;

  const parseItemKey = (itemKey) => {
    const key = String(itemKey ?? '');
    const delimiterIndex = key.indexOf(ITEM_KEY_DELIMITER);
    if (delimiterIndex === -1) {
      return { requestId: null, itemId: null };
    }
    return {
      requestId: key.slice(0, delimiterIndex),
      itemId: key.slice(delimiterIndex + ITEM_KEY_DELIMITER.length)
    };
  };

  // Fetch submitted requests
  const fetchSubmittedRequests = async (yearCycle = selectedYearCycle, requestToken = null) => {
    try {
      const response = await axios.get(API_ENDPOINTS.admin.submittedRequests, {
        headers: getAuthHeaders(),
        params: { yearCycle }
      });
      console.log('Fetched submitted requests:', response.data);
      if (requestToken === null || latestFetchTokenRef.current === requestToken) {
        setRequests(Array.isArray(response.data) ? response.data : []);
      }
      return response.data;
    } catch (err) {
      console.error('Error fetching submitted requests:', err);
      if (requestToken === null || latestFetchTokenRef.current === requestToken) {
        setError('Failed to fetch submitted requests');
      }
      throw err;
    }
  };

  const fetchDashboardData = useCallback(async (yearCycle) => {
    const fetchToken = Date.now();
    latestFetchTokenRef.current = fetchToken;
    setLoading(true);
    setError(null);

    try {
      await fetchSubmittedRequests(yearCycle, fetchToken);

      // Ignore stale responses from an earlier year-cycle request.
      if (latestFetchTokenRef.current !== fetchToken) {
        return;
      }
    } catch (err) {
      if (latestFetchTokenRef.current !== fetchToken) {
        return;
      }
      setError('Failed to fetch office dashboard data');
    } finally {
      if (latestFetchTokenRef.current === fetchToken) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    setAnimate(true);
  }, []);

  useEffect(() => {
    fetchDashboardData(selectedYearCycle);
    setPendingReviews({});
    setSelectedUnitGroup(null);
    setItemsCurrentPage(1);
  }, [selectedYearCycle, fetchDashboardData]);

  // Group requests by unit, campus, and year cycle
  const groupedRequests = useMemo(() => {
    const getCampusAbbreviation = (campusValue) => {
      const c = String(campusValue || '').trim().toLowerCase();
      if (!c || c === 'main' || c === 'main campus') return 'MAIN';
      if (c === 'baganga') return 'BGA';
      if (c === 'tarragona') return 'TAR';
      if (c === 'banaybanay' || c === 'banaybanay campus') return 'BAN';
      if (c === 'san isidro') return 'SID';
      if (c === 'president') return '';
      return String(campusValue || '').trim().toUpperCase();
    };

    const resolveDisplayUnit = (request, campusValue) => {
      const programName = (request.program && request.program.trim())
        ? request.program.trim()
        : (request.userId?.program && request.userId.program.trim())
          ? request.userId.program.trim()
          : '';
      const unitName = (request.unit && request.unit.trim())
        ? request.unit.trim()
        : (request.userId?.unit && request.userId.unit.trim())
          ? request.userId.unit.trim()
          : 'Unknown Unit';
      const base = programName || unitName;
      const campusAbbr = getCampusAbbreviation(campusValue);
      return campusAbbr ? `${campusAbbr} ${base}` : base;
    };

    const grouped = {};
    requests.forEach(request => {
      // Use request.campus first, then userId.campus, default to 'Main' if empty/null
      const campus = (request.campus && request.campus.trim()) 
        ? request.campus.trim() 
        : (request.userId?.campus && request.userId.campus.trim()) 
          ? request.userId.campus.trim() 
          : 'Main';
      
      // Normalize campus (empty/null = 'Main')
      const normalizedCampus = campus || 'Main';
      const unitName = resolveDisplayUnit(request, normalizedCampus);
      const year = request.year || 'Unknown Year';
      
      // Use unit+campus+year as the key to separate units by campus
      const key = `${unitName}|||${normalizedCampus}|||${year}`;
      
      if (!grouped[key]) {
        grouped[key] = {
          unitName,
          campus: normalizedCampus,
          year,
          requests: []
        };
      }
      grouped[key].requests.push(request);
    });
    return grouped;
  }, [requests]);

  // Filter grouped requests based on status, priority, year, and search query
  // Exclude groups where all items are approved (they're displayed in ISSP.js instead)
  const filteredGroupedRequests = useMemo(() => {
    const filtered = {};
    const searchLower = searchQuery.toLowerCase().trim();
    
    Object.keys(groupedRequests).forEach(key => {
      const group = groupedRequests[key];
      const filteredRequests = group.requests.filter(request => {
        const matchesStatus = !statusFilter || request.status === statusFilter;
        const matchesPriority = !priorityFilter || request.priority === priorityFilter;
        const matchesYear = !selectedYearCycle || request.year === selectedYearCycle;
        return matchesStatus && matchesPriority && matchesYear;
      });
      
      // Apply search filter (including campus)
      const matchesSearch = !searchLower || 
        group.unitName.toLowerCase().includes(searchLower) ||
        (group.campus && group.campus.toLowerCase().includes(searchLower)) ||
        group.year.toLowerCase().includes(searchLower) ||
        filteredRequests.some(req => 
          req.requestTitle?.toLowerCase().includes(searchLower) ||
          req.userId?.username?.toLowerCase().includes(searchLower) ||
          req.userId?.email?.toLowerCase().includes(searchLower)
        );
      
      // Check if all items in this group are approved (exclude from Offices.js)
      // Collect all items from all requests in this group
      const allItemsInGroup = [];
      filteredRequests.forEach(request => {
        if (request.items && request.items.length > 0) {
          allItemsInGroup.push(...request.items);
        }
      });
      
      // If there are no items at all, still show the group (empty requests need attention)
      // If there are items, check if ALL of them are approved
      const allItemsApproved = allItemsInGroup.length > 0 && 
        allItemsInGroup.every(item => item.approvalStatus === 'approved');
      
      // Only include groups that have items needing review (not all approved)
      if (filteredRequests.length > 0 && matchesSearch && !allItemsApproved) {
        filtered[key] = {
          ...group,
          requests: filteredRequests
        };
      }
    });
    return filtered;
  }, [groupedRequests, statusFilter, priorityFilter, selectedYearCycle, searchQuery]);

  // Handle inline approve/disapprove
  const handleItemDecision = (item, decision) => {
    const itemKey = makeItemKey(item.requestId, item.id);
    setPendingReviews(prev => ({
      ...prev,
      [itemKey]: {
        decision,
        reason: decision === 'approved' ? 'Approved' : (prev[itemKey]?.reason || '')
      }
    }));
  };

  // Handle reason change for disapproved items
  const handleReasonChange = (item, reason) => {
    const itemKey = makeItemKey(item.requestId, item.id);
    setPendingReviews(prev => ({
      ...prev,
      [itemKey]: {
        ...prev[itemKey],
        reason
      }
    }));
  };

  // Save all pending reviews
  const handleSaveReviews = async () => {
    const pendingKeys = Object.keys(pendingReviews);
    if (pendingKeys.length === 0) {
      showAlert({
        variant: 'danger',
        title: 'No Changes',
        message: 'No reviews to save. Please make some decisions first.'
      });
      return;
    }

    // Validate all disapproved items have reasons
    const invalidReviews = pendingKeys.filter(key => {
      const review = pendingReviews[key];
      return review.decision === 'disapproved' && !review.reason.trim();
    });

    if (invalidReviews.length > 0) {
      showAlert({
        variant: 'danger',
        title: 'Validation Error',
        message: 'Please provide reasons for all disapproved items.'
      });
      return;
    }

    openModal({
      variant: 'confirm',
      title: 'Save Reviews',
      message: `Are you sure you want to save ${pendingKeys.length} review${pendingKeys.length !== 1 ? 's' : ''}?`,
      confirmLabel: 'Yes, Save',
      onConfirm: async () => {
        try {
          setLoading(true);
          const token = localStorage.getItem('token');
          
          // Process all pending reviews
          await Promise.all(
            pendingKeys.map(async (itemKey) => {
              const { requestId, itemId } = parseItemKey(itemKey);
              if (!requestId || !itemId) {
                throw new Error(`Invalid pending review key: ${itemKey}`);
              }
              const review = pendingReviews[itemKey];
              
              await axios.put(
                API_ENDPOINTS.admin.requestReview(requestId, itemId),
                {
                  approvalStatus: review.decision,
                  approvalReason: review.reason
                },
                {
                  headers: { 'x-auth-token': token }
                }
              );
            })
          );

          showAlert({
            variant: 'success',
            title: 'Reviews Saved',
            message: `Successfully saved ${pendingKeys.length} review${pendingKeys.length !== 1 ? 's' : ''}!`,
            autoCloseDelay: 2000
          });
          
          // Clear pending reviews
          setPendingReviews({});
          
          await fetchSubmittedRequests();
          
          // Refresh the selected unit group
          if (selectedUnitGroup) {
            const token = localStorage.getItem('token');
            const updatedRequests = await Promise.all(
              selectedUnitGroup.requests.map(request =>
                axios.get(
                  API_ENDPOINTS.admin.getRequest(request._id),
                  { headers: { 'x-auth-token': token } }
                ).then(res => res.data)
              )
            );
            setSelectedUnitGroup({
              ...selectedUnitGroup,
              requests: updatedRequests
            });
          }
        } catch (err) {
          console.error('Error saving reviews:', err);
          showAlert({
            variant: 'danger',
            title: 'Save Failed',
            message: 'Failed to save reviews: ' + (err.response?.data?.message || err.message)
          });
        } finally {
          setLoading(false);
        }
      }
    });
  };

  // Handle complete review - mark all requests in group as reviewed
  const performCompleteReview = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!selectedUnitGroup) return;
      
      // Complete review for all requests in the group
      await Promise.all(
        selectedUnitGroup.requests.map(request =>
          axios.put(
            API_ENDPOINTS.admin.completeReview(request._id),
            {},
            {
              headers: { 'x-auth-token': token }
            }
          )
        )
      );

      showAlert({
        variant: 'success',
        title: 'Review Completed',
        message: 'Review completed successfully! The unit can now view the results.',
        autoCloseDelay: 2000
      });
      
      await fetchSubmittedRequests();
      setSelectedUnitGroup(null);
    } catch (err) {
      console.error('Error completing review:', err);
      showAlert({
        variant: 'danger',
        title: 'Error',
        message: 'Failed to complete review: ' + (err.response?.data?.message || err.message)
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteReview = () => {
    if (!selectedUnitGroup) return;
    
    // Check if all items have been reviewed across all requests
    const allItems = [];
    selectedUnitGroup.requests.forEach(request => {
      if (request.items) {
        allItems.push(...request.items);
      }
    });
    
    const allItemsReviewed = allItems.every(
      item => item.approvalStatus !== 'pending'
    );

    if (!allItemsReviewed) {
      showAlert({
        variant: 'danger',
        title: 'Incomplete Review',
        message: 'Please review all items before completing the review!'
      });
      return;
    }

    openModal({
      variant: 'confirm',
      title: 'Complete Review',
      message: 'Are you sure you want to complete this review? The unit will be notified of the results.',
      confirmLabel: 'Yes, Complete',
      onConfirm: async () => {
        await performCompleteReview();
      }
    });
  };

  // Combine all items from all requests in the group
  const allGroupItems = useMemo(() => {
    if (!selectedUnitGroup) return [];
    const items = [];
    selectedUnitGroup.requests.forEach(request => {
      if (request.items && request.items.length > 0) {
        request.items.forEach(item => {
          items.push({
            ...item,
            requestId: request._id,
            requestTitle: request.requestTitle,
            requestStatus: request.status
          });
        });
      }
    });
    return items;
  }, [selectedUnitGroup]);

  // Get all disapproved items (both saved and pending)
  const disapprovedItems = useMemo(() => {
    if (!selectedUnitGroup) return [];
    const disapproved = [];
    
    // Get saved disapproved items
    allGroupItems.forEach(item => {
      if (item.approvalStatus === 'disapproved') {
        disapproved.push({
          ...item,
          isPending: false
        });
      }
    });
    
    // Get pending disapproved items (from pendingReviews)
    Object.keys(pendingReviews).forEach(itemKey => {
      const review = pendingReviews[itemKey];
      if (review.decision === 'disapproved') {
        const { requestId, itemId } = parseItemKey(itemKey);
        if (!requestId || !itemId) {
          return;
        }
        const item = allGroupItems.find(i => 
          i.requestId === requestId && (i.id === itemId || i._id === itemId)
        );
        if (item) {
          disapproved.push({
            ...item,
            isPending: true,
            pendingReason: review.reason
          });
        }
      }
    });
    
    return disapproved;
  }, [allGroupItems, pendingReviews, selectedUnitGroup]);

  // Group disapproved items by request (excluding already rejected requests)
  const disapprovedByRequest = useMemo(() => {
    const grouped = {};
    disapprovedItems.forEach(item => {
      const requestId = item.requestId;
      const request = selectedUnitGroup.requests.find(r => r._id === requestId);
      // Exclude already rejected requests
      if (request?.status === 'rejected') {
        return;
      }
      if (!grouped[requestId]) {
        grouped[requestId] = {
          request: request,
          items: []
        };
      }
      grouped[requestId].items.push(item);
    });
    return grouped;
  }, [disapprovedItems, selectedUnitGroup]);

  // Get count of requests that can be returned (not already rejected)
  const returnableRequestsCount = useMemo(() => {
    return Object.keys(disapprovedByRequest).length;
  }, [disapprovedByRequest]);

  // Handle return disapproved items
  const handleReturnDisapprovedItems = () => {
    if (disapprovedItems.length === 0) {
      showAlert({
        variant: 'danger',
        title: 'No Disapproved Items',
        message: 'There are no disapproved items to return.'
      });
      return;
    }
    
    // Check if there are any returnable requests (not already rejected)
    if (returnableRequestsCount === 0) {
      showAlert({
        variant: 'warning',
        title: 'No Requests to Return',
        message: 'All requests containing disapproved items have already been returned.',
        autoCloseDelay: 3000
      });
      return;
    }
    
    setReturnDisapprovedModal({
      show: true,
      reason: ''
    });
  };

  // Perform return disapproved items
  const performReturnDisapprovedItems = async () => {
    if (!returnDisapprovedModal.reason.trim()) {
      showAlert({
        variant: 'danger',
        title: 'Validation Error',
        message: 'Please provide a reason for returning these items.'
      });
      return;
    }

    // Filter out already rejected/approved requests and requests being returned
    const requestIdsToReturn = Object.keys(disapprovedByRequest).filter(requestId => {
      const request = disapprovedByRequest[requestId].request;
      // Exclude already rejected requests
      if (request?.status === 'rejected') {
        return false;
      }
      // Exclude already approved requests
      if (request?.status === 'approved') {
        return false;
      }
      // Exclude requests currently being returned
      if (returningRequests.has(requestId)) {
        return false;
      }
      return true;
    });

    if (requestIdsToReturn.length === 0) {
      showAlert({
        variant: 'warning',
        title: 'No Requests to Return',
        message: 'All requests containing disapproved items have already been returned or are being processed.',
        autoCloseDelay: 3000
      });
      setReturnDisapprovedModal({ show: false, reason: '' });
      return;
    }

    // Check if already processing (prevent double-click)
    const isProcessing = requestIdsToReturn.some(id => returningRequests.has(id));
    if (isProcessing) {
      showAlert({
        variant: 'warning',
        title: 'Already Processing',
        message: 'Some requests are already being returned. Please wait...',
        autoCloseDelay: 2000
      });
      return;
    }

    try {
      // Add all request IDs to returning set to prevent duplicate clicks
      setReturningRequests(prev => {
        const newSet = new Set(prev);
        requestIdsToReturn.forEach(id => newSet.add(id));
        return newSet;
      });
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Return all requests containing disapproved items (only non-rejected ones)
      await Promise.all(
        requestIdsToReturn.map(requestId =>
          axios.put(
            API_ENDPOINTS.admin.requestStatus(requestId),
            {
              status: 'rejected',
              reason: returnDisapprovedModal.reason.trim()
            },
            {
              headers: { 'x-auth-token': token }
            }
          )
        )
      );

      showAlert({
        variant: 'success',
        title: 'Items Returned',
        message: `Successfully returned ${requestIdsToReturn.length} request${requestIdsToReturn.length !== 1 ? 's' : ''} containing disapproved items. Users will be notified.`,
        autoCloseDelay: 2000
      });
      
      // Close modal and clear pending reviews for returned items
      setReturnDisapprovedModal({ show: false, reason: '' });
      setPendingReviews({});
      
      await fetchSubmittedRequests();
      
      // Refresh the selected unit group
      if (selectedUnitGroup) {
        const updatedRequests = await Promise.all(
          selectedUnitGroup.requests.map(request =>
            axios.get(
              API_ENDPOINTS.admin.getRequest(request._id),
              { headers: { 'x-auth-token': token } }
            ).then(res => res.data)
          )
        );
        setSelectedUnitGroup({
          ...selectedUnitGroup,
          requests: updatedRequests
        });
      }
    } catch (err) {
      console.error('Error returning disapproved items:', err);
      showAlert({
        variant: 'danger',
        title: 'Return Failed',
        message: 'Failed to return items: ' + (err.response?.data?.message || err.message)
      });
    } finally {
      setLoading(false);
      // Remove all request IDs from returning set
      setReturningRequests(prev => {
        const newSet = new Set(prev);
        requestIdsToReturn.forEach(id => newSet.delete(id));
        return newSet;
      });
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {selectedUnitGroup ? (
        // Review Request Page View
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <button
                onClick={() => {
                  setSelectedUnitGroup(null);
                  setItemsCurrentPage(1); // Reset to first page when closing
                }}
                className="mr-4 text-gray-600 hover:text-gray-900"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h3 className="text-2xl font-bold text-gray-900">
                Review ISSP Requests - {selectedUnitGroup.unitName}
                {selectedUnitGroup.campus && selectedUnitGroup.campus !== 'Main' && ` - ${selectedUnitGroup.campus}`}
              </h3>
            </div>
          </div>

          {/* Disapproved Items Summary */}
          {disapprovedItems.length > 0 && (
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-red-900">Disapproved Items Summary</h4>
                    <p className="text-sm text-red-700 mt-1">
                      {disapprovedItems.length} item{disapprovedItems.length !== 1 ? 's' : ''} marked as disapproved
                      {returnableRequestsCount > 0 && (
                        <> across {returnableRequestsCount} returnable request{returnableRequestsCount !== 1 ? 's' : ''}</>
                      )}
                      {returnableRequestsCount === 0 && Object.keys(disapprovedByRequest).length > 0 && (
                        <> (all requests already returned)</>
                      )}
                    </p>
                  </div>
                </div>
                {returnableRequestsCount > 0 && (
                  <button
                    onClick={handleReturnDisapprovedItems}
                    disabled={loading || returningRequests.size > 0}
                    className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 border border-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    title={
                      returningRequests.size > 0
                        ? "Requests are being returned. Please wait..."
                        : "Return all requests containing disapproved items"
                    }
                  >
                    {loading || returningRequests.size > 0 ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Returning...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Return Disapproved Items
                      </>
                    )}
                  </button>
                )}
              </div>
              
              <div className="mt-4 space-y-3">
                {Object.entries(disapprovedByRequest).map(([requestId, group]) => (
                  <div key={requestId} className="bg-white rounded-lg p-4 border border-red-200">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h5 className="text-sm font-semibold text-gray-900">{group.request?.requestTitle || 'Unknown Request'}</h5>
                        <p className="text-xs text-gray-600 mt-1">
                          {group.items.length} disapproved item{group.items.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700">
                        {group.items.filter(i => i.isPending).length > 0 ? 'PENDING SAVE' : 'SAVED'}
                      </span>
                    </div>
                    <div className="mt-2 space-y-1">
                      {group.items.map((item, idx) => (
                        <div key={idx} className="text-xs text-gray-700 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                          <span className="font-medium">{item.item}</span>
                          {item.isPending && (
                            <span className="px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded">Pending</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Items Table */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h4 className="text-lg font-semibold text-gray-900">Items for Review</h4>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-gray-600">
                  <span>
                    <span className="font-semibold text-gray-900">
                      {allGroupItems.filter((item) => item.approvalStatus === 'pending').length}
                    </span>{' '}
                    Pending
                  </span>
                  <span className="text-gray-300 hidden sm:inline" aria-hidden>
                    ·
                  </span>
                  <span>
                    <span className="font-semibold text-gray-900">
                      {allGroupItems.filter((item) => item.approvalStatus === 'approved').length}
                    </span>{' '}
                    Approved
                  </span>
                  <span className="text-gray-300 hidden sm:inline" aria-hidden>
                    ·
                  </span>
                  <span>
                    <span className="font-semibold text-gray-900">
                      {allGroupItems.filter((item) => item.approvalStatus === 'disapproved').length}
                    </span>{' '}
                    Disapproved
                  </span>
                  <span className="text-gray-300 hidden sm:inline" aria-hidden>
                    ·
                  </span>
                  <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full font-medium">
                    {allGroupItems.length} {allGroupItems.length === 1 ? 'item' : 'items'}
                  </span>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto w-full">
              {allGroupItems.length > 0 ? (
                <>
                {/* Pagination calculations */}
                {(() => {
                  const totalPages = Math.ceil(allGroupItems.length / itemsPerPage);
                  const startIndex = (itemsCurrentPage - 1) * itemsPerPage;
                  const endIndex = startIndex + itemsPerPage;
                  const paginatedItems = allGroupItems.slice(startIndex, endIndex);
                  
                  return (
                    <>
                    <table className="w-full divide-y divide-gray-200" style={{ tableLayout: 'fixed', width: '100%' }}>
                      <colgroup>
                        <col style={{ width: '13%' }} />
                        <col style={{ width: '11%' }} />
                        <col style={{ width: '8%' }} />
                        <col style={{ width: '9%' }} />
                        <col style={{ width: '8%' }} />
                        <col style={{ width: '22%' }} />
                        <col style={{ width: '17%' }} />
                        <col style={{ width: '12%' }} />
                      </colgroup>
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Item Name</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Approval Status</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Quantity</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Price</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Range</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Specification</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Purpose</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Action</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {paginatedItems.map((item, index) => (
                      <tr key={`${item.requestId}-${item.id || index}`} className="hover:bg-gray-50">
                        <td className="px-4 py-3" style={{ overflow: 'hidden', maxWidth: 0 }}>
                          <div className="text-sm font-medium text-gray-900 line-clamp-2 break-words" title={item.item}>
                            {item.item}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center" style={{ overflow: 'hidden', maxWidth: 0 }}>
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            item.approvalStatus === 'approved' ? 'bg-green-50 text-green-700' :
                            item.approvalStatus === 'disapproved' ? 'bg-red-50 text-red-700' :
                            'bg-yellow-50 text-yellow-700'
                          }`}>
                            {(item.approvalStatus || 'pending').toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center" style={{ overflow: 'hidden', maxWidth: 0 }}>
                          <div className="text-sm text-gray-900">{item.quantity || '—'}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center" style={{ overflow: 'hidden', maxWidth: 0 }}>
                          <div className="text-sm text-gray-900">
                            {item.price > 0 ? `₱${item.price.toLocaleString()}` : '—'}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center" style={{ overflow: 'hidden', maxWidth: 0 }}>
                          <span className={`px-2 py-0.5 text-xs font-semibold rounded ${
                            item.range === 'high' ? 'bg-gray-200 text-gray-800' :
                            item.range === 'mid' ? 'bg-gray-100 text-gray-700' :
                            'bg-gray-50 text-gray-600'
                          }`}>
                            {item.range ? item.range.toUpperCase() : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3" style={{ overflow: 'hidden', maxWidth: 0 }}>
                          <div className="text-sm text-gray-900">
                            {item.specification ? (
                              <div className="line-clamp-2 break-words" title={item.specification}>
                                {item.specification}
                              </div>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3" style={{ overflow: 'hidden', maxWidth: 0 }}>
                          <div className="text-sm text-gray-900">
                            {item.purpose ? (
                              <div className="line-clamp-2 break-words" title={item.purpose}>
                                {item.purpose}
                              </div>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3" style={{ overflow: 'hidden', maxWidth: 0 }}>
                          {item.approvalStatus === 'pending' ? (
                            <div className="flex flex-col gap-2" style={{ width: '100%', boxSizing: 'border-box' }}>
                              <div className="flex flex-col gap-1.5">
                                <button
                                  onClick={() => handleItemDecision(item, 'approved')}
                                  className={`w-full px-2 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
                                    pendingReviews[`${item.requestId}-${item.id}`]?.decision === 'approved'
                                      ? 'bg-green-600 text-white shadow-md'
                                      : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                                  }`}
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleItemDecision(item, 'disapproved')}
                                  className={`w-full px-2 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
                                    pendingReviews[`${item.requestId}-${item.id}`]?.decision === 'disapproved'
                                      ? 'bg-red-600 text-white shadow-md'
                                      : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                                  }`}
                                >
                                  Disapprove
                                </button>
                              </div>
                              {pendingReviews[`${item.requestId}-${item.id}`]?.decision === 'disapproved' && (
                                <textarea
                                  value={pendingReviews[`${item.requestId}-${item.id}`]?.reason || ''}
                                  onChange={(e) => handleReasonChange(item, e.target.value)}
                                  placeholder="Reason..."
                                  rows="2"
                                  className="w-full px-2 py-1.5 text-xs border border-red-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none break-words"
                                  style={{ width: '100%', boxSizing: 'border-box', minHeight: '50px' }}
                                />
                              )}
                            </div>
                          ) : item.approvalReason ? (
                            <div className="text-xs text-gray-600" style={{ width: '100%', boxSizing: 'border-box' }}>
                              <div className="font-medium mb-1">Reason:</div>
                              <div className="line-clamp-2 break-words" title={item.approvalReason}>{item.approvalReason}</div>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                        ))}
                      </tbody>
                    </table>
                    {totalPages > 1 && (
                      <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="text-sm text-gray-700">
                          Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                          <span className="font-medium">{Math.min(endIndex, allGroupItems.length)}</span> of{' '}
                          <span className="font-medium">{allGroupItems.length}</span> items
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setItemsCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={itemsCurrentPage === 1}
                            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            Previous
                          </button>
                          
                          {/* Page Numbers */}
                          <div className="flex gap-1">
                            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                              let pageNum;
                              if (totalPages <= 5) {
                                pageNum = i + 1;
                              } else if (itemsCurrentPage <= 3) {
                                pageNum = i + 1;
                              } else if (itemsCurrentPage >= totalPages - 2) {
                                pageNum = totalPages - 4 + i;
                              } else {
                                pageNum = itemsCurrentPage - 2 + i;
                              }
                              
                              return (
                                <button
                                  key={pageNum}
                                  onClick={() => setItemsCurrentPage(pageNum)}
                                  className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                                    itemsCurrentPage === pageNum
                                      ? 'bg-gray-900 text-white'
                                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                  }`}
                                >
                                  {pageNum}
                                </button>
                              );
                            })}
                          </div>
                          
                          <button
                            onClick={() => setItemsCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={itemsCurrentPage === totalPages}
                            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                    </>
                  );
                })()}
                </>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500">No items in this group</p>
                </div>
              )}
            </div>
          </div>

          {/* Save / return — only when needed (no empty bar below table) */}
          {(Object.keys(pendingReviews).length > 0 || disapprovedItems.length > 0) && (
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-gray-600">
                {Object.keys(pendingReviews).length > 0 && (
                  <span className="text-blue-600 font-semibold">
                    {Object.keys(pendingReviews).length} unsaved change{Object.keys(pendingReviews).length !== 1 ? 's' : ''}
                  </span>
                )}
                {disapprovedItems.length > 0 && (
                  <span
                    className={`text-red-600 font-semibold ${
                      Object.keys(pendingReviews).length > 0 ? 'ml-2' : ''
                    }`}
                  >
                    {Object.keys(pendingReviews).length > 0 ? '• ' : ''}
                    {disapprovedItems.length} disapproved item{disapprovedItems.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                {disapprovedItems.length > 0 && returnableRequestsCount > 0 && (
                  <button
                    type="button"
                    onClick={handleReturnDisapprovedItems}
                    disabled={loading || returningRequests.size > 0}
                    className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title={
                      returningRequests.size > 0
                        ? 'Requests are being returned. Please wait...'
                        : 'Return all requests containing disapproved items'
                    }
                  >
                    {loading || returningRequests.size > 0 ? 'Returning…' : 'Return Disapproved Items'}
                  </button>
                )}
                {Object.keys(pendingReviews).length > 0 && (
                  <button
                    type="button"
                    onClick={handleSaveReviews}
                    disabled={loading}
                    className="px-6 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Saving…' : 'Save Reviews'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        // Main List View
        <>
      {/* ISSP Requests Section */}
      <div className="bg-white rounded-lg p-4 sm:p-6 lg:p-8 shadow-sm border border-gray-200">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800">ISSP Requests</h2>
              <p className="text-sm text-gray-600 mt-1">
                Showing {Object.keys(filteredGroupedRequests).length} unit group{Object.keys(filteredGroupedRequests).length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <select 
                value={selectedYearCycle}
                onChange={(e) => setSelectedYearCycle(e.target.value)}
                className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 text-sm font-medium text-gray-700 bg-white"
              >
                <option value="">All Years</option>
                <option value="2024-2026">2024-2026</option>
                <option value="2027-2029">2027-2029</option>
                <option value="2030-2032">2030-2032</option>
                <option value="2033-2035">2033-2035</option>
              </select>
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 text-sm font-medium text-gray-700 bg-white"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="submitted">Submitted</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="resubmitted">Resubmitted</option>
              </select>
              <select 
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 text-sm font-medium text-gray-700 bg-white"
              >
                <option value="">All Priority</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
          
          {/* Search Bar */}
          <div className="w-full">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by unit name, campus, year, request title, or user..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 text-sm text-gray-700 bg-white"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        {loading && !selectedRequest && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div>
            <p className="text-gray-600 mt-2">Loading requests...</p>
          </div>
        )}

        {error && (
          <div className="bg-gray-50 border border-gray-200 text-gray-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <div className="grid gap-4">
          {Object.keys(filteredGroupedRequests).length === 0 && !loading ? (
            <div className="text-center py-12 text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-lg font-medium">
                {requests.length === 0 ? 'No submitted requests found' : 'No requests match the selected filters'}
              </p>
            </div>
          ) : (
            Object.values(filteredGroupedRequests).map((group) => {
              const totalItems = group.requests.reduce((sum, req) => sum + (req.items?.length || 0), 0);
              const latestRequest = group.requests.sort((a, b) => {
                const aResubmitted = a.status === 'resubmitted' || a.revisionStatus === 'resubmitted';
                const bResubmitted = b.status === 'resubmitted' || b.revisionStatus === 'resubmitted';
                if (aResubmitted && !bResubmitted) return -1;
                if (!aResubmitted && bResubmitted) return 1;
                return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
              })[0];
              
              // Determine overall status
              const hasResubmitted = group.requests.some(r => r.status === 'resubmitted' || r.revisionStatus === 'resubmitted');
              const allApproved = group.requests.every(r => r.status === 'approved');
              const allRejected = group.requests.every(r => r.status === 'rejected');
              
              let overallStatus = 'submitted';
              if (hasResubmitted) overallStatus = 'resubmitted';
              else if (allApproved) overallStatus = 'approved';
              else if (allRejected) overallStatus = 'rejected';
              
              const updatedDateStr = latestRequest
                ? new Date(latestRequest.updatedAt || latestRequest.createdAt).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })
                : null;

              return (
                <div key={`${group.unitName}|||${group.campus}|||${group.year}`} className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg font-bold text-gray-900 mb-3">
                        {group.unitName} {group.campus && group.campus !== 'Main' && group.campus !== 'Main Campus' && `- ${group.campus}`} - {group.year}
                      </h2>
                      {group.campus && group.campus !== 'Main' && group.campus !== 'Main Campus' && (
                        <div className="text-sm text-gray-600 mb-1.5">
                          <span className="font-medium">Campus:</span> {group.campus}
                        </div>
                      )}
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                        overallStatus === 'approved' ? 'bg-green-50 text-green-700' :
                        overallStatus === 'submitted' ? 'bg-green-100 text-green-800' :
                        overallStatus === 'rejected' ? 'bg-red-50 text-red-700' :
                        overallStatus === 'resubmitted' ? 'bg-orange-100 text-orange-700' :
                        'bg-yellow-50 text-yellow-700'
                      }`}>
                        {overallStatus.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pt-4 border-t border-gray-200">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600">
                      <span>
                        {totalItems} item{totalItems !== 1 ? 's' : ''}
                      </span>
                      <span className="hidden sm:inline text-gray-300" aria-hidden>|</span>
                      <span>
                        {updatedDateStr ? <>updated {updatedDateStr}</> : 'updated N/A'}
                      </span>
                    </div>
                    <button 
                      onClick={() => {
                        setSelectedUnitGroup(group);
                        setItemsCurrentPage(1); // Reset to first page when selecting new unit
                      }}
                      className={`self-end sm:self-auto px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        overallStatus === 'submitted'
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      Review Items
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
        </>
      )}


      {/* Confirmation Modal */}
      <Modal
        isOpen={modalState.isOpen}
        variant={modalState.variant}
        title={modalState.title}
        message={modalState.message}
        confirmLabel={modalState.confirmLabel}
        cancelLabel={modalState.cancelLabel}
        onClose={handleModalClose}
        onConfirm={modalState.onConfirm ? handleModalConfirm : undefined}
        closeOnOverlay={modalState.closeOnOverlay}
        showCloseButton={modalState.showCloseButton}
      >
        {modalState.children}
      </Modal>

      {/* Alert Modal */}
      <Modal
        isOpen={alertState.isOpen}
        variant={alertState.variant}
        title={alertState.title}
        message={alertState.message}
        confirmLabel={alertState.confirmLabel}
        cancelLabel={alertState.cancelLabel}
        onClose={alertState.onClose ? handleAlertClose : closeAlert}
        onConfirm={alertState.autoCloseDelay ? undefined : handleAlertConfirm}
        closeOnOverlay={alertState.closeOnOverlay}
        showCloseButton={alertState.showCloseButton}
      >
        {alertState.children}
      </Modal>

      {/* Return Disapproved Items Modal */}
      <Modal
        isOpen={returnDisapprovedModal.show}
        variant="default"
        title="Return Disapproved Items"
        message=""
        confirmLabel="Return All Requests"
        cancelLabel="Cancel"
        onConfirm={performReturnDisapprovedItems}
        onClose={() => setReturnDisapprovedModal({ show: false, reason: '' })}
        closeOnOverlay={true}
        showCloseButton={true}
        zIndex={100}
      >
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-red-800">
              <strong>Warning:</strong> This will return all {returnableRequestsCount} request{returnableRequestsCount !== 1 ? 's' : ''} containing disapproved items. Users will be notified and will need to revise and resubmit.
            </p>
          </div>

          {/* Disapproved Items Summary */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Requests to be Returned ({returnableRequestsCount} request{returnableRequestsCount !== 1 ? 's' : ''})
            </label>
            <div className="bg-gray-50 rounded-lg p-4 max-h-60 overflow-y-auto border border-gray-200">
              <div className="space-y-3">
                {Object.entries(disapprovedByRequest).map(([requestId, group]) => (
                  <div key={requestId} className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="flex items-start justify-between mb-2">
                      <h5 className="text-sm font-semibold text-gray-900">{group.request?.requestTitle || 'Unknown Request'}</h5>
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700">
                        {group.items.length} item{group.items.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="mt-2 space-y-1">
                      {group.items.map((item, idx) => (
                        <div key={idx} className="text-xs text-gray-700 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                          <span>{item.item}</span>
                          {item.isPending && (
                            <span className="px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded">Pending Save</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Reason for Return */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Reason for Return <span className="text-red-500">*</span>
            </label>
            <textarea
              value={returnDisapprovedModal.reason}
              onChange={(e) => setReturnDisapprovedModal({
                ...returnDisapprovedModal,
                reason: e.target.value
              })}
              placeholder="Please provide a detailed reason for returning these requests (e.g., errors found, items need revision, missing information, etc.)"
              rows="5"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              This reason will be sent to all affected users along with the rejection notification.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Offices;


