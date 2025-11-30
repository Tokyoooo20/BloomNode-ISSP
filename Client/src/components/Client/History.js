import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { API_ENDPOINTS, getAuthHeaders } from '../../utils/api';

const STATUS_TOKENS = {
  approved: {
    label: 'Approved',
    badge: 'text-emerald-700 bg-emerald-50 ring ring-emerald-100/70',
    description: 'Cleared for implementation'
  },
  submitted: {
    label: 'Submitted',
    badge: 'text-slate-700 bg-slate-100 ring ring-slate-200/80',
    description: 'Awaiting review'
  },
  rejected: {
    label: 'Rejected',
    badge: 'text-rose-700 bg-rose-50 ring ring-rose-100/70',
    description: 'Returned for revision'
  },
  default: {
    label: 'In Progress',
    badge: 'text-amber-700 bg-amber-50 ring ring-amber-100/70',
    description: 'Being prepared'
  }
};

const PRIORITY_TOKENS = {
  high: 'text-rose-700 bg-rose-50 ring ring-rose-100/70',
  medium: 'text-amber-700 bg-amber-50 ring ring-amber-100/70',
  low: 'text-slate-700 bg-slate-100 ring ring-slate-200/70'
};

const formatDate = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

const History = () => {
  const [animateHistory, setAnimateHistory] = useState(false);
  const [selectedYearRange, setSelectedYearRange] = useState('all');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userEmail, setUserEmail] = useState('');
  const [userUnit, setUserUnit] = useState('');
  const [selectedYearGroup, setSelectedYearGroup] = useState(null); // { year, requests }

  // Fetch submitted requests from backend
  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const response = await axios.get(API_ENDPOINTS.requests.list, {
        headers: getAuthHeaders()
      });
      
      // Filter only submitted, approved, or rejected requests
      const submittedRequests = response.data.filter(req => 
        ['submitted', 'approved', 'rejected'].includes(req.status)
      );
      
      console.log('Fetched history requests:', submittedRequests);
      setRequests(submittedRequests);
    } catch (err) {
      console.error('Error fetching history:', err);
      setRequests([]);
      // Only show error for real server issues
      if (err.response && err.response.status >= 500) {
        setError('Server error. Please try again later.');
      } else if (err.message === 'Network Error') {
        setError('Unable to connect to server. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setAnimateHistory(true);
    
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUserEmail(parsedUser?.email || '');
        setUserUnit(parsedUser?.unit || '');
      } catch (parseError) {
        console.error('Error parsing stored user data:', parseError);
        setUserEmail('');
        setUserUnit('');
      }
    } else {
      setUserEmail('');
      setUserUnit('');
    }

    fetchHistory();
  }, []);

  // Filter requests by year range
  const getFilteredRequests = () => {
    if (selectedYearRange === 'all') return requests;
    
    return requests.filter(req => {
      if (!req.year) return false;
      return req.year === selectedYearRange;
    });
  };

  const filteredRequests = getFilteredRequests();
  const totalRequests = filteredRequests.length;

  // Group requests by year cycle
  const groupedRequests = useMemo(() => {
    const groups = {};
    filteredRequests.forEach(request => {
      const year = request.year || 'N/A';
      if (!groups[year]) {
        groups[year] = {
          year,
          requests: [],
          totalItems: 0
        };
      }
      groups[year].requests.push(request);
      groups[year].totalItems += request.items?.length || 0;
    });
    return groups;
  }, [filteredRequests]);

  // Combine all items from all requests in the selected year group
  const allYearGroupItems = useMemo(() => {
    if (!selectedYearGroup) return [];
    const items = [];
    selectedYearGroup.requests.forEach(request => {
      if (request.items && request.items.length > 0) {
        request.items.forEach(item => {
          items.push({
            ...item,
            requestId: request._id,
            requestTitle: request.requestTitle || request.title,
            requestStatus: request.status
          });
        });
      }
    });
    return items;
  }, [selectedYearGroup]);

  const statusSummary = ['submitted', 'approved', 'rejected'].map((statusKey) => {
    const preset = STATUS_TOKENS[statusKey];
    const count = filteredRequests.filter((req) => req.status === statusKey).length;

    return {
      key: statusKey,
      label: preset.label,
      count,
      description: preset.description
    };
  });

  // Get unique year ranges from requests
  const getYearRanges = () => {
    const years = [...new Set(requests.map(req => req.year).filter(Boolean))];
    return years.sort().reverse();
  };

  return (
    <div className={`space-y-6 sm:space-y-8 transition-opacity duration-500 ${animateHistory ? 'opacity-100' : 'opacity-0'} bg-slate-50/70 p-4 sm:p-6 rounded-2xl sm:rounded-[32px] border border-slate-100`}>
      {!selectedYearGroup && (
        <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl shadow-sm overflow-hidden">
          <div className="p-4 sm:p-6 md:p-8 flex flex-col gap-4 sm:gap-6 md:flex-row md:items-center md:justify-between bg-gradient-to-br from-white via-slate-50 to-slate-100">
            <div>
              <h2 className="text-xl sm:text-2xl font-semibold text-slate-900">ISSP History</h2>
            </div>
            <div className="flex flex-col gap-2 w-full md:w-auto md:items-end">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Year Range</label>
              <select
                value={selectedYearRange}
                onChange={(e) => setSelectedYearRange(e.target.value)}
                className="input-responsive tap-target px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400/80"
              >
                <option value="all">All Years</option>
                {getYearRanges().map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="border-t border-gray-200 bg-white px-4 sm:px-6 py-4 sm:py-5 md:px-8">
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-gray-400">
                <p className="text-sm text-gray-600 font-medium">Total Requests</p>
                <h3 className="text-2xl font-semibold text-gray-900 mt-1">
                  {totalRequests}
                </h3>
              </div>
              {statusSummary.map((summary) => (
                <div key={summary.key} className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-gray-400">
                  <p className="text-sm text-gray-600 font-medium">{summary.label}</p>
                  <h3 className="text-2xl font-semibold text-gray-900 mt-1">
                    {summary.count}
                  </h3>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl shadow-sm p-4 sm:p-6 md:p-8">
        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-slate-600"></div>
            <p className="text-slate-600 mt-4 text-sm">Preparing your request history…</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-2xl mb-6">
            {error}
          </div>
        )}

        {/* Year Group Details View */}
        {selectedYearGroup ? (
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
                <h3 className="text-2xl font-bold text-gray-900">Request History - {selectedYearGroup.year}</h3>
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

            {/* All Requests Table */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-semibold text-gray-900">All Requests</h4>
                  <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full font-medium">
                    {selectedYearGroup.requests.length} {selectedYearGroup.requests.length === 1 ? 'request' : 'requests'}
                  </span>
                </div>
              </div>
              <div className="overflow-x-auto">
                {selectedYearGroup.requests.length > 0 ? (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Priority</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Description</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Date Submitted</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Items</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Submitted By</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedYearGroup.requests.map((request) => {
                        const badgeStyles = STATUS_TOKENS[request.status]?.badge || STATUS_TOKENS.default.badge;
                        const priorityStyles = PRIORITY_TOKENS[request.priority] || PRIORITY_TOKENS.low;

                        return (
                          <tr key={request._id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${badgeStyles}`}>
                                {request.status.replace('-', ' ').toUpperCase()}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${priorityStyles}`}>
                                {request.priority?.toUpperCase() || 'N/A'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm text-gray-900 max-w-xs break-words">
                                {request.description || <span className="text-gray-400">No description provided.</span>}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                              <div className="text-sm text-gray-900">{formatDate(request.createdAt)}</div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                              <div className="text-sm text-gray-900">{request.items ? request.items.length : 0} item{request.items?.length !== 1 ? 's' : ''}</div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm text-gray-900">
                                {request.submittedByEmail || request.user?.email || request.userId?.email || userEmail || 'Unknown user'}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No requests in this year group</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Request Cards - Grouped by Year */
          !loading && !error && (
            <div className="space-y-4">
              {totalRequests === 0 ? (
                <div className="text-center py-16 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60">
                  <div className="text-slate-400">
                    <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 12h6m-6 4h6m3 5H6a3 3 0 01-3-3V6a3 3 0 013-3h6.586a1 1 0 01.707.293l6.414 6.414a1 1 0 01.293.707V18a3 3 0 01-3 3z"
                      />
                    </svg>
                    <p className="text-lg font-medium text-slate-600">No request history yet</p>
                    <p className="text-sm text-slate-400 mt-1">New submissions will appear here automatically.</p>
                  </div>
                </div>
              ) : (
                Object.entries(groupedRequests).map(([year, group]) => {
                  // Determine overall status for the group
                  const hasApproved = group.requests.some(r => r.status === 'approved');
                  const hasRejected = group.requests.some(r => r.status === 'rejected');
                  const hasSubmitted = group.requests.some(r => r.status === 'submitted');
                  
                  let overallStatus = 'submitted';
                  if (hasApproved && !hasRejected) overallStatus = 'approved';
                  else if (hasRejected) overallStatus = 'rejected';
                  else if (hasSubmitted) overallStatus = 'submitted';

                  const statusBadge = STATUS_TOKENS[overallStatus]?.badge || STATUS_TOKENS.default.badge;

                  return (
                    <div key={year} className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h2 className="text-lg font-bold text-gray-900 mb-3">
                            {year}
                          </h2>
                          <div className="space-y-1.5">
                            <div className="text-sm text-gray-700">
                              <span className="font-medium">Requests:</span> {group.requests.length} request{group.requests.length !== 1 ? 's' : ''}
                            </div>
                            <div className="text-sm text-gray-700">
                              <span className="font-medium">Total Items:</span> {group.totalItems} item{group.totalItems !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>
                        <div className="ml-4 flex-shrink-0">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${statusBadge}`}>
                            {overallStatus.toUpperCase()}
                          </span>
                        </div>
                      </div>

                      {/* Requests Summary - Single line with unit name */}
                      <div className="border-t border-gray-200 pt-4">
                        {(() => {
                          // Get unit name from first request (all should be same unit for same user)
                          const firstRequest = group.requests[0];
                          // Check if userId is populated (object) or just an ID (string)
                          let unitName = 'N/A';
                          if (firstRequest?.userId && typeof firstRequest.userId === 'object' && firstRequest.userId.unit) {
                            unitName = firstRequest.userId.unit;
                          } else if (userUnit) {
                            unitName = userUnit;
                          } else if (firstRequest?.requestTitle) {
                            unitName = firstRequest.requestTitle;
                          }
                          
                          return (
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <span className="font-semibold text-gray-900 text-base">
                                  {unitName}
                                </span>
                              </div>
                              <div className="text-sm font-medium text-gray-700">
                                {group.totalItems} item{group.totalItems !== 1 ? 's' : ''}
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      <div className="flex justify-end pt-4 border-t border-gray-200 mt-4">
                        <button
                          onClick={() => {
                            setSelectedYearGroup({ year, requests: group.requests });
                          }}
                          className="px-4 py-2 bg-gray-400 hover:bg-gray-500 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default History;
