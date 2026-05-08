import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { API_ENDPOINTS, getAuthHeaders } from '../../utils/api';

/**
 * Unit-level ISSP submission list for the selected academic year cycle.
 * Dashboard passes `officeStats` / `officeStatsLoading` so data matches the top summary KPIs.
 */
export default function IsspRequestTracking({
  yearCycle,
  refreshKey = 0,
  officeStats: officeStatsFromParent,
  officeStatsLoading: officeStatsLoadingFromParent,
  hideTitle = false,
  /** When true, flat inner styling for embedding inside a dashboard card (no extra gradient frame). */
  embedded = false
}) {
  const [officeStats, setOfficeStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const isControlled = officeStatsFromParent !== undefined;

  useEffect(() => {
    if (isControlled) {
      return undefined;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const params = {};
        if (yearCycle && String(yearCycle).trim()) {
          params.yearCycle = String(yearCycle).trim();
        }
        const response = await axios.get(API_ENDPOINTS.admin.officeStats, {
          headers: getAuthHeaders(),
          params
        });
        if (!cancelled) {
          setOfficeStats(response.data);
        }
      } catch (err) {
        console.error('Error fetching office stats (ISSP tracking):', err);
        if (!cancelled) {
          setOfficeStats(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [yearCycle, refreshKey, isControlled]);

  const effectiveOfficeStats = isControlled ? officeStatsFromParent : officeStats;
  const effectiveLoading = isControlled
    ? Boolean(officeStatsLoadingFromParent)
    : loading;

  const sortedTrackingUnits = useMemo(() => {
    const units = effectiveOfficeStats?.unitTracking?.units;
    if (!Array.isArray(units) || units.length === 0) {
      return [];
    }
    const statusRank = (u) => {
      const s = String(u?.status || '').toLowerCase();
      if (s === 'submitted') return 0;
      if (s === 'resubmitted') return 1;
      if (s === 'pending') return 2;
      if (s === 'rejected') return 3;
      if (s === 'approved') return 4;
      return 5;
    };
    return [...units].sort((a, b) => {
      if (Boolean(a.hasSubmitted) !== Boolean(b.hasSubmitted)) {
        return a.hasSubmitted ? -1 : 1;
      }
      if (a.hasSubmitted && b.hasSubmitted) {
        const ra = statusRank(a);
        const rb = statusRank(b);
        if (ra !== rb) return ra - rb;
      }
      return (a.unit || '').localeCompare(b.unit || '', undefined, { sensitivity: 'base' });
    });
  }, [effectiveOfficeStats]);

  const shellClass = embedded
    ? 'rounded-lg border border-gray-200 bg-slate-50/70 p-3 sm:p-4 flex flex-col flex-1 min-h-[180px]'
    : 'bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-lg p-4 sm:p-6 h-full';

  if (effectiveLoading && !effectiveOfficeStats) {
    return (
      <div
        className={
          embedded
            ? 'rounded-lg border border-gray-200 bg-slate-50/70 min-h-[180px] flex items-center justify-center p-4'
            : 'bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-lg p-4 sm:p-6 min-h-[200px] flex items-center justify-center'
        }
      >
        <p className="text-sm text-gray-500">Loading tracking…</p>
      </div>
    );
  }

  return (
    <div className={`${shellClass}`}>
      {!hideTitle && (
        <div className="mb-3 sm:mb-4">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">ISSP Request Tracking</h3>
        </div>
      )}
      <div className="space-y-4">
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {sortedTrackingUnits.length > 0 ? (
            sortedTrackingUnits.map((unitData, index) => {
              const hasSubmitted = unitData.hasSubmitted;

              const getStatusBadge = () => {
                if (!hasSubmitted) {
                  return { color: 'bg-red-100 text-red-700', text: 'No Request' };
                }

                switch (unitData.status) {
                  case 'pending':
                    return { color: 'bg-yellow-100 text-yellow-700', text: 'Pending' };
                  case 'submitted':
                    return { color: 'bg-blue-100 text-blue-700', text: 'Submitted' };
                  case 'resubmitted':
                    return { color: 'bg-indigo-100 text-indigo-800', text: 'Resubmitted' };
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
                <div
                  key={`${unitData.unit || 'unit'}-${index}`}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div
                      className={`w-3 h-3 rounded-full flex-shrink-0 ${hasSubmitted ? 'bg-gray-600' : 'bg-gray-400'}`}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-gray-800 font-medium block truncate">{unitData.unit}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${statusBadge.color}`}>
                      {statusBadge.text}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-4 text-gray-500">
              <svg className="w-8 h-8 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
              <p className="text-sm font-medium">No units registered</p>
              <p className="text-xs text-gray-400 mt-1">Units will appear here once users are registered</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
