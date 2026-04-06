import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../common/Modal';
import { API_ENDPOINTS } from '../../utils/api';

const UNIT_OPTIONS_STORAGE_KEY = 'adminUnitOptions';

const sanitizeUnitValue = (unit) => (typeof unit === 'string' ? unit.trim() : '');

// Helper functions will use API data fetched in component

// Campus abbreviation mapping for all campuses
const CAMPUS_ABBREVIATIONS = {
  'Main': 'MAIN',
  'Baganga': 'BGA',
  'Tarragona': 'TAR',
  'Banaybanay': 'BAN',
  'San Isidro': 'SID',
  'President': '' // President campus shows unit without prefix
};

// Normalize campus value consistently (empty/null/undefined -> 'Main', trim, case-insensitive)
const normalizeCampus = (campus) => {
  if (!campus || typeof campus !== 'string' || campus.trim() === '') {
    return 'Main';
  }
  const trimmed = campus.trim();
  // Case-insensitive normalization: capitalize first letter, lowercase rest
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
};

const getCampusAbbreviation = (campus) => {
  if (!campus || typeof campus !== 'string') return '';
  const trimmedCampus = campus.trim();
  if (!trimmedCampus) return '';
  
  // Case-insensitive matching
  const normalizedCampus = trimmedCampus.charAt(0).toUpperCase() + trimmedCampus.slice(1).toLowerCase();
  
  // Try exact match first
  if (CAMPUS_ABBREVIATIONS[trimmedCampus]) {
    return CAMPUS_ABBREVIATIONS[trimmedCampus];
  }
  
  // Try normalized match (capitalize first letter)
  if (CAMPUS_ABBREVIATIONS[normalizedCampus]) {
    return CAMPUS_ABBREVIATIONS[normalizedCampus];
  }
  
  // Try case-insensitive lookup
  const campusKey = Object.keys(CAMPUS_ABBREVIATIONS).find(
    key => key.toLowerCase() === trimmedCampus.toLowerCase()
  );
  
  return campusKey ? CAMPUS_ABBREVIATIONS[campusKey] : '';
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
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState(null);
  const [unitSelections, setUnitSelections] = useState({});
  const [unitOptions, setUnitOptions] = useState(() => loadStoredUnitOptions());
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(6);
  
  // Organization data from API
  const [campuses, setCampuses] = useState([]);
  const [offices, setOffices] = useState([]);
  const [units, setUnits] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [universityLevelOffices, setUniversityLevelOffices] = useState([]);
  
  // Helper functions using API data
  const getCampusOptions = () => campuses.filter(c => c.isActive).map(c => c.name);
  const getUniversityLevelOffices = () => universityLevelOffices.filter(u => u.isActive).map(u => u.name);
  const getFacultyPrograms = (facultyName) => {
    const faculty = faculties.find(f => f.name === facultyName && f.isActive);
    if (!faculty) return [];
    return programs.filter(p => 
      (p.faculty?._id === faculty._id || p.faculty?.name === facultyName) && p.isActive
    ).map(p => p.name);
  };
  const getMainOffices = () => {
    const mainCampus = campuses.find(c => c.name === 'Main' || c.isMain);
    if (!mainCampus) return {};
    const mainOfficesList = offices.filter(o => 
      (o.campus?._id === mainCampus._id || o.campus?.name === 'Main') && o.isActive
    );
    const grouped = {};
    mainOfficesList.forEach(office => {
      if (!grouped[office.name]) {
        grouped[office.name] = [];
      }
    });
    return grouped;
  };
  const getExtensionCampusPrograms = (campusName) => {
    const campus = campuses.find(c => c.name === campusName && c.isActive);
    if (!campus) return [];
    return programs.filter(p => 
      (!p.campus || p.campus?._id === campus._id || p.campus?.name === campusName) && p.isActive
    ).map(p => p.name);
  };
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

  // Detect duplicate program heads (same unit + same campus, both approved)
  const detectDuplicates = (usersList) => {
    const duplicates = [];
    const seen = new Map(); // key: "unit|campus", value: array of users

    usersList.forEach((user) => {
      // Only check approved users with units
      if (user.approvalStatus !== 'approved' || !user.unit || user.unit.trim() === '') {
        return;
      }

      // Skip admin, president, and Executive roles (system roles, not program heads)
      if (user.role === 'admin' || user.role === 'president' || user.role === 'Executive') {
        return;
      }

      const normalizedUnit = sanitizeUnitValue(user.unit);
      const normalizedCampus = normalizeCampus(user.campus);
      const key = `${normalizedUnit}|${normalizedCampus}`;

      if (!seen.has(key)) {
        seen.set(key, []);
      }
      seen.get(key).push(user);
    });

    // Find groups with more than one user
    seen.forEach((userGroup, key) => {
      if (userGroup.length > 1) {
        duplicates.push({
          unit: key.split('|')[0],
          campus: key.split('|')[1],
          users: userGroup
        });
      }
    });

    return duplicates;
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
        
        // Detect and warn about duplicate program heads
        const duplicates = detectDuplicates(data.users);
        if (duplicates.length > 0) {
          const duplicateMessages = duplicates.map(dup => {
            const campusAbbr = getCampusAbbreviation(dup.campus);
            const unitDisplay = campusAbbr ? `${campusAbbr} ${dup.unit}` : dup.unit;
            const userNames = dup.users.map(u => u.username).join(', ');
            return `${unitDisplay} (${dup.campus}): ${userNames}`;
          }).join('\n');

          showAlert({
            variant: 'danger',
            title: '⚠️ Duplicate Program Heads Detected',
            message: `Found ${duplicates.length} unit(s) with multiple approved program heads:\n\n${duplicateMessages}\n\nPlease suspend or delete duplicate accounts to maintain data integrity.`,
            confirmLabel: 'Dismiss',
            autoCloseDelay: null // Don't auto-close important warnings
          });
        }
        
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

    // Check for conflict if user is approved or will be approved
    const userCampus = normalizeCampus(user.campus);
    const isUniversityLevelOffice = getUniversityLevelOffices().includes(selectedUnit);
    
    // Check if there's already an approved user with this unit and campus
    const existingConflict = users.find((u) => {
      if (u._id === user._id) return false; // Skip same user
      if (!u.unit || u.unit.trim() === '') return false;
      
      // Case-insensitive unit comparison
      const uUnit = sanitizeUnitValue(u.unit);
      if (uUnit.toLowerCase() !== selectedUnit.toLowerCase()) return false;
      
      const uCampus = normalizeCampus(u.campus);
      if (uCampus !== userCampus) return false;
      
      if (u.approvalStatus !== 'approved') return false;
      
      // Normalize role for comparison (case-insensitive)
      const uRole = (u.role || '').toLowerCase().trim();
      
      // For university-level offices, check all roles except admin
      if (isUniversityLevelOffice) {
        if (uRole === 'admin') return false;
      } else {
        // For regular units, exclude admin, president, and Executive roles (case-insensitive)
        if (uRole === 'admin' || uRole === 'president' || uRole === 'executive') return false;
      }
      
      return true;
    });

    if (existingConflict && user.approvalStatus === 'approved') {
      // User is approved and there's a conflict - warn about suspending the other user
      const campusAbbr = getCampusAbbreviation(userCampus);
      const unitDisplay = campusAbbr ? `${campusAbbr} ${selectedUnit}` : selectedUnit;
      
      openModal({
        variant: 'danger',
        title: '⚠️ Conflict Detected',
        message: `Another approved user already has unit "${unitDisplay}". Updating ${user.username}'s unit will suspend the existing program head.`,
        confirmLabel: 'Update & Suspend Other User',
        cancelLabel: 'Cancel',
        children: (
          <div className="space-y-3">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-gray-700 mb-2">
                <strong>Existing Program Head:</strong>
              </p>
              <p className="text-sm font-medium text-gray-900">{existingConflict.username}</p>
              <p className="text-xs text-gray-600">{existingConflict.email}</p>
            </div>
            <p className="text-sm text-gray-600">
              Updating the unit will automatically suspend <strong>{existingConflict.username}</strong>.
            </p>
          </div>
        ),
        onConfirm: async () => {
          setUnitSelections((prevSelections) => ({
            ...prevSelections,
            [user._id]: selectedUnit
          }));
          await updateUserUnit(user, selectedUnit, { suspendUserId: existingConflict._id });
        },
        onCancel: () => {
          setUnitSelections((prevSelections) => ({
            ...prevSelections,
            [user._id]: originalUnit
          }));
        }
      });
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

  const suspendUserDirect = async (userId) => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found. Please login again.');
    }

    const response = await fetch(API_ENDPOINTS.auth.suspendUser(userId), {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    let data = {};
    try {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      }
    } catch (e) {
      // ignore parsing errors; we only need status
    }

    if (!response.ok) {
      const message = data?.message || response.statusText || `Failed to suspend user (status ${response.status}).`;
      throw new Error(message);
    }
  };

  // Update user unit
  const updateUserUnit = async (user, selectedUnit, options = {}) => {
    const originalUnit = user.unit || '';
    const { suspendUserId } = options || {};

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
      
      // If requested, suspend the conflicting user before moving unit ownership
      if (suspendUserId) {
        await suspendUserDirect(suspendUserId);
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

    // STRICT conflict check - MUST prevent duplicate program heads
    // Use current users state (passed as parameter to ensure fresh data)
    const checkForConflict = (usersList = users) => {
      // If no unit assigned, allow approval (user can be assigned unit later)
      if (!user.unit || user.unit.trim() === '') {
        return null;
      }

      // Normalize values for comparison
      const userCampus = normalizeCampus(user.campus);
      const userUnitRaw = sanitizeUnitValue(user.unit).toLowerCase().trim();
      
      if (!userUnitRaw) return null; // Empty unit after sanitization
      
      // Extract base unit name (remove campus prefix if present in unit field)
      const extractBaseUnit = (unitValue) => {
        if (!unitValue) return '';
        const normalized = sanitizeUnitValue(unitValue).toLowerCase().trim();
        // Remove common campus prefixes if they exist in the unit field itself
        const prefixes = ['main ', 'bga ', 'tar ', 'ban ', 'sid ', 'president '];
        let baseUnit = normalized;
        for (const prefix of prefixes) {
          if (baseUnit.startsWith(prefix)) {
            baseUnit = baseUnit.substring(prefix.length).trim();
            break;
          }
        }
        return baseUnit || normalized; // Return base unit or original if no prefix found
      };
      
      // Get base unit (without campus prefix)
      const userBaseUnit = extractBaseUnit(user.unit);
      
      // Construct full unit name with campus prefix for comparison
      // If unit doesn't have prefix, add it based on campus
      const getCampusPrefixForUnit = (campusName) => {
        const campus = normalizeCampus(campusName);
        const campusLower = campus.toLowerCase();
        if (campusLower === 'main') return 'main ';
        if (campusLower === 'baganga') return 'bga ';
        if (campusLower === 'tarragona') return 'tar ';
        if (campusLower === 'banaybanay') return 'ban ';
        if (campusLower === 'san isidro') return 'sid ';
        if (campusLower === 'president') return '';
        return 'main '; // Default to main
      };
      
      // Check if unit already has a campus prefix
      const userUnitHasPrefix = userUnitRaw.startsWith('main ') || 
                                userUnitRaw.startsWith('bga ') || 
                                userUnitRaw.startsWith('tar ') || 
                                userUnitRaw.startsWith('ban ') || 
                                userUnitRaw.startsWith('sid ') ||
                                userUnitRaw.startsWith('president ');
      
      // Construct normalized full unit name for comparison
      // If unit has prefix, use it; if not, add campus prefix
      const userFullUnit = userUnitHasPrefix ? userUnitRaw : (getCampusPrefixForUnit(userCampus) + userBaseUnit).toLowerCase().trim();
      
      // Check if this is a university-level office
      const isUniversityLevelOffice = getUniversityLevelOffices().some(office => 
        sanitizeUnitValue(office).toLowerCase().trim() === userBaseUnit
      );
      
      // Find ALL approved users with the same unit AND campus
      // Log for debugging - show RAW database values AND normalized values
      console.log('Conflict check details:', {
        checkingUser: { 
          id: userId, 
          username: user.username, 
          rawUnit: user.unit, // RAW from database
          rawCampus: user.campus, // RAW from database
          baseUnit: userBaseUnit, // Unit without campus prefix
          fullUnit: userFullUnit, // Full unit with campus prefix
          normalizedCampus: userCampus 
        },
        totalUsers: usersList.length,
        approvedUsers: usersList.filter(u => u.approvalStatus === 'approved').map(u => {
          const uRawUnit = sanitizeUnitValue(u.unit).toLowerCase().trim();
          const uBaseUnit = extractBaseUnit(u.unit);
          const uCampus = normalizeCampus(u.campus);
          const uHasPrefix = uRawUnit.startsWith('main ') || 
                            uRawUnit.startsWith('bga ') || 
                            uRawUnit.startsWith('tar ') || 
                            uRawUnit.startsWith('ban ') || 
                            uRawUnit.startsWith('sid ') ||
                            uRawUnit.startsWith('president ');
          const uFullUnit = uHasPrefix ? uRawUnit : (getCampusPrefixForUnit(uCampus) + uBaseUnit).toLowerCase().trim();
          
          return {
            id: u._id,
            username: u.username,
            rawUnit: u.unit, // RAW from database
            rawCampus: u.campus, // RAW from database
            baseUnit: uBaseUnit, // Unit without campus prefix
            fullUnit: uFullUnit, // Full unit with campus prefix
            normalizedCampus: uCampus,
            role: u.role,
            status: u.approvalStatus
          };
        })
      });
      
      const conflictingUsers = usersList.filter((u) => {
        // Skip the current user
        if (u._id === userId) return false;
        
        // Must have a unit
        if (!u.unit || u.unit.trim() === '') return false;
        
        // Normalize and compare unit - SIMPLIFIED LOGIC
        const uRawUnit = sanitizeUnitValue(u.unit).toLowerCase().trim();
        const uBaseUnit = extractBaseUnit(u.unit);
        const uCampus = normalizeCampus(u.campus);
        
        // Normalize and compare campus - MUST match
        const campusMatch = uCampus === userCampus;
        
        if (!campusMatch) return false; // Different campuses = no conflict
        
        // Check if unit has campus prefix
        const uHasPrefix = uRawUnit.startsWith('main ') || 
                          uRawUnit.startsWith('bga ') || 
                          uRawUnit.startsWith('tar ') || 
                          uRawUnit.startsWith('ban ') || 
                          uRawUnit.startsWith('sid ') ||
                          uRawUnit.startsWith('president ');
        
        // Construct full unit name (with campus prefix) for comparison
        const uFullUnit = uHasPrefix ? uRawUnit : (getCampusPrefixForUnit(uCampus) + uBaseUnit).toLowerCase().trim();
        
        // Units match if ANY of these conditions are true:
        // 1. Full unit names match exactly (with campus prefix)
        // 2. Base units match (handles "BSIT" vs "MAIN BSIT" on same campus)
        // 3. Raw units match (case-insensitive) - fallback for exact matches
        const rawUnitMatch = uRawUnit === userUnitRaw;
        const unitMatch = uFullUnit === userFullUnit || 
                         uBaseUnit === userBaseUnit || 
                         rawUnitMatch;
        
        // Debug logging for comparison (only log potential matches)
        if (campusMatch && u.approvalStatus === 'approved' && (uBaseUnit === userBaseUnit || uFullUnit === userFullUnit)) {
          console.log('🔍 Comparing potential conflict:', {
            existing: { 
              id: u._id,
              username: u.username,
              rawUnit: u.unit, 
              baseUnit: uBaseUnit, 
              fullUnit: uFullUnit, 
              campus: uCampus,
              role: u.role,
              status: u.approvalStatus
            },
            new: { 
              id: userId,
              username: user.username,
              rawUnit: user.unit, 
              baseUnit: userBaseUnit, 
              fullUnit: userFullUnit, 
              campus: userCampus 
            },
            unitMatch: unitMatch,
            campusMatch: campusMatch,
            willBeConflict: unitMatch && campusMatch && u.approvalStatus === 'approved'
          });
        }
        
        // MUST be approved status
        const isApproved = u.approvalStatus === 'approved';
        
        // Normalize role for comparison
        const uRole = (u.role || '').toLowerCase().trim();
        
        // For regular units: exclude ONLY system roles (admin, president, executive)
        // ALL other approved users are conflicts (including Program head, empty role, etc.)
        let isSystemRole = false;
        if (!isUniversityLevelOffice) {
          isSystemRole = uRole === 'admin' || uRole === 'president' || uRole === 'executive';
        } else {
          isSystemRole = uRole === 'admin';
        }
        
        // Check if this is a conflict
        const isConflict = unitMatch && campusMatch && isApproved && !isSystemRole;
        
        if (isConflict) {
          console.log('CONFLICT FOUND:', {
            existingUser: u.username,
            existingRawUnit: u.unit,
            existingBaseUnit: uBaseUnit,
            existingFullUnit: uFullUnit,
            existingRawCampus: u.campus,
            existingNormalizedCampus: uCampus,
            existingRole: u.role,
            newUser: user.username,
            newRawUnit: user.unit,
            newBaseUnit: userBaseUnit,
            newFullUnit: userFullUnit,
            newRawCampus: user.campus,
            newNormalizedCampus: userCampus,
            unitMatch: unitMatch,
            campusMatch: campusMatch
          });
        }
        
        return isConflict;
      });

      // Return the first conflict found (or null if none)
      const conflict = conflictingUsers.length > 0 ? conflictingUsers[0] : null;
      if (!conflict) {
        console.log('No conflict found - approval can proceed');
      }
      return conflict;
    };

    const showConflictModal = (existingUser) => {
      const approvedDate = existingUser.approvedAt 
        ? new Date(existingUser.approvedAt).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
          })
        : 'Unknown date';

      // Get campus display names (normalize consistently)
      const existingUserCampus = normalizeCampus(existingUser.campus);
      const newUserCampus = normalizeCampus(user.campus);
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
        // FINAL HARD CHECK: Refresh users and verify no conflict exists before approving
        // Even if autoSuspendConflict is true, we need to know about the conflict
        let finalConflictCheck = null;
        try {
          const token = localStorage.getItem('token');
          if (token) {
            const refreshResponse = await fetch(API_ENDPOINTS.auth.pendingUsers, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            });
            
            let freshUsersList = users;
            if (refreshResponse.ok) {
              try {
                const refreshData = await refreshResponse.json();
                freshUsersList = refreshData.users || users;
              } catch (jsonError) {
                console.error('Error parsing refresh response in final check:', jsonError);
                // Continue with current users state
              }
            }
            
            finalConflictCheck = checkForConflict(freshUsersList);
            if (finalConflictCheck && !autoSuspendConflict) {
              // Conflict detected - BLOCK approval and show modal
              console.error('BLOCKING APPROVAL - Conflict detected in final check:', finalConflictCheck);
              showConflictModal(finalConflictCheck);
              setUpdatingUserId(null);
              return; // STOP - Do not proceed
            }
          }
        } catch (refreshError) {
          console.error('Error refreshing users in final check:', refreshError);
          // Fallback: check with current state
          finalConflictCheck = checkForConflict(users);
          if (finalConflictCheck && !autoSuspendConflict) {
            console.error('BLOCKING APPROVAL - Conflict detected (using cached data):', finalConflictCheck);
            showConflictModal(finalConflictCheck);
            setUpdatingUserId(null);
            return;
          }
        }
        
        // If autoSuspendConflict is true, we're intentionally transferring program head
        // But still log it for debugging
        if (finalConflictCheck && autoSuspendConflict) {
          console.log('Approving with conflict transfer:', {
            newUser: user.username,
            existingUser: finalConflictCheck.username
          });
        }
        
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
        
        const response = await fetch(API_ENDPOINTS.auth.approveUser(userId), {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ autoSuspendConflict })
        });

        let data = {};
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            data = await response.json();
          } else {
            // If response is not JSON, create a data object
            data = { message: response.statusText || 'Approval request processed' };
          }
        } catch (jsonError) {
          console.error('Error parsing approval response:', jsonError);
          // If JSON parsing fails, create error data
          data = { 
            message: response.statusText || 'Failed to parse server response',
            error: jsonError.message 
          };
        }
        
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

          // Get campus display names (normalize consistently)
          const existingUserCampus = normalizeCampus(existingUser.campus);
          const newUserCampus = normalizeCampus(user.campus);
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
          // Refresh users list
          await fetchUsers();
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

    // CRITICAL: Refresh users list first to ensure we have latest data, then check for conflict
    // This MUST block approval if conflict exists
    let freshUsersList = users; // Will be updated with fresh data
    try {
      // Fetch fresh users data to ensure conflict check uses latest state
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('No token found, using current users state for conflict check');
      } else {
        const refreshResponse = await fetch(API_ENDPOINTS.auth.pendingUsers, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (refreshResponse.ok) {
          try {
            const refreshData = await refreshResponse.json();
            freshUsersList = refreshData.users || users;
            // Update state immediately so subsequent checks use fresh data
            setUsers(freshUsersList);
          } catch (jsonError) {
            console.error('Error parsing refresh response:', jsonError);
            // Continue with current users state
          }
        } else {
          console.warn('Refresh response not OK:', refreshResponse.status, 'Using current users state');
          // Continue with current users state
        }
      }
    } catch (refreshError) {
      console.error('Error refreshing users before conflict check:', refreshError);
      // Continue with current users state - don't block approval if refresh fails
    }
    
    // Check for conflict using fresh users data
    const existingActiveHead = checkForConflict(freshUsersList);
    if (existingActiveHead) {
      console.error('🚨 CONFLICT DETECTED - Blocking approval:', {
        newUser: user.username,
        newUnit: user.unit,
        newCampus: user.campus,
        existingUser: existingActiveHead.username,
        existingUnit: existingActiveHead.unit,
        existingCampus: existingActiveHead.campus,
        existingRole: existingActiveHead.role,
        existingStatus: existingActiveHead.approvalStatus,
        totalUsersChecked: freshUsersList.length,
        approvedUsersChecked: freshUsersList.filter(u => u.approvalStatus === 'approved').length
      });
      
      // Show conflict modal - this MUST block approval
      showConflictModal(existingActiveHead);
      
      // CRITICAL: Stop here - do NOT proceed with approval
      // The modal will handle the transfer if user confirms
      return;
    }
    
    // Log if no conflict found (for debugging)
    console.log('✅ No conflict found - can proceed with approval');

    // Show warning modal before approval
    const showApprovalWarning = () => {
      const userUnit = sanitizeUnitValue(user.unit);
      const userCampus = normalizeCampus(user.campus);
      const isUniversityLevelOffice = getUniversityLevelOffices().includes(userUnit);
      
      // Get unit display name
      const campusAbbr = getCampusAbbreviation(userCampus);
      const unitDisplay = campusAbbr ? `${campusAbbr} ${userUnit}` : userUnit;
      
      openModal({
        variant: 'confirm',
        title: 'Approve User',
        message: isUniversityLevelOffice 
          ? `Are you sure you want to approve ${user.username} for ${userUnit}?`
          : `Are you sure you want to approve ${user.username} for unit "${unitDisplay}" (${userCampus} campus)?`,
        confirmLabel: 'Approve',
        cancelLabel: 'Cancel',
        children: (
          <div className="space-y-3">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <svg className="w-5 h-5 text-blue-700 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm text-blue-700">
                  <p className="font-semibold mb-1">User Information:</p>
                  <p><strong>Name:</strong> {user.username}</p>
                  <p><strong>Email:</strong> {user.email}</p>
                  <p><strong>Unit:</strong> {unitDisplay}</p>
                  <p><strong>Campus:</strong> {userCampus}</p>
                </div>
              </div>
            </div>
            {isUniversityLevelOffice && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <svg className="w-5 h-5 text-yellow-700 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <div className="text-sm text-yellow-700">
                    <p className="font-semibold mb-1">⚠️ University-Level Office</p>
                    <p>This is a university-level office. Only one person can hold this position at a time.</p>
                  </div>
                </div>
              </div>
            )}
            <p className="text-sm text-gray-600">
              Once approved, this user will gain access to the system and be assigned as the program head for this unit.
            </p>
          </div>
        ),
        onConfirm: async () => {
          // Final conflict check right before approval (double-check with fresh data)
          try {
            const token = localStorage.getItem('token');
            if (token) {
              const finalRefreshResponse = await fetch(API_ENDPOINTS.auth.pendingUsers, {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              });
              
              if (finalRefreshResponse.ok) {
                const finalRefreshData = await finalRefreshResponse.json();
                const finalUsersList = finalRefreshData.users || users;
                const finalConflictCheck = checkForConflict(finalUsersList);
                
                if (finalConflictCheck) {
                  console.error('🚨 FINAL CONFLICT CHECK - Blocking approval at last moment:', finalConflictCheck);
                  showConflictModal(finalConflictCheck);
                  return; // Block approval - show conflict modal instead
                }
              }
            }
          } catch (finalCheckError) {
            console.error('Error in final conflict check:', finalCheckError);
            // Continue with approval if check fails (don't block user)
          }
          
          await executeApproval();
        }
      });
    };

    // If user is suspended, check for conflict again using fresh data
    if (user.approvalStatus === 'suspended') {
      // Re-check for conflict before re-approving suspended user (use fresh data from above)
      const conflictCheck = checkForConflict(freshUsersList);
      if (conflictCheck) {
        console.warn('CONFLICT DETECTED for suspended user - Blocking approval:', conflictCheck);
        showConflictModal(conflictCheck);
        return;
      }
      
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

    // For pending users, show warning modal first
    showApprovalWarning();
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

          let data = {};
          const contentType = response.headers.get('content-type');
          
          // Only try to parse JSON if the response has content
          if (response.status !== 204 && contentType && contentType.includes('application/json')) {
            try {
              data = await response.json();
            } catch (jsonError) {
              console.error('Error parsing delete response:', jsonError);
              // If JSON parsing fails, use status text
              data = { message: response.statusText || 'Failed to delete user' };
            }
          } else if (response.status === 204) {
            // No content response (204) means success
            data = { message: 'User deleted successfully' };
          }

          // Check if deletion was actually successful
          if (response.ok || response.status === 204) {
            // Refresh the user list first to verify deletion
            try {
              // Fetch updated users list
              const token = localStorage.getItem('token');
              const refreshResponse = await fetch(API_ENDPOINTS.auth.pendingUsers, {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              });

              if (refreshResponse.ok) {
                const refreshData = await refreshResponse.json();
                const updatedUsers = refreshData.users || [];
                
                // Verify the user was actually deleted by checking if they still exist in the updated list
                const userStillExists = updatedUsers.some(u => u._id === userId);
                
                if (userStillExists) {
                  // User still exists - deletion may have failed on backend
                  console.error('User still exists after deletion attempt:', userId, user.username);
                  showAlert({
                    variant: 'danger',
                    title: 'Deletion Verification Failed',
                    message: `The user "${user.username}" may not have been deleted from the database. The backend returned success, but the user still exists. Please contact support or check the backend logs.`
                  });
                  // Still refresh the UI with updated data
                  await fetchUsers();
                  return;
                }
                
                // User was successfully deleted - update state and show success
                setUsers(updatedUsers);
                showAlert({
                  variant: 'success',
                  title: 'User Deleted',
                  message: data.message || 'User deleted successfully!'
                });
              } else {
                // If refresh fails, still show success but warn about verification
                console.warn('Failed to verify deletion - refresh failed:', refreshResponse.status);
                await fetchUsers(); // Try the normal fetch anyway
                showAlert({
                  variant: 'warning',
                  title: 'User Deletion Initiated',
                  message: 'Delete request sent, but unable to verify deletion. Please refresh the page to confirm the user was deleted.'
                });
              }
            } catch (fetchError) {
              // If fetch fails, still show success but warn about verification
              console.error('Failed to refresh user list after deletion:', fetchError);
              // Try the normal fetchUsers anyway
              try {
                await fetchUsers();
              } catch (e) {
                console.error('fetchUsers also failed:', e);
              }
              showAlert({
                variant: 'warning',
                title: 'User Deletion Initiated',
                message: 'Delete request sent, but unable to verify deletion. Please refresh the page to confirm the user was deleted.'
              });
            }
          } else {
            // Show proper error message from backend
            const errorMessage = data?.message || data?.error || `Failed to delete user. (Status: ${response.status})`;
            console.error('Delete failed:', {
              status: response.status,
              statusText: response.statusText,
              data: data
            });
            showAlert({
              variant: 'danger',
              title: 'Action Failed',
              message: errorMessage
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

  // Pagination calculations
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  // Reset to page 1 when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Pagination handlers
  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const goToPreviousPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  };

  const goToNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
  };

  const renderActionButtons = (user) => {
    const buttons = [];
    const isProcessing = updatingUserId === user._id;

    // Edit button for all users
    buttons.push(
      <button
        key="edit"
        onClick={() => navigate(`/edit-user/${user._id}`)}
        disabled={isProcessing}
        className="tap-target bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed border border-blue-200 whitespace-nowrap h-7 flex items-center justify-center"
      >
        Edit
      </button>
    );

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

    // Normalize campus value consistently
    const campusValue = normalizeCampus(user.campus);

    // Check if this is a President user (by campus, role, or unit)
    // Case-insensitive check for President campus
    const roleLower = (user.role || '').toLowerCase().trim();
    const isPresidentUser =
      campusValue.toLowerCase() === 'president' ||
      roleLower === 'president' ||
      (roleLower === 'executive' && unitValue === 'Executive');
    
    // President users show unit without campus prefix
    if (isPresidentUser) {
      return (
        <div className="text-sm text-gray-900">
          {unitValue}
        </div>
      );
    }

    // Get campus abbreviation for other users
    let campusAbbr = getCampusAbbreviation(campusValue);
    
    // If no abbreviation found, default to Main (handles edge cases where campus value doesn't match)
    if (!campusAbbr && campusValue) {
      campusAbbr = getCampusAbbreviation('Main');
    }
    
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
    const unitValue = sanitizeUnitValue(user.unit);
    const universityLevelOffice = (user.universityLevelOffice || '').trim();
    
    // Check if user has a university-level office (from universityLevelOffice field or unit field)
    const userUniversityLevelOffice = universityLevelOffice || 
                                      (getUniversityLevelOffices().includes(unitValue) ? unitValue : '');
    
    // Map university-level offices to role display names
    if (userUniversityLevelOffice) {
      if (userUniversityLevelOffice === 'Office of the University President') {
        return (
          <div className="text-sm text-gray-900">
            PRESIDENT
          </div>
        );
      } else if (userUniversityLevelOffice === 'Office of the Vice President for Academic Affairs') {
        return (
          <div className="text-sm text-gray-900">
            Vice President
          </div>
        );
      } else if (userUniversityLevelOffice === 'Office of the Chancellor') {
        return (
          <div className="text-sm text-gray-900">
            Chancellor
          </div>
        );
      }
    }
    
    // Check if this is a President user (by campus, role, or unit) - legacy check
    const campusLower = (user.campus || '').toLowerCase().trim();
    const roleLower = (user.role || '').toLowerCase().trim();
    const isPresidentUser =
      campusLower === 'president' ||
      roleLower === 'president' ||
      (roleLower === 'executive' && unitValue === 'Executive');
    
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
              <div className="block md:hidden divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
                {paginatedUsers.map((user) => (
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

                      {/* Status */}
                      <div>
                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Status</div>
                        <div>{getStatusBadge(user.approvalStatus)}</div>
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
              <div className="hidden md:block table-responsive-wrapper max-h-[600px] overflow-y-auto">
                <table className="table-responsive min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 bg-gray-50">
                        User Info
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 bg-gray-50">
                        Unit
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 bg-gray-50">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 bg-gray-50">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 bg-gray-50">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {paginatedUsers.map((user) => (
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
                        <td className="px-6 py-4 whitespace-nowrap">
                          {renderActionButtons(user)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="border-t border-gray-200 px-4 sm:px-6 py-3 sm:py-4 bg-gray-50">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-sm text-gray-700">
                      Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                      <span className="font-medium">{Math.min(endIndex, filteredUsers.length)}</span> of{' '}
                      <span className="font-medium">{filteredUsers.length}</span> users
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={goToPreviousPage}
                        disabled={currentPage === 1}
                        className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
                      >
                        Previous
                      </button>
                      
                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                          // Show first page, last page, current page, and pages around current
                          if (
                            page === 1 ||
                            page === totalPages ||
                            (page >= currentPage - 1 && page <= currentPage + 1)
                          ) {
                            return (
                              <button
                                key={page}
                                onClick={() => goToPage(page)}
                                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                                  currentPage === page
                                    ? 'bg-gray-900 text-white'
                                    : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                                }`}
                              >
                                {page}
                              </button>
                            );
                          } else if (
                            page === currentPage - 2 ||
                            page === currentPage + 2
                          ) {
                            return (
                              <span key={page} className="px-2 text-gray-500">
                                ...
                              </span>
                            );
                          }
                          return null;
                        })}
                      </div>
                      
                      <button
                        onClick={goToNextPage}
                        disabled={currentPage === totalPages}
                        className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default Users;
