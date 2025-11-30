import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Modal from '../common/Modal';
import axios from 'axios';
import { API_ENDPOINTS, getAuthHeaders } from '../../utils/api';

const PAGE_C_ROWS = 10;

const createEmptyPageCRow = () => ({
  organizationalUnit: '',
  agencyHead: '',
  plannerName: '',
  plannerPosition: '',
  plannerEmail: '',
  employees: '',
  ictBudget: ''
});

const getInitialPageCTableData = () =>
  Array.from({ length: PAGE_C_ROWS }, () => createEmptyPageCRow());
 
const normalizePageCTableData = (data = []) => {
  const normalized = data.slice(0, PAGE_C_ROWS).map((row) => ({
    ...createEmptyPageCRow(),
    ...row
  }));

  while (normalized.length < PAGE_C_ROWS) {
    normalized.push(createEmptyPageCRow());
  }

  return normalized;
};

const PAGE_E_ROWS = 1;

const createPageERow = () => ({
  majorFinalOutput: '',
  criticalSystems: '',
  problems: '',
  intendedUse: ''
});

const getInitialPageETableData = () =>
  Array.from({ length: PAGE_E_ROWS }, () => createPageERow());

const normalizePageETableData = (data = []) => {
  const normalized = data.slice(0, PAGE_E_ROWS).map((row) => ({
    ...createPageERow(),
    ...row
  }));

  while (normalized.length < PAGE_E_ROWS) {
    normalized.push(createPageERow());
  }

  return normalized;
};

const RESOURCE_DEPLOYMENT_ROWS = 15;

const createResourceDeploymentRow = () => ({
  item: '',
  office: '',
  year1: '',
  year2: '',
  year3: ''
});

const getInitialResourceDeploymentData = () =>
  Array.from({ length: RESOURCE_DEPLOYMENT_ROWS }, () => createResourceDeploymentRow());

const normalizeResourceDeploymentData = (data = []) => {
  const normalized = data.slice(0, RESOURCE_DEPLOYMENT_ROWS).map((row) => ({
    ...createResourceDeploymentRow(),
    ...row
  }));

  while (normalized.length < RESOURCE_DEPLOYMENT_ROWS) {
    normalized.push(createResourceDeploymentRow());
  }

  return normalized;
};

const convertFrameworkArrayToObject = (data = []) => {
  const result = {};
  data.forEach((entry) => {
    if (entry && entry.key) {
      result[entry.key] = entry.value || '';
    }
  });
  return result;
};

const convertFrameworkObjectToArray = (data = {}) =>
  Object.entries(data).map(([key, value]) => ({ key, value }));

const DEV_PROJECT_SCHEDULE_ROWS = 5;
const DEV_SUMMARY_ROWS = 3;
const DEV_COST_BREAKDOWN_ROWS = 10;

const createDevProjectRow = () => ({
  name: '',
  year1: '',
  year2: '',
  year3: ''
});

const createDevSummaryRow = () => ({
  item: '',
  year1Physical: '',
  year1Cost: '',
  year2Physical: '',
  year2Cost: '',
  year3Physical: '',
  year3Cost: ''
});

const createDevCostRow = () => ({
  detailedItem: '',
  officeProductivity: '',
  internalProject1: '',
  internalProject2: '',
  crossAgencyProject1: '',
  crossAgencyProject2: '',
  continuingCosts: ''
});

const getInitialDevProjectSchedule = () =>
  Array.from({ length: DEV_PROJECT_SCHEDULE_ROWS }, () => createDevProjectRow());

const getInitialDevSummaryRows = () =>
  Array.from({ length: DEV_SUMMARY_ROWS }, () => createDevSummaryRow());

const getInitialDevCostRows = () =>
  Array.from({ length: DEV_COST_BREAKDOWN_ROWS }, () => createDevCostRow());

const normalizeDevProjectSchedule = (data = [], rowCount = DEV_PROJECT_SCHEDULE_ROWS) => {
  const normalized = data.slice(0, rowCount).map((row) => ({
    ...createDevProjectRow(),
    ...row
  }));

  while (normalized.length < rowCount) {
    normalized.push(createDevProjectRow());
  }

  return normalized;
};

const normalizeDevSummaryRows = (data = []) => {
  const normalized = data.slice(0, DEV_SUMMARY_ROWS).map((row) => ({
    ...createDevSummaryRow(),
    ...row
  }));

  while (normalized.length < DEV_SUMMARY_ROWS) {
    normalized.push(createDevSummaryRow());
  }

  return normalized;
};

const normalizeDevCostRows = (data = []) => {
  const normalized = data.slice(0, DEV_COST_BREAKDOWN_ROWS).map((row) => ({
    ...createDevCostRow(),
    ...row
  }));

  while (normalized.length < DEV_COST_BREAKDOWN_ROWS) {
    normalized.push(createDevCostRow());
  }

  return normalized;
};

const ensurePageERows = (rows = []) => {
  const normalized = normalizePageETableData(rows);
  return normalized.length ? normalized : getInitialPageETableData();
};

const parseStrategicConcerns = (value) => {
  if (!value) {
    return getInitialPageETableData();
  }

  if (Array.isArray(value)) {
    return ensurePageERows(value);
  }

  if (typeof value === 'object') {
    // Legacy format: single object, convert to array
    const oldData = value;
    if (oldData.majorFinalOutput || oldData.criticalSystems || oldData.problems || oldData.intendedUse) {
      // Convert old single-object format to array format
      return ensurePageERows([{
        majorFinalOutput: oldData.majorFinalOutput || '',
        criticalSystems: oldData.criticalSystems || '',
        problems: oldData.problems || '',
        intendedUse: oldData.intendedUse || ''
      }]);
    }
    return getInitialPageETableData();
  }

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return ensurePageERows(parsed);
    }
    // Legacy single object format
    if (parsed.majorFinalOutput || parsed.criticalSystems || parsed.problems || parsed.intendedUse) {
      return ensurePageERows([{
        majorFinalOutput: parsed.majorFinalOutput || '',
        criticalSystems: parsed.criticalSystems || '',
        problems: parsed.problems || '',
        intendedUse: parsed.intendedUse || ''
      }]);
    }
    return getInitialPageETableData();
  } catch (error) {
    return getInitialPageETableData();
  }
};

