import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Modal from '../common/Modal';
import { API_ENDPOINTS, getAuthHeaders } from '../../utils/api';

const Inventory = () => {
  const [animateInventory, setAnimateInventory] = useState(false);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null); // Track selected request for detail view
  const [viewItemModal, setViewItemModal] = useState({ show: false, item: null });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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

  // Group items by name (case-insensitive) across all requests
  const groupedItems = inventoryItems.reduce((acc, item) => {
    const itemNameKey = (item.name || '').toLowerCase().trim();
    if (!itemNameKey) return acc;
    
    if (!acc[itemNameKey]) {
      acc[itemNameKey] = {
        name: item.name, // Keep original casing (first occurrence)
        quantity: 0,
        specifications: new Set(),
        purposes: new Set(),
        statuses: new Set(),
        reasons: new Set(),
        prices: [],
        requestTitles: new Set(),
        requestYears: new Set(),
        originalItems: [] // Store all original items for detail view
      };
    }
    
    const group = acc[itemNameKey];
    group.quantity += Number(item.quantity) || 0;
    
    if (item.specification && item.specification.trim()) {
      group.specifications.add(item.specification.trim());
    }
    if (item.purpose && item.purpose.trim()) {
      group.purposes.add(item.purpose.trim());
    }
    if (item.status) {
      group.statuses.add(item.status);
    }
    if (item.reason && item.reason.trim()) {
      group.reasons.add(item.reason.trim());
    }
    if (item.price && item.price > 0) {
      group.prices.push(item.price);
    }
    if (item.requestTitle) {
      group.requestTitles.add(item.requestTitle);
    }
    if (item.requestYear) {
      group.requestYears.add(item.requestYear);
    }
    
    group.originalItems.push(item);
    return acc;
  }, {});

  // Convert grouped items to array format
  const groupedItemsArray = Object.values(groupedItems).map(group => ({
    name: group.name,
    quantity: group.quantity,
    specification: Array.from(group.specifications).filter(s => s).join('; ') || '—',
    purpose: Array.from(group.purposes).filter(p => p).join('; ') || '—',
    status: Array.from(group.statuses).join(', ') || 'Pending',
    reason: Array.from(group.reasons).filter(r => r).join('; ') || '—',
    price: group.prices.length > 0 ? group.prices.reduce((a, b) => a + b, 0) / group.prices.length : 0, // Average price
    requestTitles: Array.from(group.requestTitles),
    requestYears: Array.from(group.requestYears),
    originalItems: group.originalItems
  }));

  // Filter grouped items based on search term
  const filteredItems = groupedItemsArray.filter(item => {
    if (!searchTerm.trim()) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      item.name.toLowerCase().includes(searchLower) ||
      item.specification.toLowerCase().includes(searchLower) ||
      item.purpose.toLowerCase().includes(searchLower) ||
      item.status.toLowerCase().includes(searchLower) ||
      item.requestTitles.some(title => title.toLowerCase().includes(searchLower))
    );
  });

  // Pagination
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedItems = filteredItems.slice(startIndex, endIndex);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

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

          {/* Inventory Items - Grouped and Paginated View */}
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
                      <table className="min-w-full divide-y divide-gray-200" style={{ tableLayout: 'fixed', width: '100%' }}>
                        <colgroup>
                          <col style={{ width: '12%' }} />
                          <col style={{ width: '25%' }} />
                          <col style={{ width: '15%' }} />
                          <col style={{ width: '8%' }} />
                          <col style={{ width: '10%' }} />
                          <col style={{ width: '10%' }} />
                          <col style={{ width: '12%' }} />
                          <col style={{ width: '8%' }} />
                        </colgroup>
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Name</th>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Specification</th>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Purpose</th>
                            <th className="px-4 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                            <th className="px-4 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                            <th className="px-4 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                            <th className="px-4 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">View</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {selectedRequest.items.length === 0 ? (
                            <tr>
                              <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                                No items in this request
                              </td>
                            </tr>
                          ) : (
                            selectedRequest.items.map((item, index) => (
                              <tr key={item.id || index} className="hover:bg-gray-50">
                                <td className="px-4 sm:px-6 py-4">
                                  <div className="text-sm font-medium text-gray-900 truncate" title={item.name}>
                                    {item.name}
                                  </div>
                                </td>
                                <td className="px-4 sm:px-6 py-4">
                                  <div className="text-sm text-gray-700">
                                    {item.specification ? (
                                      <div className="line-clamp-2 break-words">
                                        {item.specification}
                                      </div>
                                    ) : (
                                      <span className="text-gray-400">—</span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 sm:px-6 py-4">
                                  <div className="text-sm text-gray-700">
                                    {item.purpose ? (
                                      <div className="line-clamp-2 break-words">
                                        {item.purpose}
                                      </div>
                                    ) : (
                                      <span className="text-gray-400">—</span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 sm:px-6 py-4 text-center whitespace-nowrap">
                                  <div className="text-sm font-medium text-gray-900">{item.quantity || '—'}</div>
                                </td>
                                <td className="px-4 sm:px-6 py-4 text-center whitespace-nowrap">
                                  <div className="text-sm text-gray-900">
                                    {item.price > 0 ? `₱${item.price.toLocaleString()}` : '—'}
                                  </div>
                                </td>
                                <td className="px-4 sm:px-6 py-4 text-center whitespace-nowrap">
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
                                  <div className="text-sm text-gray-700">
                                    {item.reason ? (
                                      <div className="line-clamp-2 break-words">
                                        {item.reason}
                                      </div>
                                    ) : (
                                      <span className="text-gray-400">—</span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-center">
                                  <button
                                    onClick={() => setViewItemModal({ show: true, item: item })}
                                    className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                                    title="View full item details"
                                  >
                                    View
                                  </button>
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
                // Grouped Items Table View with Pagination
                <>
                  {filteredItems.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                      <p className="text-lg font-medium">No inventory items found</p>
                      <p className="text-sm text-gray-400 mt-1">
                        {searchTerm ? 'Try a different search term' : 'Items will appear here once requests are approved'}
                      </p>
                    </div>
                  ) : (
                    <>
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
                                <th className="px-4 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">View</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {paginatedItems.map((item, index) => (
                                <tr key={`${item.name}-${index}`} className="hover:bg-gray-50">
                                  <td className="px-4 sm:px-6 py-4">
                                    <div className="text-sm font-medium text-gray-900 truncate" title={item.name}>
                                      {item.name}
                                    </div>
                                  </td>
                                  <td className="px-4 sm:px-6 py-4">
                                    <div className="text-sm text-gray-700">
                                      {item.specification !== '—' ? (
                                        <div className="line-clamp-2 break-words" title={item.specification}>
                                          {item.specification}
                                        </div>
                                      ) : (
                                        <span className="text-gray-400">—</span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-4 sm:px-6 py-4">
                                    <div className="text-sm text-gray-700">
                                      {item.purpose !== '—' ? (
                                        <div className="line-clamp-2 break-words" title={item.purpose}>
                                          {item.purpose}
                                        </div>
                                      ) : (
                                        <span className="text-gray-400">—</span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-4 sm:px-6 py-4 text-center whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">{item.quantity}</div>
                                  </td>
                                  <td className="px-4 sm:px-6 py-4 text-center whitespace-nowrap">
                                    <div className="text-sm text-gray-900">
                                      {item.price > 0 ? `₱${Math.round(item.price).toLocaleString()}` : '—'}
                                    </div>
                                  </td>
                                  <td className="px-4 sm:px-6 py-4 text-center whitespace-nowrap">
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                      item.status.includes('Approved')
                                        ? 'bg-green-100 text-green-800'
                                        : item.status.includes('Disapproved')
                                        ? 'bg-red-100 text-red-800'
                                        : 'bg-yellow-100 text-yellow-800'
                                    }`}>
                                      {item.status}
                                    </span>
                                  </td>
                                  <td className="px-4 sm:px-6 py-4">
                                    <div className="text-sm text-gray-700">
                                      {item.reason !== '—' ? (
                                        <div className="line-clamp-2 break-words" title={item.reason}>
                                          {item.reason}
                                        </div>
                                      ) : (
                                        <span className="text-gray-400">—</span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-center">
                                    <button
                                      onClick={() => setViewItemModal({ show: true, item: { ...item, originalItems: item.originalItems } })}
                                      className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                                      title="View full item details"
                                    >
                                      View
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Pagination Controls */}
                      {totalPages > 1 && (
                        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
                          <div className="flex flex-1 justify-between sm:hidden">
                            <button
                              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                              disabled={currentPage === 1}
                              className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Previous
                            </button>
                            <button
                              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                              disabled={currentPage === totalPages}
                              className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Next
                            </button>
                          </div>
                          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                            <div>
                              <p className="text-sm text-gray-700">
                                Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                                <span className="font-medium">{Math.min(endIndex, filteredItems.length)}</span> of{' '}
                                <span className="font-medium">{filteredItems.length}</span> items
                              </p>
                            </div>
                            <div>
                              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                <button
                                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                  disabled={currentPage === 1}
                                  className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <span className="sr-only">Previous</span>
                                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                    <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                                  </svg>
                                </button>
                                {[...Array(totalPages)].map((_, i) => {
                                  const page = i + 1;
                                  if (
                                    page === 1 ||
                                    page === totalPages ||
                                    (page >= currentPage - 1 && page <= currentPage + 1)
                                  ) {
                                    return (
                                      <button
                                        key={page}
                                        onClick={() => setCurrentPage(page)}
                                        className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                                          currentPage === page
                                            ? 'z-10 bg-gray-900 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900'
                                            : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                                        }`}
                                      >
                                        {page}
                                      </button>
                                    );
                                  } else if (page === currentPage - 2 || page === currentPage + 2) {
                                    return (
                                      <span key={page} className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300 focus:outline-offset-0">
                                        ...
                                      </span>
                                    );
                                  }
                                  return null;
                                })}
                                <button
                                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                  disabled={currentPage === totalPages}
                                  className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <span className="sr-only">Next</span>
                                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                    <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                                  </svg>
                                </button>
                              </nav>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* View Item Details Modal */}
      <Modal
        isOpen={viewItemModal.show}
        variant="default"
        title="Item Details"
        message=""
        confirmLabel="Close"
        cancelLabel={null}
        onConfirm={() => setViewItemModal({ show: false, item: null })}
        onClose={() => setViewItemModal({ show: false, item: null })}
        closeOnOverlay={true}
        showCloseButton={true}
        zIndex={100}
      >
        {viewItemModal.item && (
          <div className="space-y-4">
            {/* Item Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Item Name
              </label>
              <div className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">
                {viewItemModal.item.name || '—'}
              </div>
            </div>

            {/* Total Quantity (sum of all grouped items) */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Total Quantity
              </label>
              <div className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">
                {viewItemModal.item.quantity || '—'}
              </div>
            </div>

            {/* Approval Status */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Approval Status
              </label>
              <div className="flex flex-wrap gap-2">
                {viewItemModal.item.status && viewItemModal.item.status.split(', ').map((status, idx) => (
                  <span key={idx} className={`px-3 py-1 text-xs font-semibold rounded-full ${
                    status.includes('Approved')
                      ? 'bg-green-50 text-green-700'
                      : status.includes('Disapproved')
                      ? 'bg-red-50 text-red-700'
                      : 'bg-yellow-50 text-yellow-700'
                  }`}>
                    {status.trim()}
                  </span>
                ))}
              </div>
            </div>

            {/* Average Price */}
            {viewItemModal.item.price > 0 && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Average Price
                </label>
                <div className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">
                  ₱{Math.round(viewItemModal.item.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            )}

            {/* Specifications (all unique values) */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Specifications
              </label>
              <div className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-lg max-h-60 overflow-y-auto whitespace-pre-wrap">
                {viewItemModal.item.specification !== '—' ? viewItemModal.item.specification : '—'}
              </div>
            </div>

            {/* Purposes (all unique values) */}
            {viewItemModal.item.purpose && viewItemModal.item.purpose !== '—' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Purposes
                </label>
                <div className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-lg max-h-40 overflow-y-auto whitespace-pre-wrap">
                  {viewItemModal.item.purpose}
                </div>
              </div>
            )}

            {/* Reasons (all unique values) */}
            {viewItemModal.item.reason && viewItemModal.item.reason !== '—' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Reasons
                </label>
                <div className="text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded-lg max-h-40 overflow-y-auto whitespace-pre-wrap">
                  {viewItemModal.item.reason}
                </div>
              </div>
            )}

            {/* Request Titles */}
            {viewItemModal.item.requestTitles && viewItemModal.item.requestTitles.length > 0 && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Request Titles ({viewItemModal.item.requestTitles.length})
                </label>
                <div className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-lg max-h-40 overflow-y-auto">
                  {viewItemModal.item.requestTitles.join(', ')}
                </div>
              </div>
            )}

            {/* Year Cycles */}
            {viewItemModal.item.requestYears && viewItemModal.item.requestYears.length > 0 && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Year Cycles
                </label>
                <div className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">
                  {viewItemModal.item.requestYears.join(', ')}
                </div>
              </div>
            )}

            {/* Show individual items if grouped */}
            {viewItemModal.item.originalItems && viewItemModal.item.originalItems.length > 1 && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Individual Items ({viewItemModal.item.originalItems.length} items grouped)
                </label>
                <div className="bg-gray-50 rounded-lg p-3 max-h-60 overflow-y-auto">
                  <div className="space-y-2">
                    {viewItemModal.item.originalItems.map((originalItem, idx) => (
                      <div key={idx} className="text-xs text-gray-700 border-b border-gray-200 pb-2 last:border-0">
                        <div className="font-medium">Item {idx + 1}:</div>
                        <div className="ml-2 mt-1">
                          <div>Quantity: {originalItem.quantity}</div>
                          {originalItem.specification && <div>Spec: {originalItem.specification}</div>}
                          {originalItem.purpose && <div>Purpose: {originalItem.purpose}</div>}
                          {originalItem.status && <div>Status: {originalItem.status}</div>}
                          {originalItem.requestTitle && <div>Request: {originalItem.requestTitle}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

    </div>
  );
};

export default Inventory;