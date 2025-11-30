import React, { useEffect, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import Modal from '../common/Modal';

const Offices = () => {
  const [animate, setAnimate] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reviewingItem, setReviewingItem] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [approvalDecision, setApprovalDecision] = useState('');
  const [approvalReason, setApprovalReason] = useState('');
  const [officeStats, setOfficeStats] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [selectedYearCycle, setSelectedYearCycle] = useState('2024-2027');
  const [selectedUnitGroup, setSelectedUnitGroup] = useState(null); // { unitName, year, requests }
  const [searchQuery, setSearchQuery] = useState('');
  
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

  // Fetch office statistics
  const fetchOfficeStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/admin/office/stats', {
        headers: { 'x-auth-token': token }
      });
      console.log('Fetched office stats:', response.data);
      setOfficeStats(response.data);
    } catch (err) {
      console.error('Error fetching office stats:', err);
    }
  };

  // Fetch submitted requests
  const fetchSubmittedRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/admin/submitted-requests', {
        headers: { 'x-auth-token': token }
      });
      console.log('Fetched submitted requests:', response.data);
      setRequests(response.data);
    } catch (err) {
      console.error('Error fetching submitted requests:', err);
      setError('Failed to fetch submitted requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setAnimate(true);
    fetchOfficeStats();
    fetchSubmittedRequests();
  }, []);

  // Group requests by unit and year cycle
  const groupedRequests = useMemo(() => {
    const grouped = {};
    requests.forEach(request => {
      const unitName = request.userId?.unit || 'Unknown Unit';
      const year = request.year || 'Unknown Year';
      const key = `${unitName}|||${year}`;
      
      if (!grouped[key]) {
        grouped[key] = {
          unitName,
          year,
          requests: []
        };
      }
      grouped[key].requests.push(request);
    });
    return grouped;
  }, [requests]);

  // Filter grouped requests based on status, priority, year, and search query
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
      
      // Apply search filter
      const matchesSearch = !searchLower || 
        group.unitName.toLowerCase().includes(searchLower) ||
        group.year.toLowerCase().includes(searchLower) ||
        filteredRequests.some(req => 
          req.requestTitle?.toLowerCase().includes(searchLower) ||
          req.userId?.username?.toLowerCase().includes(searchLower) ||
          req.userId?.email?.toLowerCase().includes(searchLower)
        );
      
      if (filteredRequests.length > 0 && matchesSearch) {
        filtered[key] = {
          ...group,
          requests: filteredRequests
        };
      }
    });
    return filtered;
  }, [groupedRequests, statusFilter, priorityFilter, selectedYearCycle, searchQuery]);

  // Handle item review - with confirmation modal
  const performItemReview = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!reviewingItem || !reviewingItem.requestId) {
        showAlert({
          variant: 'danger',
          title: 'Error',
          message: 'Invalid item or request ID'
        });
        return;
      }
      
      await axios.put(
        `http://localhost:5000/api/admin/requests/${reviewingItem.requestId}/items/${reviewingItem.id}/review`,
        {
          approvalStatus: approvalDecision,
          approvalReason: approvalReason
        },
        {
          headers: { 'x-auth-token': token }
        }
      );

      showAlert({
        variant: 'success',
        title: 'Review Submitted',
        message: `Item ${approvalDecision === 'approved' ? 'approved' : 'disapproved'} successfully!`,
        autoCloseDelay: 2000
      });
      
      // Refresh requests and office stats
      await fetchSubmittedRequests();
      await fetchOfficeStats();
      
      // Close modals and reset
      setShowReviewModal(false);
      setReviewingItem(null);
      setApprovalDecision('');
      setApprovalReason('');
      
      // Refresh the selected unit group
      if (selectedUnitGroup) {
        const token = localStorage.getItem('token');
        const updatedRequests = await Promise.all(
          selectedUnitGroup.requests.map(request =>
            axios.get(
              `http://localhost:5000/api/admin/requests/${request._id}`,
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
      console.error('Error reviewing item:', err);
      showAlert({
        variant: 'danger',
        title: 'Review Failed',
        message: 'Failed to review item: ' + (err.response?.data?.message || err.message)
      });
    } finally {
      setLoading(false);
    }
  };

  const handleItemReview = () => {
    if (!approvalDecision || !approvalReason.trim()) {
      showAlert({
        variant: 'danger',
        title: 'Validation Error',
        message: 'Please select a decision and provide a reason'
      });
      return;
    }

    openModal({
      variant: 'confirm',
      title: 'Confirm Review',
      message: `Are you sure you want to ${approvalDecision === 'approved' ? 'approve' : 'disapprove'} this item?`,
      confirmLabel: 'Yes, Submit',
      onConfirm: async () => {
        await performItemReview();
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
            `http://localhost:5000/api/admin/requests/${request._id}/complete-review`,
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
      
      // Refresh requests, office stats, and close view
      await fetchSubmittedRequests();
      await fetchOfficeStats();
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
                }}
                className="mr-4 text-gray-600 hover:text-gray-900"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h3 className="text-2xl font-bold text-gray-900">Review ISSP Requests - {selectedUnitGroup.unitName}</h3>
            </div>
          </div>

          {/* Group Information */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-xl font-bold text-gray-900">Group Information</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Unit/Department</p>
                    <p className="text-lg font-bold text-gray-900 truncate">{selectedUnitGroup.unitName}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Year Cycle</p>
                    <p className="text-lg font-bold text-gray-900">{selectedUnitGroup.year}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Requests</p>
                    <p className="text-lg font-bold text-gray-900">{selectedUnitGroup.requests.length} request{selectedUnitGroup.requests.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Items</p>
                    <p className="text-lg font-bold text-gray-900">{allGroupItems.length} item{allGroupItems.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Status Summary */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                  <span className="text-sm text-gray-700">
                    <span className="font-semibold">{allGroupItems.filter(item => item.approvalStatus === 'pending').length}</span> Pending
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-gray-600"></div>
                  <span className="text-sm text-gray-700">
                    <span className="font-semibold">{allGroupItems.filter(item => item.approvalStatus === 'approved').length}</span> Approved
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                  <span className="text-sm text-gray-700">
                    <span className="font-semibold">{allGroupItems.filter(item => item.approvalStatus === 'disapproved').length}</span> Disapproved
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold text-gray-900">Items for Review</h4>
                <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full font-medium">
                  {allGroupItems.length} {allGroupItems.length === 1 ? 'item' : 'items'}
                </span>
              </div>
            </div>
            <div className="overflow-x-auto">
              {allGroupItems.length > 0 ? (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Request Title</th>
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
                    {allGroupItems.map((item, index) => (
                      <tr key={`${item.requestId}-${item.id || index}`} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900 max-w-xs break-words">{item.requestTitle}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{item.item}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            item.approvalStatus === 'approved' ? 'bg-green-50 text-green-700' :
                            item.approvalStatus === 'disapproved' ? 'bg-red-50 text-red-700' :
                            'bg-yellow-50 text-yellow-700'
                          }`}>
                            {(item.approvalStatus || 'pending').toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <div className="text-sm text-gray-900">{item.quantity || '—'}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <div className="text-sm text-gray-900">
                            {item.price > 0 ? `₱${item.price.toLocaleString()}` : '—'}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <span className={`px-2 py-0.5 text-xs font-semibold rounded ${
                            item.range === 'high' ? 'bg-gray-200 text-gray-800' :
                            item.range === 'mid' ? 'bg-gray-100 text-gray-700' :
                            'bg-gray-50 text-gray-600'
                          }`}>
                            {item.range ? item.range.toUpperCase() : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-900 max-w-xs break-words">
                            {item.specification || <span className="text-gray-400">—</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-900 max-w-xs break-words">
                            {item.purpose || <span className="text-gray-400">—</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          {item.approvalStatus === 'pending' ? (
                            <button
                              onClick={() => {
                                setReviewingItem({ ...item, requestId: item.requestId });
                                setShowReviewModal(true);
                              }}
                              className="px-3 py-1.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-md transition-colors"
                            >
                              Review
                            </button>
                          ) : item.approvalReason ? (
                            <div className="text-xs text-gray-600 max-w-xs">
                              <div className="font-medium mb-1">Reason:</div>
                              <div className="break-words">{item.approvalReason}</div>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500">No items in this group</p>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              {allGroupItems.filter(item => item.approvalStatus === 'pending').length} items pending review
            </div>
          </div>
        </div>
      ) : (
        // Main List View
        <>
      <div className="bg-white rounded-lg p-4 sm:p-6 lg:p-8 shadow-sm border border-gray-200">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">Offices Management</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Request Trends */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-lg p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Request Trends</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">New Requests</span>
                <span className="text-gray-900 font-semibold">
                  {officeStats?.requestTrends?.newRequests || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Pending Reviews</span>
                <span className="text-gray-900 font-semibold">
                  {officeStats?.requestTrends?.pendingReviews || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Completed</span>
                <span className="text-gray-900 font-semibold">
                  {officeStats?.requestTrends?.completed?.toLocaleString() || 0}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
                <div 
                  className="bg-gray-600 h-2 rounded-full transition-all duration-500" 
                  style={{ width: `${officeStats?.requestTrends?.completionRate || 0}%` }}
                ></div>
              </div>
              <p className="text-gray-600 text-sm">
                {officeStats?.requestTrends?.completionRate || 0}% completion rate this month
              </p>
            </div>
          </div>
          
          {/* ISSP Request Tracking */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-lg p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="text-base sm:text-lg font-semibold text-gray-800">ISSP Request Tracking</h3>
            </div>
            <div className="space-y-4">
              {/* Office List with Status */}
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {officeStats?.unitTracking?.units && officeStats.unitTracking.units.length > 0 ? (
                  officeStats.unitTracking.units.map((unitData, index) => {
                    const hasSubmitted = unitData.hasSubmitted;
                    const timeAgo = unitData.lastSubmitted 
                      ? (() => {
                          const days = Math.floor((new Date() - new Date(unitData.lastSubmitted)) / (1000 * 60 * 60 * 24));
                          if (days === 0) return 'today';
                          if (days === 1) return '1 day ago';
                          return `${days} days ago`;
                        })()
                      : null;
                    
                    // Determine status badge color and text
                    const getStatusBadge = () => {
                      if (!hasSubmitted) {
                        return { color: 'bg-red-100 text-red-700', text: 'No Request' };
                      }
                      
                      switch(unitData.status) {
                        case 'pending':
                          return { color: 'bg-yellow-100 text-yellow-700', text: 'Pending' };
                        case 'submitted':
                          return { color: 'bg-blue-100 text-blue-700', text: 'Submitted' };
                        case 'approved':
                          return { color: 'bg-green-100 text-green-700', text: 'Approved' };
                        case 'rejected':
                          return { color: 'bg-red-100 text-red-700', text: 'Rejected' };
                        default:
                          return { color: 'bg-gray-100 text-gray-600', text: 'Unknown' };
                      }
                    };
                    
                    const statusBadge = getStatusBadge();
                    
                    return (
                      <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100 hover:border-gray-300 transition-colors">
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <div className={`w-3 h-3 rounded-full flex-shrink-0 ${hasSubmitted ? 'bg-gray-600' : 'bg-gray-400'}`}></div>
                          <div className="flex-1 min-w-0">
                            <span className="text-gray-800 font-medium block truncate">{unitData.unit}</span>
                            {unitData.totalRequests > 0 && (
                              <span className="text-xs text-gray-500">{unitData.totalRequests} request{unitData.totalRequests > 1 ? 's' : ''}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 flex-shrink-0">
                          <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${statusBadge.color}`}>
                            {statusBadge.text}
                          </span>
                          {timeAgo && (
                            <span className="text-gray-600 text-xs whitespace-nowrap hidden sm:inline">{timeAgo}</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    <svg className="w-8 h-8 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <p className="text-sm font-medium">No units registered</p>
                    <p className="text-xs text-gray-400 mt-1">Units will appear here once users are registered</p>
                  </div>
                )}
              </div>
              
              {/* Summary Stats */}
              <div className="border-t border-gray-200 pt-4 mt-4">
                <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
                  <div className="bg-white rounded-lg p-2 border border-gray-100">
                    <div className="text-base sm:text-lg font-bold text-gray-800">
                      {officeStats?.unitTracking?.summary?.total || 0}
                    </div>
                    <div className="text-xs text-gray-600">Total Units</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-2 border border-green-100">
                    <div className="text-base sm:text-lg font-bold text-green-700">
                      {officeStats?.unitTracking?.summary?.submitted || 0}
                    </div>
                    <div className="text-xs text-green-700">Submitted</div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-2 border border-red-100">
                    <div className="text-base sm:text-lg font-bold text-red-700">
                      {officeStats?.unitTracking?.summary?.notSubmitted || 0}
                    </div>
                    <div className="text-xs text-red-700">Pending</div>
                  </div>
                </div>
                {officeStats?.unitTracking?.summary?.total > 0 && (
                  <div className="mt-3 text-center">
                    <p className="text-xs text-gray-600">
                      {Math.round((officeStats.unitTracking.summary.submitted / officeStats.unitTracking.summary.total) * 100)}% of units have submitted requests
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
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
                <option value="2024-2027">2024-2027</option>
                <option value="2027-2030">2027-2030</option>
                <option value="2030-2033">2030-2033</option>
                <option value="2033-2036">2033-2036</option>
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
                placeholder="Search by unit name, year, request title, or user..."
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
              
              return (
                <div key={`${group.unitName}-${group.year}`} className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h2 className="text-lg font-bold text-gray-900 mb-3">
                        {group.unitName} - {group.year}
                      </h2>
                      <div className="space-y-1.5">
                        <div className="text-sm text-gray-700">
                          <span className="font-medium">Requests:</span> {group.requests.length} request{group.requests.length !== 1 ? 's' : ''}
                        </div>
                        <div className="text-sm text-gray-700">
                          <span className="font-medium">Total Items:</span> {totalItems} item{totalItems !== 1 ? 's' : ''}
                        </div>
                        <div className="text-sm text-gray-500">
                          Last Updated: {latestRequest ? new Date(latestRequest.updatedAt || latestRequest.createdAt).toLocaleDateString() : 'N/A'}
                        </div>
                      </div>
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                        overallStatus === 'approved' ? 'bg-green-50 text-green-700' :
                        overallStatus === 'submitted' ? 'bg-blue-50 text-blue-700' :
                        overallStatus === 'rejected' ? 'bg-red-50 text-red-700' :
                        overallStatus === 'resubmitted' ? 'bg-orange-100 text-orange-700' :
                        'bg-yellow-50 text-yellow-700'
                      }`}>
                        {overallStatus.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-gray-200">
                    <button 
                      onClick={() => {
                        setSelectedUnitGroup(group);
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-lg text-sm font-medium transition-colors"
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

      {/* Review Item Modal */}
      {showReviewModal && reviewingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-2xl w-full shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 break-words">Review Item: {reviewingItem.item}</h3>
            
            <div className="space-y-4">
              <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                <p className="text-xs sm:text-sm text-gray-600">Quantity: <span className="font-medium text-gray-900">{reviewingItem.quantity}</span></p>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">Range: <span className="font-medium text-gray-900">{reviewingItem.range}</span></p>
                {reviewingItem.specification && (
                  <p className="text-xs sm:text-sm text-gray-600 mt-1 break-words">Specification: <span className="font-medium text-gray-900">{reviewingItem.specification}</span></p>
                )}
                {reviewingItem.purpose && (
                  <p className="text-xs sm:text-sm text-gray-600 mt-1 break-words">Purpose: <span className="font-medium text-gray-900">{reviewingItem.purpose}</span></p>
                )}
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Decision *</label>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                  <button
                    onClick={() => {
                      setApprovalDecision('approved');
                      setApprovalReason('Approved'); // Auto-set reason for approval
                    }}
                    className={`btn-responsive flex-1 ${
                      approvalDecision === 'approved'
                        ? 'bg-gray-200 text-gray-800'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    ✓ Approve
                  </button>
                  <button
                    onClick={() => {
                      setApprovalDecision('disapproved');
                      setApprovalReason(''); // Clear reason when switching to disapprove
                    }}
                    className={`btn-responsive flex-1 ${
                      approvalDecision === 'disapproved'
                        ? 'bg-gray-200 text-gray-800'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    ✗ Disapprove
                  </button>
                </div>
              </div>

              {/* Only show reason textarea if disapproved is selected */}
              {approvalDecision === 'disapproved' && (
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Reason for Disapproval *</label>
                  <textarea
                    value={approvalReason}
                    onChange={(e) => setApprovalReason(e.target.value)}
                    rows="4"
                    className="input-responsive tap-target w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                    placeholder="Enter reason for disapproval..."
                  ></textarea>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 sm:space-x-0 mt-4 sm:mt-6">
              <button
                onClick={() => {
                  // If user made changes, confirm before closing
                  if (approvalDecision || approvalReason.trim()) {
                    openModal({
                      variant: 'confirm',
                      title: 'Discard Changes?',
                      message: 'You have unsaved changes. Are you sure you want to cancel?',
                      confirmLabel: 'Yes, Discard',
                      onConfirm: () => {
                        setShowReviewModal(false);
                        setReviewingItem(null);
                        setApprovalDecision('');
                        setApprovalReason('');
                      }
                    });
                  } else {
                    setShowReviewModal(false);
                    setReviewingItem(null);
                    setApprovalDecision('');
                    setApprovalReason('');
                  }
                }}
                className="btn-responsive text-gray-700 bg-gray-100 hover:bg-gray-200 w-full sm:w-auto"
              >
                Cancel
              </button>
              <button
                onClick={handleItemReview}
                disabled={!approvalDecision || !approvalReason.trim() || loading}
                className="btn-responsive bg-gray-200 hover:bg-gray-300 text-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed w-full sm:w-auto"
              >
                {loading ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </div>
        </div>
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
    </div>
  );
};

export default Offices;


