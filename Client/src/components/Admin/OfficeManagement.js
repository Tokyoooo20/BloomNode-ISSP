import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_ENDPOINTS, getAuthHeaders } from '../../utils/api';
import Modal from '../common/Modal';

const OVPAA_OFFICE_NAME = 'Office of the Vice President for Academic Affairs';

const OfficeManagement = () => {
  const [activeTab, setActiveTab] = useState('campuses');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Data states
  const [campuses, setCampuses] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [offices, setOffices] = useState([]);
  const [units, setUnits] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [yearCycles, setYearCycles] = useState([]);
  const [selectedOfficeIdForUnits, setSelectedOfficeIdForUnits] = useState('');
  const [unitsUnderOffice, setUnitsUnderOffice] = useState([]);
  const [unitsPage, setUnitsPage] = useState(1);
  const [unitsPerPage] = useState(10);
  const [selectedOfficeIdForPrograms, setSelectedOfficeIdForPrograms] = useState('');
  const [unitsUnderOvpaa, setUnitsUnderOvpaa] = useState([]);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(''); // 'create' or 'edit'
  const [modalEntity, setModalEntity] = useState(''); // 'campus', 'faculty', etc.
  const [editingItem, setEditingItem] = useState(null);
  const [showUpdateConfirmation, setShowUpdateConfirmation] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null); // { entity, item }
  const [showOverlapWarning, setShowOverlapWarning] = useState(false);
  const [overlappingCycles, setOverlappingCycles] = useState([]);
  const formRef = useRef(null);
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    campus: '',
    office: '',
    unit: '',
    faculty: '',
    isActive: true,
    order: 0
  });

  const tabs = [
    { id: 'campuses', label: 'Campuses' },
    { id: 'faculties', label: 'Faculties' },
    { id: 'programs', label: 'Programs' },
    { id: 'offices', label: 'Offices' },
    { id: 'units', label: 'Units' },
    { id: 'yearCycles', label: 'Year Cycles' }
  ];

  // Fetch all data
  useEffect(() => {
    fetchCampuses();
    fetchFaculties();
    fetchOffices();
    fetchPrograms();
    fetchYearCycles();
  }, []);

  // Fetch units: all when no office selected, or only under selected office
  useEffect(() => {
    const load = async () => {
      const list = await fetchUnits(selectedOfficeIdForUnits || null);
      setUnitsUnderOffice(list || []);
      setUnitsPage(1);
    };
    load();
  }, [selectedOfficeIdForUnits]);

  // Fetch units under OVPAA when Program modal is open
  useEffect(() => {
    const ovpaa = offices.find((o) => o.name === OVPAA_OFFICE_NAME);
    if (showModal && modalEntity === 'program' && ovpaa) {
      fetchUnits(ovpaa._id).then((list) => setUnitsUnderOvpaa(list || []));
    } else {
      setUnitsUnderOvpaa([]);
    }
  }, [showModal, modalEntity, offices]);
  
  // Fetch functions
  const fetchCampuses = async () => {
    try {
      const response = await axios.get(API_ENDPOINTS.organization.campuses.list, {
        headers: getAuthHeaders()
      });
      setCampuses(response.data);
    } catch (err) {
      console.error('Error fetching campuses:', err);
    }
  };

  const fetchFaculties = async () => {
    try {
      const response = await axios.get(API_ENDPOINTS.organization.faculties.list, {
        headers: getAuthHeaders()
      });
      setFaculties(response.data);
    } catch (err) {
      console.error('Error fetching faculties:', err);
    }
  };

  const fetchOffices = async () => {
    try {
      const response = await axios.get(API_ENDPOINTS.organization.offices.list, {
        headers: getAuthHeaders()
      });
      setOffices(response.data);
    } catch (err) {
      console.error('Error fetching offices:', err);
    }
  };

  const fetchUnits = async (officeId = null) => {
    try {
      const config = { headers: getAuthHeaders() };
      if (officeId) config.params = { officeId };
      const response = await axios.get(API_ENDPOINTS.organization.units.list, config);
      return response.data;
    } catch (err) {
      console.error('Error fetching units:', err);
      return [];
    }
  };

  const fetchPrograms = async () => {
    try {
      const response = await axios.get(API_ENDPOINTS.organization.programs.list, {
        headers: getAuthHeaders()
      });
      setPrograms(response.data);
    } catch (err) {
      console.error('Error fetching programs:', err);
    }
  };

  const fetchYearCycles = async () => {
    try {
      const response = await axios.get(API_ENDPOINTS.organization.yearCycles.list, {
        headers: getAuthHeaders()
      });
      setYearCycles(response.data);
    } catch (err) {
      console.error('Error fetching year cycles:', err);
    }
  };

  // Handle create
  const handleCreate = (entity) => {
    setModalType('create');
    setModalEntity(entity);
    setEditingItem(null);
    const ovpaaOffice = offices.find((o) => o.name === OVPAA_OFFICE_NAME);
    setFormData({
      name: '',
      campus: entity === 'office' ? '' : '',
      office: entity === 'unit' ? (selectedOfficeIdForUnits || '') : '',
      unit: entity === 'program' ? '' : '',
      faculty: '',
      isActive: true,
      order: 0
    });
    setShowModal(true);
  };

  // Handle edit
  const handleEdit = (entity, item) => {
    setModalType('edit');
    setModalEntity(entity);
    setEditingItem(item);
    setFormData({
      name: item.name || '',
      campus: entity === 'office' ? '' : (item.campus?._id || item.campus || ''),
      office: item.office?._id || item.office || '',
      unit: item.unit?._id || item.unit || '',
      faculty: item.faculty?._id || item.faculty || '',
      isActive: item.isActive !== undefined ? item.isActive : true,
      order: item.order || 0
    });
    setShowModal(true);
  };

  // Handle delete - show confirmation modal
  const handleDelete = (entity, item) => {
    setItemToDelete({ entity, item });
    setShowDeleteConfirmation(true);
  };

  // Perform delete after confirmation
  const performDelete = async () => {
    if (!itemToDelete) return;

    const { entity, item } = itemToDelete;

    try {
      setLoading(true);
      setShowDeleteConfirmation(false);
      let endpoint = '';
      
      switch(entity) {
        case 'campus':
          endpoint = API_ENDPOINTS.organization.campuses.delete(item._id);
          break;
        case 'faculty':
          endpoint = API_ENDPOINTS.organization.faculties.delete(item._id);
          break;
        case 'office':
          endpoint = API_ENDPOINTS.organization.offices.delete(item._id);
          break;
        case 'program':
          endpoint = API_ENDPOINTS.organization.programs.delete(item._id);
          break;
        case 'unit':
          endpoint = API_ENDPOINTS.organization.units.delete(item._id);
          break;
        case 'yearCycle':
          endpoint = API_ENDPOINTS.organization.yearCycles.delete(item._id);
          break;
      }

      await axios.delete(endpoint, { headers: getAuthHeaders() });
      
      // Refresh data
      if (entity === 'campus') fetchCampuses();
      else if (entity === 'faculty') fetchFaculties();
      else if (entity === 'office') fetchOffices();
      else if (entity === 'program') fetchPrograms();
      else if (entity === 'unit') {
        const list = await fetchUnits(selectedOfficeIdForUnits || null);
        setUnitsUnderOffice(list || []);
      } else if (entity === 'yearCycle') fetchYearCycles();
      
      setSuccess(`${entity.charAt(0).toUpperCase() + entity.slice(1)} deleted successfully`);
      setTimeout(() => setSuccess(''), 3000);
      setItemToDelete(null);
    } catch (err) {
      setError(err.response?.data?.message || `Error deleting ${entity}`);
      setTimeout(() => setError(''), 5000);
      setItemToDelete(null);
    } finally {
      setLoading(false);
    }
  };

  // Check for year cycle overlaps
  const checkYearCycleOverlap = (yearCycleName) => {
    // Parse the year cycle name (e.g., "2033-2035")
    const parts = yearCycleName.trim().split('-');
    if (parts.length !== 2) return [];
    
    const newStartYear = parseInt(parts[0], 10);
    const newEndYear = parseInt(parts[1], 10);
    
    if (isNaN(newStartYear) || isNaN(newEndYear)) return [];
    
    // Find overlapping year cycles
    const overlaps = yearCycles.filter(cycle => {
      // Skip the current cycle being edited
      if (modalType === 'edit' && editingItem && cycle._id === editingItem._id) {
        return false;
      }
      
      // Check if cycles overlap: (newStart <= existingEnd && newEnd >= existingStart)
      return newStartYear <= cycle.endYear && newEndYear >= cycle.startYear;
    });
    
    return overlaps;
  };

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check for year cycle overlaps before submitting
    if (modalEntity === 'yearCycle' && formData.name) {
      const overlaps = checkYearCycleOverlap(formData.name);
      if (overlaps.length > 0) {
        setOverlappingCycles(overlaps);
        setShowOverlapWarning(true);
        return; // Stop submission
      }
    }
    
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      let endpoint = '';
      let method = 'POST';
      let data = { ...formData };

      if (modalType === 'edit') {
        method = 'PUT';
      }

      switch(modalEntity) {
        case 'campus':
          endpoint = modalType === 'create' 
            ? API_ENDPOINTS.organization.campuses.create
            : API_ENDPOINTS.organization.campuses.update(editingItem._id);
          data = { name: formData.name, isActive: formData.isActive, order: formData.order };
          break;
        case 'faculty':
          endpoint = modalType === 'create'
            ? API_ENDPOINTS.organization.faculties.create
            : API_ENDPOINTS.organization.faculties.update(editingItem._id);
          data = { name: formData.name, campus: formData.campus, isActive: formData.isActive, order: formData.order };
          break;
        case 'office':
          endpoint = modalType === 'create'
            ? API_ENDPOINTS.organization.offices.create
            : API_ENDPOINTS.organization.offices.update(editingItem._id);
          data = { name: formData.name, isActive: formData.isActive, order: formData.order };
          break;
        case 'program':
          endpoint = modalType === 'create'
            ? API_ENDPOINTS.organization.programs.create
            : API_ENDPOINTS.organization.programs.update(editingItem._id);
          data = { name: formData.name, campus: formData.campus, unit: formData.unit || null, isActive: formData.isActive, order: formData.order };
          break;
        case 'unit':
          endpoint = modalType === 'create'
            ? API_ENDPOINTS.organization.units.create
            : API_ENDPOINTS.organization.units.update(editingItem._id);
          data = { name: formData.name, office: formData.office, isActive: formData.isActive, order: formData.order || 0 };
          break;
        case 'yearCycle':
          endpoint = modalType === 'create'
            ? API_ENDPOINTS.organization.yearCycles.create
            : API_ENDPOINTS.organization.yearCycles.update(editingItem._id);
          data = { name: formData.name, isActive: formData.isActive, order: formData.order };
          break;
      }

      if (method === 'POST') {
        await axios.post(endpoint, data, { headers: getAuthHeaders() });
      } else {
        await axios.put(endpoint, data, { headers: getAuthHeaders() });
      }

      // Refresh data
      if (modalEntity === 'campus') fetchCampuses();
      else if (modalEntity === 'faculty') fetchFaculties();
      else if (modalEntity === 'office') fetchOffices();
      else if (modalEntity === 'program') fetchPrograms();
      else if (modalEntity === 'unit') {
        const list = await fetchUnits(selectedOfficeIdForUnits || null);
        setUnitsUnderOffice(list || []);
      } else if (modalEntity === 'yearCycle') fetchYearCycles();

      setShowModal(false);
      setShowUpdateConfirmation(false);
      setSuccess(`${modalEntity.charAt(0).toUpperCase() + modalEntity.slice(1)} ${modalType === 'create' ? 'created' : 'updated'} successfully`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || `Error ${modalType === 'create' ? 'creating' : 'updating'} ${modalEntity}`);
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  // Render table for campuses
  const renderCampusesTable = () => (
    <div className="hidden md:block table-responsive-wrapper max-h-[600px] overflow-y-auto">
      <table className="table-responsive min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50 sticky top-0 z-10">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 bg-gray-50">Name</th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 bg-gray-50">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 bg-gray-50">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {campuses.map((campus) => (
            <tr key={campus._id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{campus.name}</td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium border whitespace-nowrap ${campus.isActive ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                  {campus.isActive ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div className="flex items-center gap-1.5 flex-nowrap">
                  <button onClick={() => handleEdit('campus', campus)} className="tap-target bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium transition-colors duration-200 border border-blue-200 whitespace-nowrap h-7 flex items-center justify-center">Edit</button>
                  <button onClick={() => handleDelete('campus', campus)} className="tap-target bg-red-200 hover:bg-red-300 text-red-700 px-2 py-1 rounded text-xs font-medium transition-colors duration-200 whitespace-nowrap h-7 flex items-center justify-center">Delete</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // Render table for faculties
  const renderFacultiesTable = () => (
    <div className="hidden md:block table-responsive-wrapper max-h-[600px] overflow-y-auto">
      <table className="table-responsive min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50 sticky top-0 z-10">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 bg-gray-50">Name</th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 bg-gray-50">Campus</th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 bg-gray-50">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 bg-gray-50">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {faculties.map((faculty) => (
            <tr key={faculty._id} className="hover:bg-gray-50">
              <td className="px-6 py-4 text-sm font-medium text-gray-900 max-w-[240px]" title={faculty.name}>
                <span className="block truncate">{faculty.name}</span>
              </td>
              <td className="px-6 py-4 text-sm text-gray-500 max-w-[120px]" title={faculty.campus?.name || 'N/A'}>
                <span className="block truncate">{faculty.campus?.name || 'N/A'}</span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium border whitespace-nowrap ${faculty.isActive ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                  {faculty.isActive ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div className="flex items-center gap-1.5 flex-nowrap">
                  <button onClick={() => handleEdit('faculty', faculty)} className="tap-target bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium transition-colors duration-200 border border-blue-200 whitespace-nowrap h-7 flex items-center justify-center">Edit</button>
                  <button onClick={() => handleDelete('faculty', faculty)} className="tap-target bg-red-200 hover:bg-red-300 text-red-700 px-2 py-1 rounded text-xs font-medium transition-colors duration-200 whitespace-nowrap h-7 flex items-center justify-center">Delete</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // Render table for offices
  const renderOfficesTable = () => (
    <div className="hidden md:block table-responsive-wrapper max-h-[600px] overflow-y-auto">
      <table className="table-responsive min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 bg-gray-50">Name</th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 bg-gray-50">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 bg-gray-50">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {offices.map((office) => (
            <tr key={office._id} className="hover:bg-gray-50">
              <td className="px-6 py-4 text-sm font-medium text-gray-900 max-w-[280px]" title={office.name}>
                <span className="block truncate">{office.name}</span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium border whitespace-nowrap ${office.isActive ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                  {office.isActive ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div className="flex items-center gap-1.5 flex-nowrap">
                  <button onClick={() => handleEdit('office', office)} className="tap-target bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium transition-colors duration-200 border border-blue-200 whitespace-nowrap h-7 flex items-center justify-center">Edit</button>
                  <button onClick={() => handleDelete('office', office)} className="tap-target bg-red-200 hover:bg-red-300 text-red-700 px-2 py-1 rounded text-xs font-medium transition-colors duration-200 whitespace-nowrap h-7 flex items-center justify-center">Delete</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // Programs under OVPAA only (for filter dropdown)
  const ovpaaOffice = offices.find((o) => o.name === OVPAA_OFFICE_NAME);
  const programsForDisplay = selectedOfficeIdForPrograms
    ? programs.filter((p) => (p.office?._id || p.office) === selectedOfficeIdForPrograms)
    : programs;

  // Render table for programs (accepts array to support filtering)
  const renderProgramsTable = (programsToShow = programsForDisplay) => (
    <div className="hidden md:block table-responsive-wrapper max-h-[600px] overflow-y-auto">
      <table className="table-responsive min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50 sticky top-0 z-10">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 bg-gray-50">Name</th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 bg-gray-50">Unit</th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 bg-gray-50">Campus</th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 bg-gray-50">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 bg-gray-50">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {programsToShow.map((program) => (
            <tr key={program._id} className="hover:bg-gray-50">
              <td className="px-6 py-4 text-sm font-medium text-gray-900 max-w-[200px]" title={program.name}>
                <span className="block truncate">{program.name}</span>
              </td>
              <td className="px-6 py-4 text-sm text-gray-500 max-w-[180px]" title={program.unit?.name || '—'}>
                <span className="block truncate">{program.unit?.name || '—'}</span>
              </td>
              <td className="px-6 py-4 text-sm text-gray-500 max-w-[120px]" title={program.campus?.name || 'All Campuses'}>
                <span className="block truncate">{program.campus?.name || 'All Campuses'}</span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium border whitespace-nowrap ${program.isActive ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                  {program.isActive ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div className="flex items-center gap-1.5 flex-nowrap">
                  <button onClick={() => handleEdit('program', program)} className="tap-target bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium transition-colors duration-200 border border-blue-200 whitespace-nowrap h-7 flex items-center justify-center">Edit</button>
                  <button onClick={() => handleDelete('program', program)} className="tap-target bg-red-200 hover:bg-red-300 text-red-700 px-2 py-1 rounded text-xs font-medium transition-colors duration-200 whitespace-nowrap h-7 flex items-center justify-center">Delete</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // Render table for year cycles - display only cycles created by users (from database)
  const renderYearCyclesTable = () => {
    // Sort cycles by startYear ascending (oldest to newest)
    const sortedCycles = [...yearCycles].sort((a, b) => {
      return (a.startYear || 0) - (b.startYear || 0);
    });
    
    return (
    <div className="hidden md:block table-responsive-wrapper max-h-[600px] overflow-y-auto">
      <table className="table-responsive min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50 sticky top-0 z-10">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 bg-gray-50">Year Cycle</th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 bg-gray-50">Start Year</th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 bg-gray-50">End Year</th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 bg-gray-50">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {sortedCycles.length === 0 ? (
            <tr>
              <td colSpan="4" className="px-6 py-8 text-center text-sm text-gray-500">
                No year cycles found. Click "+ Add Year Cycle" to create one.
              </td>
            </tr>
          ) : (
            sortedCycles.map((cycle) => (
            <tr key={cycle._id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{cycle.name}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{cycle.startYear}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{cycle.endYear}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div className="flex items-center gap-1.5 flex-nowrap">
                  <button onClick={() => handleEdit('yearCycle', cycle)} className="tap-target bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium transition-colors duration-200 border border-blue-200 whitespace-nowrap h-7 flex items-center justify-center">Edit</button>
                  <button onClick={() => handleDelete('yearCycle', cycle)} className="tap-target bg-red-200 hover:bg-red-300 text-red-700 px-2 py-1 rounded text-xs font-medium transition-colors duration-200 whitespace-nowrap h-7 flex items-center justify-center">Delete</button>
                </div>
              </td>
            </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
    );
  };

  // Render table for units (accepts array to support pagination)
  const renderUnitsTable = (unitsToShow = unitsUnderOffice) => (
    <div className="hidden md:block table-responsive-wrapper max-h-[600px] overflow-y-auto">
      <table className="table-responsive min-w-full divide-y divide-gray-200 table-fixed">
        <thead className="bg-gray-50 sticky top-0 z-10">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 bg-gray-50">Name</th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 bg-gray-50">Office</th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 bg-gray-50">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 bg-gray-50">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {unitsToShow.map((unit) => (
            <tr key={unit._id} className="hover:bg-gray-50">
              <td className="px-6 py-4 text-sm font-medium text-gray-900 max-w-[200px]" title={unit.name}>
                <span className="block truncate">{unit.name}</span>
              </td>
              <td className="px-6 py-4 text-sm text-gray-500 max-w-[200px]" title={unit.office?.name || 'N/A'}>
                <span className="block truncate">{unit.office?.name || 'N/A'}</span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium border whitespace-nowrap ${unit.isActive ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                  {unit.isActive ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div className="flex items-center gap-1.5 flex-nowrap">
                  <button onClick={() => handleEdit('unit', unit)} className="tap-target bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium transition-colors duration-200 border border-blue-200 whitespace-nowrap h-7 flex items-center justify-center">Edit</button>
                  <button onClick={() => handleDelete('unit', unit)} className="tap-target bg-red-200 hover:bg-red-300 text-red-700 px-2 py-1 rounded text-xs font-medium transition-colors duration-200 whitespace-nowrap h-7 flex items-center justify-center">Delete</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // Handle modal confirm (form submission)
  const handleModalConfirm = async () => {
    if (loading) return;
    
    // Check for year cycle overlaps before showing confirmation
    if (modalEntity === 'yearCycle' && formData.name) {
      const overlaps = checkYearCycleOverlap(formData.name);
      if (overlaps.length > 0) {
        setOverlappingCycles(overlaps);
        setShowOverlapWarning(true);
        return; // Stop here, don't show confirmation modal
      }
    }
    
    // Show confirmation modal for both create and edit
    if (formRef.current) {
      const form = formRef.current;
      if (form.checkValidity()) {
        setShowUpdateConfirmation(true);
        return;
      } else {
        form.reportValidity();
      }
    }
  };

  // Handle confirmed submission (both create and update)
  const handleConfirmedSubmit = async () => {
    setShowUpdateConfirmation(false);
    if (formRef.current) {
      formRef.current.requestSubmit();
    }
  };

  // Get modal title
  const getModalTitle = () => {
    const entityNames = {
      campus: 'Campus',
      faculty: 'Faculty',
      office: 'Office',
      program: 'Program',
      unit: 'Unit',
      yearCycle: 'Year Cycle'
    };
    return `${modalType === 'create' ? 'Create' : 'Edit'} ${entityNames[modalEntity]}`;
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Success/Error Messages */}
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          {success}
        </div>
      )}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <div className="border-b border-gray-200 mb-4">
          <nav className="-mb-px flex space-x-4 sm:space-x-8 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-4 py-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors tap-target ${
                  activeTab === tab.id
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div>
        {activeTab === 'campuses' && (
          <div>
            <div className="border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 mb-4">
              <div className="flex justify-between items-center">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                  Campuses ({campuses.length})
                </h3>
                <button 
                  onClick={() => handleCreate('campus')}
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors tap-target text-sm font-medium"
                >
                  + Add Campus
                </button>
              </div>
            </div>
            {campuses.length === 0 ? (
              <div className="p-6 sm:p-8 text-center text-gray-500">
                <svg className="mx-auto mb-4 h-10 w-10 sm:h-12 sm:w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <p className="text-base sm:text-lg font-medium">No campuses found</p>
                <p className="text-xs sm:text-sm">Click "Add Campus" to create one</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                {renderCampusesTable()}
              </div>
            )}
          </div>
        )}

        {activeTab === 'faculties' && (
          <div>
            <div className="border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 mb-4">
              <div className="flex justify-between items-center">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                  Faculties ({faculties.length})
                </h3>
                <button 
                  onClick={() => handleCreate('faculty')}
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors tap-target text-sm font-medium"
                >
                  + Add Faculty
                </button>
              </div>
            </div>
            {faculties.length === 0 ? (
              <div className="p-6 sm:p-8 text-center text-gray-500">
                <svg className="mx-auto mb-4 h-10 w-10 sm:h-12 sm:w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <p className="text-base sm:text-lg font-medium">No faculties found</p>
                <p className="text-xs sm:text-sm">Click "Add Faculty" to create one</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                {renderFacultiesTable()}
              </div>
            )}
          </div>
        )}

        {activeTab === 'offices' && (
          <div>
            <div className="border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 mb-4">
              <div className="flex justify-between items-center">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                  Offices ({offices.length})
                </h3>
                <button 
                  onClick={() => handleCreate('office')}
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors tap-target text-sm font-medium"
                >
                  + Add Office
                </button>
              </div>
            </div>
            {offices.length === 0 ? (
              <div className="p-6 sm:p-8 text-center text-gray-500">
                <svg className="mx-auto mb-4 h-10 w-10 sm:h-12 sm:w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <p className="text-base sm:text-lg font-medium">No offices found</p>
                <p className="text-xs sm:text-sm">Click "Add Office" to create one</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                {renderOfficesTable()}
              </div>
            )}
          </div>
        )}

        {activeTab === 'units' && (
          <div>
            <div className="border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 mb-4">
              <div className="flex flex-wrap items-center gap-3 justify-between">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                    Units ({unitsUnderOffice.length})
                  </h3>
                  <select
                    value={selectedOfficeIdForUnits}
                    onChange={(e) => setSelectedOfficeIdForUnits(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 text-sm max-w-[280px] min-w-[180px]"
                    title={offices.find(o => o._id === selectedOfficeIdForUnits)?.name || 'All offices'}
                  >
                    <option value="">All offices</option>
                    {offices.filter(o => o.isActive).map((o) => (
                      <option key={o._id} value={o._id}>{o.name}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => handleCreate('unit')}
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors tap-target text-sm font-medium"
                >
                  + Add Unit
                </button>
              </div>
            </div>
            {unitsUnderOffice.length === 0 ? (
              <div className="p-6 sm:p-8 text-center text-gray-500">
                <p className="text-base sm:text-lg font-medium">
                  {selectedOfficeIdForUnits ? 'No units under this office yet.' : 'No units created yet.'}
                </p>
                <p className="text-xs sm:text-sm">Click &quot;+ Add Unit&quot; to create one.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                {renderUnitsTable(unitsUnderOffice.slice((unitsPage - 1) * unitsPerPage, unitsPage * unitsPerPage))}
                {unitsUnderOffice.length > unitsPerPage && (
                  <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50 text-sm">
                    <span className="text-gray-600">
                      Showing {(unitsPage - 1) * unitsPerPage + 1}–{Math.min(unitsPage * unitsPerPage, unitsUnderOffice.length)} of {unitsUnderOffice.length}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setUnitsPage((p) => Math.max(1, p - 1))}
                        disabled={unitsPage <= 1}
                        className="px-3 py-1.5 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed tap-target"
                      >
                        Previous
                      </button>
                      <span className="px-2 py-1 text-gray-600">
                        Page {unitsPage} of {Math.ceil(unitsUnderOffice.length / unitsPerPage)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setUnitsPage((p) => Math.min(Math.ceil(unitsUnderOffice.length / unitsPerPage), p + 1))}
                        disabled={unitsPage >= Math.ceil(unitsUnderOffice.length / unitsPerPage)}
                        className="px-3 py-1.5 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed tap-target"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'programs' && (
          <div>
            <div className="border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 mb-4">
              <div className="flex flex-wrap items-center gap-3 justify-between">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                    Programs ({programsForDisplay.length})
                  </h3>
                  <select
                    value={selectedOfficeIdForPrograms}
                    onChange={(e) => setSelectedOfficeIdForPrograms(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 text-sm max-w-[320px] min-w-[180px]"
                    title={ovpaaOffice && selectedOfficeIdForPrograms === ovpaaOffice._id ? OVPAA_OFFICE_NAME : 'All programs'}
                  >
                    <option value="">All programs</option>
                    {ovpaaOffice && (
                      <option value={ovpaaOffice._id}>{OVPAA_OFFICE_NAME}</option>
                    )}
                  </select>
                </div>
                <button 
                  onClick={() => handleCreate('program')}
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors tap-target text-sm font-medium"
                >
                  + Add Program
                </button>
              </div>
            </div>
            {programsForDisplay.length === 0 ? (
              <div className="p-6 sm:p-8 text-center text-gray-500">
                <svg className="mx-auto mb-4 h-10 w-10 sm:h-12 sm:w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <p className="text-base sm:text-lg font-medium">
                  {selectedOfficeIdForPrograms ? 'No programs under this office yet.' : 'No programs found'}
                </p>
                <p className="text-xs sm:text-sm">Click &quot;+ Add Program&quot; to create one (under {OVPAA_OFFICE_NAME}).</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                {renderProgramsTable()}
              </div>
            )}
          </div>
        )}

        {activeTab === 'yearCycles' && (
          <div>
            <div className="border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 mb-4">
              <div className="flex justify-between items-center">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                  Year Cycles ({yearCycles.length})
                </h3>
                <button 
                  onClick={() => handleCreate('yearCycle')}
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors tap-target text-sm font-medium"
                >
                  + Add Year Cycle
                </button>
              </div>
            </div>
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
              {renderYearCyclesTable()}
            </div>
          </div>
        )}
        </div>
      </div>

      <Modal
        isOpen={showModal}
        variant="default"
        title={getModalTitle()}
        onClose={() => {
          setShowModal(false);
          setShowUpdateConfirmation(false);
          setError('');
        }}
        onConfirm={handleModalConfirm}
        confirmLabel={loading ? 'Saving...' : modalType === 'create' ? 'Create' : 'Update'}
        cancelLabel="Cancel"
        closeOnOverlay={!loading}
        zIndex={50}
      >
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          {/* Unit modal: Office first, then Name (Name disabled until Office is selected) */}
          {modalEntity === 'unit' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Office *</label>
              <select
                value={formData.office}
                onChange={(e) => setFormData({ ...formData, office: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                required
                disabled={loading}
              >
                <option value="">Select Office</option>
                {offices.filter(o => o.isActive).map((o) => (
                  <option key={o._id} value={o._id}>{o.name}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">Select an office first, then enter the unit name below.</p>
            </div>
          )}

          {/* Program modal: Unit (under OVPAA) first, then Campus, then Name below */}
          {modalEntity === 'program' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit *</label>
                <select
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                  required
                  disabled={loading}
                >
                  <option value="">Select Unit</option>
                  {unitsUnderOvpaa.map((u) => (
                    <option key={u._id} value={u._id}>{u.name}</option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">Programs are under {OVPAA_OFFICE_NAME}. Select a unit under that office first, then fill the rest.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Campus *</label>
                <select
                  value={formData.campus}
                  onChange={(e) => setFormData({ ...formData, campus: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                  required
                  disabled={loading}
                >
                  <option value="">Select Campus</option>
                  {campuses.map(c => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {modalEntity !== 'yearCycle' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                required
                disabled={loading || (modalEntity === 'unit' && !formData.office) || (modalEntity === 'program' && !formData.unit)}
                placeholder={(modalEntity === 'unit' && !formData.office) ? 'Select office first' : (modalEntity === 'program' && !formData.unit) ? 'Select unit first' : ''}
              />
            </div>
          )}

          {modalEntity === 'faculty' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Campus *</label>
              <select
                value={formData.campus}
                onChange={(e) => setFormData({ ...formData, campus: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                required
                disabled={loading}
              >
                <option value="">Select Campus</option>
                {campuses.map(c => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {modalEntity === 'yearCycle' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year Cycle *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., 2024-2026"
                pattern="\d{4}-\d{4}"
                title="Format: YYYY-YYYY (e.g., 2024-2026)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                required
                disabled={loading}
              />
              <p className="mt-1 text-xs text-gray-500">Format: YYYY-YYYY (e.g., 2024-2026, 2027-2029)</p>
            </div>
          )}

          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="mr-2"
                disabled={loading}
              />
              <span className="text-sm font-medium text-gray-700">Active</span>
            </label>
          </div>
        </form>
      </Modal>

      {/* Confirmation Modal */}
      <Modal
        isOpen={showUpdateConfirmation}
        variant="confirm"
        title={modalType === 'create' ? 'Confirm Create' : 'Confirm Update'}
        message={modalType === 'create' 
          ? `Are you sure you want to create "${formData.name}"?`
          : `Are you sure you want to update "${editingItem?.name || formData.name}"?`
        }
        confirmLabel={loading 
          ? (modalType === 'create' ? 'Creating...' : 'Updating...') 
          : (modalType === 'create' ? 'Yes, Create' : 'Yes, Update')
        }
        cancelLabel="Cancel"
        onConfirm={handleConfirmedSubmit}
        onClose={() => setShowUpdateConfirmation(false)}
        closeOnOverlay={!loading}
        zIndex={60}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirmation}
        variant="danger"
        title="Confirm Delete"
        message={itemToDelete 
          ? `Are you sure you want to delete "${itemToDelete.item.name}"? This action cannot be undone.`
          : ''
        }
        confirmLabel={loading ? 'Deleting...' : 'Delete'}
        cancelLabel="Cancel"
        onConfirm={performDelete}
        onClose={() => {
          setShowDeleteConfirmation(false);
          setItemToDelete(null);
        }}
        closeOnOverlay={!loading}
        zIndex={60}
      />

      {/* Year Cycle Overlap Warning Modal */}
      <Modal
        isOpen={showOverlapWarning}
        variant="danger"
        title="Year Cycle Overlap Detected"
        message={
          overlappingCycles.length > 0
            ? `The year cycle "${formData.name}" overlaps with the following existing year cycle(s):\n\n${overlappingCycles.map(cycle => `• ${cycle.name} (${cycle.startYear}-${cycle.endYear})`).join('\n')}\n\nPlease choose a different year range that does not overlap with existing cycles.`
            : ''
        }
        confirmLabel="OK"
        cancelLabel={null}
        onConfirm={() => {
          setShowOverlapWarning(false);
          setOverlappingCycles([]);
        }}
        onClose={() => {
          setShowOverlapWarning(false);
          setOverlappingCycles([]);
        }}
        closeOnOverlay={true}
        zIndex={60}
      />
    </div>
  );
};

export default OfficeManagement;
