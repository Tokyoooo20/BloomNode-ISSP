import React, { useState, useEffect, useCallback } from 'react';
import Modal from '../common/Modal';
import { API_ENDPOINTS } from '../../utils/api';

const UNIT_OPTIONS_STORAGE_KEY = 'adminUnitOptions';

const sanitizeUnitValue = (unit) => (typeof unit === 'string' ? unit.trim() : '');

// Campus abbreviation mapping for all campuses
const CAMPUS_ABBREVIATIONS = {
  'Main': 'MAIN',
  'Baganga': 'BGA',
  'Tarragona': 'TAR',
  'Banaybanay': 'BAN',
  'San Isidro': 'SID',
  'President': '' // President campus shows unit without prefix
};

const getCampusAbbreviation = (campus) => {
  if (!campus || typeof campus !== 'string') return '';
  const trimmedCampus = campus.trim();
  return CAMPUS_ABBREVIATIONS[trimmedCampus] || '';
};

const loadStoredUnitOptions = () => {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const stored = window.localStorage.getItem(UNIT_OPTIONS_STORAGE_KEY);
    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map(sanitizeUnitValue)
      .filter((unit) => unit.length > 0)
      .sort((a, b) => a.localeCompare(b));
  } catch (error) {
    console.warn('Failed to load stored unit options:', error);
    return [];
  }
};

const persistUnitOptions = (options) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(UNIT_OPTIONS_STORAGE_KEY, JSON.stringify(options));
  } catch (error) {
    console.warn('Failed to store unit options:', error);
  }
};

const mergeUnitOptions = (existing = [], additional = []) => {
  const collection = new Set();

  existing.forEach((unit) => {
    const sanitized = sanitizeUnitValue(unit);
    if (sanitized) {
      collection.add(sanitized);
    }
  });

  additional.forEach((unit) => {
    const sanitized = sanitizeUnitValue(unit);
    if (sanitized) {
      collection.add(sanitized);
    }
  });

  return Array.from(collection).sort((a, b) => a.localeCompare(b));
};

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState(null);
  const [unitSelections, setUnitSelections] = useState({});
  const [unitOptions, setUnitOptions] = useState(() => loadStoredUnitOptions());
  const [searchQuery, setSearchQuery] = useState('');
  const [modalState, setModalState] = useState({
    isOpen: false,
    variant: 'default',
    title: '',
    message: '',
    confirmLabel: '',
    cancelLabel: '',
    onConfirm: null,
    onCancel: null,
    children: null,
    closeOnOverlay: true,
    showCloseButton: true
  });
  const [alertState, setAlertState] = useState({
    isOpen: false,
    variant: 'default',
    title: '',
    message: '',
    confirmLabel: 'Close',
    cancelLabel: null,
    onConfirm: null,
    onClose: null,
    closeOnOverlay: true,
    showCloseButton: true,
    children: null,
    autoCloseDelay: null
  });

  const closeModal = () => {
    setModalState((prevState) => ({
      ...prevState,
      isOpen: false
    }));
  };

  const openModal = (config) => {
    setModalState({
      isOpen: true,
      variant: 'default',
      title: '',
      message: '',
      confirmLabel: '',
      cancelLabel: '',
      onConfirm: null,
      onCancel: null,
      children: null,
      closeOnOverlay: true,
      showCloseButton: true,
      ...config
    });
  };

  const handleModalClose = () => {
    if (typeof modalState.onCancel === 'function') {
      modalState.onCancel();
    }
    closeModal();
  };

  const handleModalConfirm = async () => {
    if (typeof modalState.onConfirm === 'function') {
      await modalState.onConfirm();
    }
    closeModal();
  };

  const closeAlert = useCallback(() => {
    setAlertState((prevState) => ({
      ...prevState,
      isOpen: false
    }));
  }, []);

  const showAlert = (config) => {
    const nextState = {
      isOpen: true,
      variant: 'default',
      title: '',
      message: '',
      confirmLabel: 'Close',
      cancelLabel: null,
      onConfirm: null,
      onClose: null,
      closeOnOverlay: true,
      showCloseButton: true,
      children: null,
      autoCloseDelay: null,
      ...config
    };

    if (nextState.variant === 'success') {
      nextState.showCloseButton = false;
      nextState.closeOnOverlay = false;
      nextState.cancelLabel = null;
      nextState.autoCloseDelay = nextState.autoCloseDelay ?? 2500;
    }

    setAlertState(nextState);
  };

  const handleAlertClose = () => {
    if (typeof alertState.onClose === 'function') {
      alertState.onClose();
    }
    closeAlert();
  };

  const handleAlertConfirm = async () => {
    if (typeof alertState.onConfirm === 'function') {
      await alertState.onConfirm();
    }
    closeAlert();
  };

  useEffect(() => {
    if (!alertState.isOpen || !alertState.autoCloseDelay) {
      return;
    }

    const timer = setTimeout(() => {
      if (typeof alertState.onConfirm === 'function') {
        alertState.onConfirm();
      }
      closeAlert();
    }, alertState.autoCloseDelay);

    return () => clearTimeout(timer);
  }, [alertState.isOpen, alertState.autoCloseDelay, alertState.onConfirm, closeAlert]);

  const updateUnitOptionsList = (units) => {
    const list = Array.isArray(units) ? units : [units];
    setUnitOptions((prevOptions) => {
      const merged = mergeUnitOptions(prevOptions, list);
      persistUnitOptions(merged);
      return merged;
    });
  };

  // Fetch all users from backend
  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(API_ENDPOINTS.auth.pendingUsers, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (response.ok) {
        setUsers(data.users);
        const uniqueUnits = Array.from(
          new Set(
            data.users
              .map((user) => sanitizeUnitValue(user.unit))
              .filter((unit) => unit.length > 0)
          )
        ).sort((a, b) => a.localeCompare(b));
        updateUnitOptionsList(uniqueUnits);
        setUnitSelections((prevSelections) => {
          const nextSelections = { ...prevSelections };
          data.users.forEach((user) => {
            nextSelections[user._id] = sanitizeUnitValue(user.unit);
          });
          return nextSelections;
        });
      } else {
        showAlert({
          variant: 'danger',
          title: 'Unable to Fetch Users',
          message: data.message || 'Failed to fetch users.',
          confirmLabel: 'Dismiss'
        });
      }
    } catch (error) {
      showAlert({
        variant: 'danger',
        title: 'Network Error',
        message: 'Network error. Please check if the server is running.',
        confirmLabel: 'Retry',
        onConfirm: () => fetchUsers()
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUnitSelectionChange = (user, unitValue) => {
    const originalUnit = sanitizeUnitValue(user.unit);
    const selectedUnit = sanitizeUnitValue(unitValue);

    if (!selectedUnit) {
      setUnitSelections((prevSelections) => ({
        ...prevSelections,
        [user._id]: originalUnit
      }));
      return;
    }

    if (selectedUnit === originalUnit) {
      setUnitSelections((prevSelections) => ({
        ...prevSelections,
        [user._id]: selectedUnit
      }));
      return;
    }

    openModal({
      variant: 'confirm',
      title: 'Update Unit',
      message: `Update unit for ${user.username} to ${selectedUnit}?`,
      confirmLabel: 'Update Unit',
      onConfirm: async () => {
        setUnitSelections((prevSelections) => ({
          ...prevSelections,
          [user._id]: selectedUnit
        }));
        await updateUserUnit(user, selectedUnit);
      },
      onCancel: () => {
        setUnitSelections((prevSelections) => ({
          ...prevSelections,
          [user._id]: originalUnit
        }));
      }
    });
  };

  // Update user unit
  const updateUserUnit = async (user, selectedUnit) => {
    const originalUnit = user.unit || '';

    try {
      setUpdatingUserId(user._id);

      const token = localStorage.getItem('token');
      // When unit is assigned, automatically set role to "Program head"
      const updateData = { unit: selectedUnit };
      if (selectedUnit && selectedUnit.trim() !== '') {
        // Only set role to "Program head" if user doesn't already have admin/president role
        if (user.role !== 'admin' && user.role !== 'president' && user.role !== 'Executive') {
          updateData.role = 'Program head';
        }
      }
      
      const response = await fetch(API_ENDPOINTS.auth.updateUser(user._id), {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      });

      const data = await response.json();

      if (response.ok) {
        const updatedUser = data.user || { ...user, unit: selectedUnit };
        setUsers((prevUsers) =>
          prevUsers.map((currentUser) =>
            currentUser._id === user._id ? { ...currentUser, ...updatedUser } : currentUser
          )
        );
        setUnitSelections((prevSelections) => ({
          ...prevSelections,
          [user._id]: selectedUnit
        }));
        updateUnitOptionsList([selectedUnit]);
        showAlert({
          variant: 'success',
          title: 'Unit Updated',
          message: data.message || 'Unit updated successfully!'
        });
      } else {
        setUnitSelections((prevSelections) => ({
          ...prevSelections,
          [user._id]: originalUnit
        }));
        showAlert({
          variant: 'danger',
          title: 'Update Failed',
          message: data.message || 'Failed to update unit.'
        });
      }
    } catch (error) {
      setUnitSelections((prevSelections) => ({
        ...prevSelections,
        [user._id]: originalUnit
      }));
      showAlert({
        variant: 'danger',
        title: 'Network Error',
        message: 'Network error. Please try again.'
      });
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleUnitInputChange = (userId, value) => {
    setUnitSelections((prevSelections) => ({
      ...prevSelections,
      [userId]: value
    }));
  };

  // Role is automatically set to "Program head" when unit is assigned
  // No need for manual role updates

  // Approve user
  const approveUser = async (user) => {
    const userId = user._id;

    // Check if there's already an active program head for this unit AND campus
    const checkForConflict = () => {
      if (!user.unit || user.unit.trim() === '') {
        return null; // No unit assigned, no conflict
      }

      // Normalize campus values (empty/null = 'Main')
      const userCampus = (user.campus || '').trim() || 'Main';
      
      // Find if there's another approved user with the same unit AND same campus
      const existingActiveHead = users.find(
        (u) => {
          // Skip if same user
          if (u._id === userId) return false;
          
          // Must have unit
          if (!u.unit || u.unit.trim() === '') return false;
          
          // Must have same unit name
          if (sanitizeUnitValue(u.unit) !== sanitizeUnitValue(user.unit)) return false;
          
          // Must have same campus (normalize empty/null to 'Main')
          const uCampus = (u.campus || '').trim() || 'Main';
          if (uCampus !== userCampus) return false;
          
          // Must be approved
          if (u.approvalStatus !== 'approved') return false;
          
          // Must not be admin, president, or Executive role
          if (u.role === 'admin' || u.role === 'president' || u.role === 'Executive') return false;
          
          return true;
        }
      );

      return existingActiveHead || null;
    };

    const showConflictModal = (existingUser) => {
      const approvedDate = existingUser.approvedAt 
        ? new Date(existingUser.approvedAt).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
          })
        : 'Unknown date';

      // Get campus display names
      const existingUserCampus = (existingUser.campus || '').trim() || 'Main';
      const newUserCampus = (user.campus || '').trim() || 'Main';
      const existingCampusAbbr = getCampusAbbreviation(existingUserCampus);
      const newCampusAbbr = getCampusAbbreviation(newUserCampus);
      const existingUnitDisplay = existingCampusAbbr ? `${existingCampusAbbr} ${existingUser.unit}` : existingUser.unit;
      const newUnitDisplay = newCampusAbbr ? `${newCampusAbbr} ${user.unit}` : user.unit;

      openModal({
        variant: 'danger',
        title: '⚠️ Active Program Head Detected',
        confirmLabel: 'Yes, Change Program Head',
        cancelLabel: 'Cancel',
        children: (
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-gray-700 mb-3">
                Unit <strong>"{existingUnitDisplay}"</strong> ({existingUserCampus} campus) already has an active program head:
              </p>
              
              <div className="bg-white border border-gray-200 rounded-lg p-3 mb-3">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
                      <span className="text-blue-700 font-semibold text-sm">
                        {existingUser.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{existingUser.username}</p>
                    <p className="text-xs text-gray-600">{existingUser.email}</p>
                    <p className="text-xs text-gray-500 mt-1">Approved since {approvedDate}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center my-3">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </div>

              <div className="bg-white border border-green-200 rounded-lg p-3">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center">
                      <span className="text-green-700 font-semibold text-sm">
                        {user.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{user.username}</p>
                    <p className="text-xs text-gray-600">{user.email}</p>
                    <p className="text-xs text-green-700 mt-1 font-medium">New Program Head</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <svg className="w-5 h-5 text-red-700 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div className="text-sm text-red-700">
                  <p className="font-semibold mb-1">⚠️ Only ONE program head per unit per campus allowed</p>
                  <p>Approving <strong>{user.username}</strong> will automatically <strong>SUSPEND {existingUser.username}</strong> for unit "{newUnitDisplay}" ({newUserCampus} campus)</p>
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-600 text-center">
              Do you want to proceed with the program head transfer?
            </p>
          </div>
        ),
        onConfirm: async () => {
          await executeApproval(true);
        }
      });
    };

    const executeApproval = async (autoSuspendConflict = false) => {
      try {
        setUpdatingUserId(userId);
        const token = localStorage.getItem('token');
          const response = await fetch(API_ENDPOINTS.auth.approveUser(userId), {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ autoSuspendConflict })
          });

        const data = await response.json();
        
        // Handle conflict (409 status code) - fallback in case frontend check missed it
        if (response.status === 409 && data.conflict) {
          const existingUser = data.existingUser;
          const approvedDate = existingUser.approvedAt 
            ? new Date(existingUser.approvedAt).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
              })
            : 'Unknown date';

          // Get campus display names
          const existingUserCampus = (existingUser.campus || '').trim() || 'Main';
          const newUserCampus = (user.campus || '').trim() || 'Main';
          const existingCampusAbbr = getCampusAbbreviation(existingUserCampus);
          const newCampusAbbr = getCampusAbbreviation(newUserCampus);
          const existingUnitDisplay = existingCampusAbbr ? `${existingCampusAbbr} ${existingUser.unit}` : existingUser.unit;
          const newUnitDisplay = newCampusAbbr ? `${newCampusAbbr} ${user.unit}` : user.unit;

          openModal({
            variant: 'danger',
            title: '⚠️ Program Head Conflict Detected',
            confirmLabel: 'Yes, Transfer Program Head',
            cancelLabel: 'Cancel',
            children: (
              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-gray-700 mb-3">
                    Unit <strong>"{existingUnitDisplay}"</strong> ({existingUserCampus} campus) already has an active program head:
                  </p>
                  
                  <div className="bg-white border border-gray-200 rounded-lg p-3 mb-3">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
                          <span className="text-blue-700 font-semibold text-sm">
                            {existingUser.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{existingUser.username}</p>
                        <p className="text-xs text-gray-600">{existingUser.email}</p>
                        <p className="text-xs text-gray-500 mt-1">Approved since {approvedDate}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-center my-3">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </div>

                  <div className="bg-white border border-green-200 rounded-lg p-3">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center">
                          <span className="text-green-700 font-semibold text-sm">
                            {user.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{user.username}</p>
                        <p className="text-xs text-gray-600">{user.email}</p>
                        <p className="text-xs text-green-700 mt-1 font-medium">New Program Head</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <svg className="w-5 h-5 text-red-700 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <div className="text-sm text-red-700">
                      <p className="font-semibold mb-1">⚠️ Only ONE program head per unit per campus allowed</p>
                      <p>Approving <strong>{user.username}</strong> will automatically <strong>SUSPEND {existingUser.username}</strong> for unit "{newUnitDisplay}" ({newUserCampus} campus)</p>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-gray-600 text-center">
                  Do you want to proceed with the program head transfer?
                </p>
              </div>
            ),
            onConfirm: async () => {
              // Retry approval with autoSuspendConflict flag
              await executeApproval(true);
            }
          });
          return;
        }
        
        if (response.ok) {
          showAlert({
            variant: 'success',
            title: data.suspendedUser ? 'Program Head Transferred' : 'User Approved',
            message: data.message || 'User approved successfully!'
          });
          fetchUsers();
        } else {
          showAlert({
            variant: 'danger',
            title: 'Action Failed',
            message: data.message || 'Failed to approve user.'
          });
        }
      } catch (error) {
        showAlert({
          variant: 'danger',
          title: 'Network Error',
          message: 'Network error. Please try again.'
        });
      } finally {
        setUpdatingUserId(null);
      }
    };

    // Check for conflict BEFORE approving
    const existingActiveHead = checkForConflict();
    if (existingActiveHead) {
      showConflictModal(existingActiveHead);
      return;
    }

    // If user is suspended, show confirmation first
    if (user.approvalStatus === 'suspended') {
      openModal({
        variant: 'confirm',
        title: 'Re-approve User',
        message: `Approve ${user.username} again? They will regain access to the system.`,
        confirmLabel: 'Approve',
        onConfirm: async () => {
          await executeApproval();
        }
      });
      return;
    }

    // For pending users, proceed directly
    await executeApproval();
  };

  // Reject user
  const rejectUser = (user) => {
    const userId = user._id;
    openModal({
      variant: 'confirm',
      title: 'Reject User',
      message: `Reject ${user.username}'s account? They will have to register again to regain access.`,
      confirmLabel: 'Reject',
      onConfirm: async () => {
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(API_ENDPOINTS.auth.rejectUser(userId), {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          const data = await response.json();
          
          if (response.ok) {
            showAlert({
              variant: 'success',
              title: 'User Rejected',
              message: data.message || 'User rejected successfully!'
            });
            fetchUsers();
          } else {
            showAlert({
              variant: 'danger',
              title: 'Action Failed',
              message: data.message || 'Failed to reject user.'
            });
          }
        } catch (error) {
          showAlert({
            variant: 'danger',
            title: 'Network Error',
            message: 'Network error. Please try again.'
          });
        }
      }
    });
  };

  // Suspend user
  const suspendUser = (user) => {
    const userId = user._id;
    openModal({
      variant: 'danger',
      title: 'Suspend User',
      message: `Suspend ${user.username}? They will not be able to log in until re-approved.`,
      confirmLabel: 'Suspend',
      onConfirm: async () => {
        try {
          setUpdatingUserId(userId);
          const token = localStorage.getItem('token');
          const response = await fetch(API_ENDPOINTS.auth.suspendUser(userId), {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          const data = await response.json();

          if (response.ok) {
            showAlert({
              variant: 'success',
              title: 'User Suspended',
              message: data.message || 'User suspended successfully!'
            });
            fetchUsers();
          } else {
            showAlert({
              variant: 'danger',
              title: 'Action Failed',
              message: data.message || 'Failed to suspend user.'
            });
          }
        } catch (error) {
          showAlert({
            variant: 'danger',
            title: 'Network Error',
            message: 'Network error. Please try again.'
          });
        } finally {
          setUpdatingUserId(null);
        }
      }
    });
  };

  // Delete user
  const deleteUser = (user) => {
    const userId = user._id;
    openModal({
      variant: 'danger',
      title: 'Delete User',
      message: `Are you sure you want to delete ${user.username}'s account? This action cannot be undone.`,
      confirmLabel: 'Delete',
      onConfirm: async () => {
        try {
          setUpdatingUserId(userId);
          const token = localStorage.getItem('token');
          
          if (!token) {
            showAlert({
              variant: 'danger',
              title: 'Authentication Required',
              message: 'No authentication token found. Please login again.'
            });
            setUpdatingUserId(null);
            return;
          }

          const response = await fetch(API_ENDPOINTS.auth.deleteUser(userId), {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          let data;
          try {
            data = await response.json();
          } catch (jsonError) {
            // If response is not JSON, create a data object with the status text
            data = {
              message: response.statusText || 'Failed to delete user'
            };
          }

          if (response.ok) {
            showAlert({
              variant: 'success',
              title: 'User Deleted',
              message: data.message || 'User deleted successfully!'
            });
            // Refresh the user list to reflect the deletion
            await fetchUsers();
          } else {
            showAlert({
              variant: 'danger',
              title: 'Action Failed',
              message: data.message || `Failed to delete user. (Status: ${response.status})`
            });
          }
        } catch (error) {
          console.error('Error deleting user:', error);
          showAlert({
            variant: 'danger',
            title: 'Network Error',
            message: error.message || 'Network error. Please try again.'
          });
        } finally {
          setUpdatingUserId(null);
        }
      }
    });
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Filter users based on search query
  const filteredUsers = users.filter((user) => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase().trim();
    const username = (user.username || '').toLowerCase();
    const email = (user.email || '').toLowerCase();
    const unit = (user.unit || '').toLowerCase();
    const campus = (user.campus || '').toLowerCase();
    const role = (user.role || '').toLowerCase();
    const status = (user.approvalStatus || '').toLowerCase();
    
    return (
      username.includes(query) ||
      email.includes(query) ||
      unit.includes(query) ||
      campus.includes(query) ||
      role.includes(query) ||
      status.includes(query)
    );
  });

  const renderActionButtons = (user) => {
    const buttons = [];
    const isProcessing = updatingUserId === user._id;

    // For pending users: Approve, Reject, Delete
    if (user.approvalStatus === 'pending') {
      buttons.push(
        <button
          key="approve"
          onClick={() => approveUser(user)}
          disabled={isProcessing}
          className="tap-target bg-green-50 hover:bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed border border-green-200 whitespace-nowrap h-7 flex items-center justify-center"
        >
          Approve
        </button>
      );
      buttons.push(
        <button
          key="reject"
          onClick={() => rejectUser(user)}
          disabled={isProcessing}
          className="tap-target bg-red-50 hover:bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed border border-red-200 whitespace-nowrap h-7 flex items-center justify-center"
        >
          Reject
        </button>
      );
      buttons.push(
        <button
          key="delete"
          onClick={() => deleteUser(user)}
          disabled={isProcessing}
          className="tap-target bg-red-200 hover:bg-red-300 text-red-700 px-2 py-1 rounded text-xs font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap h-7 flex items-center justify-center"
        >
          Delete
        </button>
      );
    }
    // For rejected or suspended users: Approve, Delete
    else if (['rejected', 'suspended'].includes(user.approvalStatus)) {
      buttons.push(
        <button
          key="approve"
          onClick={() => approveUser(user)}
          disabled={isProcessing}
          className="tap-target bg-green-50 hover:bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed border border-green-200 whitespace-nowrap h-7 flex items-center justify-center"
        >
          Approve
        </button>
      );
      buttons.push(
        <button
          key="delete"
          onClick={() => deleteUser(user)}
          disabled={isProcessing}
          className="tap-target bg-red-200 hover:bg-red-300 text-red-700 px-2 py-1 rounded text-xs font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap h-7 flex items-center justify-center"
        >
          Delete
        </button>
      );
    }
    // For approved users: Suspend, Delete
    else if (user.approvalStatus === 'approved') {
      buttons.push(
        <button
          key="suspend"
          onClick={() => suspendUser(user)}
          disabled={isProcessing}
          className="tap-target bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 py-1 rounded text-xs font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap h-7 flex items-center justify-center"
        >
          Suspend
        </button>
      );
    buttons.push(
      <button
        key="delete"
        onClick={() => deleteUser(user)}
        disabled={isProcessing}
          className="tap-target bg-red-200 hover:bg-red-300 text-red-700 px-2 py-1 rounded text-xs font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap h-7 flex items-center justify-center"
      >
        Delete
      </button>
    );
    }

    return (
      <div className="flex items-center gap-1.5 flex-nowrap">
        {buttons}
      </div>
    );
  };

  const renderUnitDisplay = (user) => {
    const unitValue = sanitizeUnitValue(user.unit);
    if (!unitValue) {
      return (
        <div className="text-sm text-gray-900">
          <span className="text-gray-400 italic">No unit</span>
        </div>
      );
    }

    // Check if this is a President user (by campus, role, or unit)
    const isPresidentUser = user.campus === 'President' || 
                            user.role === 'president' || 
                            user.role === 'Executive' && unitValue === 'Executive';
    
    // President users show unit without campus prefix
    if (isPresidentUser) {
      return (
        <div className="text-sm text-gray-900">
          {unitValue}
        </div>
      );
    }

    // Get campus abbreviation for other users
    // Defaults to 'Main' if campus is empty/null
    const campus = user.campus || 'Main';
    const campusAbbr = getCampusAbbreviation(campus);
    
    // Show campus abbreviation + unit
    const displayValue = campusAbbr ? `${campusAbbr} ${unitValue}` : unitValue;
    
    return (
      <div className="text-sm text-gray-900">
        {displayValue}
      </div>
    );
  };

  const renderRoleDisplay = (user) => {
    // Display role as read-only text
    // Check if this is a President user (by campus, role, or unit)
    const unitValue = sanitizeUnitValue(user.unit);
    const isPresidentUser = user.campus === 'President' || 
                            user.role === 'president' || 
                            (user.role === 'Executive' && unitValue === 'Executive');
    
    // For President users, show "PRESIDENT" in role column
    if (isPresidentUser) {
      return (
        <div className="text-sm text-gray-900">
          PRESIDENT
        </div>
      );
    }
    
    // Default is "Program head" when unit is assigned
    const role = user.role || (user.unit ? 'Program head' : 'N/A');
    return (
      <div className="text-sm text-gray-900">
        {role}
      </div>
    );
  };

  const getStatusBadge = (status) => {
    const statusStyles = {
      pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      approved: 'bg-green-50 text-green-700 border-green-200',
      rejected: 'bg-red-50 text-red-700 border-red-200',
      suspended: 'bg-red-50 text-red-700 border-red-200'
    };

    return (
      <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium border whitespace-nowrap ${statusStyles[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const modalElement = (
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
  );

  const alertCloseHandler = alertState.onClose ? handleAlertClose : closeAlert;
  const alertConfirmHandler = alertState.onConfirm ? handleAlertConfirm : undefined;

  const alertElement = (
    <Modal
      isOpen={alertState.isOpen}
      variant={alertState.variant}
      title={alertState.title}
      message={alertState.message}
      confirmLabel={alertState.confirmLabel}
      cancelLabel={alertState.cancelLabel ?? null}
      onClose={alertCloseHandler}
      onConfirm={alertConfirmHandler}
      closeOnOverlay={alertState.closeOnOverlay}
      showCloseButton={alertState.showCloseButton}
    >
      {alertState.children}
    </Modal>
  );

  if (loading) {
    return (
      <>
        {modalElement}
        {alertElement}
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600"></div>
        </div>
      </>
    );
  }

  return (
    <>
      {modalElement}
      {alertElement}
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">User Management</h2>
            <p className="mt-1 text-xs sm:text-sm text-gray-600">Manage user accounts and approval status</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search by username, email, unit, campus, role, or status..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-gray-400 focus:border-transparent text-sm sm:text-base"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          {searchQuery && (
            <p className="mt-2 text-xs sm:text-sm text-gray-500">
              Showing {filteredUsers.length} of {users.length} users
            </p>
          )}
        </div>

        {/* Users Table */}
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">
              All Users ({searchQuery ? filteredUsers.length : users.length})
            </h3>
          </div>

          {filteredUsers.length === 0 ? (
            <div className="p-6 sm:p-8 text-center text-gray-500">
              <svg className="mx-auto mb-4 h-10 w-10 sm:h-12 sm:w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
              <p className="text-base sm:text-lg font-medium">
                {searchQuery ? 'No users match your search' : 'No users found'}
              </p>
              <p className="text-xs sm:text-sm">
                {searchQuery ? 'Try adjusting your search query' : 'Users will appear here once they register'}
              </p>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="block md:hidden divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <div key={user._id} className="p-4 hover:bg-gray-50">
                    <div className="space-y-3">
                      {/* User Info */}
                      <div>
                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">User Info</div>
                        <div className="text-sm font-medium text-gray-900 break-words">{user.username}</div>
                        <div className="text-xs text-gray-500 break-all mt-0.5">{user.email}</div>
                      </div>

                      {/* Unit and Role Row */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Unit</div>
                          <div className="text-sm text-gray-900">{renderUnitDisplay(user)}</div>
                        </div>
                        <div>
                          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Role</div>
                          <div className="text-sm">{renderRoleDisplay(user)}</div>
                        </div>
                      </div>

                      {/* Status and Date Row */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Status</div>
                          <div>{getStatusBadge(user.approvalStatus)}</div>
                        </div>
                        <div>
                          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Registered</div>
                          <div className="text-xs text-gray-500">{new Date(user.createdAt).toLocaleDateString()}</div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div>
                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Actions</div>
                        <div>{renderActionButtons(user)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block table-responsive-wrapper">
                <table className="table-responsive min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        User Info
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Unit
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Registration Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {filteredUsers.map((user) => (
                      <tr key={user._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900 break-words">{user.username}</div>
                            <div className="text-sm text-gray-500 break-all">{user.email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm">{renderUnitDisplay(user)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm">{renderRoleDisplay(user)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(user.approvalStatus)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {renderActionButtons(user)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default Users;
