import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_ENDPOINTS, getAuthHeaders } from '../../utils/api';

const Inventory = () => {
  const [animateInventory, setAnimateInventory] = useState(false);
  const [selectedReason, setSelectedReason] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

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

  // Filter items based on search term
  const filteredItems = inventoryItems.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.purpose.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.requestTitle.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

          {/* Inventory Table */}
          {!loading && !error && (
            <>
              {/* Mobile Card View */}
              <div className="block md:hidden space-y-3">
                {filteredItems.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <svg className="w-10 h-10 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                    <p className="text-sm font-medium">No inventory items found</p>
                  </div>
                ) : (
                  filteredItems.map((item) => (
                    <div key={item.id} className="border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-shadow bg-white">
                      <div className="space-y-2">
                        {/* Item Name and Status */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Item Name</div>
                            <div className="text-sm font-medium text-gray-900 break-words">{item.name}</div>
                            {item.specification && (
                              <div className="text-xs text-gray-500 mt-1 break-words">Spec: {item.specification}</div>
                            )}
                          </div>
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap flex-shrink-0 ${
                            item.status === 'Approved' 
                              ? 'bg-green-100 text-green-800'
                              : item.status === 'Disapproved'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {item.status}
                          </span>
                        </div>

                        {/* Request and Purpose */}
                        <div className="grid grid-cols-1 gap-2">
                          <div>
                            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Request</div>
                            <div className="text-xs text-gray-700 break-words">{item.requestTitle}</div>
                          </div>
                          <div>
                            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Purpose</div>
                            <div className="text-xs text-gray-700 break-words">{item.purpose}</div>
                          </div>
                        </div>

                        {/* Quantity and Action */}
                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
                          <div>
                            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-0.5">Qty</div>
                            <div className="text-sm font-medium text-gray-900">{item.quantity}</div>
                          </div>
                          <button 
                            onClick={() => {
                              setSelectedItem(item);
                              setSelectedReason(item.reason);
                              setShowReasonModal(true);
                            }}
                            className="bg-gray-400 hover:bg-gray-500 text-white px-2 py-1 rounded text-xs font-medium transition duration-200 tap-target whitespace-nowrap"
                          >
                            View Details
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block table-responsive-wrapper">
                <table className="table-responsive min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Request</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Purpose</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-6 py-12 text-center">
                          <div className="text-gray-500">
                            <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                            </svg>
                            <p className="text-lg font-medium">No inventory items found</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm text-gray-900">
                            <div className="font-medium">{item.name}</div>
                            {item.specification && (
                              <div className="text-xs text-gray-500 mt-1 break-words">Spec: {item.specification}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            <div className="max-w-xs truncate">{item.requestTitle}</div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 break-words">{item.purpose}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            <span className="font-medium">{item.quantity}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              item.status === 'Approved' 
                                ? 'bg-green-100 text-green-800'
                                : item.status === 'Disapproved'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button 
                              onClick={() => {
                                setSelectedItem(item);
                                setSelectedReason(item.reason);
                                setShowReasonModal(true);
                              }}
                              className="bg-gray-400 hover:bg-gray-500 text-white px-2 py-1 rounded text-xs font-medium transition duration-200 tap-target"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Item Details Modal */}
      {showReasonModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-2xl w-full shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Item Details</h3>
              <button
                onClick={() => {
                  setShowReasonModal(false);
                  setSelectedItem(null);
                }}
                className="text-gray-400 hover:text-gray-500 transition-colors"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Item Information */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Item Information</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Item Name</p>
                    <p className="text-sm font-medium text-gray-900">{selectedItem.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Quantity</p>
                    <p className="text-sm font-medium text-gray-900">{selectedItem.quantity}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Range</p>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      selectedItem.range === 'high' ? 'bg-red-100 text-red-800' :
                      selectedItem.range === 'mid' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {selectedItem.range.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Status</p>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      selectedItem.status === 'Approved' ? 'bg-green-100 text-green-800' :
                      selectedItem.status === 'Disapproved' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {selectedItem.status}
                    </span>
                  </div>
                </div>
                
                {selectedItem.purpose && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-500">Purpose</p>
                    <p className="text-sm text-gray-900 mt-1">{selectedItem.purpose}</p>
                  </div>
                )}
                
                {selectedItem.specification && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-500">Specification</p>
                    <p className="text-sm text-gray-900 mt-1">{selectedItem.specification}</p>
                  </div>
                )}
              </div>

              {/* Request Information */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Request Information</h4>
                <div>
                  <p className="text-xs text-gray-500">Request Title</p>
                  <p className="text-sm font-medium text-gray-900">{selectedItem.requestTitle}</p>
                </div>
                <div className="mt-2">
                  <p className="text-xs text-gray-500">Request Date</p>
                  <p className="text-sm text-gray-900">{new Date(selectedItem.requestDate).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Approval Reason */}
              <div className={`rounded-lg p-4 ${
                selectedItem.status === 'Approved' ? 'bg-green-50' :
                selectedItem.status === 'Disapproved' ? 'bg-red-50' :
                'bg-yellow-50'
              }`}>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                  {selectedItem.status === 'Approved' ? 'Approval Reason' :
                   selectedItem.status === 'Disapproved' ? 'Disapproval Reason' :
                   'Review Status'}
                </h4>
                <p className="text-sm text-gray-900">
                  {selectedReason}
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  setShowReasonModal(false);
                  setSelectedItem(null);
                }}
                className="bg-gray-400 hover:bg-gray-500 text-white px-4 sm:px-6 py-2 rounded-lg text-sm sm:text-base font-medium transition-colors duration-200 tap-target"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;