import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { toast } from 'react-toastify';
import { UserPlus, Edit, Trash2, Search, Eye, Upload, Building2, Users, Clock, Download, X, RefreshCw, Key, FileText, FileSpreadsheet, ChevronDown } from 'lucide-react';
import './EmployeeManagement.css'; // Import the CSS file
import { CircularProgress } from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const EmployeeManagement = () => {
  const { user, logout } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [persons, setPersons] = useState([]); // device persons (read-only)
  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('add'); // 'add' or 'edit'
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [searchTerm, setSearchTerm] = useState(() => {
    return localStorage.getItem('empMgmt_searchTerm') || '';
  });
  const [filterStatus, setFilterStatus] = useState(() => {
    return localStorage.getItem('empMgmt_filterStatus') || 'all';
  });
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [bulkFile, setBulkFile] = useState(null);
  const [activeView, setActiveView] = useState('employees');
  const [currentPage, setCurrentPage] = useState(() => {
    return parseInt(localStorage.getItem('empMgmt_currentPage')) || 1;
  });
  const [itemsPerPage] = useState(10);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);
  const [downloadFilters, setDownloadFilters] = useState({
    department: 'all',
    role: 'all'
  });
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role_id: '',
    department_id: '',
    shift_id: '',
    person_id: '',
    status: 'pending'
  });
  const [nameReadOnly, setNameReadOnly] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  // Save search term to localStorage
  useEffect(() => {
    localStorage.setItem('empMgmt_searchTerm', searchTerm);
  }, [searchTerm]);

  // Save filter status to localStorage
  useEffect(() => {
    localStorage.setItem('empMgmt_filterStatus', filterStatus);
  }, [filterStatus]);

  // Save current page to localStorage
  useEffect(() => {
    localStorage.setItem('empMgmt_currentPage', currentPage.toString());
  }, [currentPage]);

  // Intercept browser refresh keys (F5, Ctrl/Cmd+R, Ctrl+Shift+R) to refresh table only
  useEffect(() => {
    const onKeyDown = async (e) => {
      const key = e.key;
      const isRefreshKey =
        key === 'F5' ||
        ((e.ctrlKey || e.metaKey) && (key === 'r' || key === 'R')) ||
        (e.ctrlKey && e.shiftKey && (key === 'r' || key === 'R'));

      if (!isRefreshKey) return;

      // If user is typing in an input/textarea/contenteditable, do not intercept
      const active = document.activeElement;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      try {
        setIsRefreshing(true);
        // Keep filters/search visible; fetchData will update table data
        await fetchData();
      } catch (err) {
        // fetchData already handles errors via toast
        console.error('Table refresh failed via keyboard shortcut', err);
      } finally {
        setIsRefreshing(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [currentPage]);

  const fetchData = async () => {
    try {
      // Try to load employee list from PHP persons API first
  // Prefer backend proxy to avoid CORS issues. If you explicitly set REACT_APP_PHP_PERSONS_API, it will be used.
  const PHP_PERSONS_API = process.env.REACT_APP_PHP_PERSONS_API || '/api/php/persons';
      // Fetch persons from PHP realtime API (device)
      let phpPersons = [];
      try {
        const resp = await fetch(PHP_PERSONS_API);
        const contentType = resp.headers.get('content-type') || '';

        if (contentType.includes('application/json') || contentType.includes('text/json')) {
          const json = await resp.json();
          // Handle different possible response shapes from the PHP API
          if (Array.isArray(json)) {
            phpPersons = json;
          } else if (Array.isArray(json.data)) {
            phpPersons = json.data;
          } else if (Array.isArray(json.persons)) {
            phpPersons = json.persons;
          } else if (Array.isArray(json.result)) {
            phpPersons = json.result;
          } else if (json && typeof json === 'object') {
            // If it's an object with numeric keys, map them to array
            const maybeArray = Object.values(json).filter(v => v && (v.id || v.enroll_id || v.name || v.person_name));
            if (maybeArray.length) phpPersons = maybeArray;
          }
          if (!Array.isArray(phpPersons) || phpPersons.length === 0) {
            console.info('PHP persons API returned no persons or an unexpected JSON format', json);
          }
        } else {
          // Non-JSON response (likely HTML error page). Read text and log for debugging.
          const text = await resp.text();
          console.warn('PHP persons API returned non-JSON response. Content-type:', contentType);
          // If the response contains JSON somewhere inside, try to extract it
          const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
          if (jsonMatch) {
            try {
              const parsed = JSON.parse(jsonMatch[0]);
              if (Array.isArray(parsed)) phpPersons = parsed;
              else if (Array.isArray(parsed.data)) phpPersons = parsed.data;
            } catch (e) {
              console.warn('Failed to parse embedded JSON from non-JSON PHP persons response');
            }
          } else {
            console.info('PHP persons endpoint returned HTML or text. Response snippet:', text.slice(0, 300));
          }
        }
      } catch (err) {
        console.warn('PHP persons API unavailable or fetch failed:', err.message);
      }

      // Load auxiliary data (departments, roles, shifts) and employees from main API
      const [departmentsRes, rolesRes, shiftsRes, employeesRes] = await Promise.all([
        adminAPI.getDepartments(),
        adminAPI.getRoles(),
        adminAPI.getShifts(),
        adminAPI.getEmployees()
      ]);

      const depts = departmentsRes.data || [];
      const rles = rolesRes.data || [];
      const shfts = shiftsRes.data || [];

      // Normalize employees so that department/role/shift names exist regardless of whether
      // backend returned joined names or raw ids. This avoids UI showing raw ids after updates.
      const rawEmployees = employeesRes.data || [];
      const employeesNormalized = (rawEmployees || []).map(emp => {
        const empCopy = { ...emp };

        // department name
        if (!empCopy.department && (empCopy.department_id || empCopy.departmentid || empCopy.department)) {
          const depId = empCopy.department_id || empCopy.departmentid || empCopy.department;
          const found = depts.find(d => String(d.id) === String(depId) || String(d.department_id) === String(depId));
          if (found) empCopy.department = found.departmentname || found.name || found.departmentname;
        }

        // role name
        if (!empCopy.role && (empCopy.role_id || empCopy.roleid || empCopy.role)) {
          const roleId = empCopy.role_id || empCopy.roleid || empCopy.role;
          const found = rles.find(r => String(r.id) === String(roleId) || String(r.role_id) === String(roleId));
          if (found) empCopy.role = found.rolename || found.name || found.rolename;
        }

        // shift name
        if (!empCopy.shift && (empCopy.shift_id || empCopy.shiftid || empCopy.shift)) {
          const shiftId = empCopy.shift_id || empCopy.shiftid || empCopy.shift;
          const found = shfts.find(s => String(s.id) === String(shiftId) || String(s.shift_id) === String(shiftId));
          if (found) empCopy.shift = found.name || found.shift_name || found.name;
        }

        // status normalization (statusflag -> status)
        // Normalize status correctly
if (empCopy.status) {
  empCopy.status = empCopy.status.toLowerCase();
} else {
  // When backend doesn't return status, fallback to statusflag
  if (empCopy.statusflag === 1) {
    empCopy.status = "active";
  } else if (empCopy.statusflag === 0) {
    empCopy.status = "pending"; // 👈 MOST IMPORTANT FIX
  } else {
    empCopy.status = "inactive";
  }
}



        return empCopy;
      });

      setDepartments(depts);
      setRoles(rles);
      setShifts(shfts);
      setEmployees(employeesNormalized);

      // Normalize and store persons separately (read-only)
      const mappedPersons = (phpPersons || []).map((p, idx) => ({
        id: p.id || p.enroll_id || p.biometric_id || `${idx + 1}`,
        name: p.name || p.fullname || p.employee_name || p.person_name || `Person ${idx + 1}`,
        raw: p
      }));
      setPersons(mappedPersons);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, files } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: files ? files[0] : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // There is no server-side "add" in this deployment — import action should perform an update
      // Determine an id to use for update: prefer selectedEmployee's PK, otherwise use person_id
      const updateId = selectedEmployee?.person_id || selectedEmployee?.employeeid || selectedEmployee?.id || formData.person_id;
      if (!updateId) {
        throw new Error('Unable to determine employee id for update. Ensure the device person has an id and try again.');
      }

      // Prepare payload - include sendPassword flag so backend will email temp password on update
      const roleName = roles.find(r => String(r.id) === String(formData.role_id) || String(r.role_id) === String(formData.role_id))?.rolename || formData.role || '';
      const deptName = departments.find(d => String(d.id) === String(formData.department_id) || String(d.department_id) === String(formData.department_id))?.departmentname || formData.department || '';
      const shiftName = shifts.find(s => String(s.id) === String(formData.shift_id) || String(s.shift_id) === String(formData.shift_id))?.name || formData.shift || '';
      const payload = { ...formData, role: roleName, department: deptName, shift: shiftName, sendPassword: true };
      await adminAPI.updateEmployee(updateId, payload);
      toast.success('Employee updated successfully (password emailed)');
      fetchData();
      handleCloseModal();
    } catch (error) {
      const message = error.response?.data?.error || 'Operation failed';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (employee) => {
    setSelectedEmployee(employee);
    // If there's a linked person, prefer the device name and lock the name field
    const linkedPerson = persons.find(p => String(p.id) === String(employee.person_id));
    // Try to populate role_id/department_id/shift_id from ids if present; otherwise derive ids from names
    const resolveRoleId = () => {
      if (employee.role_id) return employee.role_id;
      const found = roles.find(r => r.rolename === employee.role || r.name === employee.role);
      return found ? (found.id || found.role_id) : '';
    };
    const resolveDeptId = () => {
      if (employee.department_id) return employee.department_id;
      const found = departments.find(d => d.departmentname === employee.department || d.name === employee.department);
      return found ? (found.id || found.department_id) : '';
    };
    const resolveShiftId = () => {
      if (employee.shift_id) return employee.shift_id;
      const found = shifts.find(s => s.name === employee.shift || s.shift_name === employee.shift);
      return found ? (found.id || found.shift_id) : '';
    };

    setFormData({
      name: linkedPerson?.name || employee.name,
      email: employee.email,
      role_id: resolveRoleId() || '',
      department_id: resolveDeptId() || '',
      shift_id: resolveShiftId() || '',
      person_id: employee.person_id || '',
      status: employee.status || 'pending'
    });
    setNameReadOnly(!!linkedPerson);
    setModalType('edit');
    setShowModal(true);
  };

  // Import a device person into an employee record (open add modal prefilled)
  const handleImportPerson = (person) => {
    setSelectedEmployee(null);
    setFormData({
      name: person.name || '',
      email: '',
      role_id: '',
      department_id: '',
      shift_id: '',
      person_id: String(person.id || ''),
      status: 'pending'
    });
    setModalType('add');
    setNameReadOnly(true);
    setShowModal(true);
  };

  const handleDelete = async (employee) => {
  const personId =
    employee.person_id ||
    employee.personid ||
    employee.biometric_id ||
    employee.enroll_id ||
    employee.id;

  if (!personId) {
    toast.error("Invalid employee record. No person_id found.");
    console.error("Delete failed — employee object:", employee);
    return;
  }

  if (!window.confirm(`Are you sure you want to delete employee ${employee.name}?`)) {
    return;
  }

  try {
    await adminAPI.deleteEmployee(personId);
    toast.success("Employee deleted successfully");
    fetchData();
  } catch (error) {
    console.error("Delete error:", error);
    toast.error("Failed to delete employee");
  }
};

  const handleResetPassword = async (employee) => {
    if (!employee.email) {
      toast.error("Employee has no registered email address");
      return;
    }

    if (!window.confirm(`Reset password for ${employee.name}?\n\nA new password will be generated and sent to ${employee.email}`)) {
      return;
    }

    try {
      await adminAPI.resetEmployeePassword(employee.person_id || employee.id, { email: employee.email });
      toast.success(`Password reset successfully. New password sent to ${employee.email}`);
    } catch (error) {
      console.error("Reset password error:", error);
      const message = error.response?.data?.error || "Failed to reset password";
      toast.error(message);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedEmployee(null);
    setFormData({
      name: '',
      email: '',
      role_id: '',
      department_id: '',
      shift_id: '',
      person_id: '',
      status: 'pending'
    });
    setNameReadOnly(false);
  };

  const handleAddEmployee = () => {
    setModalType('add');
    setSelectedEmployee(null);
    setShowModal(true);
  };

  const handleBulkUpload = () => {
    setShowBulkUploadModal(true);
  };

  const handleCloseBulkModal = () => {
    setShowBulkUploadModal(false);
    setBulkFile(null);
  };

  const handleBulkFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const fileType = file.name.split('.').pop().toLowerCase();
      if (fileType === 'csv' || fileType === 'xlsx' || fileType === 'xls') {
        setBulkFile(file);
      } else {
        toast.error('Please upload a CSV or Excel file');
        e.target.value = '';
      }
    }
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    
    if (!bulkFile) {
      toast.error('Please select a file to upload');
      return;
    }

    const formDataObj = new FormData();
    formDataObj.append('file', bulkFile);

    try {
      const response = await adminAPI.bulkUploadEmployees(formDataObj);
      toast.success(response.data.message || 'Employees uploaded successfully');
      fetchData();
      handleCloseBulkModal();
    } catch (error) {
      const message = error.response?.data?.error || 'Bulk upload failed';
      toast.error(message);
    }
  };

  const downloadSampleCSV = () => {
    // Create sample data
    const sampleData = [
      {
        name: 'John Doe',
        email: 'john.doe@example.com',
        person_id: '0000000001',
        role_id: 1,
        department_id: 1,
        shift_id: 1,
        status: 'pending'
      },
      {
        name: 'Jane Smith',
        email: 'jane.smith@example.com',
        person_id: '0000000002',
        role_id: 2,
        department_id: 2,
        shift_id: 2,
        status: 'pending'
      }
    ];

    // Convert to CSV format
    const headers = Object.keys(sampleData[0]);
    const csvContent = [
      headers.join(','),
      ...sampleData.map(row => headers.map(header => row[header]).join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'application/vnd.ms-excel' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'employee_sample.xls';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleDownloadPDF = () => {
    setShowDownloadModal(true);
  };

  const handleSelectEmployee = (personId) => {
    setSelectedEmployees(prev => {
      if (prev.includes(personId)) {
        return prev.filter(id => id !== personId);
      } else {
        return [...prev, personId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedEmployees([]);
    } else {
      const allIds = filteredCombined
        .filter(({ employee }) => employee)
        .map(({ person, employee }) => person?.id || employee?.person_id || employee?.id);
      setSelectedEmployees(allIds);
    }
    setSelectAll(!selectAll);
  };

  const handleDownloadSelected = () => {
    if (selectedEmployees.length === 0) {
      toast.warning('Please select at least one employee to download');
      return;
    }
    generateSelectedPDF();
  };

  const generateSelectedPDF = () => {
    const selectedData = employees.filter(emp => {
      const empId = emp.person_id || emp.personid || emp.id;
      return selectedEmployees.includes(empId);
    });

    if (selectedData.length === 0) {
      toast.warning('No employee data found for selected records');
      return;
    }

    const doc = new jsPDF('l', 'mm', 'a4');
    
    doc.setFontSize(18);
    doc.text('Selected Employees Report', 14, 15);
    
    doc.setFontSize(10);
    doc.text(`Total Selected: ${selectedData.length}`, 14, 22);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 27);

    const tableData = selectedData.map((emp, index) => {
      let deptName = emp.departmentname || emp.department_name || emp.department;
      if (!deptName && (emp.department_id || emp.departmentid || emp.dept_id)) {
        const deptId = emp.department_id || emp.departmentid || emp.dept_id;
        const dept = departments.find(d => d.id === parseInt(deptId));
        deptName = dept?.departmentname || dept?.name || dept?.department_name;
      }
      deptName = deptName || 'N/A';
      
      let roleName = emp.rolename || emp.role_name || emp.role;
      if (!roleName && (emp.role_id || emp.roleid)) {
        const roleId = emp.role_id || emp.roleid;
        const role = roles.find(r => r.id === parseInt(roleId));
        roleName = role?.rolename || role?.name || role?.role_name;
      }
      roleName = roleName || 'N/A';
      
      let shiftName = emp.shiftname || emp.shift_name || emp.shift;
      if (!shiftName && (emp.shift_id || emp.shiftid)) {
        const shiftId = emp.shift_id || emp.shiftid;
        const shift = shifts.find(s => s.id === parseInt(shiftId));
        shiftName = shift?.shiftname || shift?.name || shift?.shift_name;
      }
      shiftName = shiftName || 'N/A';
      
      return [
        index + 1,
        emp.name || emp.person_name || 'N/A',
        emp.email || 'N/A',
        deptName,
        roleName,
        shiftName,
        emp.person_id || emp.biometric_id || 'N/A'
      ];
    });

    autoTable(doc, {
      startY: 32,
      head: [['#', 'Name', 'Email', 'Department', 'Role', 'Shift', 'Status']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [123, 115, 255], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { top: 32 }
    });

    const fileName = `selected_employees_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    
    toast.success('PDF downloaded successfully');
    setSelectedEmployees([]);
    setSelectAll(false);
  };

  const handleCloseDownloadModal = () => {
    setShowDownloadModal(false);
    setDownloadFilters({ department: 'all', role: 'all' });
  };

  const handleDownloadFilterChange = (e) => {
    const { name, value } = e.target;
    setDownloadFilters(prev => ({ ...prev, [name]: value }));
  };

  const generatePDF = () => {
    console.log('=== PDF Generation Started ===');
    console.log('Total Employees:', employees.length);
    console.log('Download Filters:', downloadFilters);
    
    // Show sample employee structure
    if (employees.length > 0) {
      console.log('Sample Employee Object Keys:', Object.keys(employees[0]));
      console.log('Sample Employee Data:', employees[0]);
    }
    
    // Filter employees based on selected department and role
    let filteredData = employees.filter(emp => {
      // Try multiple possible property names for department and role IDs
      const empDeptId = emp.department_id || emp.departmentid || emp.dept_id;
      const empRoleId = emp.role_id || emp.roleid;
      
      console.log(`Employee: ${emp.name}, Dept ID: ${empDeptId}, Role ID: ${empRoleId}`);
      
      const matchesDept = downloadFilters.department === 'all' || 
                         String(empDeptId) === String(downloadFilters.department);
      const matchesRole = downloadFilters.role === 'all' || 
                         String(empRoleId) === String(downloadFilters.role);
      
      console.log(`Matches - Dept: ${matchesDept}, Role: ${matchesRole}`);
      
      return matchesDept && matchesRole;
    });

    console.log('Filtered Data Count:', filteredData.length);
    console.log('=== PDF Generation Filter Complete ===');

    if (filteredData.length === 0) {
      toast.warning('No employees found with selected filters');
      return;
    }

    const doc = new jsPDF('l', 'mm', 'a4'); // landscape orientation
    
    // Add title
    doc.setFontSize(18);
    doc.text('Employee List Report', 14, 15);
    
    // Add filters info
    doc.setFontSize(10);
    const deptName = downloadFilters.department === 'all' ? 'All' : 
                     departments.find(d => d.id === parseInt(downloadFilters.department))?.departmentname || 'All';
    const roleName = downloadFilters.role === 'all' ? 'All' : 
                     roles.find(r => r.id === parseInt(downloadFilters.role))?.rolename || 'All';
    doc.text(`Department: ${deptName} | Role: ${roleName}`, 14, 22);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 27);

    // Prepare table data
    const tableData = filteredData.map((emp, index) => {
      console.log('PDF Row Employee:', emp);
      
      // Get department name - try multiple field names
      let deptName = emp.departmentname || emp.department_name || emp.department;
      if (!deptName && (emp.department_id || emp.departmentid || emp.dept_id)) {
        const deptId = emp.department_id || emp.departmentid || emp.dept_id;
        const dept = departments.find(d => d.id === parseInt(deptId));
        deptName = dept?.departmentname || dept?.name || dept?.department_name;
      }
      deptName = deptName || 'N/A';
      
      // Get role name - try multiple field names
      let roleName = emp.rolename || emp.role_name || emp.role;
      if (!roleName && (emp.role_id || emp.roleid)) {
        const roleId = emp.role_id || emp.roleid;
        const role = roles.find(r => r.id === parseInt(roleId));
        roleName = role?.rolename || role?.name || role?.role_name;
      }
      roleName = roleName || 'N/A';
      
      // Get shift name - try multiple field names
      let shiftName = emp.shiftname || emp.shift_name || emp.shift;
      if (!shiftName && (emp.shift_id || emp.shiftid)) {
        const shiftId = emp.shift_id || emp.shiftid;
        const shift = shifts.find(s => s.id === parseInt(shiftId));
        shiftName = shift?.shiftname || shift?.name || shift?.shift_name;
      }
      shiftName = shiftName || 'N/A';
      
      console.log('PDF Row Data:', { name: emp.name, deptName, roleName, shiftName });
      
      return [
        index + 1,
        emp.name || emp.person_name || 'N/A',
        emp.email || 'N/A',
        deptName,
        roleName,
        shiftName,
        emp.person_id || emp.biometric_id || 'N/A'
      ];
    });

    // Add table
    autoTable(doc, {
      startY: 32,
      head: [['#', 'Name', 'Email', 'Department', 'Role', 'Shift', 'Status']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [123, 115, 255], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { top: 32 }
    });

    // Save the PDF
    const fileName = `employees_${deptName}_${roleName}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    
    toast.success('PDF downloaded successfully');
    handleCloseDownloadModal();
  };

  const generateExcel = () => {
    // Filter employees based on selected department and role (same as PDF)
    let filteredData = employees.filter(emp => {
      const empDeptId = emp.department_id || emp.departmentid || emp.dept_id;
      const empRoleId = emp.role_id || emp.roleid;
      const matchesDept = downloadFilters.department === 'all' || 
                         String(empDeptId) === String(downloadFilters.department);
      const matchesRole = downloadFilters.role === 'all' || 
                         String(empRoleId) === String(downloadFilters.role);
      return matchesDept && matchesRole;
    });

    if (filteredData.length === 0) {
      toast.warning('No employees found with selected filters');
      return;
    }

    const deptName = downloadFilters.department === 'all' ? 'All' : 
                     (departments.find(d => d.id === parseInt(downloadFilters.department))?.departmentname || 'All');
    const roleName = downloadFilters.role === 'all' ? 'All' : 
                     (roles.find(r => r.id === parseInt(downloadFilters.role))?.rolename || 'All');

    const rows = filteredData.map((emp, index) => {
      let dept = emp.departmentname || emp.department_name || emp.department;
      if (!dept && (emp.department_id || emp.departmentid || emp.dept_id)) {
        const deptId = emp.department_id || emp.departmentid || emp.dept_id;
        const d = departments.find(d => d.id === parseInt(deptId));
        dept = d?.departmentname || d?.name || d?.department_name;
      }
      dept = dept || 'N/A';

      let role = emp.rolename || emp.role_name || emp.role;
      if (!role && (emp.role_id || emp.roleid)) {
        const roleId = emp.role_id || emp.roleid;
        const r = roles.find(r => r.id === parseInt(roleId));
        role = r?.rolename || r?.name || r?.role_name;
      }
      role = role || 'N/A';

      let shift = emp.shiftname || emp.shift_name || emp.shift;
      if (!shift && (emp.shift_id || emp.shiftid)) {
        const shiftId = emp.shift_id || emp.shiftid;
        const s = shifts.find(s => s.id === parseInt(shiftId));
        shift = s?.shiftname || s?.name || s?.shift_name;
      }
      shift = shift || 'N/A';

      return {
        '#': index + 1,
        Name: emp.name || emp.person_name || 'N/A',
        Email: emp.email || 'N/A',
        Department: dept,
        Role: role,
        Shift: shift,
        Status: emp.person_id || emp.biometric_id || 'N/A',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Employees');
    const fileName = `employees_${deptName}_${roleName}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    toast.success('Excel downloaded successfully');
    handleCloseDownloadModal();
  };

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
  };

  // Build combined rows from persons (device) and employees (DB)
  const buildCombinedRows = () => {
    // Use person.id as canonical key and match it to employee.person_id when possible.
    const map = new Map();
    // First, ensure every person from device becomes a row (name & id from device)
    persons.forEach(p => {
      const pid = p.id || p.person_id || p.enroll_id || p.biometric_id || p.personid;
      const key = pid !== undefined && pid !== null ? String(pid) : `person-${Math.random().toString(36).slice(2,9)}`;
      map.set(key, { person: p, employee: null });
    });

    // Then attach any employee records to their corresponding person row (by person_id)
    employees.forEach(e => {
      const eid = e.person_id || e.personid || e.enroll_id || e.employeeid || e.biometric_id || e.id;
      const key = eid !== undefined && eid !== null ? String(eid) : null;
      if (key && map.has(key)) {
        map.set(key, { ...map.get(key), employee: e });
      } else if (key) {
        // Employee refers to a person id not present in device list — include it anyway
        map.set(key, { person: null, employee: e });
      } else {
        // Employee without a recognizable id — generate a unique row keyed by employee id
        const fallbackKey = `emp-${e.employeeid || e.id || Math.random().toString(36).slice(2,9)}`;
        map.set(fallbackKey, { person: null, employee: e });
      }
    });

    return Array.from(map.values());
  };

  const combinedRows = buildCombinedRows();

  const filteredCombined = combinedRows.filter(({ person, employee }) => {
    const name = (employee?.name || person?.name || '').toLowerCase();
    const email = (employee?.email || person?.email || '').toLowerCase();
    const matchesSearch = name.includes(searchTerm.toLowerCase()) || email.includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    if (filterStatus === 'all') return true;
    if (!employee) return false; // status filter applies only to employee records
    if (filterStatus === 'active') return (employee.status === 'active');
    if (filterStatus === 'inactive') return (employee.status === 'inactive');
    return true;
  });

  // Pagination logic for combined rows
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentRows = filteredCombined.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.max(1, Math.ceil(filteredCombined.length / itemsPerPage));

  const handlePageChange = (pageNumber) => {
    // Clamp page number
    const target = Math.min(Math.max(1, pageNumber), totalPages);
    if (target === currentPage) return;
    setCurrentPage(target);

    // Smooth scroll table into view after page change
    setTimeout(() => {
      const el = document.getElementById('refresh');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <CircularProgress />
      </div>
    );
  }

  return (
    <div className="employee-management">
      <div className="page-header">
        <h2>Employee Management</h2>
        
      </div>

      <div className="filters">
        <div className="search-box">
          <Search size={20} />
          <input
            type="text"
            placeholder="       Search employees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {searchTerm && (
          <button 
            className="clear-search-btn" 
            onClick={() => setSearchTerm('')}
            title="Clear search"
          >
            Clear
          </button>
        )}
        
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="filter-select"
        >
          <option key="all" value="all">All Employees</option>
          <option key="active" value="active">Active</option>
          <option key="inactive" value="inactive">Inactive</option>
        </select>
        <div className="header-actions">
          <button 
            type="button"
            className="btn btn-refresh" 
            onClick={() => {
              setIsRefreshing(true);
              setSelectedEmployees([]);
              setSelectAll(false);
              fetchData();
            }}
            disabled={isRefreshing}
            title="Refresh data"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: isRefreshing ? 0.6 : 1 }}
          >
            <RefreshCw size={18} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} /> 
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          {selectedEmployees.length > 0 ? (
            <button className="btn btn-download-selected" onClick={handleDownloadSelected}>
              <Download size={18} /> Download Selected Employees ({selectedEmployees.length})
            </button>
          ) : (
            <button className="btn btn-download" onClick={handleDownloadPDF}>
              <Download size={18} /> Download Employees Details
            </button>
          )}
        </div>
      </div>
      

      <div className="employees-table combined-table" id='refresh'>
        <table style={{ opacity: isRefreshing ? 0.6 : 1, transition: 'opacity 0.3s ease' }}>
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={handleSelectAll}
                  title="Select all employees"
                  style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                />
              </th>
              <th>Person ID</th>
              <th>Person Name</th>
              <th>Employee Email</th>
              <th>Department</th>
              <th>Role</th>
              <th>Shift</th>
              <th>Status</th>
              <th>Created</th>
              <th>Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentRows.map(({ person, employee }, idx) => {
              const key = employee?.person_id || employee?.employeeid || person?.id || `r-${idx}`;
              return (
                <tr key={key}>
                  <td>
                    {employee && (
                      <input
                        type="checkbox"
                        checked={selectedEmployees.includes(person?.id || employee?.person_id || employee?.id)}
                        onChange={() => handleSelectEmployee(person?.id || employee?.person_id || employee?.id)}
                        style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                      />
                    )}
                  </td>
                  <td>{person?.id || (employee?.person_id || '-')}</td>
                  <td>{person?.name || employee?.person_name || employee?.name || '-'}</td>
                  <td>{employee?.email || '-'}</td>
                  <td>{employee?.department || employee?.departmentname || '-'}</td>
                  <td>{employee?.role || employee?.rolename || '-'}</td>
                  <td>{employee?.shift || employee?.shiftname || '-'}</td>
                  <td>
                    {employee ? (
                      <span className={`status ${(employee.status === 'active') ? 'active' : (employee.status === 'inactive' ? 'inactive' : 'pending')}`}>{employee.status || 'pending'}</span>
                    ) : (
                      <span className="status pending">pending</span>
                    )}
                  </td>
                  <td>{employee?.created_date ? new Date(employee.created_date).toLocaleString() : '-'}</td>
                  <td>{employee?.updated_date ? new Date(employee.updated_date).toLocaleString() : '-'}</td>
                  <td>
                    <div className="actions">
                      {employee ? (
                        <>
                          <button className="btn-icon btn-edit" onClick={() => handleEdit(employee)} title="Edit">
                            <Edit size={16} />
                          </button>
                      <button className="btn-icon btn-reset-password" onClick={() => handleResetPassword(employee)} title="Reset Password">
                            <Key size={16} />
                          </button>
                          <button className="btn-icon btn-delete" onClick={() => handleDelete(employee)} title="Deactivate">
                            <Trash2 size={16} />
                          </button>
                        </>
                      ) : (
                        // Allow importing a device person into an employee record
                        <button className="btn-icon btn-import" onClick={() => handleImportPerson(person)} title="Import from device">
                          <Users size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Bottom-right Prev/Next and info */}
        <div className="pagination-bottom-right">
          <div className="page-info">Showing {filteredCombined.length === 0 ? 0 : indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredCombined.length)} of {filteredCombined.length}</div>
          <div className="page-controls">
            <button
              className="pagination-btn"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Prev
            </button>
            <button
              className="pagination-btn"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="pagination-btn"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          
          {[...Array(totalPages)].map((_, index) => (
            <button
              key={index + 1}
              className={`pagination-btn ${currentPage === index + 1 ? 'active' : ''}`}
              onClick={() => handlePageChange(index + 1)}
            >
              {index + 1}
            </button>
          ))}
          
          <button
            className="pagination-btn"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>{modalType === 'add' ? 'Update Employee' : 'Edit Employee'}</h3>
              <button className="close-btn" onClick={handleCloseModal}>×</button>
            </div>
            
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-grid">
                <div className="form-group">
                  <label>Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    readOnly={modalType === 'edit' || nameReadOnly}
                    title={modalType === 'edit' || nameReadOnly ? 'Name comes from device (read-only)' : ''}
                  />
                </div>

                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                {modalType === 'add' && (
                  <div className="form-group">
                    <label>Person ID</label>
                    <input
                      type="text"
                      name="person_id"
                      value={formData.person_id}
                      onChange={handleInputChange}
                      placeholder="Person ID (from device)"
                      readOnly={!!formData.person_id}
                    />
                    <small style={{ color: '#666', fontSize: '12px', marginTop: '5px', display: 'block', fontStyle: 'italic' }}>* Person ID is sourced from the device</small>
                  </div>
                )}

                <div className="form-group">
                  <label>Department</label>
                  <select
                    name="department_id"
                    value={formData.department_id}
                    onChange={handleInputChange}
                    required
                  >
                    <option key="select-dept" value="">Select Department</option>
                    {departments.map((dept, i) => {
                      const did = dept.id || dept.department_id || dept.departmentId || `dept-${i}`;
                      return (
                        <option key={did} value={did}>
                          {dept.departmentname || dept.name || `Department ${i + 1}`}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="form-group">
                  <label>Role</label>
                  <select
                    name="role_id"
                    value={formData.role_id}
                    onChange={handleInputChange}
                    required
                  >
                    <option key="select-role" value="">Select Role</option>
                    {roles.map((role, i) => {
                      const rid = role.id || role.role_id || role.roleId || `role-${i}`;
                      return (
                        <option key={rid} value={rid}>
                          {role.rolename || role.name || `Role ${i + 1}`}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="form-group">
                  <label>Shift</label>
                  <select
                    name="shift_id"
                    value={formData.shift_id}
                    onChange={handleInputChange}
                  >
                    <option key="select-shift" value="">Select Shift</option>
                    {shifts.map((shift, i) => {
                      const sid = shift.id || shift.shift_id || shift.shiftId || `shift-${i}`;
                      return (
                        <option key={sid} value={sid}>
                          {(shift.name || shift.shift_name || `Shift ${i + 1}`)} {(shift.start_time || '')} {(shift.end_time || '') ? `(${shift.start_time || ''} - ${shift.end_time || ''})` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                  >
                    <option key="pending" value={'pending'}>Pending</option>
                    <option key="active" value={'active'}>Active</option>
                    <option key="inactive" value={'inactive'}>Inactive</option>
                  </select>
                </div>

                {/* Photo field removed as requested */}
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <CircularProgress size={18} style={{ marginRight: 8 }} />
                      {modalType === 'add' ? 'Adding...' : 'Updating...'}
                    </>
                  ) : (
                    'Update Employee'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}
      {showBulkUploadModal && (
        <div className="modal-overlay">
          <div className="modal bulk-upload-modal">
            <div className="modal-header">
              <h3>Upload contact in selected Group/SubGroup</h3>
              <button className="close-btn" onClick={handleCloseBulkModal}>×</button>
            </div>
            
            <form onSubmit={handleBulkSubmit} className="modal-form">
              <div className="bulk-upload-content">
                <div className="upload-info">
                  <p>Upload employee data in CSV or Excel format</p>
                  <p className="info-text">
                    Required columns: name, email, role_id, department_id, shift_id, statusflag
                  </p>
                </div>

                <div className="form-group">
                  <label>Select File (CSV or Excel)</label>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleBulkFileChange}
                    required
                  />
                  {bulkFile && (
                    <p className="file-selected">Selected: {bulkFile.name}</p>
                  )}
                </div>

                <div className="download-sample">
                  <button 
                    type="button" 
                    className="btn btn-link"
                    onClick={downloadSampleCSV}
                  >
                    Download Sample Excel Template
                  </button>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={handleCloseBulkModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-success">
                  <Upload size={18} /> Upload Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Download PDF Modal */}
      {showDownloadModal && (
        <div className="modal-overlay">
          <div className="modal download-modal">
            <div className="modal-header">
              <h3>Download Employee PDF</h3>
              <button className="close-btn" onClick={handleCloseDownloadModal}>×</button>
            </div>
            
            <div className="modal-form">
              <div className="download-filters">
                <p className="filter-instruction">Select filters to download employee list:</p>
                
                <div className="form-group">
                  <label>Department</label>
                  <select
                    name="department"
                    value={downloadFilters.department}
                    onChange={handleDownloadFilterChange}
                    className="filter-select"
                  >
                    <option key="all-dept" value="all">All Departments</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>
                        {dept.departmentname}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Role</label>
                  <select
                    name="role"
                    value={downloadFilters.role}
                    onChange={handleDownloadFilterChange}
                    className="filter-select"
                  >
                    <option key="all-role" value="all">All Roles</option>
                    {roles.map(role => (
                      <option key={role.id} value={role.id}>
                        {role.rolename}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="modal-actions download-menu-wrapper">
                <button type="button" className="btn btn-secondary" onClick={handleCloseDownloadModal}>
                  Cancel
                </button>
                <div className="download-menu-trigger">
                  <button type="button" className="btn btn-download" onClick={() => setDownloadMenuOpen(prev => !prev)}>
                    <Download size={18} /> Download Report <ChevronDown size={16} style={{ marginLeft: 8 }} />
                  </button>
                  {downloadMenuOpen && (
                    <div className="download-menu">
                      <button type="button" className="download-menu-item" onClick={() => { setDownloadMenuOpen(false); generatePDF(); }}>
                        <FileText size={16} /> Download as PDF
                      </button>
                      <button type="button" className="download-menu-item" onClick={() => { setDownloadMenuOpen(false); generateExcel(); }}>
                        <FileSpreadsheet size={16} /> Download as Excel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeManagement;