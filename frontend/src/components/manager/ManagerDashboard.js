import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { managerAPI } from '../../services/api';
import { toast } from 'react-toastify';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { 
  Users, 
  UserCheck, 
  UserX, 
  Clock, 
  LogOut,
  Calendar,
  FileText,
  BarChart3,
  Search,
  Download,
  Key,
  ChevronDown
} from 'lucide-react';
import './ManagerDashboard.css';

const ManagerDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    absentToday: 0,
    lateToday: 0,
    recentAttendance: [],
    employees: [],
    departmentName: ''
  });
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [employeesPerPage] = useState(10);
  const [reportType, setReportType] = useState('daily');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [reportStartDate, setReportStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportEndDate, setReportEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedReportEmployee, setSelectedReportEmployee] = useState('');
  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showDownloadDropdown, setShowDownloadDropdown] = useState(false);
  const [showEmployeesDropdown, setShowEmployeesDropdown] = useState(false);

  // Download dropdown state
  const [showEmployeesDownloadMenu, setShowEmployeesDownloadMenu] = useState(false);
  const [showReportDownloadMenu, setShowReportDownloadMenu] = useState(false);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const response = await managerAPI.getDashboardStats();
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceByDate = useCallback(async () => {
    try {
      setLoadingAttendance(true);
      
      // Fetch attendance from backend manager API
      const response = await managerAPI.getAttendanceReport(attendanceDate, attendanceDate);
      
      if (response.data && response.data.records) {
        setAttendanceRecords(response.data.records);
      } else {
        setAttendanceRecords([]);
      }
    } catch (error) {
      console.error('Failed to fetch attendance:', error);
      setAttendanceRecords([]);
    } finally {
      setLoadingAttendance(false);
    }
  }, [attendanceDate]);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  useEffect(() => {
    if (activeTab === 'overview') {
      fetchAttendanceByDate();
    }
  }, [attendanceDate, activeTab, fetchAttendanceByDate]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDownloadDropdown && !event.target.closest('.download-dropdown-container')) {
        setShowDownloadDropdown(false);
      }
      if (showEmployeesDropdown && !event.target.closest('.employees-dropdown-container')) {
        setShowEmployeesDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDownloadDropdown, showEmployeesDropdown]);

  const handleStatusToggle = async (employeeId, currentStatus) => {
    try {
      const newStatus = currentStatus ? 0 : 1;
      console.log('Updating employee:', employeeId, 'from', currentStatus, 'to', newStatus);
      
      const response = await managerAPI.updateEmployeeStatus(employeeId, newStatus);
      console.log('Update response:', response);
      
      toast.success(`Employee status updated to ${newStatus ? 'Active' : 'Inactive'}`);
      fetchDashboardStats(); // Refresh the employee list
    } catch (error) {
      console.error('Failed to update employee status:', error);
      console.error('Error response:', error.response?.data);
      toast.error(error.response?.data?.error || 'Failed to update employee status');
    }
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setSelectedRole('');
    setCurrentPage(1);
  };

  // Helper: download CSV (Excel-compatible)
  const downloadCSV = (filename, rows, columns) => {
    if (!rows || rows.length === 0) {
      toast.warning('No data to download');
      return;
    }

    const cols = columns || Object.keys(rows[0]);
    const header = cols.join(',');
    const csvRows = rows.map(row => cols.map(col => {
      const cell = row[col] === undefined || row[col] === null ? '' : String(row[col]);
      return '"' + cell.replace(/"/g, '""') + '"';
    }).join(','));

    const csv = [header, ...csvRows].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadEmployees = (type = 'pdf') => {
    if (filteredEmployees.length === 0) {
      toast.warning('No employees to download');
      setShowEmployeesDownloadMenu(false);
      return;
    }

    if (type === 'pdf') {
      const doc = new jsPDF('l', 'mm', 'a4'); // landscape orientation
      // Add title
      doc.setFontSize(18);
      doc.text('Department Employees Report', 14, 15);
      // Add department info
      doc.setFontSize(10);
      doc.text(`Department: ${stats.departmentName}`, 14, 22);
      if (selectedRole) {
        doc.text(`Role: ${selectedRole}`, 14, 27);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 32);
      } else {
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 27);
      }

      const tableData = filteredEmployees.map((emp, index) => [
        index + 1,
        emp.name || 'N/A',
        emp.email || 'N/A',
        emp.role || 'N/A',
        emp.statusflag ? 'Active' : 'Inactive'
      ]);

      autoTable(doc, {
        startY: selectedRole ? 35 : 30,
        head: [['#', 'Name', 'Email', 'Role', 'Status']],
        body: tableData,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [102, 126, 234], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 245, 245] }
      });

      doc.save(`department-employees-${stats.departmentName}-${new Date().toISOString().split('T')[0]}.pdf`);
      setShowEmployeesDownloadMenu(false);
    } else {
      // Excel / CSV
      const rows = filteredEmployees.map((emp, index) => ({
        '#': index + 1,
        'Name': emp.name || 'N/A',
        'Email': emp.email || 'N/A',
        'Role': emp.role || 'N/A',
        'Status': emp.statusflag ? 'Active' : 'Inactive'
      }));

      const columns = ['#', 'Name', 'Email', 'Role', 'Status'];
      downloadCSV(`department-employees-${stats.departmentName}-${new Date().toISOString().split('T')[0]}.csv`, rows, columns);
      setShowEmployeesDownloadMenu(false);
    }
  };

  const handleShowReport = async () => {
    if (!selectedReportEmployee) {
      toast.warning('Please select an employee to view the report');
      return;
    }

    if (reportType === 'custom' && new Date(reportStartDate) > new Date(reportEndDate)) {
      toast.warning('Start date cannot be after end date');
      return;
    }

    setReportLoading(true);
    try {
      // Check if "All Employees" is selected
      if (selectedReportEmployee === 'ALL') {
        const params = {
          reportType,
          date: reportType === 'daily' ? selectedDate : undefined,
          month: reportType === 'monthly' ? selectedMonth : undefined,
          startDate: reportType === 'custom' ? reportStartDate : undefined,
          endDate: reportType === 'custom' ? reportEndDate : undefined,
          departmentId: stats.departmentId, // Use manager's department ID from stats
          roleId: selectedRole || undefined,
        };

        // Fetch all employees report from PHP database
        const response = await fetch(`/api/php/attendance-report-all?${new URLSearchParams(
          Object.entries(params).filter(([_, v]) => v !== undefined)
        )}`);
        
        const data = await response.json();
        
        if (data.success) {
          setReportData({
            ...data,
            employeeName: 'All Employees',
            employeeId: 'ALL',
            enrollId: 'ALL',
            department: stats.departmentName,
            role: selectedRole || 'All Roles',
          });
        } else {
        }
      } else {
        // Single employee report
        const employee = stats.employees.find(emp => emp.enroll_id === parseInt(selectedReportEmployee));
        
        console.log('👤 Selected employee:', employee);
        console.log('🔍 Selected enroll_id:', selectedReportEmployee);
        console.log('🔧 Employee shift:', employee.shift);
        
        if (!employee) {
          toast.error('Employee not found');
          setReportLoading(false);
          return;
        }

        // Build parameters for attendance-summary endpoint served by backend
        const params = new URLSearchParams();
        params.append('enroll_id', employee.enroll_id);

        if (reportType === 'daily' && selectedDate) {
          params.append('date', selectedDate);
        } else if (reportType === 'monthly' && selectedMonth) {
          const [year, month] = selectedMonth.split('-');
          params.append('month', month);
          params.append('year', year);
        } else if (reportType === 'custom' && reportStartDate && reportEndDate) {
          params.append('start_date', reportStartDate);
          params.append('end_date', reportEndDate);
        }

        const apiUrl = `/api/php/attendance-summary?${params.toString()}`;
        console.log('📡 Fetching attendance from:', apiUrl);

        // Fetch from backend (which queries attendance_summary table)
        const response = await fetch(apiUrl);
        const records = await response.json();

        if (Array.isArray(records)) {
          setReportData({
            success: true,
            records: records,
            count: records.length,
            employeeName: employee.name,
            employeeId: `EMP${employee.enroll_id.toString().padStart(3, '0')}`,
            enrollId: employee.enroll_id,
            department: employee.department,
            role: employee.role,
            shift: employee.shift,
          });
        } else {
        }
      }
    } catch (error) {
      console.error('Failed to fetch report:', error);
    } finally {
      setReportLoading(false);
    }
  };

  // Download report - supports pdf and excel (csv)
  const handleDownloadReport = async (type = 'pdf') => {
    if (!selectedReportEmployee) {
      toast.warning('Please select an employee to download the report');
      return;
    }

    setReportLoading(true);
    try {
      if (type === 'pdf') {
        // Reuse existing PDF logic
        await handleDownloadPDF();
        setShowReportDownloadMenu(false);
        setReportLoading(false);
        return;
      }

      // Excel/CSV path
      let records = [];

      if (selectedReportEmployee === 'ALL') {
        const params = {
          reportType,
          date: reportType === 'daily' ? selectedDate : undefined,
          month: reportType === 'monthly' ? selectedMonth : undefined,
          startDate: reportType === 'custom' ? reportStartDate : undefined,
          endDate: reportType === 'custom' ? reportEndDate : undefined,
          departmentId: stats.departmentId,
          roleId: selectedRole || undefined,
        };

        const resp = await fetch(`/api/php/attendance-report-all?${new URLSearchParams(Object.entries(params).filter(([_, v]) => v !== undefined))}`);
        const data = await resp.json();
        if (data && data.success && Array.isArray(data.records)) records = data.records;
      } else {
        const employee = stats.employees.find(emp => emp.enroll_id === parseInt(selectedReportEmployee));
        if (!employee) {
          toast.error('Employee not found');
          setReportLoading(false);
          return;
        }

        const params = new URLSearchParams();
        params.append('enroll_id', employee.enroll_id);

        if (reportType === 'daily' && selectedDate) {
          params.append('date', selectedDate);
        } else if (reportType === 'monthly' && selectedMonth) {
          const [year, month] = selectedMonth.split('-');
          params.append('month', month);
          params.append('year', year);
        } else if (reportType === 'custom' && reportStartDate && reportEndDate) {
          params.append('start_date', reportStartDate);
          params.append('end_date', reportEndDate);
        }

        const resp = await fetch(`/api/php/attendance-summary?${params.toString()}`);
        const data = await resp.json();
        if (Array.isArray(data)) records = data;
      }

      if (!records || records.length === 0) {
        toast.warning('No records to download');
        setShowReportDownloadMenu(false);
        setReportLoading(false);
        return;
      }

      const first = records[0];
      const cols = ['date','enroll_id','employee_name','department','role','status','first_in','last_out','late_status'];
      const rows = records.map(r => {
        return cols.reduce((acc, k) => {
          acc[k] = r[k] ?? r[k.toLowerCase()] ?? '';
          return acc;
        }, {});
      });

      const filename = `attendance-report-${selectedReportEmployee === 'ALL' ? 'all-employees' : selectedReportEmployee}-${reportType}-${new Date().toISOString().split('T')[0]}.csv`;
      downloadCSV(filename, rows, cols);
      setShowReportDownloadMenu(false);
    } catch (error) {
      console.error('Failed to download Excel report:', error);
      toast.error('Failed to download Excel report');
    } finally {
      setReportLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!selectedReportEmployee) {
      toast.warning('Please select an employee to download the report');
      return;
    }

    try {
      let url;
      if (selectedReportEmployee === 'ALL') {
        // All employees PDF
        const params = {
          reportType,
          date: reportType === 'daily' ? selectedDate : undefined,
          month: reportType === 'monthly' ? selectedMonth : undefined,
          startDate: reportType === 'custom' ? reportStartDate : undefined,
          endDate: reportType === 'custom' ? reportEndDate : undefined,
          departmentId: stats.departmentId, // Use manager's department ID from stats
          roleId: selectedRole || undefined,
        };

        url = `/api/php/attendance-report-all/download?${new URLSearchParams(
          Object.entries(params).filter(([_, v]) => v !== undefined)
        )}`;
      } else {
        // Single employee PDF
        const params = {
          reportType,
          date: reportType === 'daily' ? selectedDate : undefined,
          month: reportType === 'monthly' ? selectedMonth : undefined,
          startDate: reportType === 'custom' ? reportStartDate : undefined,
          endDate: reportType === 'custom' ? reportEndDate : undefined,
          enrollId: selectedReportEmployee,
        };

        url = `/api/php/attendance-report/download?${new URLSearchParams(
          Object.entries(params).filter(([_, v]) => v !== undefined)
        )}`;
      }

      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json();
        return;
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `attendance-report-${selectedReportEmployee === 'ALL' ? 'all-employees' : selectedReportEmployee}-${reportType}-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Failed to download PDF:', error);
    }
    setShowDownloadDropdown(false);
  };

  const handleDownloadExcel = () => {
    if (!reportData || !reportData.records || reportData.records.length === 0) {
      return;
    }

    try {

      // Prepare data for Excel
      const excelData = reportData.records.map((record, index) => {
        const row = {};
        
        if (reportData.enrollId === 'ALL') {
          row['#'] = index + 1;
          row['Employee Name'] = record.employeeName || 'N/A';
          row['Enroll ID'] = `EMP${String(record.enroll_id).padStart(3, '0')}`;
        } else {
          row['#'] = index + 1;
        }
        
        row['Department'] = record.department || reportData.department || 'N/A';
        row['Role'] = record.role || reportData.role || 'N/A';
        row['Shift'] = reportData.shift || 'N/A';
        row['Date'] = record.date ? new Date(record.date).toLocaleDateString() : 'N/A';
        row['Status'] = record.status === 'P' ? 'Present' : record.status === 'A' ? 'Absent' : record.status || 'N/A';
        row['First In'] = record.first_in || 'N/A';
        row['Last Out'] = record.last_out || 'N/A';
        row['Late Status'] = record.late_status || 'On Time';
        
        return row;
      });

      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(excelData);

      // Set column widths
      const columnWidths = [
        { wch: 5 },  // #
        { wch: 20 }, // Employee Name or Department
        { wch: 15 }, // Enroll ID or Role
        { wch: 15 }, // Department or Shift
        { wch: 15 }, // Role or Date
        { wch: 12 }, // Shift or Status
        { wch: 12 }, // Date or First In
        { wch: 10 }, // Status or Last Out
        { wch: 12 }, // First In or Late Status
        { wch: 12 }, // Last Out
        { wch: 12 }  // Late Status
      ];
      ws['!cols'] = columnWidths;

      // Create workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Attendance Report');

      // Generate filename
      const filename = `attendance-report-${reportData.enrollId === 'ALL' ? 'all-employees' : reportData.enrollId}-${reportType}-${new Date().toISOString().split('T')[0]}.xlsx`;

      // Download file
      XLSX.writeFile(wb, filename);
    } catch (error) {
      console.error('Failed to download Excel:', error);
    }
    setShowDownloadDropdown(false);
  };

  const handleClearReportFilters = () => {
    setReportType('daily');
    setSelectedDate(new Date().toISOString().split('T')[0]);
    setSelectedMonth(new Date().toISOString().slice(0, 7));
    setReportStartDate(new Date().toISOString().split('T')[0]);
    setReportEndDate(new Date().toISOString().split('T')[0]);
    setSelectedRole('');
    setSelectedReportEmployee('');
    setReportData(null);
  };

  // Get unique roles from employees
  const uniqueRoles = [...new Set(stats.employees.map(emp => emp.role).filter(Boolean))];

  const filteredEmployees = stats.employees.filter((employee) => {
    const matchesSearch = 
      employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = selectedRole === '' || employee.role === selectedRole;
    
    return matchesSearch && matchesRole;
  });

  const handleLogout = () => {
    logout();
    navigate('/');
    toast.success('Logged out successfully');
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }

    try {
      setPasswordLoading(true);
      await managerAPI.changePassword(
        passwordData.newPassword
      );
      toast.success('Password changed successfully');
      setShowPasswordModal(false);
      setPasswordData({
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      console.error('Failed to change password:', error);
      toast.error(error.response?.data?.error || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const renderStatsCards = () => (
    <div className="stats-grid">
      <div className="stat-card">
        <div className="stat-icon" style={{ background: '#e3f2fd' }}>
          <Users size={24} color="#1976d2" />
        </div>
        <div className="stat-details">
          <h3>{stats.totalEmployees}</h3>
          <p>Total Employees</p>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon" style={{ background: '#e8f5e9' }}>
          <UserCheck size={24} color="#388e3c" />
        </div>
        <div className="stat-details">
          <h3>{stats.presentToday}</h3>
          <p>Present Today</p>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon" style={{ background: '#ffebee' }}>
          <UserX size={24} color="#d32f2f" />
        </div>
        <div className="stat-details">
          <h3>{stats.absentToday}</h3>
          <p>Absent Today</p>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon" style={{ background: '#fff3e0' }}>
          <Clock size={24} color="#f57c00" />
        </div>
        <div className="stat-details">
          <h3>{stats.lateToday}</h3>
          <p>Late Today</p>
        </div>
      </div>
    </div>
  );

  const renderOverview = () => (
    <div className="overview-section">
      {renderStatsCards()}

      <div className="recent-attendance">
        <div className="attendance-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3>Department Attendance</h3>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar size={18} />
              <input
                type="date"
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </label>
          </div>
        </div>
        <div className="table-container">
          {loadingAttendance ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>Loading attendance...</div>
          ) : (
            <table className="attendance-table">
              <thead>
                <tr>
                  <th>Employee Name</th>
                  <th>Department</th>
                  <th>Role</th>
                  <th>Shift</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>First In</th>
                  <th>Last Out</th>
                  <th>Late Status</th>
                </tr>
              </thead>
              <tbody>
                {attendanceRecords.length > 0 ? (
                  attendanceRecords.map((record, index) => (
                    <tr key={index}>
                      <td>{record.employee_name || 'N/A'}</td>
                      <td>{record.department || stats.departmentName || 'N/A'}</td>
                      <td>{record.role || 'N/A'}</td>
                      <td>{record.shift || 'N/A'}</td>
                      <td>{record.date ? new Date(record.date).toLocaleDateString() : attendanceDate ? new Date(attendanceDate).toLocaleDateString() : 'N/A'}</td>
                      <td>
                        <span className={`status-badge status-${record.status?.toLowerCase() || 'absent'}`}>
                          {record.status === 'P' ? 'Present' : record.status === 'A' ? 'Absent' : record.status || 'Absent'}
                        </span>
                      </td>
                      <td>{record.first_in || record.clock_in_time || 'N/A'}</td>
                      <td>{record.last_out || record.clock_out_time || 'N/A'}</td>
                      <td>
                        <span className={`time-status-badge time-${record.late_status === 'Late' || record.time_status === 'Late' || record.time_status === 'late' ? 'late' : 'on_time'}`}>
                          {record.late_status || record.time_status || 'On Time'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="9" className="no-data">No attendance records found for {attendanceDate}</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );

  const renderEmployees = () => {
    // Calculate pagination
    const indexOfLastEmployee = currentPage * employeesPerPage;
    const indexOfFirstEmployee = indexOfLastEmployee - employeesPerPage;
    const currentEmployees = filteredEmployees.slice(indexOfFirstEmployee, indexOfLastEmployee);
    const totalPages = Math.ceil(filteredEmployees.length / employeesPerPage);

    const handlePageChange = (pageNumber) => {
      setCurrentPage(pageNumber);
    };

    const handlePrevPage = () => {
      if (currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
    };

    const handleNextPage = () => {
      if (currentPage < totalPages) {
        setCurrentPage(currentPage + 1);
      }
    };

    return (
    <div className="employees-section">
      <div className="employees-header-row">
        <h3>Department Employees</h3>
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowEmployeesDownloadMenu(!showEmployeesDownloadMenu)}
            className="download-employees-btn"
          >
            <Download size={18} />
            Download Report ▾
          </button>

          {showEmployeesDownloadMenu && (
            <div className="download-dropdown-menu">
              <button onClick={() => handleDownloadEmployees('pdf')} className="dropdown-item">
                <FileText size={16} />
                Download PDF
              </button>
              <button onClick={() => handleDownloadEmployees('excel')} className="dropdown-item">
                <FileText size={16} />
                Download Excel
              </button>
            </div>
          )}
        </div>
      </div>
      
      <div className="search-controls">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search by name, email"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="search-input"
          />
        </div>
        <select
          value={selectedRole}
          onChange={(e) => {
            setSelectedRole(e.target.value);
            setCurrentPage(1);
          }}
          className="role-filter"
        >
          <option value="">All Roles</option>
          {uniqueRoles.map((role, index) => (
            <option key={index} value={role}>
              {role}
            </option>
          ))}
        </select>
        {(searchTerm || selectedRole) && (
          <button onClick={handleClearSearch} className="clear-btn">
            Clear
          </button>
        )}
      </div>

      <div className="table-container">
        <table className="employees-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {currentEmployees.length > 0 ? (
              currentEmployees.map((employee) => (
                <tr key={employee.enroll_id}>
                  <td>{employee.name}</td>
                  <td>{employee.email}</td>
                  <td>{employee.role || 'N/A'}</td>
                  <td>
                    <span 
                      className={`status-badge ${employee.statusflag ? 'status-active' : 'status-inactive'} status-clickable`}
                      onClick={() => handleStatusToggle(employee.enroll_id, employee.statusflag)}
                      title={`Click to ${employee.statusflag ? 'Deactivate' : 'Activate'}`}
                    >
                      {employee.statusflag ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="no-data">
                  {searchTerm || selectedRole ? 'No employees found matching your filters' : 'No employees found'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {filteredEmployees.length > 0 && totalPages > 1 && (
        <div className="pagination">
          <button 
            onClick={handlePrevPage} 
            disabled={currentPage === 1}
            className="pagination-btn"
          >
            Previous
          </button>
          
          <div className="pagination-numbers">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => handlePageChange(pageNum)}
                className={`pagination-number ${currentPage === pageNum ? 'active' : ''}`}
              >
                {pageNum}
              </button>
            ))}
          </div>

          <button 
            onClick={handleNextPage} 
            disabled={currentPage === totalPages}
            className="pagination-btn"
          >
            Next
          </button>
        </div>
      )}

      {filteredEmployees.length > 0 && (
        <div className="pagination-info">
          Showing {indexOfFirstEmployee + 1} to {Math.min(indexOfLastEmployee, filteredEmployees.length)} of {filteredEmployees.length} employees
        </div>
      )}
    </div>
    );
  };

  const renderReports = () => (
    <div className="reports-section">
      <div className="report-header">
        <div className="header-left">
          <FileText size={24} />
          <h3>Attendance Report</h3>
        </div>
      </div>

      <div className="filter-section">
        <div className="filter-row">
          <div className="filter-group">
            <label>Select Report Type:</label>
            <select 
              value={reportType} 
              onChange={(e) => setReportType(e.target.value)}
              className="filter-select"
            >
              <option value="daily">Daily Report</option>
              <option value="monthly">Monthly Report</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>

          {reportType === 'custom' ? (
            <>
              <div className="filter-group">
                <label>Start Date:</label>
                <input
                  type="date"
                  value={reportStartDate}
                  onChange={(e) => setReportStartDate(e.target.value)}
                  className="filter-input"
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="filter-group">
                <label>End Date:</label>
                <input
                  type="date"
                  value={reportEndDate}
                  onChange={(e) => setReportEndDate(e.target.value)}
                  className="filter-input"
                  min={reportStartDate}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>
            </>
          ) : (
            <div className="filter-group">
              <label>Select Date:</label>
              {reportType === 'daily' ? (
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="filter-input"
                />
              ) : (
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="filter-input"
                />
              )}
            </div>
          )}
        </div>

        <div className="filter-row filter-row-secondary">
          <div className="filter-group">
            <label>Role:</label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="filter-select"
            >
              <option value="">All Roles</option>
              {uniqueRoles.map((role, index) => (
                <option key={index} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Employee:</label>
            <select
              value={selectedReportEmployee}
              onChange={(e) => setSelectedReportEmployee(e.target.value)}
              className="filter-select"
            >
              <option value="">Select Employee</option>
              {stats.employees
                .filter(emp => !selectedRole || emp.role === selectedRole)
                .map((employee) => (
                  <option key={employee.enroll_id} value={employee.enroll_id}>
                    {employee.name} (ID: {employee.enroll_id})
                  </option>
                ))}
            </select>
          </div>

          <button onClick={handleShowReport} className="show-report-btn" disabled={reportLoading}>
            {reportLoading ? 'Loading...' : 'Show Report'}
          </button>

          <button onClick={handleClearReportFilters} className="clear-filter-btn">
            Clear
          </button>
        </div>
      </div>

      {reportData && (
        <>
          <div className="report-header-info" style={{ marginBottom: '1rem', padding: '1rem', background: '#f8f9fa', borderRadius: '8px' }}>
            <h4 style={{ margin: '0 0 0.5rem 0' }}>Biometric Attendance Report</h4>
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.9rem' }}>
              <span>Employee: <strong>{reportData.employeeName}</strong></span>
              {reportData.enrollId !== 'ALL' && (
                <span>Employee ID: <strong>{reportData.employeeId}</strong></span>
              )}
              <span>Department: <strong>{reportData.department}</strong></span>
              <span>Role: <strong>{reportData.role}</strong></span>
              {reportData.shift && reportData.enrollId !== 'ALL' && (
                <span>Shift: <strong>{reportData.shift}</strong></span>
              )}
              <span>Total Records: <strong>{reportData.count}</strong></span>
            </div>
          </div>

          <div className="report-actions" style={{ position: 'relative' }}>
            <button onClick={() => setShowReportDownloadMenu(!showReportDownloadMenu)} className="download-pdf-btn">
              <Download size={18} />
              Download Report ▾
            </button>

            {showReportDownloadMenu && (
              <div className="download-dropdown-menu">
              <button onClick={() => handleDownloadReport('pdf')} className="dropdown-item">
                <FileText size={16} />
                Download PDF
              </button>
              <button onClick={() => handleDownloadReport('excel')} className="dropdown-item">
                <FileText size={16} />
                Download Excel
              </button>
            </div>
            )}
          </div>

          <div className="table-container">
            <table className="report-table">
              <thead>
                <tr>
                  {reportData.enrollId === 'ALL' && (
                    <>
                      <th>Employee Name</th>
                      <th>Enroll ID</th>
                    </>
                  )}
                  <th>Department</th>
                  <th>Role</th>
                  <th>Shift</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>First In</th>
                  <th>Last Out</th>
                  <th>Late Status</th>
                </tr>
              </thead>
              <tbody>
                {reportData.records && reportData.records.length > 0 ? (
                  reportData.records.map((record, index) => (
                    <tr key={index}>
                      {reportData.enrollId === 'ALL' && (
                        <>
                          <td>{record.employeeName || 'N/A'}</td>
                          <td>EMP{String(record.enroll_id).padStart(3, '0')}</td>
                        </>
                      )}
                      <td>{record.department || reportData.department || 'N/A'}</td>
                      <td>{record.role || reportData.role || 'N/A'}</td>
                      <td>{reportData.shift || 'N/A'}</td>
                      <td>{record.date ? new Date(record.date).toLocaleDateString() : 'N/A'}</td>
                      <td>
                        <span className={`status-badge status-${record.status?.toLowerCase() || 'unknown'}`}>
                          {record.status === 'P' ? 'Present' : record.status === 'A' ? 'Absent' : record.status || 'N/A'}
                        </span>
                      </td>
                      <td>{record.first_in || 'N/A'}</td>
                      <td>{record.last_out || 'N/A'}</td>
                      <td>
                        <span className={`time-status-badge time-${record.late_status === 'Late' ? 'late' : 'on_time'}`}>
                          {record.late_status || 'On Time'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={reportData.enrollId === 'ALL' ? '10' : '8'} className="no-data">No records found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'employees':
        return renderEmployees();
      case 'reports':
        return renderReports();
      default:
        return renderOverview();
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="manager-dashboard">
      <div className="dashboard-header">
        <div className="header-content">
          <div>
            <h1>Manager Dashboard</h1>
            <p className="department-name">{stats.departmentName} Department</p>
          </div>
          <div className="header-actions">
            <span className="user-info">Welcome, {user?.name}</span>
            <button onClick={handleLogout} className="logout-btn">
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="dashboard-layout">
        <aside className="sidebar">
          <nav className="nav-menu">
            <button
              className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              <BarChart3 size={20} />
              <span>Overview</span>
            </button>
            <button
              className={`nav-item ${activeTab === 'employees' ? 'active' : ''}`}
              onClick={() => setActiveTab('employees')}
            >
              <Users size={20} />
              <span>Employees</span>
            </button>
            <button
              className={`nav-item ${activeTab === 'reports' ? 'active' : ''}`}
              onClick={() => setActiveTab('reports')}
            >
              <FileText size={20} />
              <span>Reports</span>
            </button>
            <button
              className="nav-item"
              onClick={() => setShowPasswordModal(true)}
            >
              <Key size={20} />
              <span>Change Password</span>
            </button>
          </nav>
        </aside>

        <main className="main-content">
          {renderContent()}
        </main>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Change Password</h2>
            <form onSubmit={handleChangePassword}>
              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  required
                  minLength="6"
                  placeholder="Enter new password (min 6 characters)"
                />
              </div>
              <div className="form-group">
                <label>Confirm New Password</label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  required
                  placeholder="Confirm new password"
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordData({
                      newPassword: '',
                      confirmPassword: ''
                    });
                  }}
                  className="btn-secondary"
                  disabled={passwordLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={passwordLoading}
                >
                  {passwordLoading ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerDashboard;
