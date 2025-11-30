import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import Modal from '../common/Modal';
import { API_ENDPOINTS, getAuthHeaders } from '../../utils/api';

const statusStyles = {
  draft: 'bg-gray-100 text-gray-700 border border-gray-200',
  pending: 'bg-blue-100 text-blue-700 border border-blue-200',
  approved: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  rejected: 'bg-red-100 text-red-700 border border-red-200',
};

const formatStatusLabel = (status = '') =>
  status.replace(/[-_]/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()) || 'Unknown';

const formatDateTime = (value) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch (error) {
    return '—';
  }
};

const PresISSP = () => {
  const [issps, setIssps] = useState([]);
  const [selectedIsspId, setSelectedIsspId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [decisionNotes, setDecisionNotes] = useState('');
  const [isDeciding, setIsDeciding] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [modalState, setModalState] = useState({
    isOpen: false,
    variant: 'default',
    title: '',
    message: '',
    confirmLabel: 'Close',
    cancelLabel: null,
    onConfirm: null,
    onClose: null
  });
  const [showUnitRequestsModal, setShowUnitRequestsModal] = useState(false);
  const [unitRequests, setUnitRequests] = useState([]);
  const [loadingUnitRequests, setLoadingUnitRequests] = useState(false);

  const showModal = useCallback((config) => {
    setModalState({
      isOpen: true,
      variant: 'default',
      title: '',
      message: '',
      confirmLabel: 'Close',
      cancelLabel: null,
      onConfirm: null,
      onClose: null,
      ...config
    });
  }, []);

  const closeModal = useCallback(() => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const fetchIssps = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required. Please sign in again.');
      }

      const response = await axios.get(API_ENDPOINTS.issp.reviewList, {
        headers: getAuthHeaders(),
      });

      const list = Array.isArray(response.data) ? response.data : [];
      setIssps(list);
      setSelectedIsspId((prev) =>
        prev && list.some((entry) => entry._id === prev) ? prev : null
      );
    } catch (err) {
      console.error('Error loading ISSP submissions:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load ISSP submissions.');
      setIssps([]);
      setSelectedIsspId(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIssps();
  }, [fetchIssps]);

  const selectedIssp = useMemo(
    () => issps.find((entry) => entry._id === selectedIsspId) || null,
    [issps, selectedIsspId]
  );

  useEffect(() => {
    if (!selectedIssp) {
      setDecisionNotes('');
      return;
    }

    if (selectedIssp.review?.status === 'pending') {
      setDecisionNotes('');
    } else {
      setDecisionNotes(selectedIssp.review?.decisionNotes || '');
    }
  }, [selectedIssp]);

  const handleSelectIssp = (isspId) => {
    setSelectedIsspId(isspId);
  };

  const handleBackToList = () => {
    setSelectedIsspId(null);
    setDecisionNotes('');
  };

  const fetchUnitRequests = useCallback(async (unitName) => {
    try {
      setLoadingUnitRequests(true);
      const token = localStorage.getItem('token');
      if (!token) {
        return;
      }

      const response = await axios.get(API_ENDPOINTS.admin.requestsByUnit(unitName), {
        headers: getAuthHeaders()
      });
      
      setUnitRequests(response.data.requests || []);
      setShowUnitRequestsModal(true);
    } catch (error) {
      console.error('Error fetching unit requests:', error);
    } finally {
      setLoadingUnitRequests(false);
    }
  }, []);

  const handleDownloadPdf = async (issp) => {
    if (!issp) return;

    const unitName =
      typeof issp.userId === 'object' && issp.userId !== null
        ? issp.userId.unit || issp.userId.username || 'issp'
        : 'issp';

    // Show confirmation modal first
    showModal({
      variant: 'confirm',
      title: 'Generate ISSP Report',
      message: `Are you sure you want to generate and download the ISSP report for ${unitName}?`,
      confirmLabel: 'Generate',
      cancelLabel: 'Cancel',
      onConfirm: async () => {
        closeModal();
        await performDownload(issp);
      },
      onClose: closeModal
    });
  };

  const performDownload = async (issp) => {
    if (!issp) return;

    const userId =
      typeof issp.userId === 'object' && issp.userId !== null ? issp.userId._id : issp.userId;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showModal({
          variant: 'danger',
          title: 'Authentication Required',
          message: 'Please sign in again to continue.',
          onConfirm: closeModal
        });
        return;
      }

      setDownloadingId(issp._id);

      const response = await axios.get(API_ENDPOINTS.issp.generate, {
        headers: getAuthHeaders(),
        params: { userId },
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const unitName =
        typeof issp.userId === 'object' && issp.userId !== null
          ? issp.userId.unit || issp.userId.username || 'issp'
          : 'issp';

      link.href = url;
      link.setAttribute('download', `ISSP-${unitName}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      showModal({
        variant: 'success',
        title: 'Download Started',
        message: `ISSP report for ${unitName} has been downloaded successfully.`,
        onConfirm: closeModal
      });
    } catch (err) {
      console.error('Error downloading ISSP PDF:', err);
      showModal({
        variant: 'danger',
        title: 'Download Failed',
        message: err.response?.data?.message || err.message || 'Failed to download ISSP PDF.',
        onConfirm: closeModal
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDecision = (decision) => {
    if (!selectedIssp || isDeciding) {
      return;
    }

    const unitName =
      typeof selectedIssp.userId === 'object' && selectedIssp.userId !== null
        ? selectedIssp.userId.unit || selectedIssp.userId.username || 'this unit'
        : 'this unit';

    // Show confirmation modal first
    showModal({
      variant: decision === 'approved' ? 'confirm' : 'danger',
      title: decision === 'approved' ? 'Approve ISSP' : 'Reject ISSP',
      message: decision === 'approved'
        ? `Are you sure you want to approve the ISSP submission from ${unitName}?`
        : `Are you sure you want to reject the ISSP submission from ${unitName}? ${decisionNotes.trim() ? '' : 'Please note that rejection notes are required.'}`,
      confirmLabel: decision === 'approved' ? 'Approve' : 'Reject',
      cancelLabel: 'Cancel',
      onConfirm: async () => {
        closeModal();
        await performDecision(decision);
      },
      onClose: closeModal
    });
  };

  const performDecision = async (decision) => {
    if (!selectedIssp || isDeciding) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showModal({
          variant: 'danger',
          title: 'Authentication Required',
          message: 'Please sign in again to continue.',
          onConfirm: closeModal
        });
        return;
      }

      setIsDeciding(true);

      await axios.post(
        API_ENDPOINTS.issp.reviewDecision,
        {
          isspId: selectedIssp._id,
          status: decision,
          notes: decisionNotes.trim(),
        },
        {
          headers: getAuthHeaders(),
        }
      );

      await fetchIssps();
      setSelectedIsspId(null);
      setDecisionNotes('');
      
      showModal({
        variant: 'success',
        title: decision === 'approved' ? 'ISSP Approved' : 'ISSP Rejected',
        message: `ISSP has been ${decision === 'approved' ? 'approved' : 'rejected'} successfully.`,
        onConfirm: closeModal
      });
    } catch (err) {
      console.error('Error recording ISSP decision:', err);
      showModal({
        variant: 'danger',
        title: 'Decision Failed',
        message: err.response?.data?.message || err.message || 'Failed to record ISSP decision.',
        onConfirm: closeModal
      });
    } finally {
      setIsDeciding(false);
    }
  };

  const renderStatusBadge = (status) => {
    const classes = statusStyles[status] || statusStyles.draft;
    return (
      <span className={`text-xs font-semibold px-3 py-1 rounded-full ${classes}`}>
        {formatStatusLabel(status)}
      </span>
    );
  };

  const renderListView = () => (
    <div className="space-y-3">
      {issps.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-lg p-6 text-sm text-gray-500 text-center">
          No ISSP submissions are waiting for review at the moment.
        </div>
      ) : (
        issps.map((issp) => {
          const id = issp._id;
          const unitName =
            typeof issp.userId === 'object' && issp.userId !== null
              ? issp.userId.unit || issp.userId.username || 'Unnamed unit'
              : 'Unnamed unit';
          const submittedBy =
            typeof issp.userId === 'object' && issp.userId !== null
              ? issp.userId.username || issp.userId.email || 'Administrator'
              : 'Administrator';
          const submittedByEmail =
            typeof issp.userId === 'object' && issp.userId !== null
              ? issp.userId.email || 'N/A'
              : 'N/A';
          const status = issp.review?.status || 'draft';

          return (
            <button
              key={id}
              onClick={() => handleSelectIssp(id)}
              className={`w-full text-left p-4 border rounded-lg transition-all duration-200 ${
                id === selectedIsspId
                  ? 'border-purple-400 bg-purple-50 shadow-sm'
                  : 'border-gray-200 bg-white hover:border-purple-200 hover:shadow-sm'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h4 className="text-sm font-semibold text-gray-900">{unitName}</h4>
                    {renderStatusBadge(status)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    <span>Prepared by: {submittedBy}</span>
                    <span className="mx-1">•</span>
                    <span className="text-blue-600">{submittedByEmail}</span>
                  </div>
                  {status !== 'pending' && issp.review?.decidedAt && (
                    <p className="text-xs text-gray-500 mt-1">
                      Decision on {formatDateTime(issp.review.decidedAt)}
                    </p>
                  )}
                </div>
                <div className="ml-4 flex-shrink-0">
                  <span className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-gray-700 rounded-md hover:bg-gray-800 transition-colors cursor-pointer">
                    View
                  </span>
                </div>
              </div>
            </button>
          );
        })
      )}
    </div>
  );

  const renderDetailView = () => {
    if (!selectedIssp) {
      return (
        <div className="bg-white border border-dashed border-gray-300 rounded-lg p-6 text-sm text-gray-500 text-center">
          Select an ISSP on the left to view its details.
        </div>
      );
    }

    const unitName =
      typeof selectedIssp.userId === 'object' && selectedIssp.userId !== null
        ? selectedIssp.userId.unit || selectedIssp.userId.username || 'Unnamed unit'
        : 'Unnamed unit';
    const submittedBy =
      typeof selectedIssp.userId === 'object' && selectedIssp.userId !== null
        ? selectedIssp.userId.username || selectedIssp.userId.email || 'Administrator'
        : 'Administrator';
    const submittedByEmail =
      typeof selectedIssp.userId === 'object' && selectedIssp.userId !== null
        ? selectedIssp.userId.email || 'N/A'
        : 'N/A';
    const reviewStatus = selectedIssp.review?.status || 'draft';
    const isPending = reviewStatus === 'pending';

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={handleBackToList} className="text-gray-600 hover:text-gray-900">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">{unitName}</h3>
              <p className="text-xs text-gray-500">
                Submitted on {formatDateTime(selectedIssp.review?.submittedAt)}
              </p>
            </div>
          </div>
          {renderStatusBadge(reviewStatus)}
        </div>

        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="text-lg font-semibold text-gray-900">Submission Overview</h4>
              <div className="text-sm text-gray-500">
                <span>Prepared by: {submittedBy}</span>
                <span className="mx-2">•</span>
                <span className="text-blue-600">{submittedByEmail}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchUnitRequests(unitName)}
                disabled={loadingUnitRequests}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 flex items-center gap-2 ${
                  loadingUnitRequests
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-gray-700 text-white hover:bg-gray-800'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>{loadingUnitRequests ? 'Loading…' : 'View Item Statuses'}</span>
              </button>
              <button
                onClick={() => handleDownloadPdf(selectedIssp)}
                disabled={downloadingId === selectedIssp._id}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 flex items-center gap-2 ${
                  downloadingId === selectedIssp._id
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-gray-700 text-white hover:bg-gray-800'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" />
                </svg>
                <span>{downloadingId === selectedIssp._id ? 'Preparing…' : 'Download Generated PDF'}</span>
              </button>
            </div>
          </div>

          <div className="px-6 py-4 space-y-3 text-sm text-gray-700">
            <div className="flex flex-wrap gap-6">
              <div>
                <span className="font-medium text-gray-600 block">Submission status</span>
                <span>{formatStatusLabel(reviewStatus)}</span>
              </div>
              <div>
                <span className="font-medium text-gray-600 block">Submitted on</span>
                <span>{formatDateTime(selectedIssp.review?.submittedAt)}</span>
              </div>
              {selectedIssp.review?.decidedAt && (
                <div>
                  <span className="font-medium text-gray-600 block">Decision date</span>
                  <span>{formatDateTime(selectedIssp.review?.decidedAt)}</span>
                </div>
              )}
            </div>

            {selectedIssp.review?.decisionNotes && reviewStatus !== 'pending' && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-700">
                <span className="font-medium text-gray-600">Archived notes:</span>{' '}
                {selectedIssp.review.decisionNotes}
              </div>
            )}
          </div>
        </div>

        {isPending ? (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 space-y-4">
            <div>
              <h4 className="text-lg font-semibold text-gray-900">Review and Decision</h4>
              <p className="text-sm text-gray-500">
                Provide any notes for the administrator. Notes are optional when approving, but required when rejecting.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes to administrator</label>
              <textarea
                value={decisionNotes}
                onChange={(event) => setDecisionNotes(event.target.value)}
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 text-sm"
                placeholder="Share the basis for your decision (required when rejecting)."
              />
            </div>
            <div className="flex flex-wrap justify-end gap-3">
              <button
                onClick={() => handleDecision('rejected')}
                disabled={isDeciding || decisionNotes.trim().length === 0}
                className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
                  isDeciding || decisionNotes.trim().length === 0
                    ? 'bg-red-200 text-red-600 cursor-not-allowed'
                    : 'bg-red-500 text-white hover:bg-red-600'
                }`}
              >
                {isDeciding ? 'Submitting…' : 'Reject ISSP'}
              </button>
              <button
                onClick={() => handleDecision('approved')}
                disabled={isDeciding}
                className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
                  isDeciding
                    ? 'bg-emerald-200 text-emerald-600 cursor-not-allowed'
                    : 'bg-emerald-500 text-white hover:bg-emerald-600'
                }`}
              >
                {isDeciding ? 'Submitting…' : 'Approve ISSP'}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-2">Decision Summary</h4>
            <p className="text-sm text-gray-600">
              This submission was {formatStatusLabel(reviewStatus).toLowerCase()} on{' '}
              {formatDateTime(selectedIssp.review?.decidedAt)}.
            </p>
            {selectedIssp.review?.decisionNotes && (
              <p className="mt-3 text-sm text-gray-700">
                <span className="font-medium text-gray-700">Notes:</span> {selectedIssp.review.decisionNotes}
              </p>
            )}
          </div>
        )}
      </div>
    );
  };

  const handleModalConfirm = useCallback(async () => {
    if (typeof modalState.onConfirm === 'function') {
      await modalState.onConfirm();
    }
    closeModal();
  }, [modalState.onConfirm, closeModal]);

  const handleModalClose = useCallback(() => {
    if (typeof modalState.onClose === 'function') {
      modalState.onClose();
    }
    closeModal();
  }, [modalState.onClose, closeModal]);

  return (
    <>
      <Modal
        isOpen={modalState.isOpen}
        variant={modalState.variant}
        title={modalState.title}
        message={modalState.message}
        confirmLabel={modalState.confirmLabel}
        cancelLabel={modalState.cancelLabel}
        onClose={handleModalClose}
        onConfirm={modalState.onConfirm ? handleModalConfirm : undefined}
      />
      
      <div className="space-y-6">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500" />
          </div>
        ) : selectedIsspId && selectedIssp ? (
          renderDetailView()
        ) : (
          renderListView()
        )}
      </div>

      {/* Unit Requests Modal with Item Statuses */}
      {showUnitRequestsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-4xl w-full shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 mb-4 sm:mb-6">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Unit Requests - Item Statuses</h3>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">View approved items and their current status</p>
              </div>
              <button
                onClick={() => {
                  setShowUnitRequestsModal(false);
                  setUnitRequests([]);
                }}
                className="text-gray-400 hover:text-gray-600 tap-target flex-shrink-0"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {unitRequests.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No approved requests found for this unit.</p>
                </div>
              ) : (
                unitRequests.map((request) => (
                  <div key={request._id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="mb-4">
                      <h4 className="text-base font-semibold text-gray-900">{request.requestTitle || 'Untitled Request'}</h4>
                      <p className="text-xs text-gray-600 mt-1">Year: {request.year}</p>
                    </div>
                    
                    <div className="space-y-3">
                      {request.items && request.items.length > 0 ? (
                        request.items
                          .filter(item => item.approvalStatus === 'approved')
                          .map((item, index) => (
                            <div key={item.id || index} className="bg-white border border-gray-200 rounded-lg p-3">
                              <div className="flex flex-wrap items-center gap-2 mb-2">
                                <h5 className="text-sm font-medium text-gray-900">{item.item}</h5>
                                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-50 text-green-700">
                                  APPROVED
                                </span>
                                {item.itemStatus && (
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
                                )}
                              </div>
                              
                              {item.itemStatus && (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-medium text-blue-900">Item Status:</span>
                                    {item.itemStatusUpdatedAt && (
                                      <span className="text-xs text-blue-600">
                                        Updated: {new Date(item.itemStatusUpdatedAt).toLocaleDateString()}
                                      </span>
                                    )}
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-sm font-medium text-blue-800">
                                      {item.itemStatus === 'pr_created' ? 'Purchase Request (PR) Created' :
                                       item.itemStatus === 'purchased' ? 'Item Purchased' :
                                       item.itemStatus === 'received' ? 'Item Received' :
                                       item.itemStatus === 'in_transit' ? 'Item In Transit' :
                                       item.itemStatus === 'completed' ? 'Item Completed' :
                                       item.itemStatus}
                                    </p>
                                    {item.itemStatusRemarks && (
                                      <p className="text-xs text-blue-700 mt-1">
                                        <span className="font-medium">Remarks:</span> {item.itemStatusRemarks}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )}
                              
                              <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-gray-600">
                                <div>
                                  <span className="font-medium">Quantity:</span> {item.quantity}
                                </div>
                                {item.price > 0 && (
                                  <div>
                                    <span className="font-medium">Price:</span> {item.price.toLocaleString()}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))
                      ) : (
                        <p className="text-sm text-gray-500">No approved items in this request.</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PresISSP;