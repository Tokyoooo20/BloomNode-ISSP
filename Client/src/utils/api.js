// Centralized API configuration
// This file manages all API endpoints and base URL

const API_BASE_URL = (process.env.REACT_APP_API_URL || 'http://localhost:5000').replace(/\/$/, '');

// API endpoint helpers
export const API_ENDPOINTS = {
  // Auth endpoints
  auth: {
    login: `${API_BASE_URL}/api/auth/login`,
    signup: `${API_BASE_URL}/api/auth/signup`,
    verifyEmail: `${API_BASE_URL}/api/auth/verify-email`,
    resendVerification: `${API_BASE_URL}/api/auth/resend-verification`,
    forgotPassword: `${API_BASE_URL}/api/auth/forgot-password`,
    verifyResetToken: `${API_BASE_URL}/api/auth/verify-reset-token`,
    resetPassword: `${API_BASE_URL}/api/auth/reset-password`,
    me: `${API_BASE_URL}/api/auth/me`,
    profile: `${API_BASE_URL}/api/auth/profile`,
    changeEmail: `${API_BASE_URL}/api/auth/change-email`,
    changePassword: `${API_BASE_URL}/api/auth/change-password`,
    pendingUsers: `${API_BASE_URL}/api/auth/pending-users`,
    updateUser: (userId) => `${API_BASE_URL}/api/auth/update-user/${userId}`,
    approveUser: (userId) => `${API_BASE_URL}/api/auth/approve-user/${userId}`,
    rejectUser: (userId) => `${API_BASE_URL}/api/auth/reject-user/${userId}`,
    suspendUser: (userId) => `${API_BASE_URL}/api/auth/suspend-user/${userId}`,
    deleteUser: (userId) => `${API_BASE_URL}/api/auth/delete-user/${userId}`,
  },
  
  // Request endpoints
  requests: {
    list: `${API_BASE_URL}/api/requests`,
    get: (requestId) => `${API_BASE_URL}/api/requests/${requestId}`,
    submit: (requestId) => `${API_BASE_URL}/api/requests/${requestId}`,
    resubmitRevision: (requestId) => `${API_BASE_URL}/api/requests/${requestId}/resubmit-revision`,
    updateItemStatus: (requestId, itemId) => `${API_BASE_URL}/api/requests/${requestId}/items/${itemId}/status`,
    updateItemPrice: (requestId, itemId) => `${API_BASE_URL}/api/requests/${requestId}/items/${itemId}/price`,
    updateItemQuantity: (requestId, itemId) => `${API_BASE_URL}/api/requests/${requestId}/items/${itemId}/quantity`,
    updateItemSpecification: (requestId, itemId) => `${API_BASE_URL}/api/requests/${requestId}/items/${itemId}/specification`,
    inventoryItems: `${API_BASE_URL}/api/requests/inventory/items`,
  },
  
  // Admin endpoints
  admin: {
    dashboardStats: `${API_BASE_URL}/api/admin/dashboard/stats`,
    submittedRequests: `${API_BASE_URL}/api/admin/submitted-requests`,
    requestsByUnit: (unitName) => `${API_BASE_URL}/api/admin/requests/unit/${encodeURIComponent(unitName)}`,
    requestReview: (requestId, itemId) => `${API_BASE_URL}/api/admin/requests/${requestId}/items/${itemId}/review`,
    completeReview: (requestId) => `${API_BASE_URL}/api/admin/requests/${requestId}/complete-review`,
    officeStats: `${API_BASE_URL}/api/admin/office/stats`,
  },
  
  // ISSP endpoints
  issp: {
    get: `${API_BASE_URL}/api/issp`,
    status: `${API_BASE_URL}/api/issp/status`,
    informationSystemsStrategy: `${API_BASE_URL}/api/issp/information-systems-strategy`,
    organizationalProfile: `${API_BASE_URL}/api/issp/organizational-profile`,
    resourceRequirements: `${API_BASE_URL}/api/issp/resource-requirements`,
    detailedIctProjects: `${API_BASE_URL}/api/issp/detailed-ict-projects`,
    developmentInvestmentProgram: `${API_BASE_URL}/api/issp/development-investment-program`,
    generate: `${API_BASE_URL}/api/issp/generate`,
    reviewSubmit: `${API_BASE_URL}/api/issp/review/submit`,
    uploadDictApproved: `${API_BASE_URL}/api/issp/upload-dict-approved`,
    dictApproval: (isspId) => `${API_BASE_URL}/api/issp/dict-approval/${isspId}`,
    acceptingEntries: (isspId) => `${API_BASE_URL}/api/issp/accepting-entries/${isspId}`,
    reviewList: `${API_BASE_URL}/api/issp/review/list`,
    approvedDocument: `${API_BASE_URL}/api/issp/approved-document`,
  },
  
  // AI endpoints
  ai: {
    itemInsights: `${API_BASE_URL}/api/ai/item-insights`,
  },
  
  // Notification endpoints
  notifications: {
    list: `${API_BASE_URL}/api/notifications`,
    markRead: (notificationId) => `${API_BASE_URL}/api/notifications/${notificationId}/read`,
    markAllRead: `${API_BASE_URL}/api/notifications/mark-all-read`,
  },
  
  // Logs endpoints
  logs: {
    list: `${API_BASE_URL}/api/logs`,
  },
};

// Helper function to get auth headers
export const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { 'x-auth-token': token } : {};
};

// Helper function to get full URL for file uploads
export const getFileUrl = (filePath) => {
  if (!filePath) return '';
  if (filePath.startsWith('http')) return filePath;
  return `${API_BASE_URL}/${filePath}`;
};

export default API_BASE_URL;

