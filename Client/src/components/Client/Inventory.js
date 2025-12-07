import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_ENDPOINTS, getAuthHeaders } from '../../utils/api';

const Inventory = () => {
  const [animateInventory, setAnimateInventory] = useState(false);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null); // Track selected request for detail view

  // Fetch inventory items from backend
  const fetchInventoryItems = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const response = await axios.get(API_ENDPOINTS.requests.inventoryItems, {
        headers: getAuthHeaders()
      });
      console.log('Fetched inventory items:', response.data);
      setInventoryItems(response.data || []); // Ensure it's always an array
    } catch (err) {
      // Only show error for actual API failures, not empty results
      console.error('Error fetching inventory items:', err);
      setInventoryItems([]); // Set empty array on error
      // Only set error message if it's a real server error
      if (err.response && err.response.status >= 500) {
        setError('Server error. Please try again later.');
      } else if (err.message === 'Network Error') {
        setError('Unable to connect to server. Please check your connection.');
      }
      // For other errors (like 401, 404), just show empty inventory
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setAnimateInventory(true);
    fetchInventoryItems();
  }, []);

  // Group items by request
  const groupedByRequest = inventoryItems.reduce((acc, item) => {
    const requestKey = item.requestTitle || item.requestId || 'Unknown Request';
    if (!acc[requestKey]) {
      acc[requestKey] = {
        requestTitle: requestKey,
        requestId: item.requestId,
        requestYear: item.requestYear || item.year || 'N/A', // Use year cycle instead of date
        items: []
      };
    }
    acc[requestKey].items.push(item);
    return acc;
  }, {});

  // Filter grouped requests based on search term
  const filteredGroupedRequests = Object.keys(groupedByRequest)
    .filter(requestKey => {
      const group = groupedByRequest[requestKey];
      const searchLower = searchTerm.toLowerCase();
      return (
        group.requestTitle.toLowerCase().includes(searchLower) ||
        group.requestYear.toLowerCase().includes(searchLower) ||
        group.items.some(item =>
          item.name.toLowerCase().includes(searchLower) ||
          item.purpose.toLowerCase().includes(searchLower) ||
          (item.specification && item.specification.toLowerCase().includes(searchLower))
        )
      );
    })
    .reduce((acc, key) => {
      acc[key] = groupedByRequest[key];
      return acc;
    }, {});

  return (
    <div className={`space-y-4 sm:space-y-6 transition-opacity duration-500 ${animateInventory ? 'opacity-100' : 'opacity-0'}`}>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-3 sm:mb-4">Inventory Management</h2>
          
          {/* Search Section */}
          <div className="mb-4 sm:mb-6">
            <div className="max-w-full sm:max-w-xs">
              <input
                type="text"
                placeholder="Search inventory..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-responsive tap-target w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-gray-600 mt-2">Loading inventory items...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          {/* Inventory Items - List View or Detail View */}
          {!loading && !error && (
            <>
              {selectedRequest ? (
                // Detail View - Show all items from selected request
                <div className="space-y-4">
                  {/* Back Button and Header */}
                  <div className="flex items-center justify-between mb-6">
                    <button
                      onClick={() => setSelectedRequest(null)}
                      className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      <span className="text-sm font-medium">Back to Requests</span>
                    </button>
                  </div>

                  {/* Request Info Card */}
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-lg p-4 sm:p-6">
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">{selectedRequest.requestTitle}</h3>
                    <div className="flex flex-wrap items-center gap-4 mt-4">
                      <div>
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Year Cycle</span>
                        <p className="text-sm font-semibold text-gray-900 mt-1">{selectedRequest.requestYear}</p>
                      </div>
                      <div>
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Items</span>
                        <p className="text-sm font-semibold text-gray-900 mt-1">{selectedRequest.items.length} items</p>
                      </div>
                    </div>
                  </div>

                  {/* Items Table */}
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Name</th>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Specification</th>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Purpose</th>
                            <th className="px-4 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                            <th className="px-4 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                            <th className="px-4 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {selectedRequest.items.length === 0 ? (
                            <tr>
                              <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                                No items in this request
                              </td>
                            </tr>
                          ) : (
                            selectedRequest.items.map((item, index) => (
                              <tr key={item.id || index} className="hover:bg-gray-50">
                                <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium text-gray-900">{item.name}</div>
                                </td>
                                <td className="px-4 sm:px-6 py-4">
                                  <div className="text-sm text-gray-700 max-w-xs break-words">
                                    {item.specification || <span className="text-gray-400">—</span>}
                                  </div>
                                </td>
                                <td className="px-4 sm:px-6 py-4">
                                  <div className="text-sm text-gray-700 max-w-xs break-words">
                                    {item.purpose || <span className="text-gray-400">—</span>}
                                  </div>
                                </td>
                                <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-center">
                                  <div className="text-sm font-medium text-gray-900">{item.quantity || '—'}</div>
                                </td>
                                <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-center">
                                  <div className="text-sm text-gray-900">
                                    {item.price > 0 ? `₱${item.price.toLocaleString()}` : '—'}
                                  </div>
                                </td>
                                <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-center">
                                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                    item.status === 'Approved' 
                                      ? 'bg-green-100 text-green-800'
                                      : item.status === 'Disapproved'
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {item.status || 'Pending'}
                                  </span>
                                </td>
                                <td className="px-4 sm:px-6 py-4">
                                  <div className="text-sm text-gray-700 max-w-xs break-words">
                                    {item.reason || <span className="text-gray-400">—</span>}
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                // List View - Show all requests with View buttons
                <>
                  {Object.keys(filteredGroupedRequests).length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                      <p className="text-lg font-medium">No inventory items found</p>
                      <p className="text-sm text-gray-400 mt-1">Items will appear here once requests are approved</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {Object.entries(filteredGroupedRequests).map(([requestKey, group]) => {
                        const totalItems = group.items.length;
                        const approvedCount = group.items.filter(item => item.status === 'Approved').length;
                        const disapprovedCount = group.items.filter(item => item.status === 'Disapproved').length;
                        const pendingCount = group.items.filter(item => item.status === 'Pending' || !item.status).length;

                        return (
                          <div key={requestKey} className="border border-gray-200 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow">
                            <div className="px-4 sm:px-6 py-4">
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">{group.requestTitle}</h3>
                                  <div className="flex items-center space-x-4 mt-2">
                                    <div>
                                      <span className="text-xs text-gray-500">Year Cycle: </span>
                                      <span className="text-xs font-medium text-gray-700">{group.requestYear}</span>
                                    </div>
                                    <div>
                                      <span className="text-xs text-gray-500">Items: </span>
                                      <span className="text-xs font-medium text-gray-700">{totalItems}</span>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="flex items-center space-x-4 ml-4">
                                  {/* Status Summary */}
                                  <div className="hidden sm:flex items-center space-x-2">
                                    {approvedCount > 0 && (
                                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                                        {approvedCount} Approved
                                      </span>
                                    )}
                                    {disapprovedCount > 0 && (
                                      <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
                                        {disapprovedCount} Disapproved
                                      </span>
                                    )}
                                    {pendingCount > 0 && (
                                      <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded-full">
                                        {pendingCount} Pending
                                      </span>
                                    )}
                                  </div>
                                  
                                  {/* View Button */}
                                  <button
                                    onClick={() => setSelectedRequest(group)}
                                    className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md"
                                  >
                                    View
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>

    </div>
  );
};

export default Inventory;