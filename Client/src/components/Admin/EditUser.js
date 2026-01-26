import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { API_ENDPOINTS, getAuthHeaders, getFileUrl } from '../../utils/api';
import Modal from '../common/Modal';

// Helper functions will use API data fetched in component

const EditUser = () => {
  const navigate = useNavigate();
  const { userId } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userData, setUserData] = useState({ unit: '', username: '', profilePicture: null });
  
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
  const getMainOfficeUnits = (officeName) => {
    const mainCampus = campuses.find(c => c.name === 'Main' || c.isMain);
    if (!mainCampus) return [];
    const office = offices.find(o => 
      o.name === officeName && 
      (o.campus?._id === mainCampus._id || o.campus?.name === 'Main') && 
      o.isActive
    );
    if (!office) return [];
    // Return units for this office - would need to fetch units separately
    return [];
  };
  const getExtensionCampusPrograms = (campusName) => {
    const campus = campuses.find(c => c.name === campusName && c.isActive);
    if (!campus) return [];
    return programs.filter(p => 
      (!p.campus || p.campus?._id === campus._id || p.campus?.name === campusName) && p.isActive
    ).map(p => p.name);
  };
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    campus: '',
    office: '',
    universityLevelOffice: '',
    unit: ''
  });
  const [selectedFaculty, setSelectedFaculty] = useState('');
  const [isSelectingProgram, setIsSelectingProgram] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [showWarningModal, setShowWarningModal] = useState(false);

  // Fetch admin user data for sidebar
  const fetchUserData = async () => {
    try {
      const response = await axios.get(API_ENDPOINTS.auth.me, {
        headers: getAuthHeaders()
      });
      setUserData({
        unit: response.data.unit || '',
        username: response.data.username || '',
        profilePicture: response.data.profilePicture 
          ? getFileUrl(response.data.profilePicture)
          : null
      });
    } catch (error) {
      console.error('Error fetching user data:', error);
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUserData({
            unit: parsedUser.unit || '',
            username: parsedUser.username || '',
            profilePicture: null
          });
        } catch (parseError) {
          console.error('Error parsing stored user data:', parseError);
        }
      }
    }
  };

  useEffect(() => {
    fetchUser();
    fetchUserData();
  }, [userId]);

  const fetchUser = async () => {
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
        const foundUser = data.users.find(u => u._id === userId);
        if (foundUser) {
          setUser(foundUser);
          initializeFormData(foundUser);
        } else {
          setMessage('User not found');
          setMessageType('error');
        }
      } else {
        setMessage(data.message || 'Failed to fetch user');
        setMessageType('error');
      }
    } catch (error) {
      setMessage('Network error. Please try again.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const initializeFormData = (userData) => {
    const userUnit = (userData.unit || '').trim();
    const userUniversityLevelOffice = (userData.universityLevelOffice || '').trim();
    const hasUniversityLevelOffice = getUniversityLevelOffices().includes(userUnit) || 
                                     getUniversityLevelOffices().includes(userUniversityLevelOffice);
    
    let universityLevelOffice = userUniversityLevelOffice;
    if (!universityLevelOffice && getUniversityLevelOffices().includes(userUnit)) {
      universityLevelOffice = userUnit;
    }
    
    let office = (userData.office || '').trim();
    let unit = userUnit;
    
    if (hasUniversityLevelOffice) {
      office = '';
      unit = '';
    }
    
    const mainCampus = campuses.find(c => c.name === 'Main' || c.isMain);
    const faculties = mainCampus ? faculties.filter(f => 
      (f.campus?._id === mainCampus._id || f.campus?.name === 'Main') && f.isActive
    ).map(f => f.name) : [];
    const isFaculty = faculties.includes(unit);
    let faculty = '';
    let selectingProgram = false;
    
    if (isFaculty) {
      faculty = unit;
      selectingProgram = true;
      unit = '';
    } else if (unit) {
      for (const faculty of faculties) {
        const facPrograms = getFacultyPrograms(faculty.name);
        if (programs.includes(unit)) {
          faculty = fac;
          selectingProgram = true;
          break;
        }
      }
    }
    
    setFormData({
      username: userData.username || '',
      email: userData.email || '',
      firstName: userData.firstName || '',
      lastName: userData.lastName || '',
      campus: (userData.campus || '').trim() || 'Main',
      office: office,
      universityLevelOffice: universityLevelOffice,
      unit: unit
    });
    setSelectedFaculty(faculty);
    setIsSelectingProgram(selectingProgram);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const newFormData = { ...formData };
    
    if (name === 'campus') {
      newFormData.campus = value;
      newFormData.office = '';
      newFormData.unit = '';
      newFormData.universityLevelOffice = value !== 'Main' ? '' : newFormData.universityLevelOffice;
      setSelectedFaculty('');
      setIsSelectingProgram(false);
    } else if (name === 'office') {
      newFormData.office = value;
      newFormData.unit = '';
      newFormData.universityLevelOffice = '';
      setSelectedFaculty('');
      setIsSelectingProgram(false);
    } else if (name === 'universityLevelOffice') {
      if (value && getUniversityLevelOffices().includes(value)) {
        newFormData.universityLevelOffice = value;
        newFormData.campus = 'Main';
        newFormData.office = '';
        newFormData.unit = '';
      } else {
        newFormData.universityLevelOffice = value;
        newFormData.office = '';
        newFormData.unit = '';
      }
      setSelectedFaculty('');
      setIsSelectingProgram(false);
    } else if (name === 'unit') {
      newFormData.unit = value;
      const mainCampus = campuses.find(c => c.name === 'Main' || c.isMain);
    const faculties = mainCampus ? faculties.filter(f => 
      (f.campus?._id === mainCampus._id || f.campus?.name === 'Main') && f.isActive
    ).map(f => f.name) : [];
      if (faculties.includes(value)) {
        setSelectedFaculty(value);
        setIsSelectingProgram(true);
      } else {
        setSelectedFaculty('');
        setIsSelectingProgram(false);
      }
    } else {
      newFormData[name] = value;
    }
    
    setFormData(newFormData);
  };

  const getOfficeOptions = () => {
    if (formData.campus === 'Main') {
      return [
        'External and Special Units',
        'Faculties',
        'Directorates',
        'Student Affairs and Services Offices',
        'University Registrar Offices',
        'National Service Training Program Offices',
        'University Library Services Offices'
      ];
    }
    return [];
  };

  const getUniversityLevelOfficeOptions = () => {
    if (formData.campus === 'Main') {
      return getUniversityLevelOffices();
    }
    return [];
  };

  const getUnitOptions = () => {
    if (!formData.campus) return [];
    
    if (formData.campus === 'Main') {
      if (!formData.office) return [];
      
      if (formData.office === 'Faculties') {
        if (isSelectingProgram && selectedFaculty) {
          return getFacultyPrograms(selectedFaculty);
        }
        const mainCampus = campuses.find(c => c.name === 'Main' || c.isMain);
        const mainFaculties = mainCampus ? faculties.filter(f => 
          (f.campus?._id === mainCampus._id || f.campus?.name === 'Main') && f.isActive
        ) : [];
        const facultyNames = mainFaculties.map(f => f.name);
        if (facultyNames.includes(formData.unit)) {
          return getFacultyPrograms(formData.unit);
        }
        // Check if unit is a program
        for (const faculty of mainFaculties) {
          const facPrograms = getFacultyPrograms(faculty.name);
          if (facPrograms.includes(formData.unit)) {
            return facPrograms;
          }
        }
        return facultyNames;
      }
      
      return getMainOfficeUnits(formData.office);
    } else {
      return getExtensionCampusPrograms(formData.campus);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.username || !formData.email) {
      setMessage('Username and email are required');
      setMessageType('error');
      return;
    }

    let unitValue = formData.unit;
    const universityLevelOfficeNames = getUniversityLevelOffices();
    if (formData.universityLevelOffice && universityLevelOfficeNames.includes(formData.universityLevelOffice)) {
      unitValue = formData.universityLevelOffice;
    }

    if (!unitValue && !formData.universityLevelOffice) {
      setMessage('Please select a unit or university-level office');
      setMessageType('error');
      return;
    }

    // Show warning modal before saving
    setShowWarningModal(true);
  };

  const executeSave = async () => {
    setShowWarningModal(false);
    
    let unitValue = formData.unit;
    const universityLevelOfficeNames = getUniversityLevelOffices();
    if (formData.universityLevelOffice && universityLevelOfficeNames.includes(formData.universityLevelOffice)) {
      unitValue = formData.universityLevelOffice;
    }

    try {
      setSaving(true);
      setMessage('');
      const token = localStorage.getItem('token');
      
      const response = await fetch(API_ENDPOINTS.auth.updateUser(userId), {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          campus: formData.campus,
          office: formData.office || '',
          universityLevelOffice: formData.universityLevelOffice || '',
          unit: unitValue
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('User updated successfully!');
        setMessageType('success');
        setTimeout(() => {
          navigate('/dashboard', { state: { section: 'users' } });
        }, 1500);
      } else {
        setMessage(data.message || 'Failed to update user');
        setMessageType('error');
      }
    } catch (error) {
      setMessage('Network error. Please try again.');
      setMessageType('error');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoutClick = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleSidebarNavigation = (section) => {
    // Close sidebar on mobile
    setSidebarOpen(false);
    // Navigate to dashboard with section state
    navigate('/dashboard', { 
      state: { section },
      replace: false
    });
  };

  const getRoleDisplay = (userData) => {
    if (!userData) return 'User';
    
    const unitValue = (userData.unit || '').trim();
    const universityLevelOffice = (userData.universityLevelOffice || '').trim();
    
    // Check if user has a university-level office (from universityLevelOffice field or unit field)
    const universityLevelOfficeNames = getUniversityLevelOffices();
    const userUniversityLevelOffice = universityLevelOffice || 
                                      (universityLevelOfficeNames.includes(unitValue) ? unitValue : '');
    
    // Map university-level offices to role display names
    if (userUniversityLevelOffice) {
      if (userUniversityLevelOffice === 'Office of the University President') {
        return 'PRESIDENT';
      } else if (userUniversityLevelOffice === 'Office of the Vice President for Academic Affairs') {
        return 'Vice President';
      } else if (userUniversityLevelOffice === 'Office of the Chancellor') {
        return 'Chancellor';
      }
    }
    
    // Default is the role from the user data, or "Program head" if unit is assigned
    return userData.role || (userData.unit ? 'Program head' : 'User');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex">
        <div className="flex-1 bg-gray-100 lg:ml-64 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-md p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-gray-900 mb-4">User Not Found</h2>
            <p className="text-gray-600 mb-4">The user you're looking for doesn't exist.</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full bg-gray-900 text-white py-2 px-4 rounded-lg hover:bg-gray-800 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-900/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed w-64 h-screen bg-gray-800 shadow-lg overflow-y-auto z-50 transform transition-transform duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0`}>
        {/* User Profile */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-medium-gray to-dark-charcoal rounded-full flex items-center justify-center overflow-hidden">
              {userData.profilePicture ? (
                <img 
                  src={userData.profilePicture} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white font-semibold text-sm">A</span>
              )}
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm">
                ADMIN
              </h3>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-6">
          <div className="px-4">
            <button
              onClick={() => handleSidebarNavigation('dashboard')}
              className="w-full flex items-center px-4 py-3 text-left rounded-lg mb-2 transition-colors tap-target text-gray-300 hover:bg-gray-700 hover:text-white"
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Dashboard
            </button>
            
            <button
              onClick={() => handleSidebarNavigation('offices')}
              className="w-full flex items-center px-4 py-3 text-left rounded-lg mb-2 transition-colors tap-target text-gray-300 hover:bg-gray-700 hover:text-white"
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Offices
            </button>

            <button
              onClick={() => handleSidebarNavigation('issp')}
              className="w-full flex items-center px-4 py-3 text-left rounded-lg mb-2 transition-colors tap-target text-gray-300 hover:bg-gray-700 hover:text-white"
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              ISSP
            </button>

            <button
              onClick={() => handleSidebarNavigation('users')}
              className="w-full flex items-center px-4 py-3 text-left rounded-lg mb-2 transition-colors tap-target bg-gray-700 text-white"
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Users
            </button>

            <button
              onClick={() => handleSidebarNavigation('logs')}
              className="w-full flex items-center px-4 py-3 text-left rounded-lg mb-2 transition-colors tap-target text-gray-300 hover:bg-gray-700 hover:text-white"
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Activity Log
            </button>

            <button
              onClick={() => {
                setSidebarOpen(false);
                navigate('/profile');
              }}
              className="w-full flex items-center px-4 py-3 text-left rounded-lg mb-2 transition-colors tap-target text-gray-300 hover:bg-gray-700 hover:text-white"
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Profile
            </button>
          </div>
        </nav>
        
        {/* Logout Button */}
        <div className="absolute bottom-4 sm:bottom-6 left-2 sm:left-4 right-2 sm:right-auto">
          <button 
            onClick={handleLogoutClick}
            className="bg-red-500 text-white py-2.5 sm:py-2 px-4 sm:px-20 w-full sm:w-56 rounded-lg font-medium transition-all duration-300 hover:bg-red-600 shadow-lg tap-target"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-gray-100 lg:ml-64">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-4 sm:px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              {/* Hamburger Menu Button */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors tap-target"
                aria-label="Toggle menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              {/* Back Arrow Button */}
              <button
                onClick={() => navigate('/dashboard', { state: { section: 'users' } })}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors tap-target"
                aria-label="Go back"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Edit User</h1>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {/* Header Section - Profile Style */}
            <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-xl shadow-lg p-6 sm:p-8 mb-6">
              <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
                <div className="relative">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center border-4 border-white shadow-lg">
                    <span className="text-gray-700 text-xl sm:text-2xl font-bold">
                      {user ? (user.username || 'U').charAt(0).toUpperCase() : 'U'}
                    </span>
                  </div>
                  <div className="absolute bottom-0 right-0 w-5 h-5 sm:w-6 sm:h-6 bg-green-500 rounded-full border-2 border-white"></div>
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <h1 className="text-xl sm:text-2xl font-bold text-white mb-1">{user?.username || 'User'}</h1>
                  <p className="text-gray-200 text-sm mb-2">{user?.email}</p>
                  <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                    <span className="inline-flex items-center px-3 py-1 bg-white/20 backdrop-blur-sm text-white rounded-full text-xs font-semibold uppercase tracking-wide">
                      {getRoleDisplay(user)}
                    </span>
                    <span className="inline-flex items-center px-3 py-1 bg-white/10 backdrop-blur-sm text-white rounded-full text-xs font-medium">
                      {user?.unit || 'No Unit'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Message */}
            {message && (
              <div className={`mb-6 p-4 rounded-xl ${
                messageType === 'success' 
                  ? 'bg-green-50 text-green-800 border border-green-200' 
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                {message}
              </div>
            )}

            {/* Form Card - Profile Style */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8">
              <div className="flex items-center space-x-2 mb-6">
                <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <h2 className="text-lg font-bold text-gray-900">Edit User Information</h2>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Username and Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Username *
                    </label>
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      disabled
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed text-gray-600 transition-all"
                      placeholder="Enter username"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1.5 flex items-center">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      This field cannot be edited
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      disabled
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed text-gray-600 transition-all"
                      placeholder="Enter email address"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1.5 flex items-center">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      This field cannot be edited
                    </p>
                  </div>
                </div>

                {/* First Name and Last Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      First Name
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      disabled
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed text-gray-600 transition-all"
                      placeholder="Enter first name"
                    />
                    <p className="text-xs text-gray-500 mt-1.5 flex items-center">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      This field cannot be edited
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Last Name
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      disabled
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed text-gray-600 transition-all"
                      placeholder="Enter last name"
                    />
                    <p className="text-xs text-gray-500 mt-1.5 flex items-center">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      This field cannot be edited
                    </p>
                  </div>
                </div>

                {/* Campus and Office */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Campus *
                    </label>
                    <select
                      name="campus"
                      value={formData.campus}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-all bg-white text-gray-900"
                      required
                    >
                      <option value="">Select Campus</option>
                      {getCampusOptions().map((campus) => (
                        <option key={campus} value={campus}>
                          {campus}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Office
                    </label>
                    <select
                      name="office"
                      value={formData.office}
                      onChange={handleChange}
                      disabled={formData.campus !== 'Main' || !!formData.universityLevelOffice}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-all bg-white disabled:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-500 text-gray-900"
                    >
                      <option value="">
                        {formData.campus !== 'Main' 
                          ? 'Not applicable' 
                          : formData.universityLevelOffice 
                            ? 'Not applicable with University-Level Office' 
                            : 'Select Office'}
                      </option>
                      {getOfficeOptions().map((office) => (
                        <option key={office} value={office}>
                          {office}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Unit and University-Level Offices */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Unit
                    </label>
                    <select
                      name="unit"
                      value={formData.unit}
                      onChange={handleChange}
                      disabled={
                        (formData.campus === 'Main' && !formData.office && !formData.universityLevelOffice) ||
                        !!formData.universityLevelOffice
                      }
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-all bg-white disabled:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-500 text-gray-900"
                      required={!formData.universityLevelOffice}
                    >
                      <option value="">
                        {formData.universityLevelOffice 
                          ? 'Not applicable with University-Level Office' 
                          : formData.campus === 'Main' && !formData.office
                            ? 'Select Office first'
                            : 'Select Unit'}
                      </option>
                      {getUnitOptions().map((unit) => (
                        <option key={unit} value={unit}>
                          {unit}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      University-Level Offices
                    </label>
                    <select
                      name="universityLevelOffice"
                      value={formData.universityLevelOffice}
                      onChange={handleChange}
                      disabled={formData.campus !== 'Main' || (!!formData.office && !!formData.unit)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-all bg-white disabled:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-500 text-gray-900"
                    >
                      <option value="">
                        {formData.campus !== 'Main' 
                          ? 'Not applicable' 
                          : (formData.office && formData.unit)
                            ? 'Not applicable with Office/Unit'
                            : 'Select University-Level Office'}
                      </option>
                      {getUniversityLevelOfficeOptions().map((office) => (
                        <option key={office} value={office}>
                          {office}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Buttons */}
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex justify-end gap-4">
                    <button
                      type="button"
                      onClick={() => navigate('/dashboard')}
                      className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-6 py-3 bg-gray-700 hover:bg-gray-800 text-white rounded-lg transition-all duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold shadow-md hover:shadow-lg flex items-center justify-center space-x-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>{saving ? 'Saving Changes...' : 'Save Changes'}</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Warning Modal */}
      <Modal
        isOpen={showWarningModal}
        variant="confirm"
        title="Confirm Changes"
        message="Are you sure you want to update the user's campus, office, unit, or university-level office?"
        confirmLabel="Save Changes"
        cancelLabel="Cancel"
        onClose={() => setShowWarningModal(false)}
        onConfirm={executeSave}
        closeOnOverlay={true}
        showCloseButton={true}
      >
        <div className="space-y-3">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <svg className="w-5 h-5 text-blue-700 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-blue-700">
                <p className="font-semibold mb-1">Note:</p>
                <p>Only the following fields can be edited:</p>
                <ul className="list-disc list-inside mt-1 space-y-0.5">
                  <li>Campus</li>
                  <li>Office</li>
                  <li>Unit</li>
                  <li>University-Level Offices</li>
                </ul>
                <p className="mt-2">Username, Email, First Name, and Last Name cannot be modified.</p>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default EditUser;