const InformationSystemsStrategy = ({ onBack, initialData, onDataSaved, refreshStatus }) => {
  const [currentPage, setCurrentPage] = useState('A');
  const [pageADiagramUrl, setPageADiagramUrl] = useState('');
  const [pageADiagramName, setPageADiagramName] = useState('');
  const [pageBData, setPageBData] = useState({
    name: '',
    description: '',
    status: '',
    developmentStrategy: '',
    computingScheme: '',
    usersInternal: '',
    usersExternal: '',
    systemOwner: ''
  });
  const [pageCData, setPageCData] = useState({
    databaseName: '',
    generalContents: '',
    status: '',
    informationSystemsServed: '',
    dataArchiving: '',
    usersInternal: '',
    usersExternal: '',
    owner: ''
  });
  const [pageDLayoutUrl, setPageDLayoutUrl] = useState('');
  const [pageDLayoutName, setPageDLayoutName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
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

  const closeAlert = useCallback(() => {
    setAlertState((prevState) => ({
      ...prevState,
      isOpen: false
    }));
  }, []);

  const showAlert = useCallback((config) => {
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
  }, []);

  const handleAlertClose = useCallback(() => {
    if (typeof alertState.onClose === 'function') {
      alertState.onClose();
    }
    closeAlert();
  }, [alertState.onClose, closeAlert]);

  const handleAlertConfirm = useCallback(async () => {
    if (typeof alertState.onConfirm === 'function') {
      await alertState.onConfirm();
    }
    closeAlert();
  }, [alertState.onConfirm, closeAlert]);

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

  useEffect(() => {
    if (initialData) {
      const existingDiagram = initialData.pageA?.diagramUrl || '';
      setPageADiagramUrl(existingDiagram);
      setPageADiagramName(existingDiagram ? 'Existing upload' : '');

      setPageBData((prev) => ({
        ...prev,
        name: initialData.pageB?.name || '',
        description: initialData.pageB?.description || '',
        status: initialData.pageB?.status || '',
        developmentStrategy: initialData.pageB?.developmentStrategy || '',
        computingScheme: initialData.pageB?.computingScheme || '',
        usersInternal: initialData.pageB?.usersInternal || '',
        usersExternal: initialData.pageB?.usersExternal || '',
        systemOwner: initialData.pageB?.systemOwner || ''
      }));

      setPageCData((prev) => ({
        ...prev,
        databaseName: initialData.pageC?.databaseName || '',
        generalContents: initialData.pageC?.generalContents || '',
        status: initialData.pageC?.status || '',
        informationSystemsServed: initialData.pageC?.informationSystemsServed || '',
        dataArchiving: initialData.pageC?.dataArchiving || '',
        usersInternal: initialData.pageC?.usersInternal || '',
        usersExternal: initialData.pageC?.usersExternal || '',
        owner: initialData.pageC?.owner || ''
      }));

      const existingLayout = initialData.pageD?.networkLayoutUrl || '';
      setPageDLayoutUrl(existingLayout);
      setPageDLayoutName(existingLayout ? 'Existing upload' : '');
    }
  }, [initialData]);

  const handlePageBChange = (event) => {
    const { name, value } = event.target;
    setPageBData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePageCChange = (event) => {
    const { name, value } = event.target;
    setPageCData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePageAUpload = (event) => {
    const file = event.target.files && event.target.files[0];

    if (!file) {
      setPageADiagramUrl('');
      setPageADiagramName('');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPageADiagramUrl(reader.result || '');
      setPageADiagramName(file.name);
    };
    reader.onerror = () => {
      console.error('Error reading Information Systems Strategy Page A upload');
      setPageADiagramUrl('');
      setPageADiagramName('');
    };
    reader.readAsDataURL(file);
  };

  const handlePageDUpload = (event) => {
    const file = event.target.files && event.target.files[0];

    if (!file) {
      setPageDLayoutUrl('');
      setPageDLayoutName('');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPageDLayoutUrl(reader.result || '');
      setPageDLayoutName(file.name);
    };
    reader.onerror = () => {
      console.error('Error reading Information Systems Strategy Page D upload');
      setPageDLayoutUrl('');
      setPageDLayoutName('');
    };
    reader.readAsDataURL(file);
  };

  const saveInformationSystemsStrategy = async (page) => {
    const token = localStorage.getItem('token');
    if (!token) {
      showAlert({
        variant: 'danger',
        title: 'Authentication Required',
        message: 'No authentication token found. Please login again.'
      });
      return;
    }

    const payload = {
      pageA: {
        diagramUrl: pageADiagramUrl || ''
      },
      pageB: { ...pageBData },
      pageC: { ...pageCData },
      pageD: {
        networkLayoutUrl: pageDLayoutUrl || ''
      }
    };

    try {
      setIsSaving(true);
      const response = await axios.put(
        API_ENDPOINTS.issp.informationSystemsStrategy,
        payload,
        {
          headers: { 'x-auth-token': token }
        }
      );

      onDataSaved?.(response.data);
      await refreshStatus?.();

      const updatedStrategy = response.data.informationSystemsStrategy;
      const updatedDiagram = updatedStrategy?.pageA?.diagramUrl || '';
      setPageADiagramUrl(updatedDiagram);
      setPageADiagramName(updatedDiagram ? (pageADiagramName || 'Existing upload') : '');

      setPageBData({
        name: updatedStrategy?.pageB?.name || '',
        description: updatedStrategy?.pageB?.description || '',
        status: updatedStrategy?.pageB?.status || '',
        developmentStrategy: updatedStrategy?.pageB?.developmentStrategy || '',
        computingScheme: updatedStrategy?.pageB?.computingScheme || '',
        usersInternal: updatedStrategy?.pageB?.usersInternal || '',
        usersExternal: updatedStrategy?.pageB?.usersExternal || '',
        systemOwner: updatedStrategy?.pageB?.systemOwner || ''
      });

      setPageCData({
        databaseName: updatedStrategy?.pageC?.databaseName || '',
        generalContents: updatedStrategy?.pageC?.generalContents || '',
        status: updatedStrategy?.pageC?.status || '',
        informationSystemsServed: updatedStrategy?.pageC?.informationSystemsServed || '',
        dataArchiving: updatedStrategy?.pageC?.dataArchiving || '',
        usersInternal: updatedStrategy?.pageC?.usersInternal || '',
        usersExternal: updatedStrategy?.pageC?.usersExternal || '',
        owner: updatedStrategy?.pageC?.owner || ''
      });

      const updatedLayout = updatedStrategy?.pageD?.networkLayoutUrl || '';
      setPageDLayoutUrl(updatedLayout);
      setPageDLayoutName(updatedLayout ? (pageDLayoutName || 'Existing upload') : '');

      showAlert({
        variant: 'success',
        title: 'Save Successful',
        message: 'Information Systems Strategy saved successfully!'
      });
    } catch (error) {
      console.error('Error saving information systems strategy:', error);
      showAlert({
        variant: 'danger',
        title: 'Save Failed',
        message: error.response?.data?.message || error.message || 'Failed to save Information Systems Strategy.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const PageA = () => (
    <div className="bg-white p-8 rounded-lg shadow-sm">
      <h3 className="text-xl font-semibold text-gray-900 mb-8 pb-4 border-b">
        A. CONCEPTUAL FRAMEWORK FOR INFORMATION SYSTEMS (DIAGRAM OF IS INTERFACE)
      </h3>
      <div className="bg-gray-50 p-6 rounded-lg border border-gray-100">
        <div className="flex flex-col items-center justify-center min-h-[500px]">
          <div className="text-center p-8 border-4 border-dashed border-gray-300 rounded-lg w-full h-full">
            <p className="text-gray-500 mb-4">Upload your IS interface diagram here</p>
            <input
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              id="diagram-upload"
              onChange={handlePageAUpload}
            />
            <label
              htmlFor="diagram-upload"
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-700 cursor-pointer inline-block transition-colors duration-200"
            >
              Upload Diagram
            </label>
            {pageADiagramName && (
              <p className="mt-4 text-sm text-gray-600">
                Selected file: {pageADiagramName}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const PageB = () => (
    <div className="bg-white p-8 rounded-lg shadow-sm">
      <h3 className="text-xl font-semibold text-gray-900 mb-8 pb-4 border-b">
        B. DETAILED DESCRIPTION OF PROPOSED INFORMATION SYSTEMS
      </h3>
      
      <div className="table-responsive-wrapper">
        <table className="table-responsive min-w-full border border-gray-200">
          <tbody>
            <tr>
              <td className="border border-gray-200 bg-gray-50 p-3 w-1/3">
                <div className="font-medium text-gray-700">NAME OF INFORMATION SYSTEM/ SUB-SYSTEM</div>
              </td>
              <td className="border border-gray-200 p-0">
                <textarea
                  name="name"
                  value={pageBData.name}
                  onChange={handlePageBChange}
                  className="w-full p-2 border-0 focus:ring-0"
                  rows={2}
                />
              </td>
            </tr>
            <tr>
              <td className="border border-gray-200 bg-gray-50 p-3">
                <div className="font-medium text-gray-700">DESCRIPTION</div>
              </td>
              <td className="border border-gray-200 p-0">
                <textarea
                  name="description"
                  value={pageBData.description}
                  onChange={handlePageBChange}
                  className="w-full p-2 border-0 focus:ring-0"
                  rows={3}
                />
              </td>
            </tr>
            <tr>
              <td className="border border-gray-200 bg-gray-50 p-3">
                <div className="font-medium text-gray-700">STATUS</div>
              </td>
              <td className="border border-gray-200 p-0">
                <textarea
                  name="status"
                  value={pageBData.status}
                  onChange={handlePageBChange}
                  className="w-full p-2 border-0 focus:ring-0"
                  rows={2}
                />
              </td>
            </tr>
            <tr>
              <td className="border border-gray-200 bg-gray-50 p-3">
                <div className="font-medium text-gray-700">DEVELOPMENT STRATEGY</div>
              </td>
              <td className="border border-gray-200 p-0">
                <textarea
                  name="developmentStrategy"
                  value={pageBData.developmentStrategy}
                  onChange={handlePageBChange}
                  className="w-full p-2 border-0 focus:ring-0"
                  rows={2}
                />
              </td>
            </tr>
            <tr>
              <td className="border border-gray-200 bg-gray-50 p-3">
                <div className="font-medium text-gray-700">COMPUTING SCHEME</div>
              </td>
              <td className="border border-gray-200 p-0">
                <textarea
                  name="computingScheme"
                  value={pageBData.computingScheme}
                  onChange={handlePageBChange}
                  className="w-full p-2 border-0 focus:ring-0"
                  rows={2}
                />
              </td>
            </tr>
            <tr>
              <td className="border border-gray-200 bg-gray-50 p-3" rowSpan={2}>
                <div className="font-medium text-gray-700">USERS</div>
              </td>
              <td className="border border-gray-200 p-0">
                <div className="flex">
                  <div className="bg-gray-50 p-4 w-32 border-r border-gray-200">
                    <div className="font-medium text-gray-700">INTERNAL</div>
                  </div>
                  <textarea
                    name="usersInternal"
                    value={pageBData.usersInternal}
                    onChange={handlePageBChange}
                    className="flex-1 p-2 border-0 focus:ring-0"
                    rows={2}
                  />
                </div>
              </td>
            </tr>
            <tr>
              <td className="border border-gray-200 p-0">
                <div className="flex">
                  <div className="bg-gray-50 p-4 w-32 border-r border-gray-200">
                    <div className="font-medium text-gray-700">EXTERNAL</div>
                  </div>
                  <textarea
                    name="usersExternal"
                    value={pageBData.usersExternal}
                    onChange={handlePageBChange}
                    className="flex-1 p-2 border-0 focus:ring-0"
                    rows={2}
                  />
                </div>
              </td>
            </tr>
            <tr>
              <td className="border border-gray-200 bg-gray-50 p-3">
                <div className="font-medium text-gray-700">SYSTEM OWNER</div>
              </td>
              <td className="border border-gray-200 p-0">
                <textarea
                  name="systemOwner"
                  value={pageBData.systemOwner}
                  onChange={handlePageBChange}
                  className="w-full p-2 border-0 focus:ring-0"
                  rows={2}
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );

  const PageC = () => (
    <div className="bg-white p-8 rounded-lg shadow-sm">
      <h3 className="text-xl font-semibold text-gray-900 mb-8 pb-4 border-b">
        C. DATABASES REQUIRED
      </h3>
      
      <div className="table-responsive-wrapper">
        <table className="table-responsive min-w-full border border-gray-200">
          <tbody>
            <tr>
              <td className="border border-gray-200 bg-gray-50 p-3 w-1/3">
                <div className="font-medium text-gray-700">NAME OF DATABASE</div>
              </td>
              <td className="border border-gray-200 p-0">
                <textarea
                  name="databaseName"
                  value={pageCData.databaseName}
                  onChange={handlePageCChange}
                  className="w-full p-2 border-0 focus:ring-0"
                  rows={2}
                />
              </td>
            </tr>
            <tr>
              <td className="border border-gray-200 bg-gray-50 p-3">
                <div className="font-medium text-gray-700">GENERAL CONTENTS/ DESCRIPTION</div>
              </td>
              <td className="border border-gray-200 p-0">
                <textarea
                  name="generalContents"
                  value={pageCData.generalContents}
                  onChange={handlePageCChange}
                  className="w-full p-2 border-0 focus:ring-0"
                  rows={3}
                />
              </td>
            </tr>
            <tr>
              <td className="border border-gray-200 bg-gray-50 p-3">
                <div className="font-medium text-gray-700">STATUS</div>
              </td>
              <td className="border border-gray-200 p-0">
                <textarea
                  name="status"
                  value={pageCData.status}
                  onChange={handlePageCChange}
                  className="w-full p-2 border-0 focus:ring-0"
                  rows={2}
                />
              </td>
            </tr>
            <tr>
              <td className="border border-gray-200 bg-gray-50 p-3">
                <div className="font-medium text-gray-700">INFORMATION SYSTEMS SERVED</div>
              </td>
              <td className="border border-gray-200 p-0">
                <textarea
                  name="informationSystemsServed"
                  value={pageCData.informationSystemsServed}
                  onChange={handlePageCChange}
                  className="w-full p-2 border-0 focus:ring-0"
                  rows={2}
                />
              </td>
            </tr>
            <tr>
              <td className="border border-gray-200 bg-gray-50 p-3">
                <div className="font-medium text-gray-700">DATA ARCHIVING/STORAGE MEDIA</div>
              </td>
              <td className="border border-gray-200 p-0">
                <textarea
                  name="dataArchiving"
                  value={pageCData.dataArchiving}
                  onChange={handlePageCChange}
                  className="w-full p-2 border-0 focus:ring-0"
                  rows={2}
                />
              </td>
            </tr>
            <tr>
              <td className="border border-gray-200 bg-gray-50 p-3" rowSpan={2}>
                <div className="font-medium text-gray-700">USERS</div>
              </td>
              <td className="border border-gray-200 p-0">
                <div className="flex">
                  <div className="bg-gray-50 p-4 w-32 border-r border-gray-200">
                    <div className="font-medium text-gray-700">INTERNAL</div>
                  </div>
                  <textarea
                    name="usersInternal"
                    value={pageCData.usersInternal}
                    onChange={handlePageCChange}
                    className="flex-1 p-2 border-0 focus:ring-0"
                    rows={2}
                  />
                </div>
              </td>
            </tr>
            <tr>
              <td className="border border-gray-200 p-0">
                <div className="flex">
                  <div className="bg-gray-50 p-4 w-32 border-r border-gray-200">
                    <div className="font-medium text-gray-700">EXTERNAL</div>
                  </div>
                  <textarea
                    name="usersExternal"
                    value={pageCData.usersExternal}
                    onChange={handlePageCChange}
                    className="flex-1 p-2 border-0 focus:ring-0"
                    rows={2}
                  />
                </div>
              </td>
            </tr>
            <tr>
              <td className="border border-gray-200 bg-gray-50 p-3">
                <div className="font-medium text-gray-700">OWNER</div>
              </td>
              <td className="border border-gray-200 p-0">
                <textarea
                  name="owner"
                  value={pageCData.owner}
                  onChange={handlePageCChange}
                  className="w-full p-2 border-0 focus:ring-0"
                  rows={2}
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );

  const PageD = () => (
    <div className="bg-white p-8 rounded-lg shadow-sm">
      <h3 className="text-xl font-semibold text-gray-900 mb-8 pb-4 border-b">
        D. NETWORK LAYOUT
      </h3>
      
      <div className="bg-gray-50 p-6 rounded-lg border border-gray-100">
        <div className="flex flex-col items-center justify-center min-h-[500px]">
          <div className="text-center p-8 border-4 border-dashed border-gray-300 rounded-lg w-full h-full">
            <p className="text-gray-500 mb-4">Upload your network layout diagram here</p>
            <input
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              id="network-upload"
              onChange={handlePageDUpload}
            />
            <label
              htmlFor="network-upload"
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-700 cursor-pointer inline-block transition-colors duration-200"
            >
              Upload Diagram
            </label>
            {pageDLayoutName && (
              <p className="mt-4 text-sm text-gray-600">
                Selected file: {pageDLayoutName}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const alertCloseHandler = alertState.onClose ? handleAlertClose : closeAlert;
  const alertConfirmHandler = alertState.autoCloseDelay ? undefined : handleAlertConfirm;

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

  const renderPage = () => {
    switch(currentPage) {
      case 'A':
        return <PageA />;
      case 'B':
        return <PageB />;
      case 'C':
        return <PageC />;
      case 'D':
        return <PageD />;
      default:
        return <PageA />;
    }
  };

  return (
    <>
      {alertElement}
      <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center mb-6">
        <button
          onClick={() => {
            if (currentPage === 'A') {
              onBack();
            } else {
              setCurrentPage(prev => {
                if (prev === 'B') return 'A';
                if (prev === 'C') return 'B';
                if (prev === 'D') return 'C';
                return 'A';
              });
            }
          }}
          className="mr-4 text-gray-600 hover:text-gray-900"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-2xl font-bold text-gray-900">PART II. INFORMATION SYSTEMS STRATEGY</h2>
      </div>

      {renderPage()}

      <div className="flex justify-between items-center">
        <button
          type="button"
          onClick={() => saveInformationSystemsStrategy(currentPage)}
          disabled={isSaving}
          className={`px-4 py-2 text-gray-700 bg-gray-200 rounded-lg font-medium transition-colors duration-200 ${isSaving ? 'opacity-60 cursor-not-allowed' : 'hover:bg-gray-300'}`}
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>
        {currentPage !== 'D' && (
          <button
            type="button"
            onClick={() => setCurrentPage(currentPage === 'A' ? 'B' : currentPage === 'B' ? 'C' : 'D')}
            className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors duration-200 flex items-center"
          >
            Next
            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>
      </div>
    </>
  );
};

const ISSP = () => {
  const [selectedItem, setSelectedItem] = useState(null);
  const [currentPage, setCurrentPage] = useState('A');
  const [orgProfilePage, setOrgProfilePage] = useState('A'); // Separate page state for Org Profile
  const [ictProjectPage, setIctProjectPage] = useState('internal');
  const [isspItems, setIsspItems] = useState([]);
  const [isspData, setIsspData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unitStatuses, setUnitStatuses] = useState([]);
  const [formData, setFormData] = useState({
    // Page A data
    mandate: '',
    visionStatement: '',
    missionStatement: '',
    majorFinalOutput: '',
    // Page B data
    plannerName: '',
    plantillaPosition: '',
    organizationalUnit: '',
    emailAddress: '',
    contactNumbers: '',
    annualIctBudget: '',
    otherFundSources: '',
    totalEmployees: '',
    regionalOffices: '',
    provincialOffices: '',
    otherOffices: ''
  });
  const [pageCTableData, setPageCTableData] = useState(getInitialPageCTableData());
  const [functionalInterfaceChart, setFunctionalInterfaceChart] = useState({ url: '', name: '' });
  const [pageDData, setPageDData] = useState({
    strategicChallenges: ''
  });
  const [pageETableData, setPageETableData] = useState(getInitialPageETableData());
  const [resourceDeploymentData, setResourceDeploymentData] = useState(getInitialResourceDeploymentData());
  const [resourceExistingStructure, setResourceExistingStructure] = useState({ url: '', name: '' });
  const [resourceProposedStructure, setResourceProposedStructure] = useState({ url: '', name: '' });
  const [resourcePlacementStructure, setResourcePlacementStructure] = useState({ url: '', name: '' });
  const [internalProjectData, setInternalProjectData] = useState({
    nameTitle: '',
    rank: '',
    objectives: '',
    duration: '',
    deliverables: ''
  });
  const [crossAgencyProjectData, setCrossAgencyProjectData] = useState({
    nameTitle: '',
    objectives: '',
    duration: '',
    deliverables: '',
    leadAgency: '',
    implementingAgencies: ''
  });
  const [performanceFrameworkData, setPerformanceFrameworkData] = useState({});
  const [devProjectSchedule, setDevProjectSchedule] = useState(getInitialDevProjectSchedule());
  const [devIsSchedule, setDevIsSchedule] = useState(getInitialDevProjectSchedule());
  const [devSummaryInvestments, setDevSummaryInvestments] = useState(getInitialDevSummaryRows());
  const [devCostBreakdown, setDevCostBreakdown] = useState(getInitialDevCostRows());
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [submitReviewLoading, setSubmitReviewLoading] = useState(false);
  const [uploadingDictApprovedISSP, setUploadingDictApprovedISSP] = useState(false);
  const [dictApprovedISSPDocument, setDictApprovedISSPDocument] = useState(null);
  const dictApprovedISSPInputRef = useRef(null);
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
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [unitItems, setUnitItems] = useState([]);
  const [unitItemsLoading, setUnitItemsLoading] = useState(false);
  const [editingPrices, setEditingPrices] = useState({});
  const [editingQuantities, setEditingQuantities] = useState({});
  const [editingSpecifications, setEditingSpecifications] = useState({});
  const [submittedRequests, setSubmittedRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [selectedUnitRequest, setSelectedUnitRequest] = useState(null);
  const [selectedUnitForRequests, setSelectedUnitForRequests] = useState(null);
  const [unitRequestsGrouped, setUnitRequestsGrouped] = useState({});
  const [showDictStatusModal, setShowDictStatusModal] = useState(false);
  const [dictStatusForm, setDictStatusForm] = useState({ status: '', notes: '' });
  const [updatingDictStatus, setUpdatingDictStatus] = useState(false);
  const [showAcceptingEntriesModal, setShowAcceptingEntriesModal] = useState(false);
  const [acceptingEntriesForm, setAcceptingEntriesForm] = useState({ status: '', notes: '' });
  const [updatingAcceptingEntries, setUpdatingAcceptingEntries] = useState(false);
  const orgProfileAutoSaveTimerRef = useRef(null);
  const orgProfileDirtyRef = useRef(false);
  const [selectedYearCycle, setSelectedYearCycle] = useState('2024-2027');
  // Unit Submission Status - Search, Filter, and Pagination
  const [unitSearchQuery, setUnitSearchQuery] = useState('');
  const [unitStatusFilter, setUnitStatusFilter] = useState('all'); // 'all', 'submitted', 'pending'
  const [unitCurrentPage, setUnitCurrentPage] = useState(1);
  const unitsPerPage = 20;

  const closeModal = useCallback(() => {
    setModalState((prevState) => ({
      ...prevState,
      isOpen: false
    }));
  }, []);

  const openModal = useCallback((config) => {
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
  }, []);

  const handleModalClose = useCallback(() => {
    if (typeof modalState.onCancel === 'function') {
      modalState.onCancel();
    }
    closeModal();
  }, [modalState.onCancel, closeModal]);

  const handleModalConfirm = useCallback(async () => {
    if (typeof modalState.onConfirm === 'function') {
      await modalState.onConfirm();
    }
    closeModal();
  }, [modalState.onConfirm, closeModal]);

  const closeAlert = useCallback(() => {
    setAlertState((prevState) => ({
      ...prevState,
      isOpen: false
    }));
  }, []);

  const showAlert = useCallback((config) => {
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
  }, []);

  const handleAlertClose = useCallback(() => {
    if (typeof alertState.onClose === 'function') {
      alertState.onClose();
    }
    closeAlert();
  }, [alertState.onClose, closeAlert]);

  const handleAlertConfirm = useCallback(async () => {
    if (typeof alertState.onConfirm === 'function') {
      await alertState.onConfirm();
    }
    closeAlert();
  }, [alertState.onConfirm, closeAlert]);

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

  const fetchISSPStatus = useCallback(async (withLoader = false) => {
    if (withLoader) {
      setLoading(true);
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setIsspItems([]);
        return;
      }

      const response = await axios.get(API_ENDPOINTS.issp.status, {
        headers: { 'x-auth-token': token }
      });
      setIsspItems(response.data);
    } catch (error) {
      console.error('Error fetching ISSP status:', error);
    } finally {
      if (withLoader) {
        setLoading(false);
      }
    }
  }, []);

  const refreshIsspData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setIsspData(null);
        return;
      }

      const response = await axios.get(API_ENDPOINTS.issp.get, {
        headers: { 'x-auth-token': token }
      });
      setIsspData(response.data);
    } catch (error) {
      console.error('Error fetching ISSP data:', error);
    }
  }, []);

  const fetchUnitStatuses = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setUnitStatuses([]);
        return;
      }

      const response = await axios.get(API_ENDPOINTS.admin.officeStats, {
        headers: { 'x-auth-token': token }
      });
      
      // Extract unit data from the response
      const units = response.data.unitTracking?.units || [];
      setUnitStatuses(units);
    } catch (error) {
      console.error('Error fetching unit statuses:', error);
      setUnitStatuses([]);
    }
  }, []);

  const fetchSubmittedRequests = useCallback(async () => {
    try {
      setRequestsLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        setSubmittedRequests([]);
        setUnitRequestsGrouped({});
        return;
      }

      const response = await axios.get(API_ENDPOINTS.admin.submittedRequests, {
        headers: { 'x-auth-token': token }
      });
      
      console.log('Fetched submitted requests:', response.data);
      setSubmittedRequests(response.data);
      
      // Group requests by unit, filtering out requests without a valid unit
      const grouped = response.data.reduce((acc, request) => {
        const unit = request.userId?.unit;
        if (unit && unit.trim() !== '') {
          if (!acc[unit]) {
            acc[unit] = [];
          }
          acc[unit].push(request);
        }
        return acc;
      }, {});
      
      setUnitRequestsGrouped(grouped);
    } catch (error) {
      console.error('Error fetching submitted requests:', error);
      setSubmittedRequests([]);
      setUnitRequestsGrouped({});
    } finally {
      setRequestsLoading(false);
    }
  }, []);

  // Filter requests based on selected year cycle
  const filteredUnitRequestsGrouped = useMemo(() => {
    const filtered = {};
    Object.keys(unitRequestsGrouped).forEach(unit => {
      const unitRequests = unitRequestsGrouped[unit].filter(
        request => request.year === selectedYearCycle
      );
      if (unitRequests.length > 0) {
        filtered[unit] = unitRequests;
      }
    });
    return filtered;
  }, [unitRequestsGrouped, selectedYearCycle]);

  // Process units for table display with search, filter, and pagination
  const processedUnits = useMemo(() => {
    const units = Object.keys(filteredUnitRequestsGrouped).map(unitName => {
      const requests = filteredUnitRequestsGrouped[unitName];
      const firstRequest = requests[0];
      const campus = firstRequest?.userId?.campus || 'N/A';
      
      // Prioritize resubmitted requests, then sort by most recent
      const sortedRequests = requests.sort((a, b) => {
        const aResubmitted = a.status === 'resubmitted' || a.revisionStatus === 'resubmitted';
        const bResubmitted = b.status === 'resubmitted' || b.revisionStatus === 'resubmitted';
        if (aResubmitted && !bResubmitted) return -1;
        if (!aResubmitted && bResubmitted) return 1;
        return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
      });
      
      const latestRequest = sortedRequests[0];
      const lastUpdated = latestRequest ? (latestRequest.revisedAt || latestRequest.updatedAt || latestRequest.createdAt) : null;
      
      // Determine status - prioritize resubmitted, then use actual status
      let status = 'Complete';
      if (latestRequest) {
        if (latestRequest.status === 'resubmitted' || latestRequest.revisionStatus === 'resubmitted') {
          status = 'Resubmitted';
        } else if (latestRequest.status === 'submitted') {
          status = 'Submitted';
        } else if (latestRequest.status === 'approved') {
          status = 'Approved';
        } else if (latestRequest.status === 'rejected') {
          status = 'Rejected';
        } else {
          status = latestRequest.status.charAt(0).toUpperCase() + latestRequest.status.slice(1);
        }
      }
      
      return {
        unitName,
        campus,
        requestCount: requests.length,
        lastUpdated,
        status
      };
    });

    // Apply search filter
    let filtered = units;
    if (unitSearchQuery.trim()) {
      const query = unitSearchQuery.toLowerCase();
      filtered = filtered.filter(unit => 
        unit.unitName.toLowerCase().includes(query) ||
        unit.campus.toLowerCase().includes(query)
      );
    }

    // Apply status filter (currently all are 'Complete', but keeping for future use)
    if (unitStatusFilter !== 'all') {
      filtered = filtered.filter(unit => 
        unitStatusFilter === 'submitted' ? unit.status === 'Complete' : 
        unitStatusFilter === 'pending' ? unit.status === 'Pending' : true
      );
    }

    // Sort alphabetically by unit name
    filtered.sort((a, b) => a.unitName.localeCompare(b.unitName));

    return filtered;
  }, [filteredUnitRequestsGrouped, unitSearchQuery, unitStatusFilter]);

  // Calculate summary statistics
  const unitSummaryStats = useMemo(() => {
    const total = processedUnits.length;
    const submitted = processedUnits.filter(u => u.status === 'Complete').length;
    return {
      total,
      submitted,
      pending: 0 // Currently all are complete, but keeping for future
    };
  }, [processedUnits]);

  // Pagination
  const totalPages = Math.ceil(processedUnits.length / unitsPerPage);
  const paginatedUnits = useMemo(() => {
    const startIndex = (unitCurrentPage - 1) * unitsPerPage;
    const endIndex = startIndex + unitsPerPage;
    return processedUnits.slice(startIndex, endIndex);
  }, [processedUnits, unitCurrentPage, unitsPerPage]);

  // Reset to page 1 when search or filter changes
  useEffect(() => {
    setUnitCurrentPage(1);
  }, [unitSearchQuery, unitStatusFilter]);

  const fetchUnitItems = useCallback(async (unitName) => {
    try {
      setUnitItemsLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        showAlert({
          variant: 'danger',
          title: 'Authentication Required',
          message: 'No authentication token found. Please login again.'
        });
        return;
      }

      const response = await axios.get(API_ENDPOINTS.admin.requestsByUnit(unitName), {
        headers: { 'x-auth-token': token }
      });
      
      setSelectedUnit(unitName);
      setUnitItems(response.data.items || []);
      setUnitItemsLoading(false);
    } catch (error) {
      console.error('Error fetching unit items:', error);
      setUnitItemsLoading(false);
      showAlert({
        variant: 'danger',
        title: 'Error',
        message: error.response?.data?.message || error.message || 'Failed to fetch unit items.'
      });
    }
  }, [showAlert]);

  // Handle viewing unit request details (inline view, not modal)
  const handleViewUnitRequest = useCallback(async (unitName) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showAlert({
          variant: 'danger',
          title: 'Authentication Required',
          message: 'No authentication token found. Please login again.'
        });
        return;
      }

      // Get requests for this unit from the grouped data
      const unitRequests = filteredUnitRequestsGrouped[unitName] || [];
      
      if (unitRequests.length === 0) {
        showAlert({
          variant: 'default',
          title: 'No Requests',
          message: `No requests found for ${unitName}.`
        });
        return;
      }

      // Prioritize resubmitted requests, then sort by most recent
      const selectedRequest = unitRequests.sort((a, b) => {
        // First, prioritize resubmitted requests
        const aResubmitted = a.status === 'resubmitted' || a.revisionStatus === 'resubmitted';
        const bResubmitted = b.status === 'resubmitted' || b.revisionStatus === 'resubmitted';
        if (aResubmitted && !bResubmitted) return -1;
        if (!aResubmitted && bResubmitted) return 1;
        // Then sort by most recent
        return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
      })[0];

      setSelectedUnitRequest(selectedRequest);
    } catch (error) {
      console.error('Error viewing unit request:', error);
      showAlert({
        variant: 'danger',
        title: 'Error',
        message: error.response?.data?.message || error.message || 'Failed to load request details.'
      });
    }
  }, [filteredUnitRequestsGrouped, showAlert]);

  const handleUpdateDictStatus = useCallback(async () => {
    if (!selectedUnitRequest || !dictStatusForm.status) {
      showAlert({
        variant: 'danger',
        title: 'Invalid Input',
        message: 'Please select a DICT approval status.'
      });
      return;
    }

    try {
      setUpdatingDictStatus(true);
      const token = localStorage.getItem('token');
      if (!token) {
        showAlert({
          variant: 'danger',
          title: 'Authentication Required',
          message: 'No authentication token found. Please login again.'
        });
        return;
      }

      const response = await axios.put(
        API_ENDPOINTS.admin.dictApproval(selectedUnitRequest._id),
        {
          status: dictStatusForm.status,
          notes: dictStatusForm.notes || ''
        },
        {
          headers: { 'x-auth-token': token }
        }
      );

      // Update the selected request with new DICT status
      setSelectedUnitRequest(response.data.request);
      
      // Update in grouped requests
      setUnitRequestsGrouped(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(unit => {
          updated[unit] = updated[unit].map(req => 
            req._id === selectedUnitRequest._id ? response.data.request : req
          );
        });
        return updated;
      });

      setShowDictStatusModal(false);
      setDictStatusForm({ status: '', notes: '' });

      showAlert({
        variant: 'success',
        title: 'Status Updated',
        message: 'DICT approval status has been updated successfully!',
        autoCloseDelay: 2500
      });
    } catch (error) {
      console.error('Error updating DICT status:', error);
      showAlert({
        variant: 'danger',
        title: 'Update Failed',
        message: error.response?.data?.message || error.message || 'Failed to update DICT approval status.'
      });
    } finally {
      setUpdatingDictStatus(false);
    }
  }, [selectedUnitRequest, dictStatusForm, showAlert]);

  const handleUpdateWholeISSPDictStatus = useCallback(async () => {
    if (!isspData || !isspData._id || !dictStatusForm.status) {
      showAlert({
        variant: 'danger',
        title: 'Invalid Input',
        message: 'Please select a DICT approval status.'
      });
      return;
    }

    try {
      setUpdatingDictStatus(true);
      const token = localStorage.getItem('token');
      if (!token) {
        showAlert({
          variant: 'danger',
          title: 'Authentication Required',
          message: 'No authentication token found. Please login again.'
        });
        return;
      }

      const response = await axios.put(
        API_ENDPOINTS.issp.dictApproval(isspData._id),
        {
          status: dictStatusForm.status,
          notes: dictStatusForm.notes || ''
        },
        {
          headers: { 'x-auth-token': token }
        }
      );

      await refreshIsspData();
      setShowDictStatusModal(false);
      setDictStatusForm({ status: '', notes: '' });

      showAlert({
        variant: 'success',
        title: 'Status Updated',
        message: 'DICT approval status has been updated successfully! All units and president have been notified.',
        autoCloseDelay: 2500
      });
    } catch (error) {
      console.error('Error updating DICT status:', error);
      showAlert({
        variant: 'danger',
        title: 'Update Failed',
        message: error.response?.data?.message || error.message || 'Failed to update DICT approval status.'
      });
    } finally {
      setUpdatingDictStatus(false);
    }
  }, [isspData, dictStatusForm, showAlert, refreshIsspData]);

  const handleUpdateAcceptingEntries = useCallback(async () => {
    if (!isspData || !isspData._id || !acceptingEntriesForm.status || !selectedYearCycle) {
      showAlert({
        variant: 'danger',
        title: 'Invalid Input',
        message: 'Please select an accepting entries status and year cycle.'
      });
      return;
    }

    try {
      setUpdatingAcceptingEntries(true);
      const token = localStorage.getItem('token');
      if (!token) {
        showAlert({
          variant: 'danger',
          title: 'Authentication Required',
          message: 'No authentication token found. Please login again.'
        });
        return;
      }

      const response = await axios.put(
        API_ENDPOINTS.issp.acceptingEntries(isspData._id),
        {
          status: acceptingEntriesForm.status,
          notes: acceptingEntriesForm.notes || '',
          yearCycle: selectedYearCycle
        },
        {
          headers: { 'x-auth-token': token }
        }
      );

      await refreshIsspData();
      setShowAcceptingEntriesModal(false);
      setAcceptingEntriesForm({ status: '', notes: '' });

      showAlert({
        variant: 'success',
        title: 'Status Updated',
        message: `Accepting entries status for ${selectedYearCycle} has been updated successfully! All units have been notified.`,
        autoCloseDelay: 2500
      });
    } catch (error) {
      console.error('Error updating accepting entries status:', error);
      showAlert({
        variant: 'danger',
        title: 'Update Failed',
        message: error.response?.data?.message || error.message || 'Failed to update accepting entries status.'
      });
    } finally {
      setUpdatingAcceptingEntries(false);
    }
  }, [isspData, acceptingEntriesForm, selectedYearCycle, showAlert, refreshIsspData]);

  const handlePriceChange = (itemId, requestId, value) => {
    setEditingPrices(prev => ({
      ...prev,
      [`${requestId}-${itemId}`]: value
    }));
  };

  const handleQuantityChange = (itemId, requestId, value) => {
    setEditingQuantities(prev => ({
      ...prev,
      [`${requestId}-${itemId}`]: value
    }));
  };

  const handleSpecificationChange = (itemId, requestId, value) => {
    setEditingSpecifications(prev => ({
      ...prev,
      [`${requestId}-${itemId}`]: value
    }));
  };

  const handleDeleteItem = useCallback(async (itemId, requestId, itemName) => {
    // Show confirmation modal
    openModal({
      variant: 'danger',
      title: 'Delete Item',
      message: `Are you sure you want to delete "${itemName}"? This action cannot be undone.`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      onConfirm: async () => {
        try {
          const token = localStorage.getItem('token');
          if (!token) {
            showAlert({
              variant: 'danger',
              title: 'Authentication Required',
              message: 'No authentication token found. Please login again.'
            });
            closeModal();
            return;
          }

          console.log('Deleting item:', { itemId, requestId, itemName });
          
          const response = await axios.delete(
            API_ENDPOINTS.admin.getRequestItem(requestId, itemId),
            {
              headers: { 'x-auth-token': token }
            }
          );
          
          console.log('Delete response:', response.data);

          // Update the selected request
          setSelectedUnitRequest(response.data.request);

          // Update in grouped requests
          setUnitRequestsGrouped(prev => {
            const updated = { ...prev };
            Object.keys(updated).forEach(unit => {
              updated[unit] = updated[unit].map(req => 
                req._id === requestId ? response.data.request : req
              );
            });
            return updated;
          });

          closeModal();
          showAlert({
            variant: 'success',
            title: 'Item Deleted',
            message: `Item "${itemName}" has been deleted successfully.`,
            autoCloseDelay: 2500
          });
        } catch (error) {
          console.error('Error deleting item:', error);
          closeModal();
          showAlert({
            variant: 'danger',
            title: 'Delete Failed',
            message: error.response?.data?.message || error.message || 'Failed to delete item.'
          });
        }
      },
      onClose: () => closeModal()
    });
  }, [openModal, showAlert, closeModal]);

  const updateItemPrice = async (itemId, requestId, price) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showAlert({
          variant: 'danger',
          title: 'Authentication Required',
          message: 'No authentication token found. Please login again.'
        });
        return;
      }

      const priceNum = parseFloat(price);
      if (isNaN(priceNum) || priceNum < 0) {
        showAlert({
          variant: 'danger',
          title: 'Invalid Price',
          message: 'Price must be a valid positive number.'
        });
        return;
      }

      await axios.put(
        API_ENDPOINTS.admin.updateRequestItemPrice(requestId, itemId),
        { price: priceNum },
        { headers: { 'x-auth-token': token } }
      );

      // Update the item in the unitItems state
      setUnitItems(prev => prev.map(item => 
        item.id === itemId && item.requestId === requestId
          ? { ...item, price: priceNum }
          : item
      ));

      // Update the item in the unitRequestsGrouped state
      setUnitRequestsGrouped(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(unit => {
          updated[unit] = updated[unit].map(request => {
            if (request._id === requestId) {
              return {
                ...request,
                items: request.items.map(item =>
                  item.id === itemId ? { ...item, price: priceNum } : item
                )
              };
            }
            return request;
          });
        });
        return updated;
      });

      // Clear the editing state
      setEditingPrices(prev => {
        const newState = { ...prev };
        delete newState[`${requestId}-${itemId}`];
        return newState;
      });

      showAlert({
        variant: 'success',
        title: 'Price Updated',
        message: 'Item price has been updated successfully!',
        autoCloseDelay: 2000
      });
    } catch (error) {
      console.error('Error updating item price:', error);
      showAlert({
        variant: 'danger',
        title: 'Update Failed',
        message: error.response?.data?.message || error.message || 'Failed to update item price.'
      });
    }
  };

  const handlePageCTableChange = (rowIndex, field, value) => {
    orgProfileDirtyRef.current = true;
    setPageCTableData((prev) =>
      prev.map((row, index) =>
        index === rowIndex
          ? {
              ...row,
              [field]: value
            }
          : row
      )
    );
    triggerOrgProfileAutoSave('C');
  };

  const handlePageDChange = (event) => {
    const { name, value } = event.target;
    orgProfileDirtyRef.current = true;
    setPageDData((prev) => ({ ...prev, [name]: value }));
    triggerOrgProfileAutoSave('D');
  };

  const handlePageETableChange = (rowIndex, field, value) => {
    orgProfileDirtyRef.current = true;
    setPageETableData((prev) =>
      prev.map((row, index) =>
        index === rowIndex
          ? {
              ...row,
              [field]: value
            }
          : row
      )
    );
    triggerOrgProfileAutoSave('E');
  };

  const handleResourceDeploymentChange = (rowIndex, field, value) => {
    setResourceDeploymentData((prev) =>
      prev.map((row, index) =>
        index === rowIndex
          ? {
              ...row,
              [field]: value
            }
          : row
      )
    );
  };

  const handleFunctionalInterfaceChartChange = (event) => {
    const file = event.target.files && event.target.files[0];

    if (!file) {
      setFunctionalInterfaceChart({ url: '', name: '' });
      orgProfileDirtyRef.current = true;
      triggerOrgProfileAutoSave('C');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFunctionalInterfaceChart({ url: reader.result || '', name: file.name });
      orgProfileDirtyRef.current = true;
      triggerOrgProfileAutoSave('C');
    };
    reader.onerror = () => {
      console.error('Error reading Organizational Profile functional interface chart upload');
      setFunctionalInterfaceChart({ url: '', name: '' });
    };
    reader.readAsDataURL(file);
  };

  const createResourceFileHandler = (setter) => (event) => {
    const file = event.target.files && event.target.files[0];

    if (!file) {
      setter({ url: '', name: '' });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setter({ url: reader.result || '', name: file.name });
    };
    reader.onerror = () => {
      console.error('Error reading Resource Requirements upload');
      setter({ url: '', name: '' });
    };
    reader.readAsDataURL(file);
  };

  const handleInternalProjectChange = (event) => {
    const { name, value } = event.target;
    setInternalProjectData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCrossAgencyProjectChange = (event) => {
    const { name, value } = event.target;
    setCrossAgencyProjectData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePerformanceFrameworkChange = (event) => {
    const { name, value } = event.target;
    setPerformanceFrameworkData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDevProjectScheduleChange = (rowIndex, field, value, type = 'project') => {
    const setter = type === 'project' ? setDevProjectSchedule : setDevIsSchedule;
    setter((prev) =>
      prev.map((row, index) =>
        index === rowIndex
          ? {
              ...row,
              [field]: value
            }
          : row
      )
    );
  };

  const handleDevSummaryChange = (rowIndex, field, value) => {
    setDevSummaryInvestments((prev) =>
      prev.map((row, index) =>
        index === rowIndex
          ? {
              ...row,
              [field]: value
            }
          : row
      )
    );
  };

  const handleDevCostChange = (rowIndex, field, value) => {
    setDevCostBreakdown((prev) =>
      prev.map((row, index) =>
        index === rowIndex
          ? {
              ...row,
              [field]: value
            }
          : row
      )
    );
  };

  // Fetch ISSP sections status
  useEffect(() => {
    fetchISSPStatus(true);
    fetchUnitStatuses();
    fetchSubmittedRequests();
  }, [fetchISSPStatus, fetchUnitStatuses, fetchSubmittedRequests]);

useEffect(() => {
  refreshIsspData();
}, [refreshIsspData]);

  useEffect(() => {
    return () => {
      if (orgProfileAutoSaveTimerRef.current) {
        clearTimeout(orgProfileAutoSaveTimerRef.current);
      }
    };
  }, []);

  // Fetch full ISSP data when a section is selected
  useEffect(() => {
    const fetchFullISSPData = async () => {
      if (selectedItem) {
        try {
          const token = localStorage.getItem('token');
          const response = await axios.get(API_ENDPOINTS.issp.get, {
            headers: { 'x-auth-token': token }
          });
          setIsspData(response.data);
          
          console.log('Fetched ISSP data:', response.data);
          
          // Populate formData based on the selected section
          if (selectedItem.title === "ORGANIZATIONAL PROFILE") {
            setFormData({
              mandate: response.data.organizationalProfile.pageA.mandate || '',
              visionStatement: response.data.organizationalProfile.pageA.visionStatement || '',
              missionStatement: response.data.organizationalProfile.pageA.missionStatement || '',
              majorFinalOutput: response.data.organizationalProfile.pageA.majorFinalOutput || '',
              plannerName: response.data.organizationalProfile.pageB.plannerName || '',
              plantillaPosition: response.data.organizationalProfile.pageB.plantillaPosition || '',
              organizationalUnit: response.data.organizationalProfile.pageB.organizationalUnit || '',
              emailAddress: response.data.organizationalProfile.pageB.emailAddress || '',
              contactNumbers: response.data.organizationalProfile.pageB.contactNumbers || '',
              annualIctBudget: response.data.organizationalProfile.pageB.annualIctBudget || '',
              otherFundSources: response.data.organizationalProfile.pageB.otherFundSources || '',
              totalEmployees: response.data.organizationalProfile.pageB.totalEmployees || '',
              regionalOffices: response.data.organizationalProfile.pageB.regionalOffices || '',
              provincialOffices: response.data.organizationalProfile.pageB.provincialOffices || '',
              otherOffices: response.data.organizationalProfile.pageB.otherOffices || ''
            });

            setPageCTableData(
              normalizePageCTableData(
                response.data.organizationalProfile.pageC?.tableData
              )
            );

            const functionalInterfaceChartUrl = response.data.organizationalProfile.pageC?.functionalInterfaceChartUrl || '';
            setFunctionalInterfaceChart({
              url: functionalInterfaceChartUrl,
              name: functionalInterfaceChartUrl ? 'Existing upload' : ''
            });

            setPageDData({
              strategicChallenges: response.data.organizationalProfile.pageD?.strategicChallenges || ''
            });

            setPageETableData(
              parseStrategicConcerns(
                response.data.organizationalProfile.pageE?.strategicConcerns
              )
            );
          } else if (selectedItem.title === "RESOURCE REQUIREMENTS") {
            const resource = response.data.resourceRequirements;

            // First, try to load saved deployment data
            let deploymentData = normalizeResourceDeploymentData(resource.pageA?.deploymentData);
            
            // If no saved data exists, populate from submitted requests
            const hasSavedData = resource.pageA?.deploymentData && 
                                resource.pageA.deploymentData.length > 0 &&
                                resource.pageA.deploymentData.some(row => row.item && row.item.trim() !== '');
            
            if (!hasSavedData && submittedRequests.length > 0) {
              // Collect all items from all submitted requests
              const itemsFromRequests = [];
              submittedRequests.forEach(request => {
                const unitName = request.userId?.unit || 'N/A';
                if (request.items && Array.isArray(request.items)) {
                  request.items.forEach(item => {
                    if (item.item && item.item.trim() !== '') {
                      itemsFromRequests.push({
                        item: item.item,
                        office: unitName,
                        year1: '',
                        year2: '',
                        year3: ''
                      });
                    }
                  });
                }
              });
              
              // Populate the table with items from requests
              if (itemsFromRequests.length > 0) {
                const populatedData = [...itemsFromRequests];
                // Fill remaining rows with empty data
                while (populatedData.length < RESOURCE_DEPLOYMENT_ROWS) {
                  populatedData.push(createResourceDeploymentRow());
                }
                deploymentData = populatedData.slice(0, RESOURCE_DEPLOYMENT_ROWS);
              }
            }

            setResourceDeploymentData(deploymentData);

            const existingStructureUrl = resource.pageB?.existingStructureUrl || '';
            setResourceExistingStructure({
              url: existingStructureUrl,
              name: existingStructureUrl ? 'Existing upload' : ''
            });

            const proposedStructureUrl = resource.pageB?.proposedStructureUrl || '';
            setResourceProposedStructure({
              url: proposedStructureUrl,
              name: proposedStructureUrl ? 'Existing upload' : ''
            });

            const placementUrl = resource.pageC?.placementStructureUrl || '';
            setResourcePlacementStructure({
              url: placementUrl,
              name: placementUrl ? 'Existing upload' : ''
            });
          } else if (selectedItem.title === "DETAILED DESCRIPTION OF ICT PROJECT") {
            const projects = response.data.detailedIctProjects;

            setInternalProjectData({
              nameTitle: projects.internal?.nameTitle || '',
              rank: projects.internal?.rank || '',
              objectives: projects.internal?.objectives || '',
              duration: projects.internal?.duration || '',
              deliverables: projects.internal?.deliverables || ''
            });

            setCrossAgencyProjectData({
              nameTitle: projects.crossAgency?.nameTitle || '',
              objectives: projects.crossAgency?.objectives || '',
              duration: projects.crossAgency?.duration || '',
              deliverables: projects.crossAgency?.deliverables || '',
              leadAgency: projects.crossAgency?.leadAgency || '',
              implementingAgencies: projects.crossAgency?.implementingAgencies || ''
            });

            setPerformanceFrameworkData(
              convertFrameworkArrayToObject(projects.performance?.frameworkData)
            );
          } else if (selectedItem.title === "DEVELOPMENT AND INVESTMENT PROGRAM") {
            const development = response.data.developmentInvestmentProgram;

            setDevProjectSchedule(
              normalizeDevProjectSchedule(development.pageA?.projectSchedule || [])
            );

            setDevIsSchedule(
              normalizeDevProjectSchedule(development.pageA?.isSchedule || [])
            );

            setDevSummaryInvestments(
              normalizeDevSummaryRows(development.pageB?.summaryInvestments || [])
            );

            setDevCostBreakdown(
              normalizeDevCostRows(development.pageC?.costBreakdown || [])
            );
          }
        } catch (error) {
          console.error('Error fetching full ISSP data:', error);
          console.error('Error details:', error.response?.data);
        }
      }
    };
    fetchFullISSPData();
  }, [selectedItem]);

  // Populate Resource Requirements table from submitted requests when section is selected
  useEffect(() => {
    if (selectedItem?.title === "RESOURCE REQUIREMENTS" && submittedRequests.length > 0) {
      // Check if table is empty or has no meaningful data
      const hasData = resourceDeploymentData.some(row => 
        row.item && row.item.trim() !== '' && row.office && row.office.trim() !== ''
      );
      
      // Only populate if table is empty
      if (!hasData) {
        const itemsFromRequests = [];
        submittedRequests.forEach(request => {
          const unitName = request.userId?.unit || 'N/A';
          if (request.items && Array.isArray(request.items)) {
            request.items.forEach(item => {
              if (item.item && item.item.trim() !== '') {
                itemsFromRequests.push({
                  item: item.item,
                  office: unitName,
                  year1: '',
                  year2: '',
                  year3: ''
                });
              }
            });
          }
        });
        
        if (itemsFromRequests.length > 0) {
          const populatedData = [...itemsFromRequests];
          // Fill remaining rows with empty data
          while (populatedData.length < RESOURCE_DEPLOYMENT_ROWS) {
            populatedData.push(createResourceDeploymentRow());
          }
          const finalData = populatedData.slice(0, RESOURCE_DEPLOYMENT_ROWS);
          setResourceDeploymentData(finalData);
          
          // Auto-save the populated data
          const savePopulatedData = async () => {
            try {
              const token = localStorage.getItem('token');
              if (!token) return;
              
              const cleanedDeployment = finalData
                .map((row) => ({
                  item: row.item || '',
                  office: row.office || '',
                  year1: row.year1 || '',
                  year2: row.year2 || '',
                  year3: row.year3 || ''
                }))
                .filter((row) =>
                  Object.values(row).some((value) => value && value.toString().trim() !== '')
                );
              
              // Fetch current ISSP data to preserve pageB and pageC
              const currentIsspResponse = await axios.get(API_ENDPOINTS.issp.get, {
                headers: { 'x-auth-token': token }
              });
              const currentResource = currentIsspResponse.data?.resourceRequirements || {};
              
              const payload = {
                pageA: {
                  deploymentData: cleanedDeployment
                },
                pageB: {
                  existingStructureUrl: currentResource.pageB?.existingStructureUrl || resourceExistingStructure.url || '',
                  proposedStructureUrl: currentResource.pageB?.proposedStructureUrl || resourceProposedStructure.url || ''
                },
                pageC: {
                  placementStructureUrl: currentResource.pageC?.placementStructureUrl || resourcePlacementStructure.url || ''
                }
              };
              
              await axios.put(
                API_ENDPOINTS.issp.resourceRequirements,
                payload,
                { headers: { 'x-auth-token': token } }
              );
              
              console.log('Auto-saved Resource Requirements with submitted request items');
            } catch (error) {
              console.error('Error auto-saving Resource Requirements:', error);
              // Don't show error to user, just log it
            }
          };
          
          // Save after a short delay to avoid race conditions
          setTimeout(() => {
            savePopulatedData();
          }, 500);
        }
      }
    }
  }, [selectedItem, submittedRequests, resourceDeploymentData]);

  // Save Organizational Profile
  const saveOrganizationalProfile = useCallback(async (page, { silent = false } = {}) => {
    if (orgProfileAutoSaveTimerRef.current) {
      clearTimeout(orgProfileAutoSaveTimerRef.current);
      orgProfileAutoSaveTimerRef.current = null;
    }
    try {
      console.log('Saving page:', page);
      console.log('Current formData:', formData);
      console.log('Current pageDData:', pageDData);
      
      const token = localStorage.getItem('token');
      if (!token) {
        showAlert({
          variant: 'danger',
          title: 'Authentication Required',
          message: 'No authentication token found. Please login again.'
        });
        return;
      }
      
      const cleanedTableData = pageCTableData
        .map((row) => ({
          organizationalUnit: row.organizationalUnit || '',
          agencyHead: row.agencyHead || '',
          plannerName: row.plannerName || '',
          plannerPosition: row.plannerPosition || '',
          plannerEmail: row.plannerEmail || '',
          employees: row.employees || '',
          ictBudget: row.ictBudget || ''
        }))
        .filter((row) =>
          Object.values(row).some((value) =>
            value && value.toString().trim() !== ''
          )
        );

      const sanitizedStrategicConcerns = pageETableData.map((row) => ({
        majorFinalOutput: row.majorFinalOutput || '',
        criticalSystems: row.criticalSystems || '',
        problems: row.problems || '',
        intendedUse: row.intendedUse || ''
      })).filter((row) =>
        Object.values(row).some((value) =>
          value && value.toString().trim() !== ''
        )
      );

      const payload = {
        pageA: {
          mandate: formData.mandate,
          visionStatement: formData.visionStatement,
          missionStatement: formData.missionStatement,
          majorFinalOutput: formData.majorFinalOutput
        },
        pageB: {
          plannerName: formData.plannerName,
          plantillaPosition: formData.plantillaPosition,
          organizationalUnit: formData.organizationalUnit,
          emailAddress: formData.emailAddress,
          contactNumbers: formData.contactNumbers,
          annualIctBudget: formData.annualIctBudget,
          otherFundSources: formData.otherFundSources,
          totalEmployees: formData.totalEmployees,
          regionalOffices: formData.regionalOffices,
          provincialOffices: formData.provincialOffices,
          otherOffices: formData.otherOffices
        },
        pageC: {
          tableData: cleanedTableData.length ? cleanedTableData : [],
          functionalInterfaceChartUrl: functionalInterfaceChart.url || ''
        },
        pageD: {
          strategicChallenges: pageDData?.strategicChallenges || ''
        },
        pageE: {
          strategicConcerns: sanitizedStrategicConcerns
        }
      };

      console.log('Payload for Organizational Profile save:', payload);
      console.log('Page D data being sent:', payload.pageD);
      
      console.log('Sending request to backend...');
      const response = await axios.put(API_ENDPOINTS.issp.organizationalProfile, payload, {
        headers: { 'x-auth-token': token }
      });
      
      console.log('Save response:', response.data);
      console.log('Response pageD:', response.data.organizationalProfile?.pageD);
      setIsspData(response.data);
      orgProfileDirtyRef.current = false;

      if (!silent) {
        setFormData({
          mandate: response.data.organizationalProfile.pageA.mandate || '',
          visionStatement: response.data.organizationalProfile.pageA.visionStatement || '',
          missionStatement: response.data.organizationalProfile.pageA.missionStatement || '',
          majorFinalOutput: response.data.organizationalProfile.pageA.majorFinalOutput || '',
          plannerName: response.data.organizationalProfile.pageB.plannerName || '',
          plantillaPosition: response.data.organizationalProfile.pageB.plantillaPosition || '',
          organizationalUnit: response.data.organizationalProfile.pageB.organizationalUnit || '',
          emailAddress: response.data.organizationalProfile.pageB.emailAddress || '',
          contactNumbers: response.data.organizationalProfile.pageB.contactNumbers || '',
          annualIctBudget: response.data.organizationalProfile.pageB.annualIctBudget || '',
          otherFundSources: response.data.organizationalProfile.pageB.otherFundSources || '',
          totalEmployees: response.data.organizationalProfile.pageB.totalEmployees || '',
          regionalOffices: response.data.organizationalProfile.pageB.regionalOffices || '',
          provincialOffices: response.data.organizationalProfile.pageB.provincialOffices || '',
          otherOffices: response.data.organizationalProfile.pageB.otherOffices || ''
        });

        setPageCTableData(
          normalizePageCTableData(
            response.data.organizationalProfile.pageC?.tableData
          )
        );

        const updatedFunctionalInterfaceChartUrl = response.data.organizationalProfile.pageC?.functionalInterfaceChartUrl || '';
        setFunctionalInterfaceChart({
          url: updatedFunctionalInterfaceChartUrl,
          name: updatedFunctionalInterfaceChartUrl
            ? (functionalInterfaceChart.name || 'Existing upload')
            : ''
        });

        // Update Page D data - use response if available, otherwise keep current state
        const savedPageD = response.data.organizationalProfile?.pageD;
        if (savedPageD && savedPageD.strategicChallenges !== undefined) {
          setPageDData({
            strategicChallenges: savedPageD.strategicChallenges || ''
          });
        } else {
          // If backend doesn't return pageD yet, keep the current state
          console.warn('Backend did not return pageD data. Current state preserved:', pageDData);
        }

        setPageETableData(
          parseStrategicConcerns(
            response.data.organizationalProfile.pageE?.strategicConcerns
          )
        );
      }
      
      await fetchISSPStatus();
      
      if (!silent) {
        showAlert({
          variant: 'success',
          title: 'Save Successful',
          message: 'Organizational profile saved successfully!'
        });
      }
    } catch (error) {
      console.error('Error saving organizational profile:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      if (silent) {
        console.error('Auto-save failed for organizational profile.');
      } else {
        showAlert({
          variant: 'danger',
          title: 'Save Failed',
          message: error.response?.data?.message || error.message || 'Failed to save organizational profile.'
        });
      }
    }
  }, [
    fetchISSPStatus,
    formData,
    functionalInterfaceChart,
    pageCTableData,
    pageDData,
    pageETableData,
    showAlert
  ]);

  const triggerOrgProfileAutoSave = useCallback((pageKey = orgProfilePage) => {
    if (orgProfileAutoSaveTimerRef.current) {
      clearTimeout(orgProfileAutoSaveTimerRef.current);
    }
    orgProfileAutoSaveTimerRef.current = setTimeout(() => {
      orgProfileAutoSaveTimerRef.current = null;
      saveOrganizationalProfile(pageKey, { silent: true });
    }, 800);
  }, [orgProfilePage, saveOrganizationalProfile]);

  const flushOrgProfileAutoSave = useCallback(async () => {
    if (!orgProfileDirtyRef.current) {
      if (orgProfileAutoSaveTimerRef.current) {
        clearTimeout(orgProfileAutoSaveTimerRef.current);
        orgProfileAutoSaveTimerRef.current = null;
      }
      return;
    }

    if (orgProfileAutoSaveTimerRef.current) {
      clearTimeout(orgProfileAutoSaveTimerRef.current);
      orgProfileAutoSaveTimerRef.current = null;
    }

    await saveOrganizationalProfile(orgProfilePage, { silent: true });
  }, [orgProfilePage, saveOrganizationalProfile]);

  const updateFormDataField = useCallback(
    (field, pageKey) => (event) => {
      const value = event?.target?.value ?? '';
      orgProfileDirtyRef.current = true;
      setFormData((prev) => ({
        ...prev,
        [field]: value
      }));
      triggerOrgProfileAutoSave(pageKey);
    },
    [triggerOrgProfileAutoSave]
  );

  const handleOrgProfileBack = useCallback(async () => {
    await flushOrgProfileAutoSave();
    if (orgProfilePage === 'A') {
      setSelectedItem(null);
      setOrgProfilePage('A');
    } else {
      setOrgProfilePage((prev) => {
        if (prev === 'B') return 'A';
        if (prev === 'C') return 'B';
        if (prev === 'C1') return 'C';
        if (prev === 'D') return 'C1';
        if (prev === 'E') return 'D';
        return 'A';
      });
    }
  }, [flushOrgProfileAutoSave, orgProfilePage, setSelectedItem]);

  const saveResourceRequirements = async (page) => {
    try {
      console.log('Saving Resource Requirements page:', page);

      const token = localStorage.getItem('token');
      if (!token) {
        showAlert({
          variant: 'danger',
          title: 'Authentication Required',
          message: 'No authentication token found. Please login again.'
        });
        return;
      }

      const cleanedDeployment = resourceDeploymentData
        .map((row) => ({
          item: row.item || '',
          office: row.office || '',
          year1: row.year1 || '',
          year2: row.year2 || '',
          year3: row.year3 || ''
        }))
        .filter((row) =>
          Object.values(row).some((value) => value && value.toString().trim() !== '')
        );

      const payload = {
        pageA: {
          deploymentData: cleanedDeployment
        },
        pageB: {
          existingStructureUrl: resourceExistingStructure.url || '',
          proposedStructureUrl: resourceProposedStructure.url || ''
        },
        pageC: {
          placementStructureUrl: resourcePlacementStructure.url || ''
        }
      };

      const response = await axios.put(
        API_ENDPOINTS.issp.resourceRequirements,
        payload,
        {
          headers: { 'x-auth-token': token }
        }
      );

      setIsspData(response.data);
      const updatedResource = response.data.resourceRequirements;

      setResourceDeploymentData(
        normalizeResourceDeploymentData(updatedResource.pageA?.deploymentData)
      );

      const updatedExisting = updatedResource.pageB?.existingStructureUrl || '';
      setResourceExistingStructure({
        url: updatedExisting,
        name: updatedExisting
          ? resourceExistingStructure.name || 'Existing upload'
          : ''
      });

      const updatedProposed = updatedResource.pageB?.proposedStructureUrl || '';
      setResourceProposedStructure({
        url: updatedProposed,
        name: updatedProposed
          ? resourceProposedStructure.name || 'Existing upload'
          : ''
      });

      const updatedPlacement = updatedResource.pageC?.placementStructureUrl || '';
      setResourcePlacementStructure({
        url: updatedPlacement,
        name: updatedPlacement
          ? resourcePlacementStructure.name || 'Existing upload'
          : ''
      });

      await fetchISSPStatus();

      showAlert({
        variant: 'success',
        title: 'Save Successful',
        message: 'Resource requirements saved successfully!'
      });
    } catch (error) {
      console.error('Error saving resource requirements:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      showAlert({
        variant: 'danger',
        title: 'Save Failed',
        message: error.response?.data?.message || error.message || 'Failed to save resource requirements.'
      });
    }
  };

  const saveDetailedIctProjects = async (page) => {
    try {
      console.log('Saving Detailed ICT Projects page:', page);

      const token = localStorage.getItem('token');
      if (!token) {
        showAlert({
          variant: 'danger',
          title: 'Authentication Required',
          message: 'No authentication token found. Please login again.'
        });
        return;
      }

      const payload = {
        internal: { ...internalProjectData },
        crossAgency: { ...crossAgencyProjectData },
        performance: {
          frameworkData: convertFrameworkObjectToArray(performanceFrameworkData)
        }
      };

      const response = await axios.put(
        API_ENDPOINTS.issp.detailedIctProjects,
        payload,
        {
          headers: { 'x-auth-token': token }
        }
      );

      setIsspData(response.data);
      const updatedProjects = response.data.detailedIctProjects;

      setInternalProjectData({
        nameTitle: updatedProjects.internal?.nameTitle || '',
        rank: updatedProjects.internal?.rank || '',
        objectives: updatedProjects.internal?.objectives || '',
        duration: updatedProjects.internal?.duration || '',
        deliverables: updatedProjects.internal?.deliverables || ''
      });

      setCrossAgencyProjectData({
        nameTitle: updatedProjects.crossAgency?.nameTitle || '',
        objectives: updatedProjects.crossAgency?.objectives || '',
        duration: updatedProjects.crossAgency?.duration || '',
        deliverables: updatedProjects.crossAgency?.deliverables || '',
        leadAgency: updatedProjects.crossAgency?.leadAgency || '',
        implementingAgencies: updatedProjects.crossAgency?.implementingAgencies || ''
      });

      setPerformanceFrameworkData(
        convertFrameworkArrayToObject(updatedProjects.performance?.frameworkData)
      );

      await fetchISSPStatus();

      showAlert({
        variant: 'success',
        title: 'Save Successful',
        message: 'Detailed ICT projects saved successfully!'
      });
    } catch (error) {
      console.error('Error saving detailed ICT projects:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      showAlert({
        variant: 'danger',
        title: 'Save Failed',
        message: error.response?.data?.message || error.message || 'Failed to save detailed ICT projects.'
      });
    }
  };

  const saveDevelopmentInvestmentProgram = async (page) => {
    try {
      console.log('Saving Development & Investment Program page:', page);

      const token = localStorage.getItem('token');
      if (!token) {
        showAlert({
          variant: 'danger',
          title: 'Authentication Required',
          message: 'No authentication token found. Please login again.'
        });
        return;
      }

      const cleanedProjectSchedule = devProjectSchedule
        .map((row) => ({ ...row }))
        .filter((row) =>
          Object.values(row).some((value) => value && value.toString().trim() !== '')
        );

      const cleanedIsSchedule = devIsSchedule
        .map((row) => ({ ...row }))
        .filter((row) =>
          Object.values(row).some((value) => value && value.toString().trim() !== '')
        );

      const cleanedSummary = devSummaryInvestments
        .map((row) => ({ ...row }))
        .filter((row) =>
          Object.values(row).some((value) => value && value.toString().trim() !== '')
        );

      const cleanedCost = devCostBreakdown
        .map((row) => ({ ...row }))
        .filter((row) =>
          Object.values(row).some((value) => value && value.toString().trim() !== '')
        );

      const payload = {
        pageA: {
          projectSchedule: cleanedProjectSchedule,
          isSchedule: cleanedIsSchedule
        },
        pageB: {
          summaryInvestments: cleanedSummary
        },
        pageC: {
          costBreakdown: cleanedCost
        }
      };

      const response = await axios.put(
        API_ENDPOINTS.issp.developmentInvestmentProgram,
        payload,
        {
          headers: { 'x-auth-token': token }
        }
      );

      setIsspData(response.data);
      const updatedDevelopment = response.data.developmentInvestmentProgram;

      setDevProjectSchedule(
        normalizeDevProjectSchedule(updatedDevelopment.pageA?.projectSchedule || [])
      );
      setDevIsSchedule(
        normalizeDevProjectSchedule(updatedDevelopment.pageA?.isSchedule || [])
      );
      setDevSummaryInvestments(
        normalizeDevSummaryRows(updatedDevelopment.pageB?.summaryInvestments || [])
      );
      setDevCostBreakdown(
        normalizeDevCostRows(updatedDevelopment.pageC?.costBreakdown || [])
      );

      await fetchISSPStatus();

      showAlert({
        variant: 'success',
        title: 'Save Successful',
        message: 'Development and investment program saved successfully!'
      });
    } catch (error) {
      console.error('Error saving development & investment program:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      showAlert({
        variant: 'danger',
        title: 'Save Failed',
        message: error.response?.data?.message || error.message || 'Failed to save development and investment program.'
      });
    }
  };

  const getStatusBadge = (status) => {
    if (status === 'complete') {
      return (
        <span className="px-2 py-1 text-xs font-medium text-green-700 bg-green-50 rounded-full border border-green-100">
          Complete
        </span>
      );
    }
    return (
      <span className="px-2 py-1 text-xs font-medium text-yellow-700 bg-yellow-50 rounded-full border border-yellow-100">
        In Progress
      </span>
    );
  };

  const handleView = (item) => {
    setSelectedItem(item);
    setOrgProfilePage('A');
    setCurrentPage('A');
    setIctProjectPage('internal');
  };

  const performGenerateISSP = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      showAlert({
        variant: 'danger',
        title: 'Authentication Required',
        message: 'No authentication token found. Please login again.'
      });
      return;
    }

    try {
      setGeneratingPdf(true);
      const response = await axios.get(API_ENDPOINTS.issp.generate, {
        responseType: 'blob',
        headers: { 'x-auth-token': token },
        params: { yearCycle: selectedYearCycle }
      });

      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ISSP-report-${selectedYearCycle}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      showAlert({
        variant: 'success',
        title: 'Download Ready',
        message: `ISSP PDF for ${selectedYearCycle} download has started.`
      });
    } catch (error) {
      console.error('Error generating ISSP PDF:', error);
      showAlert({
        variant: 'danger',
        title: 'Generation Failed',
        message: 'Failed to generate ISSP PDF. Please try again.'
      });
    } finally {
      setGeneratingPdf(false);
    }
  }, [showAlert, selectedYearCycle]);

  const handleGenerateISSP = useCallback(() => {
    if (generatingPdf) {
      return;
    }

    openModal({
      variant: 'confirm',
      title: 'Generate ISSP PDF',
      message: `Generate the complete ISSP report for ${selectedYearCycle} as a PDF?`,
      confirmLabel: 'Generate',
      onConfirm: async () => {
        await performGenerateISSP();
      }
    });
  }, [generatingPdf, openModal, performGenerateISSP, selectedYearCycle]);

  const handleSubmitForReview = useCallback(() => {
    if (submitReviewLoading) {
      return;
    }

    const currentReviewStatus = isspData?.review?.status || 'draft';

    if (currentReviewStatus === 'pending') {
      showAlert({
        variant: 'default',
        title: 'Already Submitted',
        message: 'ISSP is already awaiting presidential review.'
      });
      return;
    }

    const sectionsComplete =
      isspItems.length > 0 && isspItems.every((item) => item.status === 'complete');

    if (!sectionsComplete) {
      showAlert({
        variant: 'danger',
        title: 'Incomplete Sections',
        message: 'Please complete all ISSP sections before submitting for presidential review.'
      });
      return;
    }

    openModal({
      variant: 'confirm',
      title: 'Send to President',
      message: 'Send the ISSP to the Office of the President for review?',
      confirmLabel: 'Send',
      onConfirm: async () => {
        const token = localStorage.getItem('token');
        if (!token) {
          showAlert({
            variant: 'danger',
            title: 'Authentication Required',
            message: 'No authentication token found. Please login again.'
          });
          return;
        }

        try {
          setSubmitReviewLoading(true);

          await axios.post(
            API_ENDPOINTS.issp.reviewSubmit,
            {},
            {
              headers: { 'x-auth-token': token }
            }
          );

          await Promise.all([fetchISSPStatus(), refreshIsspData()]);
          showAlert({
            variant: 'success',
            title: 'Submitted for Review',
            message: 'ISSP has been sent to the Office of the President for review.'
          });
        } catch (error) {
          console.error('Error submitting ISSP for review:', error);
          showAlert({
            variant: 'danger',
            title: 'Submission Failed',
            message: error.response?.data?.message || error.message || 'Failed to submit ISSP for review.'
          });
        } finally {
          setSubmitReviewLoading(false);
        }
      }
    });
  }, [
    fetchISSPStatus,
    isspData,
    isspItems,
    openModal,
    refreshIsspData,
    showAlert,
    submitReviewLoading
  ]);

  const informationSystemsItem = isspItems.find(
    (item) => item.title === 'INFORMATION SYSTEMS STRATEGY'
  );

  const reviewStatus = isspData?.review?.status || 'draft';
  const reviewStatusClasses = {
    draft: 'bg-gray-100 text-gray-700 border border-gray-200',
    pending: 'bg-blue-100 text-blue-700 border border-blue-200',
    approved: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
    rejected: 'bg-red-100 text-red-700 border border-red-200'
  };
  const reviewStatusLabel = reviewStatus.replace(/[-_]/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  const reviewSubmittedAt = isspData?.review?.submittedAt || null;
  const reviewDecidedAt = isspData?.review?.decidedAt || null;
  const reviewDecisionNotes = isspData?.review?.decisionNotes || '';

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
  const alertConfirmHandler = alertState.autoCloseDelay ? undefined : handleAlertConfirm;

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

  const formatReviewDate = (value) => {
    if (!value) return '—';
    try {
      return new Date(value).toLocaleString();
    } catch (error) {
      return '—';
    }
  };

  const sectionsComplete =
    isspItems.length > 0 && isspItems.every((item) => item.status === 'complete');

  const canSubmitForReview =
    sectionsComplete && reviewStatus !== 'pending';

  const performUploadDictApprovedISSP = useCallback(async (file) => {
    try {
      setUploadingDictApprovedISSP(true);
      const token = localStorage.getItem('token');
      if (!token) {
        showAlert({
          variant: 'danger',
          title: 'Authentication Required',
          message: 'No authentication token found. Please login again.'
        });
        return;
      }

      const formData = new FormData();
      formData.append('dictApprovedISSP', file);

      const response = await axios.post(
        API_ENDPOINTS.issp.uploadDictApproved,
        formData,
        {
          headers: {
            'x-auth-token': token,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      setDictApprovedISSPDocument(response.data.dictApprovedISSPDocument);
      await refreshIsspData();

      showAlert({
        variant: 'success',
        title: 'Upload Successful',
        message: 'Approved ISSP document has been uploaded successfully!',
        autoCloseDelay: 2500
      });
    } catch (error) {
      console.error('Error uploading DICT approved ISSP:', error);
      showAlert({
        variant: 'danger',
        title: 'Upload Failed',
        message: error.response?.data?.message || error.message || 'Failed to upload approved ISSP document.'
      });
    } finally {
      setUploadingDictApprovedISSP(false);
      // Reset file input
      if (dictApprovedISSPInputRef.current) {
        dictApprovedISSPInputRef.current.value = '';
      }
    }
  }, [showAlert, refreshIsspData]);

  const handleUploadDictApprovedISSP = useCallback((event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type (PDF or image)
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      showAlert({
        variant: 'danger',
        title: 'Invalid File Type',
        message: 'Please upload a PDF or image file (JPEG, PNG).'
      });
      // Reset file input
      event.target.value = '';
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      showAlert({
        variant: 'danger',
        title: 'File Too Large',
        message: 'File size must be less than 10MB.'
      });
      // Reset file input
      event.target.value = '';
      return;
    }

    // Show confirmation modal with file
    openModal({
      variant: 'confirm',
      title: 'Upload Approved ISSP Document',
      message: 'Upload the approved ISSP document? This document will be viewable by all users.',
      confirmLabel: 'Upload',
      onConfirm: async () => {
        await performUploadDictApprovedISSP(file);
      },
      onCancel: () => {
        // Reset file input
        if (dictApprovedISSPInputRef.current) {
          dictApprovedISSPInputRef.current.value = '';
        }
      }
    });
  }, [showAlert, openModal, dictApprovedISSPDocument, performUploadDictApprovedISSP]);

  // Fetch DICT approved document when ISSP data is loaded
  useEffect(() => {
    if (isspData?.dictApprovedISSPDocument) {
      setDictApprovedISSPDocument(isspData.dictApprovedISSPDocument);
    } else {
      setDictApprovedISSPDocument(null);
    }
  }, [isspData]);

  const submitButtonLabel = submitReviewLoading
    ? 'Sending…'
    : reviewStatus === 'pending'
    ? 'Awaiting Presidential Review'
    : 'Send to President';

  return (
    <>
      {modalElement}
      {alertElement}
      
      {/* DICT Status Update Modal */}
      <Modal
        isOpen={showDictStatusModal}
        variant="default"
        title="Update DICT Approval Status"
        message={null}
        confirmLabel="Update"
        cancelLabel="Cancel"
        onClose={() => {
          setShowDictStatusModal(false);
          setDictStatusForm({ status: '', notes: '' });
        }}
        onConfirm={selectedUnitRequest ? handleUpdateDictStatus : handleUpdateWholeISSPDictStatus}
        closeOnOverlay={true}
        showCloseButton={true}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              DICT Approval Status <span className="text-red-500">*</span>
            </label>
            <select
              value={dictStatusForm.status}
              onChange={(e) => setDictStatusForm(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="approve_for_dict">Approve for DICT</option>
              <option value="collation_compilation">Collation/Compilation</option>
              <option value="revision_from_dict">Revision from DICT</option>
              <option value="approved_by_dict">Approved by DICT</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={dictStatusForm.notes}
              onChange={(e) => setDictStatusForm(prev => ({ ...prev, notes: e.target.value }))}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Add any notes or comments about the DICT approval status..."
            />
          </div>
        </div>
      </Modal>

      {/* Accepting Entries Status Update Modal */}
      <Modal
        isOpen={showAcceptingEntriesModal}
        variant="default"
        title="Update ISSP Entry Status"
        message={null}
        confirmLabel="Update"
        cancelLabel="Cancel"
        onClose={() => {
          setShowAcceptingEntriesModal(false);
          setAcceptingEntriesForm({ status: '', notes: '' });
        }}
        onConfirm={handleUpdateAcceptingEntries}
        closeOnOverlay={true}
        showCloseButton={true}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Entry Status <span className="text-red-500">*</span>
            </label>
            <select
              value={acceptingEntriesForm.status}
              onChange={(e) => setAcceptingEntriesForm(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="accepting">Accepting Entries</option>
              <option value="not_accepting">No Accepting Entries</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={acceptingEntriesForm.notes}
              onChange={(e) => setAcceptingEntriesForm(prev => ({ ...prev, notes: e.target.value }))}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Add any notes or comments about the entry status..."
            />
          </div>
        </div>
      </Modal>
      
      {/* Request Details Modal */}
      {selectedUnitRequest && (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <button
                  onClick={() => {
                    setSelectedUnitRequest(null);
                  }}
                  className="mr-4 text-gray-600 hover:text-gray-900"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h3 className="text-2xl font-bold text-gray-900">Request Details</h3>
              </div>
              <button
                onClick={() => {
                  setDictStatusForm({
                    status: selectedUnitRequest.dictApproval?.status || 'pending',
                    notes: selectedUnitRequest.dictApproval?.notes || ''
                  });
                  setShowDictStatusModal(true);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors duration-200 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Update ISSP status
              </button>
            </div>
            
            {selectedUnitRequest.requestTitle && (
              <p className="text-sm text-gray-600 mb-4 -mt-4 ml-10">{selectedUnitRequest.requestTitle}</p>
            )}
            
            {/* Revision Status Display */}
            {(selectedUnitRequest.revisionStatus === 'resubmitted' || selectedUnitRequest.status === 'resubmitted') && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-orange-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="text-sm font-semibold text-orange-900">Revised Request Resubmitted</span>
                        {selectedUnitRequest.revisedAt && (
                          <span className="ml-3 text-xs text-orange-700">
                            Resubmitted on: {new Date(selectedUnitRequest.revisedAt).toLocaleString()}
                          </span>
                        )}
                      </div>
                      <span className="px-3 py-1 text-xs font-semibold rounded-full bg-orange-200 text-orange-900">
                        RESUBMITTED
                      </span>
                    </div>
                    {selectedUnitRequest.revisionNotes && (
                      <div className="mt-2 text-sm text-orange-800">
                        <span className="font-medium">Revision Notes:</span> {selectedUnitRequest.revisionNotes}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* DICT Status Display */}
            {selectedUnitRequest.dictApproval && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-blue-900">DICT Approval Status: </span>
                    <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
                      selectedUnitRequest.dictApproval.status === 'approved_by_dict' ? 'bg-green-50 text-green-700' :
                      selectedUnitRequest.dictApproval.status === 'revision_from_dict' ? 'bg-red-50 text-red-700' :
                      selectedUnitRequest.dictApproval.status === 'approve_for_dict' ? 'bg-yellow-50 text-yellow-700' :
                      selectedUnitRequest.dictApproval.status === 'collation_compilation' ? 'bg-purple-50 text-purple-700' :
                      'bg-gray-50 text-gray-700'
                    }`}>
                      {selectedUnitRequest.dictApproval.status === 'approved_by_dict' ? 'Approved by DICT' :
                       selectedUnitRequest.dictApproval.status === 'revision_from_dict' ? 'Revision from DICT' :
                       selectedUnitRequest.dictApproval.status === 'approve_for_dict' ? 'Approve for DICT' :
                       selectedUnitRequest.dictApproval.status === 'collation_compilation' ? 'Collation/Compilation' :
                       'Pending'}
                    </span>
                  </div>
                  {selectedUnitRequest.dictApproval.updatedAt && (
                    <span className="text-xs text-blue-600">
                      Updated: {new Date(selectedUnitRequest.dictApproval.updatedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                {selectedUnitRequest.dictApproval.notes && (
                  <div className="mt-2 text-sm text-blue-800">
                    <span className="font-medium">Notes:</span> {selectedUnitRequest.dictApproval.notes}
                  </div>
                )}
              </div>
            )}
            
            <div className="space-y-4 sm:space-y-6">
              {/* Items Section */}
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="p-3 sm:p-4 border-b border-gray-200 bg-gray-50">
                  <h4 className="text-base sm:text-lg font-semibold text-gray-900">
                    Items ({selectedUnitRequest.items?.length || 0})
                  </h4>
                </div>
                <div className="overflow-x-auto">
                  {selectedUnitRequest.items && selectedUnitRequest.items.length > 0 ? (
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Unit</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Item Name</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Approval Status</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Item Status</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Quantity</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Price</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Range</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Status Details</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Specification</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Action</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {selectedUnitRequest.items.map((item, index) => (
                          <tr key={item.id || index} className="hover:bg-gray-50">
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{selectedUnitRequest.userId?.unit || 'N/A'}</div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{item.item}</div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                item.approvalStatus === 'approved' ? 'bg-green-50 text-green-700' :
                                item.approvalStatus === 'disapproved' ? 'bg-red-50 text-red-700' :
                                'bg-yellow-50 text-yellow-700'
                              }`}>
                                {(item.approvalStatus || 'pending').toUpperCase()}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                              {item.approvalStatus === 'approved' && item.itemStatus ? (
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
                              ) : (
                                <span className="text-xs text-gray-400">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                              <div className="text-sm text-gray-900">{item.quantity}</div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                              <div className="text-sm text-gray-900">
                                {item.price > 0 ? item.price.toLocaleString() : 'N/A'}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                              <span className={`px-2 py-0.5 text-xs font-semibold rounded ${
                                item.range === 'high' ? 'bg-gray-200 text-gray-800' :
                                item.range === 'mid' ? 'bg-gray-100 text-gray-700' :
                                'bg-gray-50 text-gray-600'
                              }`}>
                                {item.range?.toUpperCase() || 'N/A'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {item.approvalStatus === 'approved' && item.itemStatus ? (
                                <div className="text-xs">
                                  <div className="font-medium text-gray-700 mb-1">
                                    {item.itemStatus === 'pr_created' ? 'Purchase Request (PR) Created' :
                                     item.itemStatus === 'purchased' ? 'Item Purchased' :
                                     item.itemStatus === 'received' ? 'Item Received' :
                                     item.itemStatus === 'in_transit' ? 'Item In Transit' :
                                     item.itemStatus === 'completed' ? 'Item Completed' :
                                     item.itemStatus}
                                  </div>
                                  {item.itemStatusRemarks && (
                                    <div className="text-gray-600 mt-1">
                                      <span className="font-medium">Remarks:</span> {item.itemStatusRemarks}
                                    </div>
                                  )}
                                  {item.itemStatusUpdatedAt && (
                                    <div className="text-gray-500 mt-1">
                                      Updated: {new Date(item.itemStatusUpdatedAt).toLocaleDateString()}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm text-gray-900 max-w-xs break-words">
                                {item.specification || <span className="text-gray-400">—</span>}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                              <button
                                onClick={() => {
                                  const itemIdToDelete = item.id || item._id || `item-${index}`;
                                  console.log('Delete button clicked:', { item, itemIdToDelete, selectedUnitRequest });
                                  handleDeleteItem(itemIdToDelete, selectedUnitRequest._id, item.item);
                                }}
                                className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors duration-200 flex items-center gap-1.5 mx-auto"
                                title="Delete item"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-8 text-center text-gray-500">
                      <p className="text-sm">No items in this request</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-200">
              </div>
            </div>
          </div>
      )}
      
      {!selectedUnitRequest && (
      <div className="p-6 relative min-h-screen">
        {selectedUnitForRequests ? (
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center mb-6">
              <button
                onClick={() => {
                  setSelectedUnitForRequests(null);
                  setEditingPrices({});
                  setEditingQuantities({});
                  setEditingSpecifications({});
                }}
                className="mr-4 text-gray-600 hover:text-gray-900"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h2 className="text-2xl font-bold text-gray-900">{selectedUnitForRequests} - ISSP Items</h2>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-sm">
              <div className="table-responsive-wrapper">
                <table className="table-responsive w-full border-collapse border border-gray-300 text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 px-3 sm:px-4 py-2 sm:py-3 text-left font-semibold text-gray-700 sticky left-0 bg-gray-50 z-10 text-xs sm:text-sm">Item Name</th>
                      <th className="border border-gray-300 px-3 sm:px-4 py-2 sm:py-3 text-center font-semibold text-gray-700 text-xs sm:text-sm">Year</th>
                      <th className="border border-gray-300 px-3 sm:px-4 py-2 sm:py-3 text-center font-semibold text-gray-700 text-xs sm:text-sm">Quantity</th>
                      <th className="border border-gray-300 px-3 sm:px-4 py-2 sm:py-3 text-center font-semibold text-gray-700 text-xs sm:text-sm">Price</th>
                      <th className="border border-gray-300 px-3 sm:px-4 py-2 sm:py-3 text-center font-semibold text-gray-700 text-xs sm:text-sm">Range</th>
                      <th className="border border-gray-300 px-3 sm:px-4 py-2 sm:py-3 text-left font-semibold text-gray-700 min-w-[150px] sm:min-w-[200px] text-xs sm:text-sm">Specification</th>
                      <th className="border border-gray-300 px-3 sm:px-4 py-2 sm:py-3 text-left font-semibold text-gray-700 min-w-[150px] sm:min-w-[200px] text-xs sm:text-sm">Purpose</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUnitRequestsGrouped[selectedUnitForRequests]?.flatMap((request) =>
                      request.items?.map((item, index) => {
                        const priceKey = `${request._id}-${item.id}`;
                        const currentPrice = editingPrices[priceKey] !== undefined 
                          ? editingPrices[priceKey] 
                          : (item.price || '');
                        const currentQuantity = editingQuantities[priceKey] !== undefined 
                          ? editingQuantities[priceKey] 
                          : (item.quantity || '');
                        const currentSpecification = editingSpecifications[priceKey] !== undefined 
                          ? editingSpecifications[priceKey] 
                          : (item.specification || '');
                        
                        return (
                          <tr key={`${request._id}-${item.id}-${index}`} className="hover:bg-gray-50 group">
                            <td className="border border-gray-300 px-3 sm:px-4 py-2 sm:py-3 text-gray-900 font-medium sticky left-0 bg-white group-hover:bg-gray-50 z-10 text-xs sm:text-sm">
                              {item.item}
                            </td>
                            <td className="border border-gray-300 px-3 sm:px-4 py-2 sm:py-3 text-center text-gray-700 text-xs sm:text-sm">
                              {request.year}
                            </td>
                            <td className="border border-gray-300 px-3 sm:px-4 py-2 sm:py-3">
                              <input
                                type="number"
                                value={currentQuantity}
                                onChange={(e) => handleQuantityChange(item.id, request._id, e.target.value)}
                                placeholder="0"
                                min="0"
                                step="1"
                                className="w-full px-2 py-1 border border-gray-300 rounded text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm"
                              />
                            </td>
                            <td className="border border-gray-300 px-3 sm:px-4 py-2 sm:py-3">
                              <input
                                type="number"
                                value={currentPrice}
                                onChange={(e) => handlePriceChange(item.id, request._id, e.target.value)}
                                placeholder="0.00"
                                min="0"
                                step="0.01"
                                className="w-full px-2 py-1 border border-gray-300 rounded text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm"
                              />
                            </td>
                            <td className="border border-gray-300 px-3 sm:px-4 py-2 sm:py-3 text-center text-xs sm:text-sm">
                              <span className={`px-2 py-0.5 text-xs font-semibold rounded ${
                                item.range === 'high' ? 'bg-gray-200 text-gray-800' :
                                item.range === 'mid' ? 'bg-gray-100 text-gray-700' :
                                'bg-gray-50 text-gray-600'
                              }`}>
                                {item.range?.toUpperCase() || 'N/A'}
                              </span>
                            </td>
                            <td className="border border-gray-300 px-3 sm:px-4 py-2 sm:py-3">
                              <textarea
                                value={currentSpecification}
                                onChange={(e) => handleSpecificationChange(item.id, request._id, e.target.value)}
                                placeholder="Enter specification..."
                                rows="2"
                                className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm resize-none"
                              />
                            </td>
                            <td className="border border-gray-300 px-3 sm:px-4 py-2 sm:py-3 text-gray-700 max-w-xs text-xs sm:text-sm">
                              <div className="break-words" title={item.purpose || 'N/A'}>
                                {item.purpose || <span className="text-gray-400">N/A</span>}
                              </div>
                            </td>
                          </tr>
                        );
                      }) || []
                    )}
                  </tbody>
                </table>
              </div>
              
              <div className="mt-6">
                <button
                  type="button"
                  onClick={async () => {
                    // Check for any changes
                    const priceUpdates = Object.entries(editingPrices);
                    const quantityUpdates = Object.entries(editingQuantities);
                    const specificationUpdates = Object.entries(editingSpecifications);
                    
                    if (priceUpdates.length === 0 && quantityUpdates.length === 0 && specificationUpdates.length === 0) {
                      showAlert({
                        variant: 'default',
                        title: 'No Changes',
                        message: 'No changes have been made.'
                      });
                      return;
                    }

                    try {
                      const token = localStorage.getItem('token');
                      if (!token) {
                        showAlert({
                          variant: 'danger',
                          title: 'Authentication Required',
                          message: 'No authentication token found. Please login again.'
                        });
                        return;
                      }

                      let updateCount = 0;

                      // Update all prices
                      for (const [key, price] of priceUpdates) {
                        const [requestId, itemId] = key.split('-');
                        const priceNum = parseFloat(price);
                        
                        if (!isNaN(priceNum) && priceNum >= 0) {
                          await axios.put(
                            API_ENDPOINTS.admin.updateRequestItemPrice(requestId, itemId),
                            { price: priceNum },
                            { headers: { 'x-auth-token': token } }
                          );
                          updateCount++;
                        }
                      }

                      // Update all quantities
                      for (const [key, quantity] of quantityUpdates) {
                        const [requestId, itemId] = key.split('-');
                        const quantityNum = parseInt(quantity);
                        
                        if (!isNaN(quantityNum) && quantityNum >= 0) {
                          await axios.put(
                            API_ENDPOINTS.admin.updateRequestItemQuantity(requestId, itemId),
                            { quantity: quantityNum },
                            { headers: { 'x-auth-token': token } }
                          );
                          updateCount++;
                        }
                      }

                      // Update all specifications
                      for (const [key, specification] of specificationUpdates) {
                        const [requestId, itemId] = key.split('-');
                        
                        await axios.put(
                          API_ENDPOINTS.admin.updateRequestItemSpecification(requestId, itemId),
                          { specification: specification },
                          { headers: { 'x-auth-token': token } }
                        );
                        updateCount++;
                      }

                      // Update the unitRequestsGrouped state
                      setUnitRequestsGrouped(prev => {
                        const updated = { ...prev };
                        Object.keys(updated).forEach(unit => {
                          updated[unit] = updated[unit].map(request => {
                            const priceUpdate = priceUpdates.find(([k]) => k.startsWith(request._id));
                            const quantityUpdate = quantityUpdates.find(([k]) => k.startsWith(request._id));
                            const specificationUpdate = specificationUpdates.find(([k]) => k.startsWith(request._id));
                            
                            if (priceUpdate || quantityUpdate || specificationUpdate) {
                              return {
                                ...request,
                                items: request.items.map(item => {
                                  const priceKey = `${request._id}-${item.id}`;
                                  let updatedItem = { ...item };
                                  
                                  // Update price
                                  const priceEntry = priceUpdates.find(([k]) => k === priceKey);
                                  if (priceEntry) {
                                    const priceNum = parseFloat(priceEntry[1]);
                                    if (!isNaN(priceNum) && priceNum >= 0) {
                                      updatedItem.price = priceNum;
                                    }
                                  }
                                  
                                  // Update quantity
                                  const quantityEntry = quantityUpdates.find(([k]) => k === priceKey);
                                  if (quantityEntry) {
                                    const quantityNum = parseInt(quantityEntry[1]);
                                    if (!isNaN(quantityNum) && quantityNum >= 0) {
                                      updatedItem.quantity = quantityNum;
                                    }
                                  }
                                  
                                  // Update specification
                                  const specEntry = specificationUpdates.find(([k]) => k === priceKey);
                                  if (specEntry) {
                                    updatedItem.specification = specEntry[1];
                                  }
                                  
                                  return updatedItem;
                                })
                              };
                            }
                            return request;
                          });
                        });
                        return updated;
                      });

                      // Clear all editing states
                      setEditingPrices({});
                      setEditingQuantities({});
                      setEditingSpecifications({});

                      showAlert({
                        variant: 'success',
                        title: 'Updates Saved',
                        message: `Successfully updated ${updateCount} item${updateCount > 1 ? 's' : ''}!`,
                        autoCloseDelay: 2000
                      });
                    } catch (error) {
                      console.error('Error updating items:', error);
                      showAlert({
                        variant: 'danger',
                        title: 'Update Failed',
                        message: error.response?.data?.message || error.message || 'Failed to update items.'
                      });
                    }
                  }}
                  disabled={Object.keys(editingPrices).length === 0 && Object.keys(editingQuantities).length === 0 && Object.keys(editingSpecifications).length === 0}
                  className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors duration-200 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        ) : selectedUnit ? (
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center mb-6">
              <button
                onClick={() => {
                  setSelectedUnit(null);
                  setUnitItems([]);
                  setEditingPrices({});
                }}
                className="mr-4 text-gray-600 hover:text-gray-900"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h2 className="text-2xl font-bold text-gray-900">Unit Items - {selectedUnit}</h2>
            </div>

            {unitItemsLoading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="text-gray-600 mt-2">Loading items...</p>
              </div>
            ) : unitItems.length === 0 ? (
              <div className="bg-white p-8 rounded-lg shadow-sm">
                <div className="text-center py-12 text-gray-500">
                  <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <p className="text-lg font-medium">No approved items found</p>
                  <p className="text-sm mt-1">This unit has no approved items yet.</p>
                </div>
              </div>
            ) : (
              <div className="bg-white p-8 rounded-lg shadow-sm">
                <div className="mb-4">
                  <p className="text-sm text-gray-600">
                    View and update prices for approved items ({unitItems.length} item{unitItems.length !== 1 ? 's' : ''})
                  </p>
                </div>
                <div className="table-responsive-wrapper">
                  <table className="table-responsive w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-300 px-3 sm:px-4 py-2 sm:py-3 text-left font-semibold text-gray-700 sticky left-0 bg-gray-50 z-10 text-xs sm:text-sm">Item Name</th>
                        <th className="border border-gray-300 px-3 sm:px-4 py-2 sm:py-3 text-left font-semibold text-gray-700 text-xs sm:text-sm">Request</th>
                        <th className="border border-gray-300 px-3 sm:px-4 py-2 sm:py-3 text-center font-semibold text-gray-700 text-xs sm:text-sm">Year</th>
                        <th className="border border-gray-300 px-3 sm:px-4 py-2 sm:py-3 text-center font-semibold text-gray-700 text-xs sm:text-sm">Quantity</th>
                        <th className="border border-gray-300 px-3 sm:px-4 py-2 sm:py-3 text-left font-semibold text-gray-700 min-w-[150px] sm:min-w-[200px] text-xs sm:text-sm">Specification</th>
                        <th className="border border-gray-300 px-3 sm:px-4 py-2 sm:py-3 text-left font-semibold text-gray-700 min-w-[150px] sm:min-w-[200px] text-xs sm:text-sm">Purpose</th>
                        <th className="border border-gray-300 px-3 sm:px-4 py-2 sm:py-3 text-center font-semibold text-gray-700 text-xs sm:text-sm">Price</th>
                        <th className="border border-gray-300 px-3 sm:px-4 py-2 sm:py-3 text-center font-semibold text-gray-700 text-xs sm:text-sm">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {unitItems.map((item, index) => {
                        const priceKey = `${item.requestId}-${item.id}`;
                        const currentPrice = editingPrices[priceKey] !== undefined 
                          ? editingPrices[priceKey] 
                          : (item.price || '');
                        
                        return (
                          <tr key={`${item.requestId}-${item.id}-${index}`} className="hover:bg-gray-50 group">
                            <td className="border border-gray-300 px-3 sm:px-4 py-2 sm:py-3 text-gray-900 font-medium sticky left-0 bg-white group-hover:bg-gray-50 z-10 text-xs sm:text-sm">
                              {item.item}
                            </td>
                            <td className="border border-gray-300 px-3 sm:px-4 py-2 sm:py-3 text-gray-700 text-xs sm:text-sm">
                              {item.requestTitle}
                            </td>
                            <td className="border border-gray-300 px-3 sm:px-4 py-2 sm:py-3 text-center text-gray-700 text-xs sm:text-sm">
                              {item.requestYear}
                            </td>
                            <td className="border border-gray-300 px-3 sm:px-4 py-2 sm:py-3 text-center text-gray-700 text-xs sm:text-sm">
                              {item.quantity}
                            </td>
                            <td className="border border-gray-300 px-3 sm:px-4 py-2 sm:py-3 text-gray-700 max-w-xs text-xs sm:text-sm">
                              <div className="break-words" title={item.specification || 'N/A'}>
                                {item.specification || <span className="text-gray-400">N/A</span>}
                              </div>
                            </td>
                            <td className="border border-gray-300 px-4 py-3 text-gray-700 max-w-xs">
                              <div className="break-words" title={item.purpose || 'N/A'}>
                                {item.purpose || <span className="text-gray-400">N/A</span>}
                              </div>
                            </td>
                            <td className="border border-gray-300 px-4 py-3">
                              <input
                                type="number"
                                value={currentPrice}
                                onChange={(e) => handlePriceChange(item.id, item.requestId, e.target.value)}
                                placeholder="0.00"
                                min="0"
                                step="0.01"
                                className="w-full px-2 py-1 border border-gray-300 rounded text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </td>
                            <td className="border border-gray-300 px-4 py-3 text-center">
                              <button
                                onClick={() => updateItemPrice(item.id, item.requestId, currentPrice)}
                                disabled={editingPrices[priceKey] === undefined || currentPrice === (item.price || '') || currentPrice === ''}
                                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
                              >
                                Update
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : !selectedItem ? (
        <>
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <>
              {/* Year Cycle Selector, Search Bar, and Action Buttons - Top */}
              <div className="mb-6">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                  {/* Search Bar and Year Cycle Selector */}
                  <div className="flex flex-col sm:flex-row items-center gap-4 flex-1">
                    {/* Search Bar */}
                    <div className="flex-1 max-w-md">
                      <div className="relative">
                        <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                          type="text"
                          placeholder="Search by unit name or campus..."
                          value={unitSearchQuery}
                          onChange={(e) => setUnitSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-gray-700">Year Cycle:</label>
                    <select
                      value={selectedYearCycle}
                      onChange={(e) => setSelectedYearCycle(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400 text-sm font-medium text-gray-700 bg-white"
                    >
                      <option value="2024-2027">2024-2027</option>
                      <option value="2027-2030">2027-2030</option>
                      <option value="2030-2033">2030-2033</option>
                      <option value="2033-2036">2033-2036</option>
                    </select>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={handleGenerateISSP}
                      disabled={generatingPdf}
                      className={`px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg shadow-md transition-all duration-200 flex items-center justify-center space-x-2 ${
                        generatingPdf ? 'opacity-60 cursor-not-allowed' : 'hover:bg-gray-300 hover:shadow-lg'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{generatingPdf ? 'Generating…' : 'Generate ISSP'}</span>
                    </button>
                    <button
                      onClick={handleSubmitForReview}
                      disabled={!canSubmitForReview || submitReviewLoading}
                      className={`px-4 py-2 font-medium rounded-lg shadow-md transition-all duration-200 flex items-center justify-center space-x-2 ${
                        canSubmitForReview && !submitReviewLoading
                          ? 'bg-gray-200 text-gray-700 hover:bg-gray-300 hover:shadow-lg'
                          : 'bg-gray-200 text-gray-500 cursor-not-allowed opacity-70'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v16h16V4H4zm4 6h8m-8 4h5" />
                      </svg>
                      <span>{submitButtonLabel}</span>
                    </button>
                    <input
                      type="file"
                      ref={dictApprovedISSPInputRef}
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleUploadDictApprovedISSP}
                      disabled={uploadingDictApprovedISSP}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => dictApprovedISSPInputRef.current?.click()}
                      disabled={uploadingDictApprovedISSP}
                      className={`px-4 py-2 font-medium rounded-lg shadow-md transition-all duration-200 flex items-center justify-center space-x-2 ${
                        uploadingDictApprovedISSP
                          ? 'bg-gray-200 text-gray-500 cursor-not-allowed opacity-70'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300 hover:shadow-lg cursor-pointer'
                      }`}
                    >
                        {uploadingDictApprovedISSP ? (
                          <>
                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Uploading...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            <span>Upload Approved ISSP</span>
                          </>
                        )}
                    </button>
                  </div>
                  </div>
                </div>
                
              <div>
                <div className="mb-4">
                  <h2 className="text-lg font-bold text-gray-800 mb-4">UNIT SUBMISSION STATUS</h2>
                </div>

                {requestsLoading ? (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="text-gray-600 mt-2">Loading requests...</p>
                  </div>
                ) : Object.keys(filteredUnitRequestsGrouped).length === 0 ? (
                  <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200">
                    <div className="text-center py-8 text-gray-500">
                      <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-lg font-medium">No submitted requests found for {selectedYearCycle}</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Units Table */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                      <div className="overflow-x-auto max-h-[350px] overflow-y-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50 sticky top-0 z-10">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Unit Name
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Campus
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Requests
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                              </th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {paginatedUnits.length > 0 ? (
                              paginatedUnits.map((unit) => (
                                <tr key={unit.unitName} className="hover:bg-gray-50 transition-colors">
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">
                                      {unit.unitName}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-600">
                                      {unit.campus}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-600">
                                      {unit.requestCount} {unit.requestCount === 1 ? 'request' : 'requests'}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${
                                      unit.status === 'Resubmitted' 
                                        ? 'text-orange-700 bg-orange-50 border-orange-100' 
                                        : unit.status === 'Submitted'
                                        ? 'text-blue-700 bg-blue-50 border-blue-100'
                                        : unit.status === 'Approved'
                                        ? 'text-green-700 bg-green-50 border-green-100'
                                        : unit.status === 'Rejected'
                                        ? 'text-red-700 bg-red-50 border-red-100'
                                        : 'text-gray-700 bg-gray-50 border-gray-100'
                                    }`}>
                                      {unit.status}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button
                                      onClick={() => handleViewUnitRequest(unit.unitName)}
                                      className="px-4 py-1 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md transition-colors duration-200 cursor-pointer"
                                    >
                                      View
                                    </button>
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                                  <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  <p className="text-lg font-medium">No units found</p>
                                  <p className="text-sm mt-1">Try adjusting your search or filter criteria</p>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination */}
                      {totalPages > 1 && (
                        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                          <div className="text-sm text-gray-700">
                            Showing <span className="font-medium">{(unitCurrentPage - 1) * unitsPerPage + 1}</span> to{' '}
                            <span className="font-medium">
                              {Math.min(unitCurrentPage * unitsPerPage, processedUnits.length)}
                            </span> of{' '}
                            <span className="font-medium">{processedUnits.length}</span> units
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setUnitCurrentPage(prev => Math.max(1, prev - 1))}
                              disabled={unitCurrentPage === 1}
                              className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Previous
                            </button>
                            
                            {/* Page Numbers */}
                            <div className="flex gap-1">
                              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                let pageNum;
                                if (totalPages <= 5) {
                                  pageNum = i + 1;
                                } else if (unitCurrentPage <= 3) {
                                  pageNum = i + 1;
                                } else if (unitCurrentPage >= totalPages - 2) {
                                  pageNum = totalPages - 4 + i;
                                } else {
                                  pageNum = unitCurrentPage - 2 + i;
                                }
                                
                                return (
                                  <button
                                    key={pageNum}
                                    onClick={() => setUnitCurrentPage(pageNum)}
                                    className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                                      unitCurrentPage === pageNum
                                        ? 'bg-gray-700 text-white'
                                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                    }`}
                                  >
                                    {pageNum}
                                  </button>
                                );
                              })}
                            </div>
                            
                            <button
                              onClick={() => setUnitCurrentPage(prev => Math.min(totalPages, prev + 1))}
                              disabled={unitCurrentPage === totalPages}
                              className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="mb-6 mt-8">
                <h2 className="text-lg font-bold text-gray-800 mb-4">ISSP SECTIONS</h2>
                
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {isspItems.filter((item) => item.title !== 'Goal Completion').map((item) => (
                      <div
                      key={item.id}
                        className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col h-full"
                      >
                        <h2 className="text-base font-semibold text-gray-900 mb-4">
                        {item.title}
                        </h2>
                        <div className="mt-auto flex justify-between items-center">
                        {getStatusBadge(item.status)}
                          <button
                          onClick={() => handleView(item)}
                            className="px-4 py-1 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md transition-colors duration-200"
                          >
                            View
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
              </div>

              <div className="mt-8">
                <h2 className="text-lg font-bold text-gray-800 mb-4">PRESIDENTIAL REVIEW STATUS</h2>
                <div className="bg-gradient-to-br from-white to-gray-50 rounded-lg shadow-md border border-gray-200 overflow-hidden">
                  {/* Status Header */}
                  <div className={`px-6 py-4 border-b ${
                    reviewStatus === 'approved' ? 'bg-emerald-50 border-emerald-200' :
                    reviewStatus === 'rejected' ? 'bg-red-50 border-red-200' :
                    reviewStatus === 'pending' ? 'bg-blue-50 border-blue-200' :
                    'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div className="flex items-center gap-3">
                        {/* Status Icon */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          reviewStatus === 'approved' ? 'bg-emerald-100' :
                          reviewStatus === 'rejected' ? 'bg-red-100' :
                          reviewStatus === 'pending' ? 'bg-blue-100' :
                          'bg-gray-100'
                        }`}>
                          {reviewStatus === 'approved' ? (
                            <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          ) : reviewStatus === 'rejected' ? (
                            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          ) : reviewStatus === 'pending' ? (
                            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          ) : (
                            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          )}
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 font-medium mb-1">Current Status</p>
                          <span className={`text-sm font-semibold px-4 py-1.5 rounded-full inline-block ${reviewStatusClasses[reviewStatus]}`}>
                            {reviewStatusLabel}
                          </span>
                        </div>
                      </div>
                      
                      {/* Timestamp Info */}
                      {(reviewSubmittedAt || reviewDecidedAt) && (
                        <div className="text-xs text-gray-600">
                          {reviewStatus === 'pending' && reviewSubmittedAt && (
                            <div className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>Submitted: {formatReviewDate(reviewSubmittedAt)}</span>
                            </div>
                          )}
                          {reviewDecidedAt && (reviewStatus === 'approved' || reviewStatus === 'rejected') && (
                            <div className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>Decided: {formatReviewDate(reviewDecidedAt)}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Content Area */}
                  <div className="p-6 space-y-4">
                    {/* Incomplete Warning */}
                    {!sectionsComplete && (
                      <div className="bg-amber-50 border-l-4 border-amber-400 rounded-r-lg p-4 flex gap-3">
                        <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-amber-800 mb-1">Sections Incomplete</p>
                          <p className="text-sm text-amber-700">
                            Please complete all ISSP sections before submitting for presidential review.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Pending Status Info */}
                    {reviewStatus === 'pending' && (
                      <div className="bg-blue-50 border-l-4 border-blue-400 rounded-r-lg p-4 flex gap-3">
                        <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-blue-800 mb-1">Awaiting Review</p>
                          <p className="text-sm text-blue-700">
                            Your ISSP has been submitted and is currently under review by the Office of the President.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Approved Status Info */}
                    {reviewStatus === 'approved' && (
                      <div className="bg-emerald-50 border-l-4 border-emerald-400 rounded-r-lg p-4 flex gap-3">
                        <svg className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-emerald-800 mb-1">Approved by President</p>
                          <p className="text-sm text-emerald-700">
                            Congratulations! Your ISSP has been approved by the Office of the President.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Rejected Status Info */}
                    {reviewStatus === 'rejected' && (
                      <div className="bg-red-50 border-l-4 border-red-400 rounded-r-lg p-4 flex gap-3">
                        <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-red-800 mb-1">Needs Revision</p>
                          <p className="text-sm text-red-700">
                            Your ISSP requires revisions. Please review the feedback below and resubmit.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Presidential Notes */}
                    {reviewDecisionNotes && reviewStatus !== 'pending' && reviewStatus !== 'draft' && (
                      <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                            <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-900 mb-2">Presidential Feedback</p>
                            <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
                              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{reviewDecisionNotes}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Draft Status Info */}
                    {reviewStatus === 'draft' && sectionsComplete && (
                      <div className="bg-gray-50 border-l-4 border-gray-400 rounded-r-lg p-4 flex gap-3">
                        <svg className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-gray-800 mb-1">Ready for Submission</p>
                          <p className="text-sm text-gray-700">
                            All sections are complete. You can now submit your ISSP for presidential review using the button above.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* DICT Approval Status Section */}
              <div className="mt-8">
                <h2 className="text-lg font-bold text-gray-800 mb-4">DICT APPROVAL STATUS</h2>
                <div className="bg-gradient-to-br from-white to-gray-50 rounded-lg shadow-md border border-gray-200 overflow-hidden">
                  {/* Status Header */}
                  <div className={`px-6 py-4 border-b ${
                    isspData?.dictApproval?.status === 'approved_by_dict' ? 'bg-emerald-50 border-emerald-200' :
                    isspData?.dictApproval?.status === 'revision_from_dict' ? 'bg-red-50 border-red-200' :
                    isspData?.dictApproval?.status === 'approve_for_dict' ? 'bg-yellow-50 border-yellow-200' :
                    isspData?.dictApproval?.status === 'collation_compilation' ? 'bg-purple-50 border-purple-200' :
                    'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="text-xs text-gray-600 font-medium mb-1">DICT Approval Status</p>
                          <span className={`text-sm font-semibold px-4 py-1.5 rounded-full inline-block ${
                            isspData?.dictApproval?.status === 'approved_by_dict' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                            isspData?.dictApproval?.status === 'revision_from_dict' ? 'bg-red-100 text-red-700 border border-red-200' :
                            isspData?.dictApproval?.status === 'approve_for_dict' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                            isspData?.dictApproval?.status === 'collation_compilation' ? 'bg-purple-100 text-purple-700 border border-purple-200' :
                            'bg-gray-100 text-gray-700 border border-gray-200'
                          }`}>
                            {isspData?.dictApproval?.status === 'approved_by_dict' ? 'Approved by DICT' :
                             isspData?.dictApproval?.status === 'revision_from_dict' ? 'Revision from DICT' :
                             isspData?.dictApproval?.status === 'approve_for_dict' ? 'Approve for DICT' :
                             isspData?.dictApproval?.status === 'collation_compilation' ? 'Collation/Compilation' :
                             'Pending'}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setDictStatusForm({
                            status: isspData?.dictApproval?.status || 'pending',
                            notes: isspData?.dictApproval?.notes || ''
                          });
                          setShowDictStatusModal(true);
                        }}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors duration-200 flex items-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Update ISSP status
                      </button>
                    </div>
                    {isspData?.dictApproval?.updatedAt && (
                      <div className="text-xs text-gray-600 mt-2">
                        Updated: {new Date(isspData.dictApproval.updatedAt).toLocaleString()}
                      </div>
                    )}
                  </div>

                  {/* Content Area */}
                  <div className="p-6">
                    {isspData?.dictApproval?.notes && (
                      <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">Notes:</p>
                        <p className="text-sm text-gray-900">{isspData.dictApproval.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Accepting Entries Status Section */}
              <div className="mt-8">
                <h2 className="text-lg font-bold text-gray-800 mb-4">ISSP ENTRY STATUS ({selectedYearCycle})</h2>
                <div className="bg-gradient-to-br from-white to-gray-50 rounded-lg shadow-md border border-gray-200 overflow-hidden">
                  {/* Status Header */}
                  {(() => {
                    // Handle Map structure - Mongoose Maps are converted to objects in JSON
                    const acceptingEntries = isspData?.acceptingEntries;
                    const yearCycleStatus = acceptingEntries && typeof acceptingEntries === 'object' && !Array.isArray(acceptingEntries) 
                      ? acceptingEntries[selectedYearCycle] 
                      : null;
                    const currentStatus = yearCycleStatus?.status || 'accepting'; // Default to 'accepting'
                    
                    return (
                      <>
                        <div className={`px-6 py-4 border-b ${
                          currentStatus === 'accepting' ? 'bg-green-50 border-green-200' :
                          'bg-red-50 border-red-200'
                        }`}>
                          <div className="flex items-center justify-between flex-wrap gap-4">
                            <div className="flex items-center gap-3">
                              <div>
                                <p className="text-xs text-gray-600 font-medium mb-1">Current Status for {selectedYearCycle}</p>
                                <span className={`text-sm font-semibold px-4 py-1.5 rounded-full inline-block ${
                                  currentStatus === 'accepting' ? 'bg-green-100 text-green-700 border border-green-200' :
                                  'bg-red-100 text-red-700 border border-red-200'
                                }`}>
                                  {currentStatus === 'accepting' ? 'Accepting Entries' : 'No Accepting Entries'}
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                setAcceptingEntriesForm({
                                  status: currentStatus,
                                  notes: yearCycleStatus?.notes || ''
                                });
                                setShowAcceptingEntriesModal(true);
                              }}
                              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors duration-200 flex items-center gap-2"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Update Entry Status
                            </button>
                          </div>
                          {yearCycleStatus?.updatedAt && (
                            <div className="text-xs text-gray-600 mt-2">
                              Updated: {new Date(yearCycleStatus.updatedAt).toLocaleString()}
                            </div>
                          )}
                        </div>

                        {/* Content Area */}
                        <div className="p-6">
                          {yearCycleStatus?.notes && (
                            <div className="bg-white border border-gray-200 rounded-lg p-4">
                              <p className="text-sm font-medium text-gray-700 mb-2">Notes:</p>
                              <p className="text-sm text-gray-900">{yearCycleStatus.notes}</p>
                            </div>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

            </>
          )}
        </>
        ) : (
          selectedItem.title === "ORGANIZATIONAL PROFILE" ? (
            <div className="max-w-7xl mx-auto space-y-6">
              <div className="flex items-center mb-6">
                <button
                  onClick={handleOrgProfileBack}
                  className="mr-4 text-gray-600 hover:text-gray-900"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h2 className="text-2xl font-bold text-gray-900">PART I. ORGANIZATIONAL PROFILE</h2>
              </div>

              {orgProfilePage === 'A' && (
                <div className="bg-white p-8 rounded-lg shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-8">
                    A. DEPARTMENT/AGENCY VISION / MISSION STATEMENT
                  </h3>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        A.1. Mandate
                      </label>
                      <textarea
                        name="mandate"
                        value={formData.mandate}
                        onChange={updateFormDataField('mandate', 'A')}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter mandate..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        A.2. Vision Statement
                      </label>
                      <textarea
                        name="visionStatement"
                        value={formData.visionStatement}
                        onChange={updateFormDataField('visionStatement', 'A')}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter vision statement..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        A.3. Mission Statement
                      </label>
                      <textarea
                        name="missionStatement"
                        value={formData.missionStatement}
                        onChange={updateFormDataField('missionStatement', 'A')}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter mission statement..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        A.4. Major Final Output
                      </label>
                      <textarea
                        name="majorFinalOutput"
                        value={formData.majorFinalOutput}
                        onChange={updateFormDataField('majorFinalOutput', 'A')}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter major final output..."
                      />
                    </div>
                  </div>
                </div>
              )}

              {orgProfilePage === 'B' && (
                <div className="bg-white p-8 rounded-lg shadow-sm">
                  <h3 className="text-xl font-semibold text-gray-900 mb-8 pb-4 border-b">
                    B. DEPARTMENT/AGENCY PROFILE
                  </h3>
                  
                  <div className="space-y-8">
                    <div className="bg-gray-50 p-6 rounded-lg border border-gray-100">
                      <h4 className="text-md font-semibold text-gray-800 mb-6">
                        B.1. Name of Designated IS Planner
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Full Name
                          </label>
                          <input
                            type="text"
                            name="plannerName"
                            value={formData.plannerName}
                            onChange={updateFormDataField('plannerName', 'B')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Plantilla Position
                          </label>
                          <input
                            type="text"
                            name="plantillaPosition"
                            value={formData.plantillaPosition}
                            onChange={updateFormDataField('plantillaPosition', 'B')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Organizational Unit
                          </label>
                          <input
                            type="text"
                            name="organizationalUnit"
                            value={formData.organizationalUnit}
                            onChange={updateFormDataField('organizationalUnit', 'B')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Email Address
                          </label>
                          <input
                            type="email"
                            name="emailAddress"
                            value={formData.emailAddress}
                            onChange={updateFormDataField('emailAddress', 'B')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Contact Numbers
                          </label>
                          <input
                            type="text"
                            name="contactNumbers"
                            value={formData.contactNumbers}
                            onChange={updateFormDataField('contactNumbers', 'B')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 p-6 rounded-lg border border-gray-100">
                      <h4 className="text-md font-semibold text-gray-800 mb-6">
                        B.2. Current Annual ICT Budget
                      </h4>
                      <div className="grid grid-cols-1 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Annual ICT Budget
                          </label>
                          <input
                            type="text"
                            name="annualIctBudget"
                            value={formData.annualIctBudget}
                            onChange={updateFormDataField('annualIctBudget', 'B')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Other Sources of Funds
                          </label>
                          <textarea
                            name="otherFundSources"
                            value={formData.otherFundSources}
                            onChange={updateFormDataField('otherFundSources', 'B')}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 p-6 rounded-lg border border-gray-100">
                      <h4 className="text-md font-semibold text-gray-800 mb-6">
                        B.3. Organizational Structure
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Total No. of Employees
                          </label>
                          <input
                            type="number"
                            name="totalEmployees"
                            value={formData.totalEmployees}
                            onChange={updateFormDataField('totalEmployees', 'B')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            No. of Regional/Extension Offices
                          </label>
                          <input
                            type="number"
                            name="regionalOffices"
                            value={formData.regionalOffices}
                            onChange={updateFormDataField('regionalOffices', 'B')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            No. of Provincial Offices
                          </label>
                          <input
                            type="number"
                            name="provincialOffices"
                            value={formData.provincialOffices}
                            onChange={updateFormDataField('provincialOffices', 'B')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            No. of Other Offices
                          </label>
                          <input
                            type="number"
                            name="otherOffices"
                            value={formData.otherOffices}
                            onChange={updateFormDataField('otherOffices', 'B')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {orgProfilePage === 'C' && (
                <div className="bg-white p-8 rounded-lg shadow-sm">
                  <h3 className="text-xl font-semibold text-gray-900 mb-8 pb-4 border-b">
                    TABLE B-1 (FOR DEPARTMENT-WIDE ORGANIZATIONS ONLY)
                  </h3>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full border border-gray-200">
                      <thead>
                        <tr>
                          <th className="border border-gray-200 bg-gray-50 p-2">
                            <div className="font-medium text-gray-700 text-sm">ORGANIZATIONAL UNIT₁</div>
                          </th>
                          <th className="border border-gray-200 bg-gray-50 p-2">
                            <div className="font-medium text-gray-700 text-sm">NAME OF AGENCY HEAD₂</div>
                          </th>
                          <th colSpan={3} className="border border-gray-200 bg-gray-50 p-2 text-center">
                            <div className="font-medium text-gray-700 text-sm">DESIGNATED IS PLANNER₃</div>
                          </th>
                          <th className="border border-gray-200 bg-gray-50 p-2">
                            <div className="font-medium text-gray-700 text-sm">NUMBER OF EMPLOYEES₄</div>
                          </th>
                          <th className="border border-gray-200 bg-gray-50 p-2">
                            <div className="font-medium text-gray-700 text-sm">CURRENT ANNUAL ICT BUDGET₅</div>
                          </th>
                        </tr>
                        <tr>
                          <th className="border border-gray-200 bg-gray-50 p-2"></th>
                          <th className="border border-gray-200 bg-gray-50 p-2"></th>
                          <th className="border border-gray-200 bg-gray-50 p-2">
                            <div className="font-medium text-gray-700 text-sm">NAME₃ₐ</div>
                          </th>
                          <th className="border border-gray-200 bg-gray-50 p-2">
                            <div className="font-medium text-gray-700 text-sm">PLANTILLA POSITION₃ᵦ</div>
                          </th>
                          <th className="border border-gray-200 bg-gray-50 p-2">
                            <div className="font-medium text-gray-700 text-sm">E-MAIL ADDRESS₃ᵧ</div>
                          </th>
                          <th className="border border-gray-200 bg-gray-50 p-2"></th>
                          <th className="border border-gray-200 bg-gray-50 p-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {pageCTableData.map((row, index) => (
                          <tr key={index}>
                            <td className="border border-gray-200 p-0">
                              <input
                                type="text"
                                value={row.organizationalUnit}
                                onChange={(event) =>
                                  handlePageCTableChange(index, 'organizationalUnit', event.target.value)
                                }
                                className="w-full p-2 border-0 focus:ring-0"
                              />
                            </td>
                            <td className="border border-gray-200 p-0">
                              <input
                                type="text"
                                value={row.agencyHead}
                                onChange={(event) =>
                                  handlePageCTableChange(index, 'agencyHead', event.target.value)
                                }
                                className="w-full p-2 border-0 focus:ring-0"
                              />
                            </td>
                            <td className="border border-gray-200 p-0">
                              <input
                                type="text"
                                value={row.plannerName}
                                onChange={(event) =>
                                  handlePageCTableChange(index, 'plannerName', event.target.value)
                                }
                                className="w-full p-2 border-0 focus:ring-0"
                              />
                            </td>
                            <td className="border border-gray-200 p-0">
                              <input
                                type="text"
                                value={row.plannerPosition}
                                onChange={(event) =>
                                  handlePageCTableChange(index, 'plannerPosition', event.target.value)
                                }
                                className="w-full p-2 border-0 focus:ring-0"
                              />
                            </td>
                            <td className="border border-gray-200 p-0">
                              <input
                                type="email"
                                value={row.plannerEmail}
                                onChange={(event) =>
                                  handlePageCTableChange(index, 'plannerEmail', event.target.value)
                                }
                                className="w-full p-2 border-0 focus:ring-0"
                              />
                            </td>
                            <td className="border border-gray-200 p-0">
                              <input
                                type="number"
                                value={row.employees}
                                onChange={(event) =>
                                  handlePageCTableChange(index, 'employees', event.target.value)
                                }
                                className="w-full p-2 border-0 focus:ring-0"
                              />
                            </td>
                            <td className="border border-gray-200 p-0">
                              <input
                                type="text"
                                value={row.ictBudget}
                                onChange={(event) =>
                                  handlePageCTableChange(index, 'ictBudget', event.target.value)
                                }
                                className="w-full p-2 border-0 focus:ring-0"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {orgProfilePage === 'D' && (
                <div className="bg-white p-8 rounded-lg shadow-sm">
                  <h3 className="text-xl font-semibold text-gray-900 mb-8 pb-4 border-b">
                    D. PRESENT ICT SITUATION (STRATEGIC CHALLENGES)
                  </h3>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Strategic Challenges
                      </label>
                      <textarea
                        name="strategicChallenges"
                        value={pageDData.strategicChallenges}
                        onChange={handlePageDChange}
                        rows={20}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter strategic challenges related to the present ICT situation..."
                      />
                    </div>
                  </div>
                </div>
              )}

              {orgProfilePage === 'E' && (
                <div className="bg-white p-8 rounded-lg shadow-sm">
                  <h3 className="text-xl font-semibold text-gray-900 mb-8 pb-4 border-b">
                    E. STRATEGIC CONCERNS FOR ICT USE
                  </h3>

                  <div className="overflow-x-auto border border-gray-400">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr>
                          <th className="border border-gray-400 bg-gray-50 p-3 text-left font-semibold uppercase tracking-wide text-gray-800">
                            MAJOR FINAL OUTPUT / ORGANIZATIONAL OUTCOME
                          </th>
                          <th className="border border-gray-400 bg-gray-50 p-3 text-left font-semibold uppercase tracking-wide text-gray-800">
                            CRITICAL MANAGEMENT / OPERATING / BUSINESS SYSTEMS
                          </th>
                          <th className="border border-gray-400 bg-gray-50 p-3 text-left font-semibold uppercase tracking-wide text-gray-800">
                            PROBLEMS
                          </th>
                          <th className="border border-gray-400 bg-gray-50 p-3 text-left font-semibold uppercase tracking-wide text-gray-800">
                            INTENDED USE OF ICT
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {pageETableData.map((row, index) => (
                          <tr key={index}>
                            <td className="border border-gray-400 p-0 align-top">
                              <textarea
                                value={row.majorFinalOutput}
                                onChange={(event) =>
                                  handlePageETableChange(index, 'majorFinalOutput', event.target.value)
                                }
                                className="w-full h-full p-4 min-h-[260px] text-gray-900 leading-relaxed bg-white resize-none focus:outline-none"
                                placeholder="Type organizational outcomes..."
                              />
                            </td>
                            <td className="border border-gray-400 p-0 align-top">
                              <textarea
                                value={row.criticalSystems}
                                onChange={(event) =>
                                  handlePageETableChange(index, 'criticalSystems', event.target.value)
                                }
                                className="w-full h-full p-4 min-h-[260px] text-gray-900 leading-relaxed bg-white resize-none focus:outline-none"
                                placeholder="List critical management / operating systems..."
                              />
                            </td>
                            <td className="border border-gray-400 p-0 align-top">
                              <textarea
                                value={row.problems}
                                onChange={(event) =>
                                  handlePageETableChange(index, 'problems', event.target.value)
                                }
                                className="w-full h-full p-4 min-h-[260px] text-gray-900 leading-relaxed bg-white resize-none focus:outline-none"
                                placeholder="Describe problems/challenges..."
                              />
                            </td>
                            <td className="border border-gray-400 p-0 align-top">
                              <textarea
                                value={row.intendedUse}
                                onChange={(event) =>
                                  handlePageETableChange(index, 'intendedUse', event.target.value)
                                }
                                className="w-full h-full p-4 min-h-[260px] text-gray-900 leading-relaxed bg-white resize-none focus:outline-none"
                                placeholder="Indicate intended ICT interventions..."
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {orgProfilePage === 'C1' && (
                <div className="bg-white p-8 rounded-lg shadow-sm">
                  <h3 className="text-xl font-semibold text-gray-900 mb-8 pb-4 border-b">
                    C. THE DEPARTMENT/AGENCY AND ITS ENVIRONMENT (FUNCTIONAL INTERFACE CHART)
                  </h3>
                  
                  <div className="bg-gray-50 p-6 rounded-lg border border-gray-100">
                    <div className="flex flex-col items-center justify-center min-h-[500px]">
                      <div className="text-center p-8 border-4 border-dashed border-gray-300 rounded-lg w-full h-full">
                        <p className="text-gray-500 mb-4">Upload your functional interface chart here</p>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          id="functional-interface-upload"
                          onChange={handleFunctionalInterfaceChartChange}
                        />
                        <label
                          htmlFor="functional-interface-upload"
                          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-700 cursor-pointer inline-block transition-colors duration-200"
                        >
                          Upload Chart
                        </label>
                        {functionalInterfaceChart.name && (
                          <p className="mt-4 text-sm text-gray-600">
                            Selected file: {functionalInterfaceChart.name}
                          </p>
                        )}
                        {functionalInterfaceChart.url && functionalInterfaceChart.url.startsWith('data:image') && (
                          <div className="mt-4">
                            <img 
                              src={functionalInterfaceChart.url} 
                              alt="Functional Interface Chart" 
                              className="max-w-full max-h-96 mx-auto rounded-lg border border-gray-200"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => saveOrganizationalProfile(orgProfilePage)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors duration-200"
                >
                  Save
                </button>
                {(orgProfilePage !== 'E' || informationSystemsItem) && (
                  <button
                    type="button"
                    onClick={async () => {
                      await flushOrgProfileAutoSave();
                      if (orgProfilePage === 'E') {
                        if (informationSystemsItem) {
                          handleView(informationSystemsItem);
                        } else {
                          showAlert({
                            variant: 'default',
                            title: 'Section Unavailable',
                            message: 'Information Systems Strategy section is not available yet.'
                          });
                        }
                        return;
                      }
                      setOrgProfilePage((prev) => {
                        if (prev === 'A') return 'B';
                        if (prev === 'B') return 'C';
                        if (prev === 'C') return 'C1';
                        if (prev === 'C1') return 'D';
                        if (prev === 'D') return 'E';
                        return prev;
                      });
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors duration-200 flex items-center"
                  >
                    {orgProfilePage === 'E' ? 'Next Section' : 'Next'}
                    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ) : selectedItem.title === "INFORMATION SYSTEMS STRATEGY" ? (
            <InformationSystemsStrategy
              onBack={() => setSelectedItem(null)}
              initialData={isspData?.informationSystemsStrategy}
              onDataSaved={(updatedData) => setIsspData(updatedData)}
              refreshStatus={fetchISSPStatus}
            />
          ) : selectedItem.title === "RESOURCE REQUIREMENTS" ? (
            <div className="max-w-7xl mx-auto space-y-6">
              <div className="flex items-center mb-6">
                <button
                  onClick={() => {
                    if (currentPage === 'A') {
                      setSelectedItem(null);
                    } else if (currentPage === 'B') {
                      setCurrentPage('A');
                    } else if (currentPage === 'C') {
                      setCurrentPage('B');
                    }
                  }}
                  className="mr-4 text-gray-600 hover:text-gray-900"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h2 className="text-2xl font-bold text-gray-900">PART IV. RESOURCE REQUIREMENTS</h2>
              </div>

              {currentPage === 'A' ? (
                <div className="bg-white p-8 rounded-lg shadow-sm">
                  <h3 className="text-xl font-semibold text-gray-900 mb-8 pb-4 border-b">
                    A. DEPLOYMENT OF ICT EQUIPMENT AND SERVICES
                  </h3>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-900 text-sm">
                      <thead>
                        <tr>
                          <th className="border border-gray-900 bg-white p-3 font-bold text-left align-top" rowSpan={2}>
                            <div>I T E M ₁</div>
                            <div className="text-xs font-normal mt-1">(Allotment Class/ Object of Expenditures)</div>
                            <div className="italic font-normal mt-2">Examples:</div>
                          </th>
                          <th className="border border-gray-900 bg-white p-3 font-bold text-center align-top" rowSpan={2}>
                            <div>NAME OF OFFICE/</div>
                            <div>ORGANIZATIONAL UNITS₂</div>
                          </th>
                          <th className="border border-gray-900 bg-white p-3 font-bold text-center align-top" colSpan={3}>
                            <div>PROPOSED NUMBER</div>
                            <div>OF UNITS₃</div>
                          </th>
                        </tr>
                        <tr>
                          <th className="border border-gray-900 bg-white p-3 font-bold text-center">YEAR 1</th>
                          <th className="border border-gray-900 bg-white p-3 font-bold text-center">YEAR 2</th>
                          <th className="border border-gray-900 bg-white p-3 font-bold text-center">YEAR 3</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Empty rows for user input */}
                        {resourceDeploymentData.map((row, index) => (
                          <tr key={index}>
                            <td className="border border-gray-900 p-0">
                              <input
                                type="text"
                                value={row.item}
                                onChange={(event) =>
                                  handleResourceDeploymentChange(index, 'item', event.target.value)
                                }
                                className="w-full p-2 border-0 focus:ring-0"
                              />
                            </td>
                            <td className="border border-gray-900 p-0">
                              <input
                                type="text"
                                value={row.office}
                                onChange={(event) =>
                                  handleResourceDeploymentChange(index, 'office', event.target.value)
                                }
                                className="w-full p-2 border-0 focus:ring-0"
                              />
                            </td>
                            <td className="border border-gray-900 p-0">
                              <input
                                type="text"
                                value={row.year1}
                                onChange={(event) =>
                                  handleResourceDeploymentChange(index, 'year1', event.target.value)
                                }
                                className="w-full p-2 border-0 focus:ring-0 text-center"
                              />
                            </td>
                            <td className="border border-gray-900 p-0">
                              <input
                                type="text"
                                value={row.year2}
                                onChange={(event) =>
                                  handleResourceDeploymentChange(index, 'year2', event.target.value)
                                }
                                className="w-full p-2 border-0 focus:ring-0 text-center"
                              />
                            </td>
                            <td className="border border-gray-900 p-0">
                              <input
                                type="text"
                                value={row.year3}
                                onChange={(event) =>
                                  handleResourceDeploymentChange(index, 'year3', event.target.value)
                                }
                                className="w-full p-2 border-0 focus:ring-0 text-center"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-between mt-8">
                    <button
                      type="button"
                      onClick={() => saveResourceRequirements(currentPage)}
                      className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors duration-200"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentPage('B')}
                      className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors duration-200 flex items-center"
                    >
                      Next
                      <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              ) : currentPage === 'B' ? (
                <div className="bg-white p-8 rounded-lg shadow-sm">
                  <h3 className="text-xl font-semibold text-gray-900 mb-8 pb-4 border-b">
                    B. ICT ORGANIZATIONAL STRUCTURE
                  </h3>

                  <div className="space-y-12">
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">
                        B.1 EXISTING ICT ORGANIZATIONAL STRUCTURE
                      </h4>
                      <div className="border-2 border-gray-400 min-h-[320px] bg-white rounded-sm flex items-center justify-center overflow-hidden">
                        {resourceExistingStructure.url ? (
                          resourceExistingStructure.url.startsWith('data:image') ? (
                            <img
                              src={resourceExistingStructure.url}
                              alt="Existing ICT organizational structure"
                              className="max-h-full max-w-full object-contain"
                            />
                          ) : (
                            <a
                              href={resourceExistingStructure.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 underline"
                            >
                              View uploaded file
                            </a>
                          )
                        ) : null}
                      </div>
                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          id="existing-structure-upload"
                          onChange={createResourceFileHandler(setResourceExistingStructure)}
                        />
                        <label
                          htmlFor="existing-structure-upload"
                          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md text-gray-700 cursor-pointer transition-colors duration-200"
                        >
                          Upload File
                        </label>
                        {resourceExistingStructure.name && (
                          <span className="text-sm text-gray-600">
                            Uploaded: {resourceExistingStructure.name}
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">
                        B.2 PROPOSED ICT ORGANIZATIONAL STRUCTURE
                      </h4>
                      <div className="border-2 border-gray-400 min-h-[320px] bg-white rounded-sm flex items-center justify-center overflow-hidden">
                        {resourceProposedStructure.url ? (
                          resourceProposedStructure.url.startsWith('data:image') ? (
                            <img
                              src={resourceProposedStructure.url}
                              alt="Proposed ICT organizational structure"
                              className="max-h-full max-w-full object-contain"
                            />
                          ) : (
                            <a
                              href={resourceProposedStructure.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 underline"
                            >
                              View uploaded file
                            </a>
                          )
                        ) : null}
                      </div>
                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          id="proposed-structure-upload"
                          onChange={createResourceFileHandler(setResourceProposedStructure)}
                        />
                        <label
                          htmlFor="proposed-structure-upload"
                          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md text-gray-700 cursor-pointer transition-colors duration-200"
                        >
                          Upload File
                        </label>
                        {resourceProposedStructure.name && (
                          <span className="text-sm text-gray-600">
                            Uploaded: {resourceProposedStructure.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between mt-12">
                    <button
                      type="button"
                      onClick={() => saveResourceRequirements(currentPage)}
                      className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors duration-200"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentPage('C')}
                      className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors duration-200 flex items-center"
                    >
                      Next
                      <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              ) : currentPage === 'C' ? (
                <div className="bg-white p-8 rounded-lg shadow-sm">
                  <h3 className="text-xl font-semibold text-gray-900 mb-8 pb-4 border-b">
                    B.3. PLACEMENT OF THE PROPOSED ICT ORGANIZATIONAL STRUCTURE IN THE AGENCY ORGANIZATIONAL CHART
                  </h3>

                  <div>
                    <div className="border-2 border-gray-400 min-h-[420px] bg-white rounded-sm flex items-center justify-center overflow-hidden">
                      {resourcePlacementStructure.url ? (
                        resourcePlacementStructure.url.startsWith('data:image') ? (
                          <img
                            src={resourcePlacementStructure.url}
                            alt="Placement of proposed ICT organizational structure"
                            className="max-h-full max-w-full object-contain"
                          />
                        ) : (
                          <a
                            href={resourcePlacementStructure.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 underline"
                          >
                            View uploaded file
                          </a>
                        )
                      ) : null}
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        id="placement-structure-upload"
                        onChange={createResourceFileHandler(setResourcePlacementStructure)}
                      />
                      <label
                        htmlFor="placement-structure-upload"
                        className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md text-gray-700 cursor-pointer transition-colors duration-200"
                      >
                        Upload File
                      </label>
                      {resourcePlacementStructure.name && (
                        <span className="text-sm text-gray-600">
                          Uploaded: {resourcePlacementStructure.name}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between mt-12">
                    <button
                      type="button"
                      onClick={() => saveResourceRequirements(currentPage)}
                      className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors duration-200"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : selectedItem.title === "DETAILED DESCRIPTION OF ICT PROJECT" ? (
            <div className="max-w-7xl mx-auto space-y-6">
              <div className="flex items-center mb-6">
                <button
                  onClick={() => {
                    if (ictProjectPage === 'performance') {
                      setIctProjectPage('cross-agency');
                    } else if (ictProjectPage === 'cross-agency') {
                      setIctProjectPage('internal');
                    } else {
                      setSelectedItem(null);
                    }
                  }}
                  className="mr-4 text-gray-600 hover:text-gray-900"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h2 className="text-2xl font-bold text-gray-900">PART III. DETAILED DESCRIPTION OF ICT PROJECTS</h2>
              </div>

              {ictProjectPage === 'internal' ? (
                <div className="bg-white p-8 rounded-lg shadow-sm">
                  <h3 className="text-xl font-semibold text-gray-900 mb-8 pb-4 border-b">
                    A. INTERNAL ICT PROJECTS
                  </h3>

                  <div className="overflow-x-auto">
                    <table className="w-full border border-gray-200">
                      <tbody>
                        <tr>
                          <td className="border border-gray-200 bg-gray-50 p-3 w-1/4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <span className="font-medium text-gray-700 mr-2">1</span>
                                <div className="font-medium text-gray-700">NAME/TITLE</div>
                              </div>
                            </div>
                            <input
                              type="text"
                              name="nameTitle"
                              value={internalProjectData.nameTitle}
                              onChange={handleInternalProjectChange}
                              className="mt-3 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            />
                          </td>
                          <td className="border border-gray-200 p-4">
                            <div className="font-medium text-gray-700 mb-2">RANK:</div>
                            <input
                              type="text"
                              name="rank"
                              value={internalProjectData.rank}
                              onChange={handleInternalProjectChange}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            />
                          </td>
                        </tr>
                        <tr>
                          <td className="border border-gray-200 bg-gray-50 p-3">
                            <div className="flex items-center">
                              <span className="font-medium text-gray-700 mr-2">2</span>
                              <div className="font-medium text-gray-700">OBJECTIVES</div>
                            </div>
                          </td>
                          <td className="border border-gray-200 p-0">
                            <textarea
                              name="objectives"
                              value={internalProjectData.objectives}
                              onChange={handleInternalProjectChange}
                              className="w-full p-2 border-0 focus:ring-0"
                              rows={6}
                            />
                          </td>
                        </tr>
                        <tr>
                          <td className="border border-gray-200 bg-gray-50 p-3">
                            <div className="flex items-center">
                              <span className="font-medium text-gray-700 mr-2">3</span>
                              <div className="font-medium text-gray-700">DURATION</div>
                            </div>
                          </td>
                          <td className="border border-gray-200 p-0">
                            <textarea
                              name="duration"
                              value={internalProjectData.duration}
                              onChange={handleInternalProjectChange}
                              className="w-full p-2 border-0 focus:ring-0"
                              rows={2}
                            />
                          </td>
                        </tr>
                        <tr>
                          <td className="border border-gray-200 bg-gray-50 p-3">
                            <div className="flex items-center">
                              <span className="font-medium text-gray-700 mr-2">4</span>
                              <div className="font-medium text-gray-700">DELIVERABLES</div>
                            </div>
                          </td>
                          <td className="border border-gray-200 p-0">
                            <textarea
                              name="deliverables"
                              value={internalProjectData.deliverables}
                              onChange={handleInternalProjectChange}
                              className="w-full p-2 border-0 focus:ring-0"
                              rows={6}
                            />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-between mt-8">
                    <button
                      type="button"
                      onClick={() => saveDetailedIctProjects(ictProjectPage)}
                      className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors duration-200"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setIctProjectPage('cross-agency')}
                      className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors duration-200 flex items-center"
                    >
                      Next
                      <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              ) : ictProjectPage === 'cross-agency' ? (
                <div
                  className="bg-white p-8 rounded-lg shadow-sm"
                  style={{ pageBreakBefore: 'always', breakBefore: 'page' }}
                >
                  <h3 className="text-xl font-semibold text-gray-900 mb-8 pb-4 border-b">
                    B. CROSS-AGENCY ICT PROJECTS
                  </h3>

                  <div className="overflow-x-auto">
                    <table className="w-full border border-gray-200">
                      <tbody>
                        <tr>
                          <td className="border border-gray-200 bg-gray-50 p-3 w-1/4">
                            <div className="flex items-center">
                              <span className="font-medium text-gray-700 mr-2">1</span>
                              <div className="font-medium text-gray-700">NAME/TITLE</div>
                            </div>
                          </td>
                          <td className="border border-gray-200 p-0">
                            <textarea
                              name="nameTitle"
                              value={crossAgencyProjectData.nameTitle}
                              onChange={handleCrossAgencyProjectChange}
                              className="w-full p-2 border-0 focus:ring-0"
                              rows={2}
                            />
                          </td>
                        </tr>
                        <tr>
                          <td className="border border-gray-200 bg-gray-50 p-3">
                            <div className="flex items-center">
                              <span className="font-medium text-gray-700 mr-2">2</span>
                              <div className="font-medium text-gray-700">OBJECTIVES</div>
                            </div>
                          </td>
                          <td className="border border-gray-200 p-0">
                            <textarea
                              name="objectives"
                              value={crossAgencyProjectData.objectives}
                              onChange={handleCrossAgencyProjectChange}
                              className="w-full p-2 border-0 focus:ring-0"
                              rows={6}
                            />
                          </td>
                        </tr>
                        <tr>
                          <td className="border border-gray-200 bg-gray-50 p-3">
                            <div className="flex items-center">
                              <span className="font-medium text-gray-700 mr-2">3</span>
                              <div className="font-medium text-gray-700">DURATION</div>
                            </div>
                          </td>
                          <td className="border border-gray-200 p-0">
                            <textarea
                              name="duration"
                              value={crossAgencyProjectData.duration}
                              onChange={handleCrossAgencyProjectChange}
                              className="w-full p-2 border-0 focus:ring-0"
                              rows={2}
                            />
                          </td>
                        </tr>
                        <tr>
                          <td className="border border-gray-200 bg-gray-50 p-3">
                            <div className="flex items-center">
                              <span className="font-medium text-gray-700 mr-2">4</span>
                              <div className="font-medium text-gray-700">DELIVERABLES</div>
                            </div>
                          </td>
                          <td className="border border-gray-200 p-0">
                            <textarea
                              name="deliverables"
                              value={crossAgencyProjectData.deliverables}
                              onChange={handleCrossAgencyProjectChange}
                              className="w-full p-2 border-0 focus:ring-0"
                              rows={6}
                            />
                          </td>
                        </tr>
                        <tr>
                          <td className="border border-gray-200 bg-gray-50 p-3">
                            <div className="flex items-center">
                              <span className="font-medium text-gray-700 mr-2">5</span>
                              <div className="font-medium text-gray-700">LEAD AGENCY</div>
                            </div>
                          </td>
                          <td className="border border-gray-200 p-0">
                            <textarea
                              name="leadAgency"
                              value={crossAgencyProjectData.leadAgency}
                              onChange={handleCrossAgencyProjectChange}
                              className="w-full p-2 border-0 focus:ring-0"
                              rows={2}
                            />
                          </td>
                        </tr>
                        <tr>
                          <td className="border border-gray-200 bg-gray-50 p-3">
                            <div className="flex items-center">
                              <span className="font-medium text-gray-700 mr-2">6</span>
                              <div className="font-medium text-gray-700">IMPLEMENTING AGENCIES</div>
                            </div>
                          </td>
                          <td className="border border-gray-200 p-0">
                            <textarea
                              name="implementingAgencies"
                              value={crossAgencyProjectData.implementingAgencies}
                              onChange={handleCrossAgencyProjectChange}
                              className="w-full p-2 border-0 focus:ring-0"
                              rows={4}
                            />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-between mt-8">
                    <button
                      type="button"
                      onClick={() => saveDetailedIctProjects(ictProjectPage)}
                      className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors duration-200"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setIctProjectPage('performance')}
                      className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors duration-200 flex items-center"
                    >
                      Next
                      <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              ) : ictProjectPage === 'performance' ? (
                <div className="bg-white p-8 rounded-lg shadow-sm">
                  <h3 className="text-xl font-semibold text-gray-900 mb-8 pb-4 border-b">
                    C. PERFORMANCE MEASUREMENT FRAMEWORK
                  </h3>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full border border-gray-200 text-sm">
                      <thead>
                        <tr>
                          <th className="border border-gray-200 bg-gray-50 p-3 text-left font-medium text-gray-700">
                            Hierarchy of targeted results₁
                          </th>
                          <th className="border border-gray-200 bg-gray-50 p-3 text-left font-medium text-gray-700">
                            Objectively verifiable indicators (OVI)₂
                          </th>
                          <th className="border border-gray-200 bg-gray-50 p-3 text-left font-medium text-gray-700">
                            Baseline data₃
                          </th>
                          <th className="border border-gray-200 bg-gray-50 p-3 text-left font-medium text-gray-700">
                            Targets₄
                          </th>
                          <th className="border border-gray-200 bg-gray-50 p-3 text-left font-medium text-gray-700">
                            Data collection methods₅
                          </th>
                          <th className="border border-gray-200 bg-gray-50 p-3 text-left font-medium text-gray-700">
                            Responsibility to collect data₆
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-gray-200 p-0" rowSpan={2}>
                            <textarea
                              name="perf_g1_results"
                              value={performanceFrameworkData['perf_g1_results'] || ''}
                              onChange={handlePerformanceFrameworkChange}
                              className="w-full h-full p-3 border-0 focus:ring-0 resize-none"
                              rows={6}
                            />
                          </td>
                          <td className="border border-gray-200 p-0">
                            <textarea
                              name="perf_g1_indicators_a"
                              value={performanceFrameworkData['perf_g1_indicators_a'] || ''}
                              onChange={handlePerformanceFrameworkChange}
                              className="w-full h-full p-3 border-0 focus:ring-0 resize-none"
                              rows={3}
                            />
                          </td>
                          <td className="border border-gray-200 p-0">
                            <textarea
                              name="perf_g1_baseline_a"
                              value={performanceFrameworkData['perf_g1_baseline_a'] || ''}
                              onChange={handlePerformanceFrameworkChange}
                              className="w-full h-full p-3 border-0 focus:ring-0 resize-none"
                              rows={3}
                            />
                          </td>
                          <td className="border border-gray-200 p-0">
                            <textarea
                              name="perf_g1_targets_a"
                              value={performanceFrameworkData['perf_g1_targets_a'] || ''}
                              onChange={handlePerformanceFrameworkChange}
                              className="w-full h-full p-3 border-0 focus:ring-0 resize-none"
                              rows={3}
                            />
                          </td>
                          <td className="border border-gray-200 p-0" rowSpan={2}>
                            <textarea
                              name="perf_g1_methods"
                              value={performanceFrameworkData['perf_g1_methods'] || ''}
                              onChange={handlePerformanceFrameworkChange}
                              className="w-full h-full p-3 border-0 focus:ring-0 resize-none"
                              rows={6}
                            />
                          </td>
                          <td className="border border-gray-200 p-0" rowSpan={2}>
                            <textarea
                              name="perf_g1_responsibility"
                              value={performanceFrameworkData['perf_g1_responsibility'] || ''}
                              onChange={handlePerformanceFrameworkChange}
                              className="w-full h-full p-3 border-0 focus:ring-0 resize-none"
                              rows={6}
                            />
                          </td>
                        </tr>
                        <tr>
                          <td className="border border-gray-200 p-0">
                            <textarea
                              name="perf_g1_indicators_b"
                              value={performanceFrameworkData['perf_g1_indicators_b'] || ''}
                              onChange={handlePerformanceFrameworkChange}
                              className="w-full h-full p-3 border-0 focus:ring-0 resize-none"
                              rows={3}
                            />
                          </td>
                          <td className="border border-gray-200 p-0">
                            <textarea
                              name="perf_g1_baseline_b"
                              value={performanceFrameworkData['perf_g1_baseline_b'] || ''}
                              onChange={handlePerformanceFrameworkChange}
                              className="w-full h-full p-3 border-0 focus:ring-0 resize-none"
                              rows={3}
                            />
                          </td>
                          <td className="border border-gray-200 p-0">
                            <textarea
                              name="perf_g1_targets_b"
                              value={performanceFrameworkData['perf_g1_targets_b'] || ''}
                              onChange={handlePerformanceFrameworkChange}
                              className="w-full h-full p-3 border-0 focus:ring-0 resize-none"
                              rows={3}
                            />
                          </td>
                        </tr>
                        <tr>
                          <td className="border border-gray-200 p-0" rowSpan={2}>
                            <textarea
                              name="perf_g2_results"
                              value={performanceFrameworkData['perf_g2_results'] || ''}
                              onChange={handlePerformanceFrameworkChange}
                              className="w-full h-full p-3 border-0 focus:ring-0 resize-none"
                              rows={6}
                            />
                          </td>
                          <td className="border border-gray-200 p-0">
                            <textarea
                              name="perf_g2_indicators_a"
                              value={performanceFrameworkData['perf_g2_indicators_a'] || ''}
                              onChange={handlePerformanceFrameworkChange}
                              className="w-full h-full p-3 border-0 focus:ring-0 resize-none"
                              rows={3}
                            />
                          </td>
                          <td className="border border-gray-200 p-0">
                            <textarea
                              name="perf_g2_baseline_a"
                              value={performanceFrameworkData['perf_g2_baseline_a'] || ''}
                              onChange={handlePerformanceFrameworkChange}
                              className="w-full h-full p-3 border-0 focus:ring-0 resize-none"
                              rows={3}
                            />
                          </td>
                          <td className="border border-gray-200 p-0">
                            <textarea
                              name="perf_g2_targets_a"
                              value={performanceFrameworkData['perf_g2_targets_a'] || ''}
                              onChange={handlePerformanceFrameworkChange}
                              className="w-full h-full p-3 border-0 focus:ring-0 resize-none"
                              rows={3}
                            />
                          </td>
                          <td className="border border-gray-200 p-0" rowSpan={2}>
                            <textarea
                              name="perf_g2_methods"
                              value={performanceFrameworkData['perf_g2_methods'] || ''}
                              onChange={handlePerformanceFrameworkChange}
                              className="w-full h-full p-3 border-0 focus:ring-0 resize-none"
                              rows={6}
                            />
                          </td>
                          <td className="border border-gray-200 p-0" rowSpan={2}>
                            <textarea
                              name="perf_g2_responsibility"
                              value={performanceFrameworkData['perf_g2_responsibility'] || ''}
                              onChange={handlePerformanceFrameworkChange}
                              className="w-full h-full p-3 border-0 focus:ring-0 resize-none"
                              rows={6}
                            />
                          </td>
                        </tr>
                        <tr>
                          <td className="border border-gray-200 p-0">
                            <textarea
                              name="perf_g2_indicators_b"
                              value={performanceFrameworkData['perf_g2_indicators_b'] || ''}
                              onChange={handlePerformanceFrameworkChange}
                              className="w-full h-full p-3 border-0 focus:ring-0 resize-none"
                              rows={3}
                            />
                          </td>
                          <td className="border border-gray-200 p-0">
                            <textarea
                              name="perf_g2_baseline_b"
                              value={performanceFrameworkData['perf_g2_baseline_b'] || ''}
                              onChange={handlePerformanceFrameworkChange}
                              className="w-full h-full p-3 border-0 focus:ring-0 resize-none"
                              rows={3}
                            />
                          </td>
                          <td className="border border-gray-200 p-0">
                            <textarea
                              name="perf_g2_targets_b"
                              value={performanceFrameworkData['perf_g2_targets_b'] || ''}
                              onChange={handlePerformanceFrameworkChange}
                              className="w-full h-full p-3 border-0 focus:ring-0 resize-none"
                              rows={3}
                            />
                          </td>
                        </tr>
                        <tr>
                          <td className="border border-gray-200 p-0" rowSpan={3}>
                            <textarea
                              name="perf_g3_results"
                              value={performanceFrameworkData['perf_g3_results'] || ''}
                              onChange={handlePerformanceFrameworkChange}
                              className="w-full h-full p-3 border-0 focus:ring-0 resize-none"
                              rows={9}
                            />
                          </td>
                          <td className="border border-gray-200 p-0">
                            <textarea
                              name="perf_g3_indicators_a"
                              value={performanceFrameworkData['perf_g3_indicators_a'] || ''}
                              onChange={handlePerformanceFrameworkChange}
                              className="w-full h-full p-3 border-0 focus:ring-0 resize-none"
                              rows={3}
                            />
                          </td>
                          <td className="border border-gray-200 p-0">
                            <textarea
                              name="perf_g3_baseline_a"
                              value={performanceFrameworkData['perf_g3_baseline_a'] || ''}
                              onChange={handlePerformanceFrameworkChange}
                              className="w-full h-full p-3 border-0 focus:ring-0 resize-none"
                              rows={3}
                            />
                          </td>
                          <td className="border border-gray-200 p-0">
                            <textarea
                              name="perf_g3_targets_a"
                              value={performanceFrameworkData['perf_g3_targets_a'] || ''}
                              onChange={handlePerformanceFrameworkChange}
                              className="w-full h-full p-3 border-0 focus:ring-0 resize-none"
                              rows={3}
                            />
                          </td>
                          <td className="border border-gray-200 p-0" rowSpan={3}>
                            <textarea
                              name="perf_g3_methods"
                              value={performanceFrameworkData['perf_g3_methods'] || ''}
                              onChange={handlePerformanceFrameworkChange}
                              className="w-full h-full p-3 border-0 focus:ring-0 resize-none"
                              rows={9}
                            />
                          </td>
                          <td className="border border-gray-200 p-0" rowSpan={3}>
                            <textarea
                              name="perf_g3_responsibility"
                              value={performanceFrameworkData['perf_g3_responsibility'] || ''}
                              onChange={handlePerformanceFrameworkChange}
                              className="w-full h-full p-3 border-0 focus:ring-0 resize-none"
                              rows={9}
                            />
                          </td>
                        </tr>
                        <tr>
                          <td className="border border-gray-200 p-0">
                            <textarea
                              name="perf_g3_indicators_b"
                              value={performanceFrameworkData['perf_g3_indicators_b'] || ''}
                              onChange={handlePerformanceFrameworkChange}
                              className="w-full h-full p-3 border-0 focus:ring-0 resize-none"
                              rows={3}
                            />
                          </td>
                          <td className="border border-gray-200 p-0">
                            <textarea
                              name="perf_g3_baseline_b"
                              value={performanceFrameworkData['perf_g3_baseline_b'] || ''}
                              onChange={handlePerformanceFrameworkChange}
                              className="w-full h-full p-3 border-0 focus:ring-0 resize-none"
                              rows={3}
                            />
                          </td>
                          <td className="border border-gray-200 p-0">
                            <textarea
                              name="perf_g3_targets_b"
                              value={performanceFrameworkData['perf_g3_targets_b'] || ''}
                              onChange={handlePerformanceFrameworkChange}
                              className="w-full h-full p-3 border-0 focus:ring-0 resize-none"
                              rows={3}
                            />
                          </td>
                        </tr>
                        <tr>
                          <td className="border border-gray-200 p-0">
                            <textarea
                              name="perf_g3_indicators_c"
                              value={performanceFrameworkData['perf_g3_indicators_c'] || ''}
                              onChange={handlePerformanceFrameworkChange}
                              className="w-full h-full p-3 border-0 focus:ring-0 resize-none"
                              rows={3}
                            />
                          </td>
                          <td className="border border-gray-200 p-0">
                            <textarea
                              name="perf_g3_baseline_c"
                              value={performanceFrameworkData['perf_g3_baseline_c'] || ''}
                              onChange={handlePerformanceFrameworkChange}
                              className="w-full h-full p-3 border-0 focus:ring-0 resize-none"
                              rows={3}
                            />
                          </td>
                          <td className="border border-gray-200 p-0">
                            <textarea
                              name="perf_g3_targets_c"
                              value={performanceFrameworkData['perf_g3_targets_c'] || ''}
                              onChange={handlePerformanceFrameworkChange}
                              className="w-full h-full p-3 border-0 focus:ring-0 resize-none"
                              rows={3}
                            />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-between mt-8">
                    <button
                      type="button"
                      onClick={() => saveDetailedIctProjects(ictProjectPage)}
                      className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors duration-200"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : selectedItem.title === "DEVELOPMENT AND INVESTMENT PROGRAM" ? (
            <div className="max-w-7xl mx-auto space-y-6">
              <div className="flex items-center mb-6">
                <button
                  onClick={() => {
                    if (currentPage === 'A') {
                      setSelectedItem(null);
                    } else if (currentPage === 'B') {
                      setCurrentPage('A');
                    } else if (currentPage === 'C') {
                      setCurrentPage('B');
                    }
                  }}
                  className="mr-4 text-gray-600 hover:text-gray-900"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h2 className="text-2xl font-bold text-gray-900">PART V. DEVELOPMENT AND INVESTMENT PROGRAM</h2>
              </div>

              {currentPage === 'A' ? (
                <div className="bg-white p-8 rounded-lg shadow-sm space-y-8">
                {/* A. ICT PROJECTS IMPLEMENTATION SCHEDULE */}
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-6">
                    A. ICT PROJECTS IMPLEMENTATION SCHEDULE
                  </h3>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-900 text-sm">
                      <thead>
                        <tr>
                          <th className="border border-gray-900 bg-gray-100 p-3 font-bold text-center">
                            NAME OF<br />ICT PROJECT/S
                          </th>
                          <th className="border border-gray-900 bg-gray-100 p-3 font-bold text-center">
                            YEAR<br />1
                          </th>
                          <th className="border border-gray-900 bg-gray-100 p-3 font-bold text-center">
                            YEAR<br />2
                          </th>
                          <th className="border border-gray-900 bg-gray-100 p-3 font-bold text-center">
                            YEAR<br />3
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {devProjectSchedule.map((row, index) => (
                          <tr key={index}>
                            <td className="border border-gray-900 p-0">
                              <input
                                type="text"
                                value={row.name}
                                onChange={(event) =>
                                  handleDevProjectScheduleChange(index, 'name', event.target.value, 'project')
                                }
                                className="w-full p-2 border-0 focus:ring-0"
                              />
                            </td>
                            <td className="border border-gray-900 p-0">
                              <input
                                type="text"
                                value={row.year1}
                                onChange={(event) =>
                                  handleDevProjectScheduleChange(index, 'year1', event.target.value, 'project')
                                }
                                className="w-full p-2 border-0 focus:ring-0"
                              />
                            </td>
                            <td className="border border-gray-900 p-0">
                              <input
                                type="text"
                                value={row.year2}
                                onChange={(event) =>
                                  handleDevProjectScheduleChange(index, 'year2', event.target.value, 'project')
                                }
                                className="w-full p-2 border-0 focus:ring-0"
                              />
                            </td>
                            <td className="border border-gray-900 p-0">
                              <input
                                type="text"
                                value={row.year3}
                                onChange={(event) =>
                                  handleDevProjectScheduleChange(index, 'year3', event.target.value, 'project')
                                }
                                className="w-full p-2 border-0 focus:ring-0"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* B. INFORMATION SYSTEMS (IS) IMPLEMENTATION SCHEDULE */}
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-6">
                    B. INFORMATION SYSTEMS (IS) IMPLEMENTATION SCHEDULE
                  </h3>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-900 text-sm">
                      <thead>
                        <tr>
                          <th className="border border-gray-900 bg-gray-100 p-3 font-bold text-center">
                            NAME OF INFORMATION SYSTEMS/<br />SUB-SYSTEMS OR MODULES
                          </th>
                          <th className="border border-gray-900 bg-gray-100 p-3 font-bold text-center">
                            YEAR<br />1
                          </th>
                          <th className="border border-gray-900 bg-gray-100 p-3 font-bold text-center">
                            YEAR<br />2
                          </th>
                          <th className="border border-gray-900 bg-gray-100 p-3 font-bold text-center">
                            YEAR<br />3
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {devIsSchedule.map((row, index) => (
                          <tr key={index}>
                            <td className="border border-gray-900 p-0">
                              <input
                                type="text"
                                value={row.name}
                                onChange={(event) =>
                                  handleDevProjectScheduleChange(index, 'name', event.target.value, 'is')
                                }
                                className="w-full p-2 border-0 focus:ring-0"
                              />
                            </td>
                            <td className="border border-gray-900 p-0">
                              <input
                                type="text"
                                value={row.year1}
                                onChange={(event) =>
                                  handleDevProjectScheduleChange(index, 'year1', event.target.value, 'is')
                                }
                                className="w-full p-2 border-0 focus:ring-0"
                              />
                            </td>
                            <td className="border border-gray-900 p-0">
                              <input
                                type="text"
                                value={row.year2}
                                onChange={(event) =>
                                  handleDevProjectScheduleChange(index, 'year2', event.target.value, 'is')
                                }
                                className="w-full p-2 border-0 focus:ring-0"
                              />
                            </td>
                            <td className="border border-gray-900 p-0">
                              <input
                                type="text"
                                value={row.year3}
                                onChange={(event) =>
                                  handleDevProjectScheduleChange(index, 'year3', event.target.value, 'is')
                                }
                                className="w-full p-2 border-0 focus:ring-0"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex justify-between mt-8">
                  <button
                    type="button"
                    onClick={() => saveDevelopmentInvestmentProgram(currentPage)}
                    className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors duration-200"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage('B')}
                    className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors duration-200 flex items-center"
                  >
                    Next
                    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
              ) : currentPage === 'B' ? (
                <div className="bg-white p-8 rounded-lg shadow-sm">
                  <h3 className="text-xl font-semibold text-gray-900 mb-6">
                    C. SUMMARY OF INVESTMENTS
                  </h3>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-900 text-xs">
                      <thead>
                        <tr>
                          <th className="border border-gray-900 bg-white p-2 font-bold text-left align-top" rowSpan={2}>
                            <div>ITEM</div>
                            <div className="text-xs font-normal mt-1">(Allotment Class/Object of Expenditures)</div>
                          </th>
                          <th className="border border-gray-900 bg-gray-100 p-2 font-bold text-center" colSpan={2}>
                            YEAR 1₁
                          </th>
                          <th className="border border-gray-900 bg-gray-100 p-2 font-bold text-center" colSpan={2}>
                            YEAR 2₂
                          </th>
                          <th className="border border-gray-900 bg-gray-100 p-2 font-bold text-center" colSpan={2}>
                            YEAR 3₃
                          </th>
                        </tr>
                        <tr>
                          <th className="border border-gray-900 bg-white p-2 font-bold text-center">
                            PHYSICAL<br />TARGETS
                          </th>
                          <th className="border border-gray-900 bg-white p-2 font-bold text-center">
                            COST
                          </th>
                          <th className="border border-gray-900 bg-white p-2 font-bold text-center">
                            PHYSICAL<br />TARGETS
                          </th>
                          <th className="border border-gray-900 bg-white p-2 font-bold text-center">
                            COST
                          </th>
                          <th className="border border-gray-900 bg-white p-2 font-bold text-center">
                            PHYSICAL<br />TARGETS
                          </th>
                          <th className="border border-gray-900 bg-white p-2 font-bold text-center">
                            COST
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {devSummaryInvestments.map((row, index) => (
                          <tr key={index}>
                            <td className="border border-gray-900 p-0">
                              <textarea
                                className="w-full p-2 border-0 focus:ring-0 text-sm resize-none"
                                rows={8}
                                value={row.item}
                                onChange={(event) =>
                                  handleDevSummaryChange(index, 'item', event.target.value)
                                }
                              />
                            </td>
                            <td className="border border-gray-900 p-0">
                              <textarea
                                className="w-full p-2 border-0 focus:ring-0 text-center text-sm resize-none"
                                rows={8}
                                value={row.year1Physical}
                                onChange={(event) =>
                                  handleDevSummaryChange(index, 'year1Physical', event.target.value)
                                }
                              />
                            </td>
                            <td className="border border-gray-900 p-0">
                              <textarea
                                className="w-full p-2 border-0 focus:ring-0 text-center text-sm resize-none"
                                rows={8}
                                value={row.year1Cost}
                                onChange={(event) =>
                                  handleDevSummaryChange(index, 'year1Cost', event.target.value)
                                }
                              />
                            </td>
                            <td className="border border-gray-900 p-0">
                              <textarea
                                className="w-full p-2 border-0 focus:ring-0 text-center text-sm resize-none"
                                rows={8}
                                value={row.year2Physical}
                                onChange={(event) =>
                                  handleDevSummaryChange(index, 'year2Physical', event.target.value)
                                }
                              />
                            </td>
                            <td className="border border-gray-900 p-0">
                              <textarea
                                className="w-full p-2 border-0 focus:ring-0 text-center text-sm resize-none"
                                rows={8}
                                value={row.year2Cost}
                                onChange={(event) =>
                                  handleDevSummaryChange(index, 'year2Cost', event.target.value)
                                }
                              />
                            </td>
                            <td className="border border-gray-900 p-0">
                              <textarea
                                className="w-full p-2 border-0 focus:ring-0 text-center text-sm resize-none"
                                rows={8}
                                value={row.year3Physical}
                                onChange={(event) =>
                                  handleDevSummaryChange(index, 'year3Physical', event.target.value)
                                }
                              />
                            </td>
                            <td className="border border-gray-900 p-0">
                              <textarea
                                className="w-full p-2 border-0 focus:ring-0 text-center text-sm resize-none"
                                rows={8}
                                value={row.year3Cost}
                                onChange={(event) =>
                                  handleDevSummaryChange(index, 'year3Cost', event.target.value)
                                }
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-between mt-8">
                    <button
                      type="button"
                    onClick={() => saveDevelopmentInvestmentProgram(currentPage)}
                      className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors duration-200"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentPage('C')}
                      className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors duration-200 flex items-center"
                    >
                      Next
                      <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              ) : currentPage === 'C' ? (
                <div className="bg-white p-8 rounded-lg shadow-sm">
                  <h3 className="text-xl font-semibold text-gray-900 mb-6">
                    D. YEAR 1 COST BREAKDOWN
                  </h3>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-900 text-xs">
                      <thead>
                        <tr>
                          <th className="border border-gray-900 bg-white p-3 font-bold text-center">
                            DETAILED COST ITEMS
                          </th>
                          <th className="border border-gray-900 bg-white p-3 font-bold text-center">
                            OFFICE<br />PRODUCTIVITY
                          </th>
                          <th className="border border-gray-900 bg-white p-3 font-bold text-center">
                            INTERNAL ICT<br />PROJECT 1
                          </th>
                          <th className="border border-gray-900 bg-white p-3 font-bold text-center">
                            INTERNAL ICT<br />PROJECT 2
                          </th>
                          <th className="border border-gray-900 bg-white p-3 font-bold text-center">
                            CROSS-AGENCY<br />PROJECT 1
                          </th>
                          <th className="border border-gray-900 bg-white p-3 font-bold text-center">
                            CROSS-AGENCY<br />PROJECT 2
                          </th>
                          <th className="border border-gray-900 bg-white p-3 font-bold text-center">
                            CONTINUING<br />COSTS
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {devCostBreakdown.map((row, index) => (
                          <tr key={index}>
                            <td className="border border-gray-900 p-0">
                              <input
                                type="text"
                                value={row.detailedItem}
                                onChange={(event) =>
                                  handleDevCostChange(index, 'detailedItem', event.target.value)
                                }
                                className="w-full p-2 border-0 focus:ring-0 text-sm"
                              />
                            </td>
                            <td className="border border-gray-900 p-0">
                              <input
                                type="text"
                                value={row.officeProductivity}
                                onChange={(event) =>
                                  handleDevCostChange(index, 'officeProductivity', event.target.value)
                                }
                                className="w-full p-2 border-0 focus:ring-0 text-center text-sm"
                              />
                            </td>
                            <td className="border border-gray-900 p-0">
                              <input
                                type="text"
                                value={row.internalProject1}
                                onChange={(event) =>
                                  handleDevCostChange(index, 'internalProject1', event.target.value)
                                }
                                className="w-full p-2 border-0 focus:ring-0 text-center text-sm"
                              />
                            </td>
                            <td className="border border-gray-900 p-0">
                              <input
                                type="text"
                                value={row.internalProject2}
                                onChange={(event) =>
                                  handleDevCostChange(index, 'internalProject2', event.target.value)
                                }
                                className="w-full p-2 border-0 focus:ring-0 text-center text-sm"
                              />
                            </td>
                            <td className="border border-gray-900 p-0">
                              <input
                                type="text"
                                value={row.crossAgencyProject1}
                                onChange={(event) =>
                                  handleDevCostChange(index, 'crossAgencyProject1', event.target.value)
                                }
                                className="w-full p-2 border-0 focus:ring-0 text-center text-sm"
                              />
                            </td>
                            <td className="border border-gray-900 p-0">
                              <input
                                type="text"
                                value={row.crossAgencyProject2}
                                onChange={(event) =>
                                  handleDevCostChange(index, 'crossAgencyProject2', event.target.value)
                                }
                                className="w-full p-2 border-0 focus:ring-0 text-center text-sm"
                              />
                            </td>
                            <td className="border border-gray-900 p-0">
                              <input
                                type="text"
                                value={row.continuingCosts}
                                onChange={(event) =>
                                  handleDevCostChange(index, 'continuingCosts', event.target.value)
                                }
                                className="w-full p-2 border-0 focus:ring-0 text-center text-sm"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-between mt-8">
                    <button
                      type="button"
                    onClick={() => saveDevelopmentInvestmentProgram(currentPage)}
                      className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors duration-200"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="max-w-7xl mx-auto space-y-6">
              <div className="flex items-center mb-6">
                <button
                  onClick={() => setSelectedItem(null)}
                  className="mr-4 text-gray-600 hover:text-gray-900"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h2 className="text-2xl font-bold text-gray-900">{selectedItem.title}</h2>
              </div>
              <div className="bg-white p-8 rounded-lg shadow-sm">
                <p className="text-gray-500 text-center">No content available for this section yet.</p>
              </div>
            </div>
          )
        )}
      </div>
      )}
      </>
    );
  };

export default ISSP;