import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Modal from '../common/Modal';
import { API_ENDPOINTS, getAuthHeaders } from '../../utils/api';

// Searchable dropdown: type to filter, click to select. Options are strings.
function SearchableSelect({ id, options = [], value, onChange, placeholder, disabled, className = '' }) {
  const [open, setOpen] = useState(false);
  const [inputText, setInputText] = useState(value || '');
  const containerRef = useRef(null);

  const filtered = options.filter((opt) =>
    String(opt).toLowerCase().includes((inputText || '').toLowerCase())
  );

  useEffect(() => {
    setInputText(value || '');
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setInputText(value || ''); // reset to selected value on blur
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [value]);

  const handleSelect = (opt) => {
    onChange(opt);
    setInputText(opt);
    setOpen(false);
  };

  const handleInputChange = (e) => {
    setInputText(e.target.value);
    setOpen(true);
    if (!e.target.value) onChange('');
  };

  const inputClass = `w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 min-h-[42px] ${className}`;
  return (
    <div ref={containerRef} className="relative">
      <input
        id={id}
        type="text"
        value={inputText}
        onChange={handleInputChange}
        onFocus={() => !disabled && setOpen(true)}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        className={inputClass}
      />
      {open && !disabled && (
        <ul
          className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg py-1"
          role="listbox"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-gray-500">No matches</li>
          ) : (
            filtered.map((opt) => (
              <li
                key={opt}
                role="option"
                aria-selected={opt === value}
                onClick={() => handleSelect(opt)}
                className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 ${opt === value ? 'bg-gray-50 font-medium' : ''}`}
              >
                {opt}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

const OVPAA_OFFICE_NAME = 'Office of the Vice President for Academic Affairs';

const defaultSuccessMessage =
  'Your account has been created successfully and is pending admin approval.';

const phrasesToStrip = [
  
];

const sanitizeSuccessMessage = (message) => {
  let text = message || defaultSuccessMessage;

  phrasesToStrip.forEach((pattern) => {
    text = text.replace(pattern, '');
  });

  const cleaned = text.replace(/\s{2,}/g, ' ').trim();
  return cleaned || defaultSuccessMessage;
};

// Strong password validation function
const validateStrongPassword = (password) => {
  const minLength = 12;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  if (password.length < minLength) {
    return { isValid: false, message: 'Password must be at least 12 characters long' };
  }
  if (!hasUpperCase) {
    return { isValid: false, message: 'Password must contain at least one uppercase letter' };
  }
  if (!hasLowerCase) {
    return { isValid: false, message: 'Password must contain at least one lowercase letter' };
  }
  if (!hasNumber) {
    return { isValid: false, message: 'Password must contain at least one number' };
  }
  if (!hasSpecialChar) {
    return { isValid: false, message: 'Password must contain at least one special character (!@#$%^&* etc.)' };
  }

  return { isValid: true, message: '' };
};

const Signup = () => {
  const [formData, setFormData] = useState({
    unit: '',
    office: '',
    campus: '',
    universityLevelOffice: '',
    program: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  
  // Data from API
  const [campuses, setCampuses] = useState([]);
  const [offices, setOffices] = useState([]);
  const [units, setUnits] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [universityLevelOffices, setUniversityLevelOffices] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'
  const [showModal, setShowModal] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: '',
    message: '',
    variant: 'brand',
    confirmLabel: 'Great'
  });
  const [selectedOffice, setSelectedOffice] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState('');
  const [isSelectingProgram, setIsSelectingProgram] = useState(false);

  // Fetch all data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingData(true);
        const [campusesRes, officesRes, facultiesRes, programsRes, universityLevelRes] = await Promise.all([
          axios.get(API_ENDPOINTS.organization.campuses.list, { headers: getAuthHeaders() }),
          axios.get(API_ENDPOINTS.organization.offices.list, { headers: getAuthHeaders() }),
          axios.get(API_ENDPOINTS.organization.faculties.list, { headers: getAuthHeaders() }),
          axios.get(API_ENDPOINTS.organization.programs.list, { headers: getAuthHeaders() }),
          axios.get(API_ENDPOINTS.organization.universityLevelOffices.list, { headers: getAuthHeaders() })
        ]);
        
        setCampuses(campusesRes.data.filter(c => c.isActive));
        setOffices(officesRes.data.filter(o => o.isActive));
        setFaculties(facultiesRes.data.filter(f => f.isActive));
        setPrograms(programsRes.data.filter(p => p.isActive));
        setUniversityLevelOffices(universityLevelRes.data.filter(u => u.isActive));
      } catch (error) {
        console.error('Error fetching organization data:', error);
        setMessage('Failed to load organization data. Please refresh the page.');
        setMessageType('error');
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, []);

  // Fetch units when office changes (e.g. "Office of the President" → show its units in Unit dropdown)
  useEffect(() => {
    const fetchUnits = async () => {
      if (!formData.office) {
        setUnits([]);
        return;
      }
      try {
        // Find office by name (offices are unique by name; may have no campus)
        const selectedOfficeObj = offices.find(o => o.name === formData.office);
        if (selectedOfficeObj) {
          const unitsRes = await axios.get(API_ENDPOINTS.organization.units.list, {
            params: { officeId: selectedOfficeObj._id },
            headers: getAuthHeaders()
          });
          setUnits(unitsRes.data.filter(u => u.isActive));
        } else {
          setUnits([]);
        }
      } catch (error) {
        console.error('Error fetching units:', error);
        setUnits([]);
      }
    };

    fetchUnits();
  }, [formData.office, offices]);

  // Get campus options
  const getCampusOptions = () => {
    return campuses.map(c => c.name);
  };

  // Get office options: show all offices from Office Management regardless of campus (Main or Extension)
  const getOfficeOptions = () => {
    if (!formData.campus) return [];
    // Return all active offices (unique by name) — same list for Main and Extension
    const uniqueOfficeNames = [...new Set(offices.map(o => o.name))];
    return uniqueOfficeNames;
  };

  // Get University-Level Offices options
  const getUniversityLevelOfficeOptions = () => {
    // Only show options for Main campus
    if (formData.campus === 'Main') {
      return universityLevelOffices.map(o => o.name);
    }
    // For other campuses, return empty (will show "Not applicable")
    return [];
  };

  // Get program options: OVPAA + unit selected → programs registered to that unit (and campus when set on the program)
  const getProgramOptions = () => {
    if (formData.office !== OVPAA_OFFICE_NAME || !formData.unit) return [];
    const selectedCampus = campuses.find((c) => c.name === formData.campus);
    if (!selectedCampus) return [];
    const selectedUnit = units.find((u) => u.name === formData.unit);
    if (!selectedUnit) return [];

    const matchesUnit = (p) => {
      const pUnit = p.unit?._id || p.unit;
      if (pUnit && selectedUnit._id && String(pUnit) === String(selectedUnit._id)) return true;
      return p.unit?.name === formData.unit;
    };

    // If the program has no campus, it is offered for any campus under this unit
    const matchesCampus = (p) => {
      if (!p.campus) return true;
      return (
        p.campus?._id === selectedCampus._id ||
        p.campus?.name === formData.campus
      );
    };

    const unitPrograms = programs.filter(
      (p) => p.isActive && matchesUnit(p) && matchesCampus(p)
    );
    const names = [...new Set(unitPrograms.map((p) => p.name))];
    return names.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  };

  // Get units for selected office (when user selects an office like "Office of the President")
  const getUnitsForOffice = () => {
    if (formData.office) {
      return units.map(u => u.name);
    }
    return [];
  };

  // Get the current display value for the unit dropdown
  const getUnitDisplayValue = () => {
    if (!formData.unit) return '';
    
    // Check if Faculties is selected (either as office for Main or universityLevelOffice for others)
    const isFacultiesSelected = (formData.campus === 'Main' && formData.office === 'Faculties') || 
                                (formData.campus !== 'Main' && formData.universityLevelOffice === 'Faculties');
    
    // For extension campuses, check if office (faculty) is selected
    const isExtensionCampusFacultySelected = formData.campus && formData.campus !== 'Main' && formData.office;
    
    if (isFacultiesSelected) {
      // Check if unit is a faculty name
      const facultyNames = faculties.map(f => f.name);
      if (facultyNames.includes(formData.unit)) {
        return ''; // Return empty to show programs
      }
      // Otherwise, it's a program name (final value)
      return formData.unit;
    }
    
    // For extension campuses: if unit is a faculty name, return empty to show programs
    if (isExtensionCampusFacultySelected) {
      const selectedCampus = campuses.find(c => c.name === formData.campus);
      if (selectedCampus) {
        const campusFaculties = faculties.filter(f => 
          f.campus?._id === selectedCampus._id || f.campus?.name === formData.campus
        );
        const facultyNames = campusFaculties.map(f => f.name);
        if (facultyNames.includes(formData.unit)) {
          return ''; // Return empty to show programs
        }
      }
    }
    
    return formData.unit;
  };

  // Generate unit options based on selected campus and office
  const getUnitOptions = () => {
    if (!formData.campus) return [];
    
    if (formData.campus === 'Main') {
      // Need office to be selected first (not university-level office)
      if (!formData.office) {
        return [];
      }
      
      // Special handling for Faculties - cascading dropdown
      if (formData.office === 'Faculties') {
        const mainCampus = campuses.find(c => c.name === 'Main' || c.isMain);
        if (!mainCampus) return [];
        const filterProgramsByCampus = (programList) =>
          programList.filter(
            (p) =>
              p.campus &&
              (p.campus?._id === mainCampus._id || p.campus?.name === 'Main')
          );
        
        const mainFaculties = faculties.filter(f => 
          f.campus?._id === mainCampus._id || f.campus?.name === 'Main'
        );
        const facultyNames = mainFaculties.map(f => f.name);
        
        // Check if unit value is a faculty name (user just selected a faculty)
        const isFacultySelected = formData.unit && facultyNames.includes(formData.unit);
        
        // If a faculty is selected (either via selectedFaculty state or formData.unit), show programs
        if (isFacultySelected || (selectedFaculty && isSelectingProgram)) {
          const faculty = selectedFaculty || formData.unit;
          const facultyObj = mainFaculties.find(f => f.name === faculty);
          if (facultyObj) {
            const allFacultyPrograms = programs.filter(p => 
              p.faculty?._id === facultyObj._id || p.faculty?.name === faculty
            );
            const facultyPrograms = filterProgramsByCampus(allFacultyPrograms);
            return [...new Set(facultyPrograms.map(p => p.name))];
          }
          return [];
        }
        
        // Check if unit is a program (find which faculty it belongs to)
        let programFaculty = null;
        if (formData.unit && !isFacultySelected) {
          // Find which faculty contains this program
          for (const faculty of mainFaculties) {
            const allFacultyPrograms = programs.filter(p => 
              p.faculty?._id === faculty._id || p.faculty?.name === faculty.name
            );
            const facultyPrograms = filterProgramsByCampus(allFacultyPrograms);
            if (facultyPrograms.some(p => p.name === formData.unit)) {
              programFaculty = faculty;
              break;
            }
          }
        }
        
        // If unit is a program (final value), show that faculty's programs so it's visible
        if (programFaculty) {
          const allFacultyPrograms = programs.filter(p => 
            p.faculty?._id === programFaculty._id || p.faculty?.name === programFaculty.name
          );
          const facultyPrograms = filterProgramsByCampus(allFacultyPrograms);
          return [...new Set(facultyPrograms.map(p => p.name))];
        }
        
        // If no faculty selected yet, show all faculties (user must select faculty first)
        return facultyNames;
      }
      
      // For other offices, return the units directly
      return getUnitsForOffice();
    } else {
      // For Extension campuses: show units under selected office, or faculty → programs
      const selectedCampus = campuses.find(c => c.name === formData.campus);
      if (!selectedCampus) return [];
      
      if (formData.office) {
        const campusFaculties = faculties.filter(f => 
          f.campus?._id === selectedCampus._id || f.campus?.name === formData.campus
        );
        const selectedFaculty = campusFaculties.find(f => f.name === formData.office);
        // If selected "office" is a regular office (not a faculty), show units under that office
        if (!selectedFaculty && getUnitsForOffice().length > 0) {
          return getUnitsForOffice();
        }
        if (selectedFaculty) {
          // Check if unit value is a faculty name (user just selected a faculty)
          const facultyNames = campusFaculties.map(f => f.name);
          const isFacultySelected = facultyNames.includes(formData.unit);
          
          // Filter programs by faculty AND campus (for extension campuses, only show programs for this campus or programs without campus)
          const filterProgramsByCampus = (programList) => {
            return programList.filter(p => {
              // Program must belong to the selected faculty
              const belongsToFaculty = p.faculty?._id === selectedFaculty._id || p.faculty?.name === formData.office;
              if (!belongsToFaculty) return false;
              
              // Only show programs explicitly assigned to the selected campus
              if (!p.campus) return false;
              return p.campus?._id === selectedCampus._id || p.campus?.name === formData.campus;
            });
          };
          
          // If a faculty is selected but program not yet selected, show programs
          if ((selectedFaculty && isSelectingProgram) || isFacultySelected) {
            const faculty = selectedFaculty.name;
            const allFacultyPrograms = programs.filter(p => 
              p.faculty?._id === selectedFaculty._id || p.faculty?.name === faculty
            );
            const facultyPrograms = filterProgramsByCampus(allFacultyPrograms);
            return [...new Set(facultyPrograms.map(p => p.name))];
          }
          
          // Check if unit is a program (find which faculty it belongs to)
          let programFaculty = null;
          if (formData.unit && !isFacultySelected) {
            // Find which faculty contains this program
            for (const faculty of campusFaculties) {
              const allFacultyPrograms = programs.filter(p => 
                p.faculty?._id === faculty._id || p.faculty?.name === faculty.name
              );
              const facultyPrograms = filterProgramsByCampus(allFacultyPrograms);
              if (facultyPrograms.some(p => p.name === formData.unit)) {
                programFaculty = faculty;
                break;
              }
            }
          }
          
          // If unit is a program (final value), show that faculty's programs so it's visible
          if (programFaculty) {
            const allFacultyPrograms = programs.filter(p => 
              p.faculty?._id === programFaculty._id || p.faculty?.name === programFaculty.name
            );
            const facultyPrograms = filterProgramsByCampus(allFacultyPrograms);
            return [...new Set(facultyPrograms.map(p => p.name))];
          }
          
          // Show programs for selected faculty
          const allFacultyPrograms = programs.filter(p => 
            p.faculty?._id === selectedFaculty._id || p.faculty?.name === formData.office
          );
          const facultyPrograms = filterProgramsByCampus(allFacultyPrograms);
          return [...new Set(facultyPrograms.map(p => p.name))];
        }
      }
      
      // If no faculty selected yet, return empty (user needs to select faculty first)
      return [];
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // If campus changes, reset office and selection state (but preserve firstName, lastName, email, password)
    if (name === 'campus') {
      setFormData({
        ...formData, // Preserve firstName, lastName, email, password, confirmPassword
        campus: value,
        office: '', // Clear office
        unit: '', // Clear unit
        program: '', // Clear program
        universityLevelOffice: value !== 'Main' ? '' : formData.universityLevelOffice // Clear if not Main
      });
      setSelectedOffice('');
      setSelectedFaculty('');
      setIsSelectingProgram(false);
    } else if (name === 'office') {
      // When office changes, clear unit and program
      setFormData({
        ...formData,
        office: value,
        unit: '',
        program: '',
        universityLevelOffice: '' // Clear university-level office when regular office is selected
      });
      setSelectedFaculty('');
      setIsSelectingProgram(false);
    } else if (name === 'unit') {
      // When unit changes and office is OVPAA, clear program so user picks from programs for new unit
      setFormData({
        ...formData,
        [name]: value,
        ...(formData.office === OVPAA_OFFICE_NAME ? { program: '' } : {})
      });
    } else if (name === 'universityLevelOffice') {
      // When University-Level Office is selected
      if (value) {
        // If it's a university-level office, auto-set campus to Main
        const universityLevelOfficeNames = universityLevelOffices.map(o => o.name);
        if (universityLevelOfficeNames.includes(value)) {
          setFormData({
            ...formData,
            universityLevelOffice: value,
            campus: 'Main', // Auto-set to Main
            office: '', // Clear office
            unit: '', // Clear unit
            program: '' // Clear program
          });
          setSelectedOffice('');
          setSelectedFaculty('');
          setIsSelectingProgram(false);
        } else {
          // For other campuses, just set the office (it's acting as a regular office)
          setFormData({
            ...formData,
            universityLevelOffice: value,
            office: '', // Clear regular office
            unit: '', // Clear unit
            program: '' // Clear program
          });
          setSelectedOffice('');
          setSelectedFaculty('');
          setIsSelectingProgram(false);
        }
      } else {
        // If cleared, just update the field
        setFormData({
          ...formData,
          universityLevelOffice: value
        });
      }
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    
    // Validation
    // Check if Unit is selected (mutually exclusive with office)
    const hasUniversityLevelOffice = formData.universityLevelOffice && formData.universityLevelOffice.trim() !== '';
    const hasOffice = formData.office && formData.office.trim() !== '';
    
    if (hasUniversityLevelOffice && hasOffice) {
      setMessage('Please select either Unit OR Office, not both');
      setMessageType('error');
      setLoading(false);
      return;
    }
    
    // For Main campus, ensure either Unit OR office is selected
    if (formData.campus === 'Main') {
      if (!hasUniversityLevelOffice && (!formData.office || formData.office.trim() === '')) {
        setMessage('Please select either a Unit or a regular Office');
        setMessageType('error');
        setLoading(false);
        return;
      }
      
      // Program is required only when office is OVPAA and a unit is selected
      if (formData.office === OVPAA_OFFICE_NAME && formData.unit && (!formData.program || formData.program.trim() === '')) {
        setMessage('Please select a program');
        setMessageType('error');
        setLoading(false);
        return;
      }
    } else {
      // For extension campuses, office is required
      if (!formData.office || formData.office.trim() === '') {
        setMessage('Please select an office');
        setMessageType('error');
        setLoading(false);
        return;
      }
      // Program is required only when office is OVPAA and a unit is selected
      if (formData.office === OVPAA_OFFICE_NAME && formData.unit && (!formData.program || formData.program.trim() === '')) {
        setMessage('Please select a program');
        setMessageType('error');
        setLoading(false);
        return;
      }
    }
    
    // Validate first name and last name
    if (!formData.firstName || formData.firstName.trim() === '') {
      setMessage('Please enter your first name');
      setMessageType('error');
      setLoading(false);
      return;
    }
    
    if (!formData.lastName || formData.lastName.trim() === '') {
      setMessage('Please enter your last name');
      setMessageType('error');
      setLoading(false);
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setMessage('Passwords do not match');
      setMessageType('error');
      setLoading(false);
      return;
    }

    // Strong password validation
    const passwordValidation = validateStrongPassword(formData.password);
    if (!passwordValidation.isValid) {
      setMessage(passwordValidation.message);
      setMessageType('error');
      setLoading(false);
      return;
    }
    
    try {
      // Combine first name and last name into username
      const username = `${formData.firstName.trim()} ${formData.lastName.trim()}`;
      
      // Unit value priority:
      // 1) University-level office name (special flow)
      // 2) Selected program (e.g., BSIT) when available
      // 3) Selected unit as fallback
      const universityLevelOfficeNames = universityLevelOffices.map(o => o.name);
      const unitValue = hasUniversityLevelOffice && universityLevelOfficeNames.includes(formData.universityLevelOffice)
        ? formData.universityLevelOffice
        : (formData.office && (formData.program || formData.unit) ? (formData.program || formData.unit) : '');
      
      const response = await fetch(API_ENDPOINTS.auth.signup, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          unit: unitValue,
          campus: formData.campus,
          office: formData.office || '',
          universityLevelOffice: formData.universityLevelOffice || '',
          program: formData.program || '',
          firstName: formData.firstName,
          lastName: formData.lastName,
          username: username,
          email: formData.email,
          password: formData.password
        }),
      });

      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        // If response is not JSON, handle as text error
        const textError = await response.text();
        setMessage(textError || 'Signup failed. Please try again.');
        setMessageType('error');
        setLoading(false);
        return;
      }

      if (response.ok) {
        setModalConfig({
          title: 'Registration Successful!',
          message: sanitizeSuccessMessage(data.message),
          variant: 'brand',
          confirmLabel: 'Got it'
        });
        setShowModal(true);

        setFormData({
          unit: '',
          office: '',
          campus: '',
          universityLevelOffice: '',
          program: '',
          firstName: '',
          lastName: '',
          email: '',
          password: '',
          confirmPassword: ''
        });
        setSelectedOffice('');
        setSelectedFaculty('');
        setIsSelectingProgram(false);
      } else {
        setMessage(data.message || data.error || 'Signup failed. Please try again.');
        setMessageType('error');
      }
    } catch (error) {
      console.error('Signup error:', error);
      setMessage(error.message || 'Network error. Please check if the server is running.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleModalConfirm = () => {
    setShowModal(false);
  };

  if (loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center padding-responsive bg-gradient-to-br from-dark-charcoal via-medium-gray to-darker-charcoal">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading organization data...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Modal
        isOpen={showModal}
        variant={modalConfig.variant}
        title={modalConfig.title}
        message={modalConfig.message}
        confirmLabel={modalConfig.confirmLabel}
        cancelLabel={null}
        onClose={() => setShowModal(false)}
        onConfirm={handleModalConfirm}
        closeOnOverlay={false}
      />
      
      <div className="min-h-screen flex items-center justify-center padding-responsive bg-gradient-to-br from-dark-charcoal via-medium-gray to-darker-charcoal">
        <div className="w-full max-w-2xl">
          <div className="bg-white/95 backdrop-blur-xl rounded-xl sm:rounded-2xl padding-responsive shadow-lg border border-white/10">
            <div className="text-center mb-6 sm:mb-8">
              <div className="text-xs font-semibold tracking-[0.35em] text-gray-400 uppercase mb-3">
                BloomNode
              </div>
              <h1 className="text-responsive-xl font-semibold text-gray-900 mb-2 tracking-tight">
                Create account
              </h1>
            </div>
        
            {/* Message Display */}
            {message && (
              <div
                className={`mb-4 sm:mb-6 rounded-lg px-4 py-3 text-responsive-sm font-medium ${
                  messageType === 'success'
                    ? 'bg-green-50 text-green-800 border border-green-100'
                    : 'bg-red-50 text-red-800 border border-red-100'
                }`}
              >
                {message}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              {/* Top row: Campus + Office */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="form-group-responsive">
                  <label
                    htmlFor="campus"
                    className="block text-gray-700 text-responsive-sm font-medium mb-1.5"
                  >
                    Campus
                  </label>
                  <SearchableSelect
                    id="campus"
                    placeholder="Select a campus"
                    options={getCampusOptions()}
                    value={formData.campus}
                    onChange={(val) => {
                      setSelectedOffice('');
                      setSelectedFaculty('');
                      setIsSelectingProgram(false);
                      setFormData((prev) => {
                        const newCampus = val || '';
                        return {
                          ...prev,
                          campus: newCampus,
                          office: '',
                          unit: '',
                          program: '',
                          universityLevelOffice: newCampus === 'Main' ? prev.universityLevelOffice : ''
                        };
                      });
                    }}
                    disabled={loading || loadingData}
                  />
                </div>

                {/* Office */}
                <div className="form-group-responsive">
                  <label
                    htmlFor="office"
                    className="block text-gray-700 text-responsive-sm font-medium mb-1.5"
                  >
                    Office
                  </label>
                  <SearchableSelect
                    id="office"
                    placeholder={
                      formData.universityLevelOffice
                        ? 'Not applicable with Unit'
                        : formData.campus
                          ? 'Select an office'
                          : 'Select campus first'
                    }
                    options={getOfficeOptions()}
                    value={formData.office}
                    onChange={(val) => {
                      setSelectedFaculty('');
                      setIsSelectingProgram(false);
                      setFormData((prev) => ({
                        ...prev,
                        office: val || '',
                        unit: '',
                        program: '',
                        universityLevelOffice: ''
                      }));
                    }}
                    disabled={loading || loadingData || !formData.campus || (formData.campus === 'Main' && !!formData.universityLevelOffice)}
                  />
                </div>
              </div>

              {/* Unit and Program - Side by side */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Unit: shows units under selected office, or university-level options when no office selected (Main only) */}
                <div className="form-group-responsive">
                  <label
                    htmlFor={formData.office ? 'unit' : 'universityLevelOffice'}
                    className="block text-gray-700 text-responsive-sm font-medium mb-1.5"
                  >
                    Unit
                  </label>
                  <SearchableSelect
                    id={formData.office ? 'unit' : 'universityLevelOffice'}
                    placeholder={
                      !formData.campus
                        ? 'Select campus first'
                        : formData.campus === 'Main' && !formData.office && !formData.universityLevelOffice
                          ? 'Select office first'
                          : formData.campus !== 'Main' && !formData.office
                            ? 'Select office first'
                            : 'Select unit'
                    }
                    options={formData.office ? getUnitOptions() : getUniversityLevelOfficeOptions()}
                    value={formData.office ? formData.unit : formData.universityLevelOffice}
                    onChange={(val) => setFormData((prev) => {
                      const value = val || '';
                      if (prev.office) {
                        return { ...prev, unit: value, program: prev.office === OVPAA_OFFICE_NAME ? '' : prev.program };
                      }
                      return { ...prev, universityLevelOffice: value, office: '', unit: '', program: '' };
                    })}
                    disabled={loading || loadingData || !formData.campus || (formData.campus === 'Main' && !formData.office && !formData.universityLevelOffice) || (formData.campus !== 'Main' && !formData.office)}
                  />
                </div>

                {/* Program: when office is OVPAA and unit selected, show programs for that unit; otherwise show "Not applicable" */}
                <div className="form-group-responsive">
                  <label
                    htmlFor="program"
                    className="block text-gray-700 text-responsive-sm font-medium mb-1.5"
                  >
                    Program
                  </label>
                  <SearchableSelect
                    id="program"
                    placeholder={
                      !formData.office
                        ? 'Select office first'
                        : formData.office !== OVPAA_OFFICE_NAME
                          ? 'Not applicable'
                          : !formData.unit
                            ? 'Select unit first'
                            : 'Select program'
                    }
                    options={formData.office === OVPAA_OFFICE_NAME ? getProgramOptions() : []}
                    value={formData.office === OVPAA_OFFICE_NAME ? formData.program : ''}
                    onChange={(val) => setFormData((prev) => ({ ...prev, program: val || '' }))}
                    disabled={loading || loadingData || !formData.office || formData.office !== OVPAA_OFFICE_NAME || (formData.office === OVPAA_OFFICE_NAME && !formData.unit)}
                  />
                </div>
              </div>

              {/* First name and Last name - Side by side */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="form-group-responsive">
                  <label
                    htmlFor="firstName"
                    className="block text-gray-700 text-responsive-sm font-medium mb-1.5"
                  >
                    First name
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    className="input-responsive tap-target"
                    placeholder="Enter your first name"
                    required
                    disabled={loading}
                  />
                </div>

                <div className="form-group-responsive">
                  <label
                    htmlFor="lastName"
                    className="block text-gray-700 text-responsive-sm font-medium mb-1.5"
                  >
                    Last name
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    className="input-responsive tap-target"
                    placeholder="Enter your last name"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Middle: Email full width */}
              <div className="form-group-responsive">
                <label
                  htmlFor="email"
                  className="block text-gray-700 text-responsive-sm font-medium mb-1.5"
                >
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="input-responsive tap-target"
                  placeholder="you@example.com"
                  required
                  disabled={loading}
                />
              </div>

              {/* Bottom row: Password + Confirm password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="form-group-responsive">
                  <label
                    htmlFor="password"
                    className="block text-gray-700 text-responsive-sm font-medium mb-1.5"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className="input-responsive tap-target pr-10"
                      placeholder="Create a password (min 12 characters)"
                      required
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-0 top-0 bottom-0 flex items-center justify-center w-10 text-gray-400 hover:text-gray-600 tap-target select-none-mobile"
                      tabIndex={-1}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 sm:h-4 sm:w-4"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 sm:h-4 sm:w-4"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div className="form-group-responsive">
                  <label
                    htmlFor="confirmPassword"
                    className="block text-gray-700 text-responsive-sm font-medium mb-1.5"
                  >
                    Confirm password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="input-responsive tap-target pr-10"
                      placeholder="Confirm your password"
                      required
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute right-0 top-0 bottom-0 flex items-center justify-center w-10 text-gray-400 hover:text-gray-600 tap-target select-none-mobile"
                      tabIndex={-1}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 sm:h-4 sm:w-4"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 sm:h-4 sm:w-4"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || loadingData}
                className="btn-responsive w-full bg-gradient-to-r from-medium-gray to-dark-charcoal text-white hover:from-light-gray hover:to-darkest-gray disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>

            <div className="text-center mt-6 pt-4 border-t border-gray-100">
              <p className="text-gray-600 text-responsive-sm">
                Already have an account?{' '}
                <Link
                  to="/login"
                  className="text-medium-gray font-semibold hover:text-dark-charcoal transition-colors duration-200"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Signup;
