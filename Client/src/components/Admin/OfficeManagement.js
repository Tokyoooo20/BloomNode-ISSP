import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_ENDPOINTS, getAuthHeaders } from '../../utils/api';
import Modal from '../common/Modal';

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
  const [universityLevelOffices, setUniversityLevelOffices] = useState([]);
  const [yearCycles, setYearCycles] = useState([]);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(''); // 'create' or 'edit'
  const [modalEntity, setModalEntity] = useState(''); // 'campus', 'faculty', etc.
  const [editingItem, setEditingItem] = useState(null);
  const [showUpdateConfirmation, setShowUpdateConfirmation] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null); // { entity, item }
  const formRef = useRef(null);
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    campus: '',
    office: '',
    faculty: '',
    isActive: true,
    order: 0
  });

  const tabs = [
    { id: 'campuses', label: 'Campuses' },
    { id: 'faculties', label: 'Faculties' },
    { id: 'programs', label: 'Programs' },
    { id: 'offices', label: 'Offices' },
    { id: 'universityLevel', label: 'University-Level Offices' },
    { id: 'yearCycles', label: 'Year Cycles' }
  ];

  // Fetch all data
  useEffect(() => {
    fetchCampuses();
    fetchFaculties();
    fetchOffices();
    fetchPrograms();
    fetchUniversityLevelOffices();
    fetchYearCycles();
  }, []);

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

  const fetchUnits = async (officeId) => {
    try {
      const response = await axios.get(API_ENDPOINTS.organization.units.list, {
        params: { officeId },
        headers: getAuthHeaders()
      });
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

  const fetchUniversityLevelOffices = async () => {
    try {
      const response = await axios.get(API_ENDPOINTS.organization.universityLevelOffices.list, {
        headers: getAuthHeaders()
      });
      setUniversityLevelOffices(response.data);
    } catch (err) {
      console.error('Error fetching university level offices:', err);
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
    setFormData({
      name: '',
      campus: '',
      office: '',
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
      campus: item.campus?._id || item.campus || '',
      office: item.office?._id || item.office || '',
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
        case 'universityLevel':
          endpoint = API_ENDPOINTS.organization.universityLevelOffices.delete(item._id);
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
      else if (entity === 'universityLevel') fetchUniversityLevelOffices();
      else if (entity === 'yearCycle') fetchYearCycles();
      
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

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
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
          data = { name: formData.name, campus: formData.campus, isActive: formData.isActive, order: formData.order };
          break;
        case 'program':
          endpoint = modalType === 'create'
            ? API_ENDPOINTS.organization.programs.create
            : API_ENDPOINTS.organization.programs.update(editingItem._id);
          data = { name: formData.name, faculty: formData.faculty, campus: formData.campus, isActive: formData.isActive, order: formData.order };
          break;
        case 'universityLevel':
          endpoint = modalType === 'create'
            ? API_ENDPOINTS.organization.universityLevelOffices.create
            : API_ENDPOINTS.organization.universityLevelOffices.update(editingItem._id);
          data = { name: formData.name, isActive: formData.isActive, order: formData.order };
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
      else if (modalEntity === 'universityLevel') fetchUniversityLevelOffices();
      else if (modalEntity === 'yearCycle') fetchYearCycles();

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
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{faculty.name}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {faculty.campus?.name || 'N/A'}
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
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 bg-gray-50">Campus</th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 bg-gray-50">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 bg-gray-50">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {offices.map((office) => (
            <tr key={office._id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{office.name}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {office.campus?.name || 'N/A'}
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

  // Render table for programs
  const renderProgramsTable = () => (
    <div className="hidden md:block table-responsive-wrapper max-h-[600px] overflow-y-auto">
      <table className="table-responsive min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50 sticky top-0 z-10">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 bg-gray-50">Name</th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 bg-gray-50">Faculty</th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 bg-gray-50">Campus</th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 bg-gray-50">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 bg-gray-50">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {programs.map((program) => (
            <tr key={program._id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{program.name}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {program.faculty?.name || 'N/A'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {program.campus?.name || 'All Campuses'}
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
    // Sort cycles by order and startYear
    const sortedCycles = [...yearCycles].sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return (b.startYear || 0) - (a.startYear || 0);
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

  // Render table for university level offices
  const renderUniversityLevelTable = () => (
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
          {universityLevelOffices.map((office) => (
            <tr key={office._id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{office.name}</td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium border whitespace-nowrap ${office.isActive ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                  {office.isActive ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div className="flex items-center gap-1.5 flex-nowrap">
                  <button onClick={() => handleEdit('universityLevel', office)} className="tap-target bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium transition-colors duration-200 border border-blue-200 whitespace-nowrap h-7 flex items-center justify-center">Edit</button>
                  <button onClick={() => handleDelete('universityLevel', office)} className="tap-target bg-red-200 hover:bg-red-300 text-red-700 px-2 py-1 rounded text-xs font-medium transition-colors duration-200 whitespace-nowrap h-7 flex items-center justify-center">Delete</button>
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
      universityLevel: 'University-Level Office',
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

        {activeTab === 'programs' && (
          <div>
            <div className="border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 mb-4">
              <div className="flex justify-between items-center">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                  Programs ({programs.length})
                </h3>
                <button 
                  onClick={() => handleCreate('program')}
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors tap-target text-sm font-medium"
                >
                  + Add Program
                </button>
              </div>
            </div>
            {programs.length === 0 ? (
              <div className="p-6 sm:p-8 text-center text-gray-500">
                <svg className="mx-auto mb-4 h-10 w-10 sm:h-12 sm:w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <p className="text-base sm:text-lg font-medium">No programs found</p>
                <p className="text-xs sm:text-sm">Click "Add Program" to create one</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                {renderProgramsTable()}
              </div>
            )}
          </div>
        )}

        {activeTab === 'universityLevel' && (
          <div>
            <div className="border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 mb-4">
              <div className="flex justify-between items-center">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                  University-Level Offices ({universityLevelOffices.length})
                </h3>
                <button 
                  onClick={() => handleCreate('universityLevel')}
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors tap-target text-sm font-medium"
                >
                  + Add University-Level Office
                </button>
              </div>
            </div>
            {universityLevelOffices.length === 0 ? (
              <div className="p-6 sm:p-8 text-center text-gray-500">
                <svg className="mx-auto mb-4 h-10 w-10 sm:h-12 sm:w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <p className="text-base sm:text-lg font-medium">No university-level offices found</p>
                <p className="text-xs sm:text-sm">Click "Add University-Level Office" to create one</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                {renderUniversityLevelTable()}
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
              required
              disabled={loading}
            />
          </div>

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

          {modalEntity === 'office' && (
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

          {modalEntity === 'program' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Campus *</label>
                <select
                  value={formData.campus}
                  onChange={(e) => {
                    setFormData({ ...formData, campus: e.target.value, faculty: '' }); // Clear faculty when campus changes
                  }}
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Faculty *</label>
                <select
                  value={formData.faculty}
                  onChange={(e) => setFormData({ ...formData, faculty: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                  required
                  disabled={loading || !formData.campus}
                >
                  <option value="">
                    {formData.campus ? 'Select Faculty' : 'Select Campus first'}
                  </option>
                  {formData.campus && faculties
                    .filter(f => {
                      const facultyCampusId = f.campus?._id || f.campus;
                      const selectedCampusId = formData.campus;
                      return facultyCampusId === selectedCampusId || 
                             (typeof facultyCampusId === 'string' && facultyCampusId === selectedCampusId) ||
                             (typeof selectedCampusId === 'string' && facultyCampusId === selectedCampusId);
                    })
                    .map(f => (
                      <option key={f._id} value={f._id}>{f.name}</option>
                    ))}
                </select>
              </div>
            </>
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
    </div>
  );
};

export default OfficeManagement;
