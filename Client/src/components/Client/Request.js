import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { flushSync } from 'react-dom';
import axios from 'axios';
import Modal from '../common/Modal';
import { API_ENDPOINTS, getAuthHeaders } from '../../utils/api';

const statusBadges = {
  loading: { label: 'Fetching...', styles: 'bg-blue-50 text-blue-600 border-blue-100' },
  ready: { label: 'AI Ready', styles: 'bg-green-50 text-green-600 border-green-100' },
  error: { label: 'Needs Attention', styles: 'bg-red-50 text-red-600 border-red-100' },
  typing: { label: 'Preparing', styles: 'bg-amber-50 text-amber-600 border-amber-100' },
  idle: { label: 'Idle', styles: 'bg-gray-100 text-gray-500 border-gray-200' }
};

const ItemInsightSidebar = ({ itemName, status, insights, error, onRetry }) => {
  const trimmedName = (itemName || '').trim();
  if (!trimmedName) return null;

  const badge = statusBadges[status] || statusBadges.loading;
  const hasInsights = status === 'ready' && insights;
  const isLoading = status === 'loading';
  const isError = status === 'error';

  return (
    <aside className="bg-white border border-blue-100 rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-5 flex flex-col h-full lg:max-h-[600px]">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-blue-100 flex items-center justify-center flex-shrink-0">
            <svg
              className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.4}
                d="M15.75 5.25L18 3m0 0l2.25 2.25M18 3v7.5m-5.25 9.75L10.5 21m0 0l-2.25-2.25M10.5 21v-7.5M4.5 9.75L2.25 7.5M2.25 7.5 4.5 5.25M2.25 7.5H9"
              />
            </svg>
          </div>
          <div>
            <p className="text-xs sm:text-sm text-gray-700 font-medium">BloomNode Assistant</p>
          </div>
        </div>
      </div>

      <div className="mt-4 sm:mt-5 flex-1 flex flex-col space-y-3 sm:space-y-4 text-xs sm:text-sm text-gray-600 overflow-y-auto">
        <div className="space-y-2">
          <p className="text-xs text-gray-900 uppercase tracking-widest">You Typed</p>
          <div className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 font-medium text-gray-900">
            “{trimmedName}”
          </div>
        </div>

        {isLoading && (
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 space-y-3">
            <div className="flex items-center space-x-2 text-blue-900 font-semibold">
              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6l4 2" />
              </svg>
              <span>Fetching AI insight...</span>
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-white/60 rounded animate-pulse"></div>
              <div className="h-3 bg-white/60 rounded animate-pulse w-3/4"></div>
              <div className="h-3 bg-white/60 rounded animate-pulse w-2/3"></div>
            </div>
          </div>
        )}

        {isError && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 space-y-3">
            <p className="font-medium">Unable to fetch AI insights right now.</p>
            <p className="text-sm">{error || 'Please try again shortly.'}</p>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center space-x-1 text-red-700 font-semibold"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 4v5h.582M20 20v-5h-.581M5.5 9A7.5 7.5 0 0119 9M5 15a7.5 7.5 0 0113.5 0"
                  />
                </svg>
                <span>Try again</span>
              </button>
            )}
          </div>
        )}

        {hasInsights && (
          <>
            <div className="grid grid-cols-1 gap-3">
              <div className="bg-white border border-blue-100 rounded-2xl p-4">
                <p className="text-xs text-gray-900 uppercase tracking-widest mb-1">Estimated Price Range</p>
                <p className="text-base font-semibold text-gray-900">
                  {insights.priceRange || 'Information unavailable'}
                </p>
              </div>
            </div>

            {Array.isArray(insights.specs) && insights.specs.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-2xl p-4">
                <p className="text-xs text-gray-900 uppercase tracking-widest mb-2">Representative Specs</p>
                <ul className="space-y-1 text-gray-900 text-sm list-disc list-inside">
                  {insights.specs.map((spec, idx) => (
                    <li key={`${spec}-${idx}`}>{spec}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
};

const Request = ({ onRequestUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showAddRequest, setShowAddRequest] = useState(false);
  const [editingRequest, setEditingRequest] = useState(null);
  const [requestForm, setRequestForm] = useState({
    requestTitle: '',
    priority: 'medium',
    year: '2024-2026',
    description: '',
    items: []
  });
  const requestFormRef = useRef(requestForm);
  
  // Keep ref in sync with state
  useEffect(() => {
    requestFormRef.current = requestForm;
  }, [requestForm]);
  const [currentItem, setCurrentItem] = useState({
    item: '',
    quantity: '',
    quantityByYear: {}, // e.g., { 2024: 30, 2025: 30, 2026: 0 }
    price: '',
    range: 'mid',
    specification: '',
    purpose: ''
  });

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

  // Get years for current request cycle
  const currentCycleYears = useMemo(() => {
    return getYearsFromCycle(requestForm.year);
  }, [requestForm.year]);

  // Reset quantityByYear when year cycle changes
  useEffect(() => {
    if (currentCycleYears.length > 0) {
      setCurrentItem(prev => {
        const newQuantityByYear = {};
        currentCycleYears.forEach(year => {
          newQuantityByYear[year] = prev.quantityByYear?.[year] || 0;
        });
        const totalQuantity = Object.values(newQuantityByYear).reduce((sum, qty) => sum + (qty || 0), 0);
        return {
          ...prev,
          quantityByYear: newQuantityByYear,
          quantity: totalQuantity.toString()
        };
      });
    }
  }, [requestForm.year]); // Only reset when year changes, not on every render

  const [showNewRequestPage, setShowNewRequestPage] = useState(false);
  const [showAddItemForm, setShowAddItemForm] = useState(false);
  const [requests, setRequests] = useState([]);
  const [showSubmitConfirmation, setShowSubmitConfirmation] = useState(false);
  const [requestToSubmit, setRequestToSubmit] = useState(null);
  const hasCurrentItemName = currentItem.item.trim().length > 0;
  const [alertModal, setAlertModal] = useState({ show: false, variant: 'default', title: '', message: '' });
  const [itemInsights, setItemInsights] = useState(null);
  const [aiStatus, setAiStatus] = useState('idle');
  const [aiError, setAiError] = useState(null);
  const latestQueriedItemRef = useRef('');
  const aiStatusRef = useRef('idle');
  const aiRequestIdRef = useRef(0);
  const [statusUpdateModal, setStatusUpdateModal] = useState({ show: false, requestId: null, itemId: null, itemName: '' });
  const [statusUpdateForm, setStatusUpdateForm] = useState({ itemStatus: '', remarks: '' });
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [isRevisingRequest, setIsRevisingRequest] = useState(false);
  const [revisingRequest, setRevisingRequest] = useState(null);
  const [revisionNotes, setRevisionNotes] = useState('');
  const [selectedYearGroup, setSelectedYearGroup] = useState(null); // { year, requests }

  useEffect(() => {
    aiStatusRef.current = aiStatus;
  }, [aiStatus]);

  const fetchItemInsights = useCallback(
    async (name, options = {}) => {
      const trimmed = (name || '').trim();
      if (!trimmed) return;

      if (!options.force && trimmed === latestQueriedItemRef.current && aiStatusRef.current === 'ready') {
        return;
      }

      const requestId = Date.now();
      aiRequestIdRef.current = requestId;
      latestQueriedItemRef.current = trimmed;
      setAiStatus('loading');
      setAiError(null);

      try {
        const token = localStorage.getItem('token');
        const headers = token ? { 'x-auth-token': token } : undefined;
        const response = await axios.post(
          API_ENDPOINTS.ai.itemInsights,
          { itemName: trimmed },
          { headers }
        );

        if (aiRequestIdRef.current !== requestId) return;

        setItemInsights(response.data);
        setAiStatus('ready');
      } catch (err) {
        if (aiRequestIdRef.current !== requestId) return;
        if (err.code === 'ERR_CANCELED') return;
        const message = err.response?.data?.message || err.message || 'Failed to fetch item insights';
        setAiStatus('error');
        setAiError(message);
      }
    },
    []
  );


  useEffect(() => {
    const trimmed = currentItem.item.trim();
    if (!trimmed) {
      setAiStatus('idle');
      setItemInsights(null);
      setAiError(null);
      latestQueriedItemRef.current = '';
      return;
    }

    const debounceId = setTimeout(() => {
      fetchItemInsights(trimmed);
    }, 600);

    return () => clearTimeout(debounceId);
  }, [currentItem.item, fetchItemInsights]);

  const handleAiRetry = useCallback(() => {
    const trimmed = currentItem.item.trim();
    if (trimmed) {
      fetchItemInsights(trimmed, { force: true });
    }
  }, [currentItem.item, fetchItemInsights]);

  // Fetch requests from backend
  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const response = await axios.get(API_ENDPOINTS.requests.list, {
        headers: getAuthHeaders()
      });
      console.log('Fetched requests:', response.data);
      if (response.data && response.data.length > 0) {
        console.log('First request items:', response.data[0].items);
      }
      setRequests(response.data);
    } catch (err) {
      setError('Failed to fetch requests');
      console.error('Error fetching requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // Group requests by year cycle
  const groupedRequests = useMemo(() => {
    const grouped = {};
    requests.forEach(request => {
      const year = request.year || '2024-2026';
      if (!grouped[year]) {
        grouped[year] = [];
      }
      grouped[year].push(request);
    });
    return grouped;
  }, [requests]);

  // Combine all items from all requests in the selected year group
  const allYearGroupItems = useMemo(() => {
    if (!selectedYearGroup) return [];
    const items = [];
    const cycleYears = getYearsFromCycle(selectedYearGroup.year);
    
    selectedYearGroup.requests.forEach(request => {
      if (request.items && request.items.length > 0) {
        request.items.forEach(item => {
          // Ensure quantityByYear is preserved and properly formatted
          let quantityByYear = item.quantityByYear || {};
          
          // If quantityByYear is empty but quantity exists, and we have cycle years,
          // we could initialize it, but for now just preserve what's there
          // Convert any number keys to strings for consistency
          if (quantityByYear && typeof quantityByYear === 'object') {
            const normalizedQuantityByYear = {};
            Object.keys(quantityByYear).forEach(key => {
              const yearKey = key.toString();
              normalizedQuantityByYear[yearKey] = quantityByYear[key];
            });
            quantityByYear = normalizedQuantityByYear;
          }
          
          // Log for debugging
          if (Object.keys(quantityByYear).length > 0) {
            console.log('Item quantityByYear:', item.item, quantityByYear, 'Total quantity:', item.quantity);
          } else if (item.quantity) {
            console.log('Item without quantityByYear:', item.item, 'Total quantity:', item.quantity);
          }
          
          items.push({
            ...item,
            quantityByYear: quantityByYear,
            requestId: request._id,
            requestTitle: request.requestTitle || request.title,
            requestStatus: request.status
          });
        });
      }
    });
    return items;
  }, [selectedYearGroup]);

  // Get years from the selected year cycle for the table
  const cycleYears = useMemo(() => {
    if (!selectedYearGroup) return [];
    return getYearsFromCycle(selectedYearGroup.year);
  }, [selectedYearGroup]);

  // Handle item status update
  const handleUpdateItemStatus = async () => {
    if (!statusUpdateForm.itemStatus) {
      setAlertModal({
        show: true,
        variant: 'danger',
        title: 'Status Required',
        message: 'Please select a status.'
      });
      return;
    }

    try {
      setUpdatingStatus(true);
      const token = localStorage.getItem('token');
      const response = await axios.put(
        API_ENDPOINTS.requests.updateItemStatus(statusUpdateModal.requestId, statusUpdateModal.itemId),
        {
          itemStatus: statusUpdateForm.itemStatus,
          remarks: statusUpdateForm.remarks || ''
        },
        {
          headers: { 'x-auth-token': token }
        }
      );

      // Get the updated request from response
      const updatedRequest = response.data;
      
      // Refresh requests to get updated status
      await fetchRequests();
      
      // If viewing year group details, refresh the selected year group immediately
      if (selectedYearGroup) {
        // Update the selectedYearGroup with the refreshed request from response
        const updatedYearGroup = {
          ...selectedYearGroup,
          requests: selectedYearGroup.requests.map(req => 
            req._id === statusUpdateModal.requestId ? updatedRequest : req
          )
        };
        setSelectedYearGroup(updatedYearGroup);
      }
      
      // If editing this request, update the form
      if (editingRequest && editingRequest._id === statusUpdateModal.requestId) {
        const updatedRequest = response.data;
        const normalizedItems = (updatedRequest.items || []).map((item, index) => ({
          id: item.id || item._id || `item-${Date.now()}-${index}`,
          item: item.item || '',
          quantity: Number(item.quantity) || 0,
          quantityByYear: item.quantityByYear || {},
          price: item.price ? Number(item.price) : 0,
          range: item.range || 'mid',
          specification: item.specification || '',
          purpose: item.purpose || '',
          approvalStatus: item.approvalStatus || 'pending',
          approvalReason: item.approvalReason || '',
          itemStatus: item.itemStatus || null,
          itemStatusRemarks: item.itemStatusRemarks || '',
          itemStatusUpdatedAt: item.itemStatusUpdatedAt || null
        }));
        setRequestForm({
          requestTitle: updatedRequest.requestTitle || updatedRequest.title,
          priority: updatedRequest.priority,
          year: updatedRequest.year || '2024-2026',
          description: updatedRequest.description,
          items: normalizedItems
        });
        setEditingRequest(updatedRequest);
      }

      setStatusUpdateModal({ show: false, requestId: null, itemId: null, itemName: '' });
      setStatusUpdateForm({ itemStatus: '', remarks: '' });
      
      setAlertModal({
        show: true,
        variant: 'success',
        title: 'Status Updated',
        message: 'Item status has been updated successfully!'
      });
    } catch (error) {
      console.error('Error updating item status:', error);
      setAlertModal({
        show: true,
        variant: 'danger',
        title: 'Update Failed',
        message: error.response?.data?.message || 'Failed to update item status.'
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const openStatusUpdateModal = (requestId, itemId, itemName, currentStatus = null) => {
    setStatusUpdateModal({
      show: true,
      requestId,
      itemId,
      itemName
    });
    setStatusUpdateForm({
      itemStatus: currentStatus || '',
      remarks: ''
    });
  };

  // Debug: Track items changes
  useEffect(() => {
    console.log('requestForm.items changed:', requestForm.items);
    console.log('Items count:', requestForm.items.length);
  }, [requestForm.items]);

  const handleRequestFormChange = (e) => {
    const { name, value } = e.target;
    setRequestForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCurrentItemChange = (e) => {
    const { name, value } = e.target;
    setCurrentItem(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle year-by-year quantity change
  const handleQuantityByYearChange = (year, value) => {
    const numValue = value === '' ? 0 : Math.max(0, parseInt(value, 10) || 0);
    setCurrentItem(prev => {
      const newQuantityByYear = {
        ...prev.quantityByYear,
        [year.toString()]: numValue  // Ensure year is stored as string for consistency
      };
      // Calculate total quantity
      const totalQuantity = Object.values(newQuantityByYear).reduce((sum, qty) => sum + (qty || 0), 0);
      console.log('Updated quantityByYear:', newQuantityByYear, 'for year:', year);
      return {
        ...prev,
        quantityByYear: newQuantityByYear,
        quantity: totalQuantity.toString()
      };
    });
  };

  const addItemToRequest = () => {
    // Calculate total from quantityByYear if available, otherwise use quantity
    const totalQuantity = Object.keys(currentItem.quantityByYear || {}).length > 0
      ? Object.values(currentItem.quantityByYear).reduce((sum, qty) => sum + (qty || 0), 0)
      : Number(currentItem.quantity) || 0;

    if (currentItem.item && totalQuantity > 0) {
      const newItem = {
        id: Date.now().toString(),
        item: currentItem.item,
        quantity: totalQuantity,
        quantityByYear: currentItem.quantityByYear || {},
        price: currentItem.price ? Number(currentItem.price) : 0,
        range: currentItem.range,
        specification: currentItem.specification || '',
        purpose: currentItem.purpose || ''
      };
      console.log('Adding item with quantityByYear:', newItem.item, newItem.quantityByYear);
      console.log('Adding new item:', newItem);
      console.log('Current items in form before adding:', requestForm.items);
      console.log('Current items count:', requestForm.items.length);
      
      // Use flushSync to ensure synchronous state update
      let newItemCount = 0;
      flushSync(() => {
        setRequestForm(prev => {
          const updatedItems = [...prev.items, newItem];
          newItemCount = updatedItems.length;
          console.log('Updated items array:', updatedItems);
          console.log('Updated items count:', updatedItems.length);
          return {
            ...prev,
            items: updatedItems
          };
        });
      });
      
      // After flushSync, state is guaranteed to be updated
      console.log('After flushSync - items count should be:', newItemCount);
      
      // Show immediate feedback with the new count
      setAlertModal({
        show: true,
        variant: 'success',
        title: 'Item Added Successfully!',
        message: `Total items: ${newItemCount}. Scroll up to verify all items are visible before saving.`
      });
      
      // Reset the form and hide it AFTER state update
      setCurrentItem({
        item: '',
        quantity: '',
        quantityByYear: {},
        price: '',
        range: 'mid',
        specification: '',
        purpose: ''
      });
      setShowAddItemForm(false);
      } else {
      setAlertModal({
        show: true,
        variant: 'danger',
        title: 'Missing Required Fields',
        message: 'Please fill in Item name and at least one year quantity'
      });
    }
  };

  const removeItemFromRequest = (itemId) => {
    setRequestForm(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId)
    }));
  };

  // Handle submit confirmation
  const handleConfirmSubmit = async () => {
    if (!requestToSubmit) return;

    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      
      // Update the request status to 'submitted'
      const response = await axios.put(
        API_ENDPOINTS.requests.submit(requestToSubmit._id),
        { status: 'submitted' },
        {
          headers: { 'x-auth-token': token }
        }
      );

      console.log('Request submitted successfully:', response.data);
      setAlertModal({
        show: true,
        variant: 'success',
        title: 'Request Submitted',
        message: 'Request submitted successfully! You can view it in the History page.'
      });
      
      // Refresh the requests list
      await fetchRequests();
      
      // Trigger dashboard refresh if callback is provided
      if (onRequestUpdate) {
        onRequestUpdate();
      }
      
      // Close the confirmation modal
      setShowSubmitConfirmation(false);
      setRequestToSubmit(null);
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to submit request';
      setError(errorMessage);
      console.error('Error submitting request:', err);
      setAlertModal({
        show: true,
        variant: 'danger',
        title: 'Submission Failed',
        message: `Failed to submit request: ${errorMessage}`
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    
    // Small delay to ensure all state updates are complete
    await new Promise(resolve => setTimeout(resolve, 50));
    
    console.log('=== SUBMIT REQUEST ===');
    // Use ref to get the latest state to avoid stale closures
    const currentForm = requestFormRef.current;
    console.log('requestForm.items from ref:', currentForm.items);
    console.log('requestForm.items.length from ref:', currentForm.items.length);
    console.log('requestForm.items from state:', requestForm.items);
    console.log('requestForm.items.length from state:', requestForm.items.length);
    
    // Verify items are present
    if (!currentForm.items || currentForm.items.length === 0) {
      setAlertModal({
        show: true,
        variant: 'danger',
        title: 'No Items Found',
        message: 'Error: No items found in the request. Please add at least one item.'
      });
      return;
    }
    
    if (currentForm.items.length > 0) {
      try {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem('token');
        
        // Check if entries are being accepted for this year cycle
        if (currentForm.year) {
          try {
            // Fetch admin ISSP to check accepting entries status
            const adminResponse = await axios.get(API_ENDPOINTS.issp.get, {
              headers: { 'x-auth-token': token }
            });
            
            const adminISSP = adminResponse.data;
            if (adminISSP && adminISSP.acceptingEntries) {
              // Handle Map structure - Mongoose Maps are converted to objects in JSON
              const acceptingEntries = adminISSP.acceptingEntries;
              const yearCycleStatus = acceptingEntries && typeof acceptingEntries === 'object' && !Array.isArray(acceptingEntries)
                ? acceptingEntries[currentForm.year]
                : null;
              
              // If status exists and is 'not_accepting', block the request
              if (yearCycleStatus && yearCycleStatus.status === 'not_accepting') {
                setAlertModal({
                  show: true,
                  variant: 'danger',
                  title: 'Submission Not Allowed',
                  message: `ISSP entries are not being accepted for ${currentForm.year}. Please contact the administrator.`
                });
                setLoading(false);
                return;
              }
            }
          } catch (isspError) {
            console.error('Error checking accepting entries status:', isspError);
            // Continue with submission if check fails (don't block user)
          }
        }
        
        // Ensure all quantities are numbers and items are properly formatted before submitting
        const formDataToSubmit = {
          ...currentForm,
          items: currentForm.items.map((item, index) => {
            // Ensure item has all required fields and proper types
            return {
              id: item.id || `item-${Date.now()}-${index}`,
              item: item.item || '',
              quantity: Number(item.quantity) || 0,
              quantityByYear: item.quantityByYear || {},
              price: item.price ? Number(item.price) : 0,
              range: item.range || 'mid',
              specification: item.specification || '',
              purpose: item.purpose || ''
            };
          })
        };
        
        // Debug: Log items being sent
        console.log('=== ITEMS BEING SENT ===');
        console.log('Submitting request with items:', formDataToSubmit.items);
        console.log('Items count:', formDataToSubmit.items.length);
        formDataToSubmit.items.forEach((item, index) => {
          console.log(`Item ${index + 1}:`, item);
        });
        
        if (editingRequest) {
          // Update existing request - use _id from editingRequest or request
          const requestId = editingRequest._id || editingRequest.id;
          if (!requestId) {
            throw new Error('Request ID not found');
          }
          console.log('Updating request with ID:', requestId);
          const response = await axios.put(
            API_ENDPOINTS.requests.get(requestId),
            formDataToSubmit,
            {
              headers: { 'x-auth-token': token }
            }
          );
          console.log('Update response:', response.data);
          console.log('Items in response:', response.data.items);
          console.log('Items count in response:', response.data.items ? response.data.items.length : 0);
          setAlertModal({
            show: true,
            variant: 'success',
            title: 'Request Updated',
            message: `Request updated successfully with ${response.data.items.length} items!`
          });
          
          // Refresh the requests list and wait for it to complete
          await fetchRequests();
          
          // Trigger dashboard refresh if callback is provided
          if (onRequestUpdate) {
            onRequestUpdate();
          }
          
          // Small delay to ensure state is updated
          setTimeout(() => {
            setEditingRequest(null);
            setShowAddItemForm(false);
          }, 100);
        } else {
          // Create new request
          const response = await axios.post(
            API_ENDPOINTS.requests.list,
            formDataToSubmit,
            {
              headers: { 'x-auth-token': token }
            }
          );
          setAlertModal({
            show: true,
            variant: 'success',
            title: 'Request Submitted',
            message: 'Request submitted successfully!'
          });
          // Refresh the requests list
          await fetchRequests();
          
          // Trigger dashboard refresh if callback is provided
          if (onRequestUpdate) {
            onRequestUpdate();
          }
        }
        
        // Reset form
        setRequestForm({
          requestTitle: '',
          priority: 'medium',
          year: '2024-2026',
          description: '',
          items: []
        });
        setCurrentItem({
          item: '',
          quantity: '',
          price: '',
          range: 'mid',
          specification: '',
          purpose: ''
        });
        setShowAddRequest(false);
      } catch (err) {
        const errorMessage = err.response?.data?.message || err.message || 'Failed to submit request';
        setError(errorMessage);
        console.error('Error submitting request:', err);
        setAlertModal({
          show: true,
          variant: 'danger',
          title: 'Submission Failed',
          message: `Failed to submit request: ${errorMessage}`
        });
      } finally {
        setLoading(false);
      }
    } else {
      setAlertModal({
        show: true,
        variant: 'danger',
        title: 'Missing Required Information',
        message: 'Please add at least one item'
      });
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Show list view only when NOT adding, editing, revising, or viewing year group */}
      {!showAddRequest && !editingRequest && !isRevisingRequest && !selectedYearGroup && (
        <>
          {/* Add Item Button */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-800">Request Management</h3>
            <button
              onClick={() => setShowAddRequest(true)}
              className="bg-gray-400 hover:bg-gray-500 text-white px-4 sm:px-6 py-2 sm:py-2 rounded-lg text-sm sm:text-base font-medium transition-colors duration-200 flex items-center justify-center space-x-2 shadow-sm w-full sm:w-auto tap-target"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Add Item</span>
            </button>
          </div>

          {/* ISSP REQUEST Section */}
          <div className="bg-white rounded-lg p-4 sm:p-6 shadow-sm border border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-4 sm:mb-6">
              <h4 className="text-base sm:text-lg font-semibold text-gray-800 flex items-center space-x-2">
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <span>ISSP REQUESTS</span>
              </h4>
              <span className="text-xs sm:text-sm text-gray-500">{requests.length} Total Requests</span>
            </div>

            {Object.keys(groupedRequests).length === 0 ? (
              <div className="text-center py-8 sm:py-12 text-gray-500">
                <svg className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm sm:text-base">No requests found. Click "Add Item" to create your first request.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(groupedRequests).map(([year, yearRequests]) => {
                  const totalItems = yearRequests.reduce((sum, req) => sum + (req.items?.length || 0), 0);
                  const latestRequest = yearRequests.sort((a, b) => {
                    const aResubmitted = a.status === 'resubmitted' || a.revisionStatus === 'resubmitted';
                    const bResubmitted = b.status === 'resubmitted' || b.revisionStatus === 'resubmitted';
                    if (aResubmitted && !bResubmitted) return -1;
                    if (!aResubmitted && bResubmitted) return 1;
                    return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
                  })[0];
                  
                  // Determine overall status for the group
                  const hasResubmitted = yearRequests.some(r => r.status === 'resubmitted' || r.revisionStatus === 'resubmitted');
                  const allApproved = yearRequests.every(r => r.status === 'approved');
                  const allRejected = yearRequests.every(r => r.status === 'rejected');
                  
                  let overallStatus = 'submitted';
                  if (hasResubmitted) overallStatus = 'resubmitted';
                  else if (allApproved) overallStatus = 'approved';
                  else if (allRejected) overallStatus = 'rejected';
                  
                  return (
                    <div key={year} className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h2 className="text-lg font-bold text-gray-900 mb-3">
                            {year}
                          </h2>
                          <div className="space-y-1.5">
                            <div className="text-sm text-gray-700">
                              <span className="font-medium">Requests:</span> {yearRequests.length} request{yearRequests.length !== 1 ? 's' : ''}
                            </div>
                            <div className="text-sm text-gray-700">
                              <span className="font-medium">Total Items:</span> {totalItems} item{totalItems !== 1 ? 's' : ''}
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

                      {/* Requests Summary - Single line with unit name */}
                      <div className="border-t border-gray-200 pt-4">
                        {(() => {
                          // Get unit name from first request (all should be same unit for same user)
                          const unitName = yearRequests[0]?.userId?.unit || 
                                         yearRequests[0]?.requestTitle || 
                                         'N/A';
                          const hasInProgress = yearRequests.some(r => r.progress === 'in-progress');
                          
                          return (
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <span className="font-semibold text-gray-900 text-base">
                                  {unitName}
                                </span>
                                {hasInProgress && (
                                  <div className="flex items-center space-x-1.5">
                                    <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                                    <span className="text-orange-600 text-sm font-medium">In Progress</span>
                                  </div>
                                )}
                              </div>
                              <div className="text-sm font-medium text-gray-700">
                                {totalItems} item{totalItems !== 1 ? 's' : ''}
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 mt-4">
                        {/* Check if there are any pending/draft requests that can be submitted */}
                        {(() => {
                          const pendingRequests = yearRequests.filter(r => r.status === 'pending' || r.status === 'draft');
                          const hasPending = pendingRequests.length > 0;
                          
                          return hasPending && (
                            <button
                              onClick={async () => {
                                // Submit all pending requests in this year group
                                const pendingReqs = yearRequests.filter(r => r.status === 'pending' || r.status === 'draft');
                                
                                if (pendingReqs.length === 0) return;
                                
                                try {
                                  setLoading(true);
                                  setError(null);
                                  const token = localStorage.getItem('token');
                                  
                                  // Submit all pending requests
                                  const submitPromises = pendingReqs.map(request => 
                                    axios.put(
                                      API_ENDPOINTS.requests.submit(request._id),
                                      { status: 'submitted' },
                                      { headers: { 'x-auth-token': token } }
                                    )
                                  );
                                  
                                  await Promise.all(submitPromises);
                                  
                                  setAlertModal({
                                    show: true,
                                    variant: 'success',
                                    title: 'Requests Submitted',
                                    message: `Successfully submitted ${pendingReqs.length} request${pendingReqs.length !== 1 ? 's' : ''} for ${year}!`
                                  });
                                  
                                  // Refresh the requests list
                                  await fetchRequests();
                                  
                                  // Trigger dashboard refresh if callback is provided
                                  if (onRequestUpdate) {
                                    onRequestUpdate();
                                  }
                                } catch (err) {
                                  const errorMessage = err.response?.data?.message || err.message || 'Failed to submit requests';
                                  setError(errorMessage);
                                  setAlertModal({
                                    show: true,
                                    variant: 'danger',
                                    title: 'Submission Failed',
                                    message: `Failed to submit requests: ${errorMessage}`
                                  });
                                } finally {
                                  setLoading(false);
                                }
                              }}
                              disabled={loading}
                              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {loading ? 'Submitting...' : 'Submit'}
                            </button>
                          );
                        })()}
                        <button
                          onClick={() => {
                            setSelectedYearGroup({ year, requests: yearRequests });
                          }}
                          className="px-4 py-2 bg-gray-400 hover:bg-gray-500 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          View
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Year Group Details View */}
      {selectedYearGroup && (
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <button
                onClick={() => {
                  setSelectedYearGroup(null);
                }}
                className="mr-4 text-gray-600 hover:text-gray-900"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h3 className="text-2xl font-bold text-gray-900">Request Details - {selectedYearGroup.year}</h3>
            </div>
          </div>

          {/* Year Group Information */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                Group Information
              </h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                <div className="flex items-center gap-2 mb-1.5">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Year Cycle</label>
                </div>
                <div className="text-xl font-bold text-gray-900">{selectedYearGroup.year}</div>
              </div>
              <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                <div className="flex items-center gap-2 mb-1.5">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Requests</label>
                </div>
                <div className="text-xl font-bold text-gray-900">{selectedYearGroup.requests.length} <span className="text-sm font-normal text-gray-600">request{selectedYearGroup.requests.length !== 1 ? 's' : ''}</span></div>
              </div>
              <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                <div className="flex items-center gap-2 mb-1.5">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Items</label>
                </div>
                <div className="text-xl font-bold text-gray-900">{allYearGroupItems.length} <span className="text-sm font-normal text-gray-600">item{allYearGroupItems.length !== 1 ? 's' : ''}</span></div>
              </div>
            </div>
          </div>

          {/* All Items Table */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold text-gray-900">All Items</h4>
                <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full font-medium">
                  {allYearGroupItems.length} {allYearGroupItems.length === 1 ? 'item' : 'items'}
                </span>
              </div>
            </div>
            <div className="overflow-x-auto">
              {allYearGroupItems.length > 0 ? (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Item Name</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Approval Status</th>
                        {allYearGroupItems.some(item => item.approvalStatus === 'approved') && (
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Item Status</th>
                        )}
                        {cycleYears.map(year => (
                          <th key={year} className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                            {year}
                          </th>
                        ))}
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Price</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Range</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Specification</th>
                        {allYearGroupItems.some(item => item.approvalStatus === 'approved') && (
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Purpose</th>
                        )}
                        {allYearGroupItems.some(item => item.approvalStatus === 'approved') && (
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Remarks</th>
                        )}
                        {allYearGroupItems.some(item => item.approvalStatus === 'approved') && (
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Actions</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {allYearGroupItems.map((item, index) => {
                        const isApproved = item.approvalStatus === 'approved';
                        return (
                          <tr key={`${item.requestId}-${item.id || index}`} className="hover:bg-gray-50">
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
                            {allYearGroupItems.some(i => i.approvalStatus === 'approved') && (
                              <td className="px-4 py-3 whitespace-nowrap text-center">
                                {isApproved && item.itemStatus ? (
                                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                    item.itemStatus === 'pr_created' ? 'bg-blue-50 text-blue-700' :
                                    item.itemStatus === 'purchased' ? 'bg-purple-50 text-purple-700' :
                                    item.itemStatus === 'received' ? 'bg-green-50 text-green-700' :
                                    item.itemStatus === 'in_transit' ? 'bg-yellow-50 text-yellow-700' :
                                    item.itemStatus === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                                    'bg-gray-50 text-gray-700'
                                  }`}>
                                    {item.itemStatus === 'pr_created' ? 'PR CREATED' :
                                     item.itemStatus === 'purchased' ? 'PURCHASED' :
                                     item.itemStatus === 'received' ? 'RECEIVED' :
                                     item.itemStatus === 'in_transit' ? 'IN TRANSIT' :
                                     item.itemStatus === 'completed' ? 'COMPLETED' :
                                     item.itemStatus.toUpperCase()}
                                  </span>
                                ) : isApproved ? (
                                  <span className="text-xs text-gray-400">Not Set</span>
                                ) : (
                                  <span className="text-xs text-gray-400">—</span>
                                )}
                              </td>
                            )}
                            {cycleYears.map(year => {
                              // Check if quantityByYear exists and has data for this year
                              // Try both string and number keys for compatibility
                              const hasQuantityByYear = item.quantityByYear && 
                                                       typeof item.quantityByYear === 'object' && 
                                                       Object.keys(item.quantityByYear).length > 0;
                              const yearStr = year.toString();
                              const yearNum = parseInt(year, 10);
                              const yearQuantity = hasQuantityByYear 
                                ? (item.quantityByYear[yearStr] !== undefined ? item.quantityByYear[yearStr] : item.quantityByYear[yearNum])
                                : null;
                              const displayValue = yearQuantity !== null && yearQuantity !== undefined 
                                ? yearQuantity 
                                : '—';
                              
                              // Debug logging
                              if (hasQuantityByYear && yearQuantity === null) {
                                console.log('Item:', item.item, 'quantityByYear:', item.quantityByYear, 'year:', year, 'yearStr:', yearStr);
                              }
                              
                              return (
                                <td key={year} className="px-4 py-3 whitespace-nowrap text-center">
                                  <div className="text-sm text-gray-900">
                                    {displayValue}
                                  </div>
                                </td>
                              );
                            })}
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
                          {allYearGroupItems.some(i => i.approvalStatus === 'approved') && (
                            <td className="px-4 py-3">
                              <div className="text-sm text-gray-900 max-w-xs break-words">
                                {isApproved ? (item.purpose || <span className="text-gray-400">—</span>) : <span className="text-gray-400">—</span>}
                              </div>
                            </td>
                          )}
                          {allYearGroupItems.some(i => i.approvalStatus === 'approved') && (
                            <td className="px-4 py-3">
                              <div className="text-sm text-gray-700 max-w-xs break-words">
                                {isApproved ? (item.itemStatusRemarks || <span className="text-gray-400">—</span>) : <span className="text-gray-400">—</span>}
                              </div>
                            </td>
                          )}
                          {allYearGroupItems.some(i => i.approvalStatus === 'approved') && (
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                              {isApproved && (
                                <button
                                  onClick={() => openStatusUpdateModal(item.requestId, item.id || item._id, item.item, item.itemStatus)}
                                  className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                                >
                                  {item.itemStatus ? 'Update Status' : 'Set Status'}
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500">No items in this year group</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Revision Mode View */}
      {isRevisingRequest && revisingRequest && (
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center mb-6">
            <button
              onClick={() => {
                setIsRevisingRequest(false);
                setRevisingRequest(null);
                setRevisionNotes('');
                setRequestForm({
                  requestTitle: '',
                  priority: 'medium',
                  year: '2024-2026',
                  description: '',
                  items: []
                });
              }}
              className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Revise Request</h3>
              <p className="text-sm text-gray-600 mt-1">Edit rejected items and add new items as needed</p>
            </div>
          </div>

          {/* DICT Revision Notice */}
          {revisingRequest.dictApproval?.status === 'revision_from_dict' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <h4 className="text-sm font-semibold text-red-900 mb-1">Revision Required by DICT</h4>
                  <p className="text-sm text-red-800">{revisingRequest.dictApproval?.notes || 'Please revise the rejected items and resubmit your request.'}</p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {/* Request Info (Read-only) */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-gray-800 mb-4">Request Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Request Title</label>
                  <div className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900">
                    {requestForm.requestTitle}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                  <div className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 capitalize">
                    {requestForm.priority}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Year Cycle</label>
                  <div className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900">
                    {requestForm.year}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <div className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 min-h-[40px]">
                    {requestForm.description || 'No description'}
                  </div>
                </div>
              </div>
            </div>

            {/* Items Section */}
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-semibold text-gray-800">Items</h4>
                  <button
                    type="button"
                    onClick={() => setShowAddItemForm(true)}
                    className="px-3 py-1.5 text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 rounded-md transition-colors flex items-center gap-1.5"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add New Item
                  </button>
                </div>
              </div>
              <div className="divide-y divide-gray-200">
                {requestForm.items.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <p>No items. Click "Add New Item" to add items.</p>
                  </div>
                ) : (
                  requestForm.items.map((item, index) => {
                    const isRejected = item.approvalStatus === 'disapproved' || item.isRejected;
                    const isApproved = item.approvalStatus === 'approved';
                    
                    return (
                      <div key={item.id || index} className={`p-4 rounded-lg border-2 ${isRejected ? 'bg-red-50 border-red-300' : isApproved ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-4">
                            <span className="text-lg font-medium text-gray-900">Item {index + 1}</span>
                            {isRejected && (
                              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-200 text-red-900 border border-red-300">
                                REJECTED - Edit Required
                              </span>
                            )}
                            {isApproved && (
                              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-200 text-green-900 border border-green-300">
                                APPROVED - No Changes Needed
                              </span>
                            )}
                          </div>
                          {isRejected && (
                            <button
                              type="button"
                              onClick={() => {
                                setRequestForm(prev => ({
                                  ...prev,
                                  items: prev.items.filter((_, i) => i !== index)
                                }));
                              }}
                              className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded transition-colors flex items-center gap-1"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Remove
                            </button>
                          )}
                        </div>
                        
                        {/* Item fields - editable only for rejected items */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Item Name</label>
                            <input
                              type="text"
                              value={item.item}
                              onChange={(e) => {
                                const newItems = [...requestForm.items];
                                newItems[index].item = e.target.value;
                                setRequestForm(prev => ({ ...prev, items: newItems }));
                              }}
                              disabled={!isRejected}
                              className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${!isRejected ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => {
                                const newItems = [...requestForm.items];
                                newItems[index].quantity = e.target.value;
                                setRequestForm(prev => ({ ...prev, items: newItems }));
                              }}
                              disabled={!isRejected}
                              className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${!isRejected ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Price</label>
                            <input
                              type="number"
                              value={item.price}
                              onChange={(e) => {
                                const newItems = [...requestForm.items];
                                newItems[index].price = e.target.value;
                                setRequestForm(prev => ({ ...prev, items: newItems }));
                              }}
                              disabled={!isRejected}
                              className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${!isRejected ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Range</label>
                            <select
                              value={item.range}
                              onChange={(e) => {
                                const newItems = [...requestForm.items];
                                newItems[index].range = e.target.value;
                                setRequestForm(prev => ({ ...prev, items: newItems }));
                              }}
                              disabled={!isRejected}
                              className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${!isRejected ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
                            >
                              <option value="low">Low</option>
                              <option value="mid">Mid</option>
                              <option value="high">High</option>
                            </select>
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Specification</label>
                            <textarea
                              value={item.specification}
                              onChange={(e) => {
                                const newItems = [...requestForm.items];
                                newItems[index].specification = e.target.value;
                                setRequestForm(prev => ({ ...prev, items: newItems }));
                              }}
                              disabled={!isRejected}
                              rows={3}
                              className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${!isRejected ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
                            />
                          </div>
                          {item.approvalReason && (
                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-red-700 mb-2">Rejection Reason</label>
                              <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                                {item.approvalReason}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Add Item Form (shown in revision mode) */}
            {showAddItemForm && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-semibold text-gray-800">Add New Item</h4>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentItem({ item: '', quantity: '', quantityByYear: {}, price: '', range: 'mid', specification: '', purpose: '' });
                      setShowAddItemForm(false);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className={`grid grid-cols-1${hasCurrentItemName ? ' lg:grid-cols-[minmax(0,1.7fr)_minmax(280px,1fr)] gap-4 sm:gap-6' : ''}`}>
                  <div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Item Name *</label>
                        <input
                          type="text"
                          name="item"
                          value={currentItem.item}
                          onChange={handleCurrentItemChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                          placeholder="e.g., Desktop Computers, Projectors"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Quantity by Year *</label>
                        {currentCycleYears.length > 0 ? (
                          <div className="border border-gray-300 rounded-lg overflow-hidden">
                            <table className="w-full">
                              <thead className="bg-gray-50">
                                <tr>
                                  {currentCycleYears.map(year => (
                                    <th key={year} className="px-3 py-2 text-xs font-medium text-gray-700 text-center border-r border-gray-300 last:border-r-0">
                                      {year}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  {currentCycleYears.map(year => (
                                    <td key={year} className="px-2 py-2 border-r border-gray-300 last:border-r-0">
                                      <input
                                        type="number"
                                        value={currentItem.quantityByYear?.[year] || ''}
                                        onChange={(e) => handleQuantityByYearChange(year, e.target.value)}
                                        className="w-full px-2 py-1 text-sm text-center border border-gray-200 rounded focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                                        placeholder="0"
                                        min="0"
                                      />
                                    </td>
                                  ))}
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <input
                            type="number"
                            name="quantity"
                            value={currentItem.quantity}
                            onChange={handleCurrentItemChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                            placeholder="Enter quantity"
                            min="1"
                          />
                        )}
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Specification</label>
                      <textarea
                        name="specification"
                        value={currentItem.specification}
                        onChange={handleCurrentItemChange}
                        rows="2"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                        placeholder="Technical specifications for this item"
                      />
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Purpose</label>
                      <textarea
                        name="purpose"
                        value={currentItem.purpose}
                        onChange={handleCurrentItemChange}
                        rows="2"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                        placeholder="Purpose and intended use of this item"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={addItemToRequest}
                      className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center space-x-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <span>Add Item</span>
                    </button>
                  </div>

                  {hasCurrentItemName && (
                    <ItemInsightSidebar
                      itemName={currentItem.item}
                      status={aiStatus}
                      insights={itemInsights}
                      error={aiError}
                      onRetry={handleAiRetry}
                    />
                  )}
                </div>
              </div>
            )}

            {/* Revision Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Revision Notes (Optional)</label>
              <textarea
                value={revisionNotes}
                onChange={(e) => setRevisionNotes(e.target.value)}
                rows={3}
                placeholder="Add any notes about the revisions made..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsRevisingRequest(false);
                  setRevisingRequest(null);
                  setRevisionNotes('');
                }}
                className="px-6 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (requestForm.items.length === 0) {
                    setAlertModal({
                      show: true,
                      variant: 'danger',
                      title: 'No Items',
                      message: 'Please add at least one item before resubmitting.'
                    });
                    return;
                  }

                  try {
                    setLoading(true);
                    const token = localStorage.getItem('token');
                    const response = await axios.put(
                      API_ENDPOINTS.requests.resubmitRevision(revisingRequest._id),
                      {
                        items: requestForm.items.map(item => ({
                          id: item.id || `item-${Date.now()}-${Math.random()}`,
                          item: item.item,
                          quantity: Number(item.quantity) || 0,
                          quantityByYear: item.quantityByYear || {},
                          price: item.price ? Number(item.price) : 0,
                          range: item.range || 'mid',
                          specification: item.specification || '',
                          purpose: item.purpose || ''
                        })),
                        revisionNotes: revisionNotes
                      },
                      {
                        headers: { 'x-auth-token': token }
                      }
                    );

                    setAlertModal({
                      show: true,
                      variant: 'success',
                      title: 'Request Resubmitted',
                      message: 'Your revised request has been resubmitted successfully!'
                    });

                    setIsRevisingRequest(false);
                    setRevisingRequest(null);
                    setRevisionNotes('');
                    setRequestForm({
                      requestTitle: '',
                      priority: 'medium',
                      year: '2024-2026',
                      description: '',
                      items: []
                    });
                    await fetchRequests();
                    if (onRequestUpdate) {
                      onRequestUpdate();
                    }
                  } catch (error) {
                    console.error('Error resubmitting request:', error);
                    setAlertModal({
                      show: true,
                      variant: 'danger',
                      title: 'Resubmission Failed',
                      message: error.response?.data?.message || 'Failed to resubmit revised request.'
                    });
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Resubmitting...' : 'Resubmit Revised Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Item Form (shown when showAddRequest is true and NOT editing) */}
      {showAddRequest && !editingRequest && !isRevisingRequest && (
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          {/* Back Button and Title */}
          <div className="flex items-center mb-6">
            <button
              onClick={() => {
                setShowAddRequest(false);
                setRequestForm({
                  requestTitle: '',
                  priority: 'medium',
                  year: '2024-2026',
                  description: '',
                  items: []
                });
                setCurrentItem({
                  item: '',
                  quantity: '',
                  price: '',
                  range: 'mid',
                  specification: '',
                  purpose: ''
                });
              }}
              className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <h3 className="text-xl font-semibold text-gray-900">Add New ISSP Item</h3>
          </div>

          <form className="space-y-6" onSubmit={handleSubmitRequest}>
              {/* Item Header Info */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-gray-800 mb-4">Item Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                    <select 
                      name="priority"
                      value={requestForm.priority}
                      onChange={handleRequestFormChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Year (3-Year Cycle)</label>
                    <select 
                      name="year"
                      value={requestForm.year}
                      onChange={handleRequestFormChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                    >
                      <option value="2024-2026">2024-2026</option>
                      <option value="2027-2029">2027-2029</option>
                      <option value="2030-2032">2030-2032</option>
                      <option value="2033-2035">2033-2035</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Items Added</label>
                    <div className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700">
                      {requestForm.items.length} item(s) added
                    </div>
                  </div>
                </div>
              </div>

              {/* Current Item Form */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-gray-800 mb-4">Add Item Details</h4>
                
                <div className={`grid grid-cols-1${hasCurrentItemName ? ' lg:grid-cols-[minmax(0,1.7fr)_minmax(280px,1fr)] gap-6' : ''}`}>
                  <div>
                    {/* Row 1: Item and Quantity */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Item Name *</label>
                        <input
                          type="text"
                          name="item"
                          value={currentItem.item}
                          onChange={handleCurrentItemChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                          placeholder="e.g., Desktop Computers, Projectors"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Quantity by Year *</label>
                        {currentCycleYears.length > 0 ? (
                          <div className="border border-gray-300 rounded-lg overflow-hidden">
                            <table className="w-full">
                              <thead className="bg-gray-50">
                                <tr>
                                  {currentCycleYears.map(year => (
                                    <th key={year} className="px-3 py-2 text-xs font-medium text-gray-700 text-center border-r border-gray-300 last:border-r-0">
                                      {year}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  {currentCycleYears.map(year => (
                                    <td key={year} className="px-2 py-2 border-r border-gray-300 last:border-r-0">
                                      <input
                                        type="number"
                                        value={currentItem.quantityByYear?.[year] || ''}
                                        onChange={(e) => handleQuantityByYearChange(year, e.target.value)}
                                        className="w-full px-2 py-1 text-sm text-center border border-gray-200 rounded focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                                        placeholder="0"
                                        min="0"
                                      />
                                    </td>
                                  ))}
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <input
                            type="number"
                            name="quantity"
                            value={currentItem.quantity}
                            onChange={handleCurrentItemChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                            placeholder="Enter quantity"
                            min="1"
                          />
                        )}
                      </div>
                    </div>

                    {/* Specification */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Specification</label>
                      <textarea
                        name="specification"
                        value={currentItem.specification}
                        onChange={handleCurrentItemChange}
                        rows="2"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                        placeholder="Technical specifications for this item"
                      ></textarea>
                    </div>

                    {/* Purpose */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Purpose</label>
                      <textarea
                        name="purpose"
                        value={currentItem.purpose}
                        onChange={handleCurrentItemChange}
                        rows="2"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                        placeholder="Purpose and intended use of this item"
                      ></textarea>
                    </div>

                    <button
                      type="button"
                      onClick={addItemToRequest}
                      className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center space-x-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <span>Add Item</span>
                    </button>
                  </div>

                  {hasCurrentItemName && (
                    <ItemInsightSidebar
                      itemName={currentItem.item}
                      status={aiStatus}
                      insights={itemInsights}
                      error={aiError}
                      onRetry={handleAiRetry}
                    />
                  )}
                </div>
              </div>

              {/* Items List */}
              {requestForm.items.length > 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Items Added ({requestForm.items.length})</h4>
                  <div className="space-y-3">
                    {requestForm.items.map((item, index) => (
                      <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-3 flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-4">
                            <span className="font-medium text-gray-900">{index + 1}. {item.item}</span>
                            <span className="text-sm text-gray-600">Qty: {item.quantity}</span>
                            {item.price > 0 && (
                              <span className="text-sm font-medium text-green-700">{item.price.toLocaleString()}</span>
                            )}
                            <span className={`px-2 py-1 rounded text-xs ${
                              item.range === 'high' ? 'bg-red-100 text-red-800' :
                              item.range === 'mid' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {item.range.toUpperCase()}
                            </span>
                          </div>
                          {item.specification && (
                            <p className="text-sm text-gray-600 mt-1">Spec: {item.specification}</p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItemFromRequest(item.id)}
                          className="text-red-600 hover:text-red-800 p-1"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex justify-between pt-6 border-t border-gray-200">
                {requestForm.items.length > 0 && (
                  <button
                    type="button"
                    onClick={addItemToRequest}
                    className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span>Add Another Item</span>
                  </button>
                )}
                
                <div className="flex space-x-3 ml-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddRequest(false);
                      setEditingRequest(null);
                      setShowAddItemForm(false);
                    }}
                    className="px-6 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={requestForm.items.length === 0}
                    className={`px-6 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2 ${
                      requestForm.items.length > 0 
                        ? 'bg-gray-400 hover:bg-gray-500 text-white' 
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    <span>Submit Item ({requestForm.items.length} items)</span>
                  </button>
                </div>
              </div>
            </form>
        </div>
      )}

      {/* Edit Item Form / View Details Form (integrated into replace view) */}
      {editingRequest && !showAddRequest && !isRevisingRequest && (
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center mb-6">
            <button
              onClick={() => {
                setEditingRequest(null);
                setShowAddItemForm(false);
              }}
              className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <h3 className="text-xl font-semibold text-gray-900">
              {editingRequest.status === 'submitted' || editingRequest.status === 'approved' || editingRequest.status === 'rejected'
                ? 'View Item Details'
                : 'Edit ISSP Item'}
            </h3>
          </div>

          <form onSubmit={handleSubmitRequest} className="space-y-6">
              {/* Item Details Section */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-gray-800 mb-4">Item Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                    <select
                      name="priority"
                      value={requestForm.priority}
                      onChange={handleRequestFormChange}
                      disabled={editingRequest.status === 'submitted' || editingRequest.status === 'approved' || editingRequest.status === 'rejected'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                    <select
                      name="year"
                      value={requestForm.year}
                      onChange={handleRequestFormChange}
                      disabled={editingRequest.status === 'submitted' || editingRequest.status === 'approved' || editingRequest.status === 'rejected'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="2024-2026">2024-2026</option>
                      <option value="2027-2029">2027-2029</option>
                      <option value="2030-2032">2030-2032</option>
                      <option value="2033-2035">2033-2035</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                    <div className={`px-3 py-2 rounded-lg text-sm font-medium ${
                      editingRequest.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      editingRequest.status === 'in-review' ? 'bg-blue-100 text-blue-800' :
                      editingRequest.status === 'submitted' ? 'bg-purple-100 text-purple-800' :
                      editingRequest.status === 'approved' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {editingRequest.status.toUpperCase()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div className="bg-white border border-gray-200 rounded-lg">
                <div className="divide-y divide-gray-200">
                  {requestForm.items.length === 0 && (
                    <div className="p-8 text-center text-gray-500">
                      <p>No items added yet. Click "Add Item" below to add items.</p>
                    </div>
                  )}
                  {requestForm.items.map((item, index) => (
                    <div key={item.id} className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-4">
                          <span className="text-lg font-medium text-gray-900">Item {index + 1}</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            item.range === 'high' ? 'bg-red-100 text-red-800' :
                            item.range === 'mid' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {item.range.toUpperCase()}
                          </span>
                          {/* Show approval status badge if request is submitted/approved/rejected */}
                          {(editingRequest.status === 'submitted' || editingRequest.status === 'approved' || editingRequest.status === 'rejected') && (
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              item.approvalStatus === 'approved' ? 'bg-green-100 text-green-800' :
                              item.approvalStatus === 'disapproved' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {item.approvalStatus === 'approved' ? '✓ APPROVED' :
                               item.approvalStatus === 'disapproved' ? '✗ DISAPPROVED' :
                               '⏳ PENDING REVIEW'}
                            </span>
                          )}
                          {/* Show item status badge for approved items */}
                          {item.approvalStatus === 'approved' && item.itemStatus && (
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              item.itemStatus === 'pr_created' ? 'bg-blue-100 text-blue-800' :
                              item.itemStatus === 'purchased' ? 'bg-purple-100 text-purple-800' :
                              item.itemStatus === 'received' ? 'bg-green-100 text-green-800' :
                              item.itemStatus === 'in_transit' ? 'bg-yellow-100 text-yellow-800' :
                              item.itemStatus === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {item.itemStatus === 'pr_created' ? 'PR CREATED' :
                               item.itemStatus === 'purchased' ? 'PURCHASED' :
                               item.itemStatus === 'received' ? 'RECEIVED' :
                               item.itemStatus === 'in_transit' ? 'IN TRANSIT' :
                               item.itemStatus === 'completed' ? 'COMPLETED' :
                               'APPROVED'}
                            </span>
                          )}
                        </div>
                        {!(editingRequest.status === 'submitted' || editingRequest.status === 'approved' || editingRequest.status === 'rejected') && (
                          <button
                            type="button"
                            onClick={() => removeItemFromRequest(item.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Item Name</label>
                          <input
                            type="text"
                            value={item.item || ''}
                            onChange={(e) => {
                              const updatedItems = [...requestForm.items];
                              updatedItems[index] = { ...item, item: e.target.value };
                              setRequestForm(prev => ({ ...prev, items: updatedItems }));
                            }}
                            disabled={editingRequest.status === 'submitted' || editingRequest.status === 'approved' || editingRequest.status === 'rejected'}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400 disabled:bg-gray-100 disabled:cursor-not-allowed"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                          <input
                            type="number"
                            value={item.quantity || 0}
                            onChange={(e) => {
                              const updatedItems = [...requestForm.items];
                              updatedItems[index] = { ...item, quantity: Number(e.target.value) || 0 };
                              setRequestForm(prev => ({ ...prev, items: updatedItems }));
                            }}
                            min="1"
                            disabled={editingRequest.status === 'submitted' || editingRequest.status === 'approved' || editingRequest.status === 'rejected'}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400 disabled:bg-gray-100 disabled:cursor-not-allowed"
                          />
                        </div>
                      </div>
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Specification</label>
                        <textarea
                          value={item.specification || ''}
                          onChange={(e) => {
                            const updatedItems = [...requestForm.items];
                            updatedItems[index] = { ...item, specification: e.target.value };
                            setRequestForm(prev => ({ ...prev, items: updatedItems }));
                          }}
                          rows="2"
                          disabled={editingRequest.status === 'submitted' || editingRequest.status === 'approved' || editingRequest.status === 'rejected'}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        ></textarea>
                      </div>
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Purpose</label>
                        <textarea
                          value={item.purpose || ''}
                          onChange={(e) => {
                            const updatedItems = [...requestForm.items];
                            updatedItems[index] = { ...item, purpose: e.target.value };
                            setRequestForm(prev => ({ ...prev, items: updatedItems }));
                          }}
                          rows="2"
                          disabled={editingRequest.status === 'submitted' || editingRequest.status === 'approved' || editingRequest.status === 'rejected'}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        ></textarea>
                      </div>
                      {/* Show approval reason if item is disapproved */}
                      {(editingRequest.status === 'approved' || editingRequest.status === 'rejected') && 
                       item.approvalStatus === 'disapproved' && item.approvalReason && (
                        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
                          <label className="block text-sm font-medium text-red-800 mb-1">Reason for Disapproval</label>
                          <p className="text-sm text-red-700">{item.approvalReason}</p>
                        </div>
                      )}
                      {/* Status Update Section for Approved Items */}
                      {item.approvalStatus === 'approved' && (
                        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <label className="block text-sm font-medium text-blue-900">Item Status</label>
                            <button
                              type="button"
                              onClick={() => openStatusUpdateModal(editingRequest._id, item.id, item.item, item.itemStatus)}
                              className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-md transition-colors"
                            >
                              {item.itemStatus ? 'Update Status' : 'Set Status'}
                            </button>
                          </div>
                          {item.itemStatus ? (
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  item.itemStatus === 'pr_created' ? 'bg-blue-100 text-blue-800' :
                                  item.itemStatus === 'purchased' ? 'bg-purple-100 text-purple-800' :
                                  item.itemStatus === 'received' ? 'bg-green-100 text-green-800' :
                                  item.itemStatus === 'in_transit' ? 'bg-yellow-100 text-yellow-800' :
                                  item.itemStatus === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {item.itemStatus === 'pr_created' ? 'PR Created' :
                                   item.itemStatus === 'purchased' ? 'Purchased' :
                                   item.itemStatus === 'received' ? 'Received' :
                                   item.itemStatus === 'in_transit' ? 'In Transit' :
                                   item.itemStatus === 'completed' ? 'Completed' :
                                   item.itemStatus}
                                </span>
                                {item.itemStatusUpdatedAt && (
                                  <span className="text-xs text-gray-500">
                                    Updated: {new Date(item.itemStatusUpdatedAt).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                              {item.itemStatusRemarks && (
                                <p className="text-sm text-gray-700 mt-2">
                                  <span className="font-medium">Remarks:</span> {item.itemStatusRemarks}
                                </p>
                              )}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-600">No status set. Click "Set Status" to update.</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Add New Item Section - Only show for editable requests */}
              {!(editingRequest.status === 'submitted' || editingRequest.status === 'approved' || editingRequest.status === 'rejected') && (
                <div>
                  {!showAddItemForm && (
                    <div className="flex justify-center">
                      <button
                        type="button"
                        onClick={() => setShowAddItemForm(true)}
                        className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        <span>Add Item</span>
                      </button>
                    </div>
                  )}

                {showAddItemForm && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-lg font-semibold text-gray-800">Add New Item</h4>
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentItem({ item: '', quantity: '', quantityByYear: {}, price: '', range: 'mid', specification: '', purpose: '' });
                          setShowAddItemForm(false);
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    <div className={`grid grid-cols-1${hasCurrentItemName ? ' lg:grid-cols-[minmax(0,1.7fr)_minmax(280px,1fr)] gap-4 sm:gap-6' : ''}`}>
                      <div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Item Name *</label>
                            <input
                              type="text"
                              name="item"
                              value={currentItem.item}
                              onChange={handleCurrentItemChange}
                              className="input-responsive tap-target"
                              placeholder="e.g., Desktop Computers, Projectors"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Quantity by Year *</label>
                            {currentCycleYears.length > 0 ? (
                              <div className="border border-gray-300 rounded-lg overflow-hidden">
                                <table className="w-full">
                                  <thead className="bg-gray-50">
                                    <tr>
                                      {currentCycleYears.map(year => (
                                        <th key={year} className="px-3 py-2 text-xs font-medium text-gray-700 text-center border-r border-gray-300 last:border-r-0">
                                          {year}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    <tr>
                                      {currentCycleYears.map(year => (
                                        <td key={year} className="px-2 py-2 border-r border-gray-300 last:border-r-0">
                                          <input
                                            type="number"
                                            value={currentItem.quantityByYear?.[year] || ''}
                                            onChange={(e) => handleQuantityByYearChange(year, e.target.value)}
                                            className="w-full px-2 py-1 text-sm text-center border border-gray-200 rounded focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                                            placeholder="0"
                                            min="0"
                                          />
                                        </td>
                                      ))}
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <input
                                type="number"
                                name="quantity"
                                value={currentItem.quantity}
                                onChange={handleCurrentItemChange}
                                className="input-responsive tap-target"
                                placeholder="Enter quantity"
                                min="1"
                              />
                            )}
                          </div>
                        </div>

                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Specification</label>
                          <textarea
                            name="specification"
                            value={currentItem.specification}
                            onChange={handleCurrentItemChange}
                            rows="2"
                            className="input-responsive tap-target"
                            placeholder="Technical specifications for this item"
                          ></textarea>
                        </div>

                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Purpose</label>
                          <textarea
                            name="purpose"
                            value={currentItem.purpose}
                            onChange={handleCurrentItemChange}
                            rows="2"
                            className="input-responsive tap-target"
                            placeholder="Purpose and intended use of this item"
                          ></textarea>
                        </div>

                        <button
                          type="button"
                          onClick={addItemToRequest}
                          className="btn-responsive w-full bg-gray-600 hover:bg-gray-700 text-white flex items-center justify-center space-x-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          <span>Add Item</span>
                        </button>
                      </div>

                      {hasCurrentItemName && (
                        <ItemInsightSidebar
                          itemName={currentItem.item}
                          status={aiStatus}
                          insights={itemInsights}
                          error={aiError}
                          onRetry={handleAiRetry}
                        />
                      )}
                    </div>
                  </div>
                )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 sm:space-x-0 pt-4 sm:pt-6 border-t border-gray-200">
                {editingRequest.status === 'submitted' || editingRequest.status === 'approved' || editingRequest.status === 'rejected' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingRequest(null);
                      setShowAddItemForm(false);
                    }}
                    className="btn-responsive bg-gray-600 hover:bg-gray-700 text-white"
                  >
                    Close
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingRequest(null);
                        setShowAddItemForm(false);
                      }}
                      className="btn-responsive text-gray-700 bg-gray-100 hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-responsive bg-gray-400 hover:bg-gray-500 text-white flex items-center justify-center space-x-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Save Changes ({requestForm.items.length} {requestForm.items.length === 1 ? 'Item' : 'Items'})</span>
                    </button>
                  </>
                )}
              </div>
            </form>
        </div>
      )}

      {/* New Request Page Modal */}
      <Modal
        isOpen={showNewRequestPage}
        variant="default"
        title="Request Management Options"
        message="Choose how you would like to proceed with your ISSP request:"
        cancelLabel={null}
        onClose={() => setShowNewRequestPage(false)}
      >
        <div className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {/* Create New Request */}
            <div 
              className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 sm:p-6 hover:border-blue-300 transition-colors cursor-pointer tap-target"
              onClick={() => {
                setShowNewRequestPage(false);
                setShowAddRequest(true);
              }}
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h4 className="text-base sm:text-lg font-semibold text-blue-900 mb-2">Create New Request</h4>
              <p className="text-blue-700 text-xs sm:text-sm">Start a fresh ISSP equipment request with detailed specifications</p>
            </div>
            
            {/* View All Requests */}
            <div 
              className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4 sm:p-6 hover:border-purple-300 transition-colors cursor-pointer tap-target"
              onClick={() => setShowNewRequestPage(false)}
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h4 className="text-base sm:text-lg font-semibold text-purple-900 mb-2">View All Requests</h4>
              <p className="text-purple-700 text-xs sm:text-sm">Browse and manage your existing ISSP requests</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {/* Draft Requests */}
            <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4 sm:p-6 hover:border-orange-300 transition-colors cursor-pointer tap-target">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <h4 className="text-base sm:text-lg font-semibold text-orange-900 mb-2">Draft Requests</h4>
              <p className="text-orange-700 text-xs sm:text-sm">Continue working on saved draft requests</p>
            </div>
            
            {/* Request Templates */}
            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 sm:p-6 hover:border-green-300 transition-colors cursor-pointer tap-target">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h4 className="text-base sm:text-lg font-semibold text-green-900 mb-2">Request Templates</h4>
              <p className="text-green-700 text-xs sm:text-sm">Use pre-made templates for common equipment requests</p>
            </div>
          </div>
        </div>
      </Modal>

      {/* Submit Confirmation Modal */}
      <Modal
        isOpen={showSubmitConfirmation && requestToSubmit}
        variant="confirm"
        title="Submit Item"
        message={requestToSubmit ? `Are you sure you want to submit "${requestToSubmit.requestTitle || 
          (requestToSubmit.userId?.unit ? requestToSubmit.userId.unit : 
           `Request #${(requestToSubmit._id || requestToSubmit.id || '').toString().slice(-6)}`)}"? Once submitted, you will not be able to edit this item.` : ''}
        confirmLabel={loading ? 'Submitting...' : 'Yes, Submit'}
        cancelLabel="Cancel"
        onClose={() => {
          setShowSubmitConfirmation(false);
          setRequestToSubmit(null);
        }}
        onConfirm={handleConfirmSubmit}
      >
        {requestToSubmit && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-xs sm:text-sm text-blue-800">
                <p className="font-medium">Item includes:</p>
                <p className="mt-1">{requestToSubmit.items?.length || 0} item(s)</p>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Alert Modal for all notifications */}
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

      {/* Status Update Modal */}
      <Modal
        isOpen={statusUpdateModal.show}
        variant="default"
        title="Update Item Status"
        message={`Update status for "${statusUpdateModal.itemName}"`}
        confirmLabel={updatingStatus ? 'Updating...' : 'Update Status'}
        cancelLabel="Cancel"
        onConfirm={handleUpdateItemStatus}
        onClose={() => {
          setStatusUpdateModal({ show: false, requestId: null, itemId: null, itemName: '' });
          setStatusUpdateForm({ itemStatus: '', remarks: '' });
        }}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status *</label>
            <select
              value={statusUpdateForm.itemStatus}
              onChange={(e) => setStatusUpdateForm(prev => ({ ...prev, itemStatus: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select Status</option>
              <option value="approved">Approved</option>
              <option value="pr_created">PR Created</option>
              <option value="purchased">Purchased</option>
              <option value="received">Received</option>
              <option value="in_transit">In Transit</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Remarks (Optional)</label>
            <textarea
              value={statusUpdateForm.remarks}
              onChange={(e) => setStatusUpdateForm(prev => ({ ...prev, remarks: e.target.value }))}
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Add any remarks or notes about this status update..."
            ></textarea>
          </div>
        </div>
      </Modal>

    </div>
  );
};

export default Request;
