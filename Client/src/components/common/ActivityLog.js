import React, { useEffect, useState, useCallback, useRef } from 'react';
import axios from 'axios';
import { API_ENDPOINTS, getAuthHeaders } from '../../utils/api';

const actionColors = {
  request_created: 'bg-blue-50 text-blue-700',
  request_updated: 'bg-amber-50 text-amber-700',
  request_deleted: 'bg-red-50 text-red-700',
  request_item_reviewed: 'bg-purple-50 text-purple-700',
  request_status_changed: 'bg-green-50 text-green-700',
  request_review_completed: 'bg-indigo-50 text-indigo-700',
  issp_submitted_for_review: 'bg-blue-50 text-blue-700',
  issp_review_decision: 'bg-green-50 text-green-700',
  request_item_added: 'bg-slate-50 text-slate-700',
  request_item_removed: 'bg-rose-50 text-rose-700',
  request_item_updated: 'bg-amber-50 text-amber-700',
  account_verified: 'bg-green-50 text-green-700',
  account_rejected: 'bg-red-50 text-red-700',
  account_suspended: 'bg-orange-50 text-orange-700',
  account_role_changed: 'bg-purple-50 text-purple-700',
  account_unit_updated: 'bg-slate-50 text-slate-700',
  account_removed: 'bg-gray-50 text-gray-700',
  issp_section_updated: 'bg-indigo-50 text-indigo-700',
  issp_field_removed: 'bg-rose-50 text-rose-700'
};

const timeAgo = (input) => {
  if (!input) return 'just now';
  const now = Date.now();
  const then = new Date(input).getTime();
  const diff = Math.max(0, now - then);

  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return new Date(input).toLocaleString();
};

const formatMetadataValue = (value) => {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
};

const ActivityLog = ({ limit = 30, title = 'System Activity Log', filterByRole = null, filterByCurrentUser = false }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);
  const lastLogIdRef = useRef(null);

  // Fetch current user ID if filtering by current user
  useEffect(() => {
    if (filterByCurrentUser) {
      const fetchCurrentUser = async () => {
        try {
          const response = await axios.get(API_ENDPOINTS.auth.me, {
            headers: getAuthHeaders()
          });
          setCurrentUserId(response.data._id || response.data.id);
        } catch (err) {
          console.error('Error fetching current user:', err);
        }
      };
      fetchCurrentUser();
    }
  }, [filterByCurrentUser]);

  const fetchLogs = useCallback(async (checkForNew = false) => {
    try {
      if (!checkForNew) {
        setLoading(true);
      }
      setError(null);
      const params = { limit };
      // Add role filter if specified
      if (filterByRole) {
        params.actorRole = filterByRole;
      }
      const response = await axios.get(API_ENDPOINTS.logs.list, {
        headers: getAuthHeaders(),
        params
      });
      let newLogs = response.data?.logs || [];
      
      // Filter by current user ID if specified
      if (filterByCurrentUser && currentUserId) {
        newLogs = newLogs.filter(log => {
          const actorId = log.actor?.id;
          // Handle both string and ObjectId comparison
          return actorId && (
            actorId.toString() === currentUserId.toString() ||
            actorId === currentUserId
          );
        });
      }
      
      if (checkForNew && lastLogIdRef.current) {
        // Check if there are new logs (compare first log ID with last known ID)
        const firstLogId = newLogs.length > 0 ? newLogs[0]._id?.toString() : null;
        
        if (firstLogId && firstLogId !== lastLogIdRef.current) {
          // Only update if there are actually new logs
          setLogs(newLogs);
          lastLogIdRef.current = firstLogId;
        }
      } else {
        // Initial load
        setLogs(newLogs);
        if (newLogs.length > 0) {
          lastLogIdRef.current = newLogs[0]._id?.toString();
        }
      }
    } catch (err) {
      console.error('Error loading logs:', err);
      setError(err.response?.data?.message || 'Failed to load logs');
    } finally {
      if (!checkForNew) {
        setLoading(false);
      }
    }
  }, [limit, filterByRole, filterByCurrentUser, currentUserId]);

  useEffect(() => {
    // If filtering by current user, wait for user ID to be fetched
    if (filterByCurrentUser && !currentUserId) {
      return; // Don't fetch logs yet, wait for user ID
    }
    
    fetchLogs(false); // Initial load
    
    // Poll for new logs every 15 seconds, but only update if there are new ones
    const interval = setInterval(() => {
      fetchLogs(true); // Check for new logs
    }, 15000);
    
    return () => clearInterval(interval);
  }, [fetchLogs, filterByCurrentUser, currentUserId]);

  const filteredLogs = logs.filter((log) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      log.description?.toLowerCase().includes(query) ||
      log.action?.toLowerCase().includes(query) ||
      log.actor?.email?.toLowerCase().includes(query) ||
      log.actor?.name?.toLowerCase().includes(query) ||
      log.actor?.role?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{title}</h2>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-3 sm:space-y-4 max-h-[70vh] overflow-y-auto pr-1 scroll-smooth-mobile">
        {loading && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-xs sm:text-sm text-gray-600">
            Loading recent activity…
          </div>
        )}

        {!loading && logs.length === 0 && (
          <div className="rounded-lg border border-dashed border-gray-300 px-4 sm:px-6 py-6 sm:py-8 text-center text-gray-500">
            <svg className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs sm:text-sm">No activity recorded yet.</p>
          </div>
        )}

        {!loading && logs.length > 0 && filteredLogs.length === 0 && (
          <div className="rounded-lg border border-dashed border-gray-300 px-4 sm:px-6 py-6 sm:py-8 text-center text-gray-500">
            <svg className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <p className="text-xs sm:text-sm">No logs found matching your search.</p>
          </div>
        )}

        {filteredLogs.map((log) => (
          <div key={log._id} className="border border-gray-200 rounded-lg sm:rounded-xl p-3 sm:p-4 hover:shadow-sm transition-shadow bg-white">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
              <div className="flex items-start space-x-2 sm:space-x-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-50 text-gray-600 flex items-center justify-center font-semibold uppercase text-xs sm:text-sm flex-shrink-0">
                  {(log.actor?.name || log.actor?.email || 'U').charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-gray-900 font-semibold break-words">{log.description}</p>
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs text-gray-500 mt-1">
                    {log.actor?.email && <span className="truncate max-w-[150px] sm:max-w-none">{log.actor.email}</span>}
                    {log.actor?.role && (
                      <span className="inline-flex items-center px-2 py-0.5 bg-gray-100 rounded-full">
                        {log.actor.role}
                      </span>
                    )}
                    <span>{timeAgo(log.createdAt)}</span>
                  </div>
                </div>
              </div>
              <span className={`inline-flex items-center px-2 sm:px-3 py-1 text-xs font-medium rounded-full flex-shrink-0 ${actionColors[log.action] || 'bg-gray-50 text-gray-700'}`}>
                {log.action.replace(/_/g, ' ')}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActivityLog;

