import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { FileText, Download, Calendar, X, RefreshCw, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import './AttendanceReport.css';

const AttendanceReport = () => {
  const [reportType, setReportType] = useState('daily');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('summary'); // 'summary' or 'records'
  const [recordsData, setRecordsData] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);

  useEffect(() => {
    fetchDepartments();
    fetchRoles();
    fetchEmployees();
  }, []);

  const fetchDepartments = async () => {
    try {
      const response = await adminAPI.getDepartments();
      setDepartments(response.data);
    } catch (error) {
      console.error('Failed to fetch departments:', error);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await adminAPI.getRoles();
      setRoles(response.data);
    } catch (error) {
      console.error('Failed to fetch roles:', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await adminAPI.getEmployees();
      console.log('📋 Employees loaded:', response.data);
      
      // Map employees to ensure enroll_id is available
      const mappedEmployees = response.data.map(emp => {
        const enrollId = emp.enroll_id || emp.person_id || emp.employeeid || emp.id;
        return {
          ...emp,
          enroll_id: enrollId,
          display_id: enrollId
        };
      });
      
      console.log('📋 Mapped employees with enroll_id:', mappedEmployees);
      setEmployees(mappedEmployees);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    }
  };

  const handleShowReport = async () => {
    // Validate custom date range
    if (reportType === 'custom' && new Date(startDate) > new Date(endDate)) {
      return;
    }

    setLoading(true);
    try {
      const params = {
        reportType,
        date: reportType === 'daily' ? selectedDate : undefined,
        month: reportType === 'monthly' ? selectedMonth : undefined,
        startDate: reportType === 'custom' ? startDate : undefined,
        endDate: reportType === 'custom' ? endDate : undefined,
        departmentId: selectedDepartment || undefined,
        roleId: selectedRole || undefined,
        employeeId: selectedEmployee || undefined,
      };

      console.log('📊 Fetching attendance report with params:', params);

      const response = await adminAPI.getAttendanceReport(params);
      console.log('📥 Backend API Response:', response.data);

      // If "All Employees" is selected
      if (!selectedEmployee || selectedEmployee === '') {
        if (response.data && response.data.records) {
          setReportData({
            records: response.data.records,
            count: response.data.records.length,
            employeeName: 'All Employees',
            enrollId: 'ALL',
          });
          console.log(`Found ${response.data.records.length} attendance records`);
        } else if (response.data && response.data.message) {
          console.log(response.data.message);
          setReportData({ records: [], count: 0, employeeName: 'All Employees', enrollId: 'ALL' });
        } else {
        }
      } else {
        // Single employee report
        const employee = employees.find(emp => emp.enroll_id === parseInt(selectedEmployee));
        
        console.log('👤 Selected employee:', employee);
        console.log('🔍 Selected enroll_id:', selectedEmployee);
        
        if (!employee) {
          setLoading(false);
          return;
        }

        const employeeName = employee.person_name || employee.name || 'Unknown Employee';

        if (response.data && response.data.records) {
          setReportData({
            records: response.data.records,
            count: response.data.records.length,
            employeeName: employeeName,
            enrollId: employee.enroll_id,
          });
          console.log(`Found ${response.data.records.length} attendance records for ${employeeName}`);
        } else if (response.data && response.data.message) {
          console.log(response.data.message);
          setReportData({ records: [], count: 0, employeeName: employeeName, enrollId: employee.enroll_id });
        } else {
        }
      }
    } catch (error) {
      console.error('Failed to fetch report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    console.log('🔍 PDF Download - reportData:', reportData);
    
    if (!reportData) {
      return;
    }
    
    if (!reportData.records || reportData.records.length === 0) {
      return;
    }

    console.log('✅ Starting PDF generation with', reportData.records.length, 'records');

    try {
      console.log('✅ jsPDF libraries loaded');
      
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      console.log('✅ PDF document created');
      console.log('✅ autoTable available:', typeof doc.autoTable);
      
      // Title
      doc.setFontSize(16);
      doc.text('Attendance Report', pageWidth / 2, 15, { align: 'center' });
      
      // Report details
      doc.setFontSize(10);
      let yPos = 25;
      doc.text('Report Type: ' + (reportType.charAt(0).toUpperCase() + reportType.slice(1)), 14, yPos);
      yPos += 6;
      
      if (reportType === 'daily') {
        doc.text('Date: ' + selectedDate, 14, yPos);
      } else if (reportType === 'monthly') {
        doc.text('Month: ' + selectedMonth, 14, yPos);
      } else {
        doc.text('Period: ' + startDate + ' to ' + endDate, 14, yPos);
      }
      yPos += 6;
      
      if (reportData.employeeName && reportData.employeeName !== 'All Employees') {
        doc.text('Employee: ' + reportData.employeeName, 14, yPos);
        yPos += 6;
      }
      
      if (selectedDepartment) {
        const dept = departments.find(d => d.id === parseInt(selectedDepartment));
        if (dept && dept.name) {
          doc.text('Department: ' + dept.name, 14, yPos);
          yPos += 6;
        }
      }
      
      if (selectedRole) {
        const role = roles.find(r => r.id === parseInt(selectedRole));
        if (role && role.role_name) {
          doc.text('Role: ' + role.role_name, 14, yPos);
          yPos += 6;
        }
      }
      
      doc.text('Total Records: ' + reportData.count, 14, yPos);
      yPos += 6;
      
      console.log('✅ PDF header created, preparing table data...');
      
      // Table data - format dates and times properly
      const tableData = reportData.records.map((record, index) => {
        // Format date (remove time if present)
        let dateStr = record.date || '-';
        if (dateStr !== '-' && dateStr.includes('T')) {
          dateStr = dateStr.split('T')[0];
        }
        
        // Format check in time (extract time only)
        let checkIn = record.check_in || record.first_in || '-';
        if (checkIn !== '-') {
          if (checkIn.includes('T')) {
            checkIn = checkIn.split('T')[1]?.split('.')[0] || checkIn;
          }
        }
        
        // Format check out time (extract time only)
        let checkOut = record.check_out || record.last_out || '-';
        if (checkOut !== '-') {
          if (checkOut.includes('T')) {
            checkOut = checkOut.split('T')[1]?.split('.')[0] || checkOut;
          }
        }
        
        return [
          (index + 1).toString(),
          (record.person_name || record.name || '-').toString(),
          dateStr,
          checkIn,
          checkOut,
          (record.status || '-').toString()
        ];
      });
      
      console.log('✅ Table data prepared:', tableData.length, 'rows');
      
      autoTable(doc, {
        startY: yPos + 5,
        head: [['#', 'Name', 'Date', 'Check In', 'Check Out', 'Status']],
        body: tableData,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [123, 115, 255] }
      });
      
      console.log('✅ Table added to PDF, saving...');
      
      // Save
      const fileName = 'attendance_' + reportType + '_' + Date.now() + '.pdf';
      doc.save(fileName);
      
      console.log('✅ PDF saved:', fileName);
    } catch (error) {
      console.error('❌ PDF generation error:', error);
      console.error('Error stack:', error.stack);
    }
  };

  const handleDownloadExcel = async () => {
    console.log('🔍 Excel Download - reportData:', reportData);
    
    if (!reportData) {
      return;
    }
    
    if (!reportData.records || reportData.records.length === 0) {
      return;
    }

    console.log('✅ Starting Excel generation with', reportData.records.length, 'records');

    try {
      // Prepare data for Excel
      const excelData = reportData.records.map((record, index) => {
        // Format date (remove time if present)
        let dateStr = record.date || '-';
        if (dateStr !== '-' && dateStr.includes('T')) {
          dateStr = dateStr.split('T')[0];
        }

        // Format check in time
        let checkIn = record.check_in || record.first_in || '-';
        if (checkIn !== '-') {
          if (checkIn.includes('T')) {
            checkIn = checkIn.split('T')[1]?.split('.')[0] || checkIn;
          }
        }

        // Format check out time
        let checkOut = record.check_out || record.last_out || '-';
        if (checkOut !== '-') {
          if (checkOut.includes('T')) {
            checkOut = checkOut.split('T')[1]?.split('.')[0] || checkOut;
          }
        }

        return {
          '#': index + 1,
          'Employee Name': record.person_name || record.name || '-',
          'Department': record.department || '-',
          'Role': record.role || '-',
          'Date': dateStr,
          'Check In': checkIn,
          'Check Out': checkOut,
          'Status': record.status || '-',
          'Late Status': record.late_status || 'On-Time',
          'Email': record.email || '-'
        };
      });

      // Create a new workbook
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance Report');

      // Add styles (basic)
      worksheet['!cols'] = [
        { wch: 5 },   // #
        { wch: 20 },  // Employee Name
        { wch: 15 },  // Department
        { wch: 15 },  // Role
        { wch: 12 },  // Date
        { wch: 12 },  // Check In
        { wch: 12 },  // Check Out
        { wch: 12 },  // Status
        { wch: 15 },  // Late Status
        { wch: 20 }   // Email
      ];

      // Generate filename
      const fileName = `attendance_report_${reportType}_${Date.now()}.xlsx`;

      // Save the file
      XLSX.writeFile(workbook, fileName);

      console.log('✅ Excel file saved:', fileName);
    } catch (error) {
      console.error('❌ Excel generation error:', error);
    }
  };

  const handleClearFilters = () => {
    setReportType('daily');
    setSelectedDate(new Date().toISOString().split('T')[0]);
    setSelectedMonth(new Date().toISOString().slice(0, 7));
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate(new Date().toISOString().split('T')[0]);
    setSelectedDepartment('');
    setSelectedRole('');
    setSelectedEmployee('');
    setReportData(null);
    toast.info('Filters cleared');
  };

  const filteredEmployees = employees.filter(emp => {
    // Filter by department (handle both department_id FK and department VARCHAR)
    if (selectedDepartment) {
      const deptMatches = emp.department_id === parseInt(selectedDepartment) || 
                         emp.department === selectedDepartment ||
                         emp.departmentname === selectedDepartment;
      if (!deptMatches) return false;
    }
    
    // Filter by role (handle both role_id FK and role VARCHAR)
    if (selectedRole) {
      const roleMatches = emp.role_id === parseInt(selectedRole) || 
                         emp.role === selectedRole ||
                         emp.rolename === selectedRole;
      if (!roleMatches) return false;
    }
    
    return true;
  });

  return (
    <div className="attendance-report">
      <div className="page-header">
        <h2>
          <FileText size={24} style={{ marginRight: '10px', verticalAlign: 'middle' }} />
          Attendance Report
        </h2>
      </div>

      <div className="report-filters">
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
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="filter-input"
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="filter-group">
                <label>End Date:</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="filter-input"
                  min={startDate}
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
                  max={new Date().toISOString().split('T')[0]}
                />
              ) : (
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="filter-input"
                  max={new Date().toISOString().slice(0, 7)}
                />
              )}
            </div>
          )}
        </div>

        <div className="filter-row filter-row-secondary">
          <div className="filter-group">
            <label>Department:</label>
            <select 
              value={selectedDepartment} 
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="filter-select"
            >
              <option value="">All Departments</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.departmentname}>{dept.departmentname}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Role:</label>
            <select 
              value={selectedRole} 
              onChange={(e) => setSelectedRole(e.target.value)}
              className="filter-select"
            >
              <option value="">All Roles</option>
              {roles.map(role => (
                <option key={role.id} value={role.rolename}>{role.rolename}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Select Contact:</label>
            <select 
              value={selectedEmployee} 
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="filter-select"
            >
              <option value="">All Employees</option>
              {filteredEmployees.map(emp => {
                const employeeName = emp.person_name || emp.name || 'Unknown';
                const enrollId = emp.enroll_id || emp.display_id;
                return (
                  <option key={enrollId} value={enrollId}>
                    {employeeName} (ID: {enrollId})
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        <div className="action-buttons">
          
          <button className="btn-show-report" onClick={handleShowReport}>
            <Calendar size={18} />
            Show Report
          </button>
          <button className="btn-clear" onClick={handleClearFilters}>
            <X size={18} />
            Clear
          </button>
        </div>
      </div>

      {loading && (
        <div className="loading-spinner">Loading report...</div>
      )}

      {reportData && !loading && (
        <div className="report-display">
          <div className="report-header-info" style={{
            background: 'linear-gradient(135deg, #efefefff 0%, #ffffffff 100%)',
            color: 'white',
            padding: '24px',
            borderRadius: '12px',
            marginBottom: '24px'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '24px' }}>📊 Attendance Summary Report</h3>
            <div className="report-meta" style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px'
            }}>
              {reportData.employeeName && (
                <span>Employee: <strong>{reportData.employeeName}</strong></span>
              )}
              <span>Report Date: <strong>{reportType === 'daily' ? new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : reportType}</strong></span>
              <span>Total Records: <strong>{reportData.count || 0}</strong></span>
              <span>
                Status: <strong style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  padding: '4px 12px',
                  borderRadius: '12px',
                  marginLeft: '4px'
                }}>
                  {reportData.count > 0 ? 'Data Available' : 'No Data'}
                </strong>
              </span>
            </div>
          </div>

          <div className="daily-report-table" style={{ 
            background: 'white',
            borderRadius: '12px',
            overflow: 'auto',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            maxHeight: '600px'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1000px' }}>
              <thead style={{ background: '#f8fafc' }}>
                <tr>
                  <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Employee</th>
                  <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Department</th>
                  <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Role</th>
                  <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Date</th>
                  <th style={{ padding: '16px', textAlign: 'center', fontWeight: '600', color: '#475569' }}>Status</th>
                  <th style={{ padding: '16px', textAlign: 'center', fontWeight: '600', color: '#475569' }}>Check In</th>
                  <th style={{ padding: '16px', textAlign: 'center', fontWeight: '600', color: '#475569' }}>Check Out</th>
                  <th style={{ padding: '16px', textAlign: 'center', fontWeight: '600', color: '#475569' }}>Late Status</th>
                </tr>
              </thead>
              <tbody>
                {reportData.records && reportData.records.length > 0 ? (
                  reportData.records.map((record, index) => (
                    <tr key={index} style={{ 
                      borderBottom: '1px solid #e2e8f0',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                    >
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontWeight: '600', color: '#1e293b' }}>{record.name || 'N/A'}</div>
                            <div style={{ fontSize: '13px', color: '#64748b' }}>{record.email || 'No email'}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '16px', color: '#475569' }}>
                        <div>{record.department || 'N/A'}</div>
                      </td>
                      <td style={{ padding: '16px', color: '#94a3b8' }}>
                        <div style={{ fontSize: '13px' }}>{record.role || 'N/A'}</div>
                      </td>
                      <td style={{ padding: '16px', color: '#475569' }}>
                        <div style={{ fontWeight: '500' }}>
                          {record.date ? new Date(record.date).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                          }) : 'N/A'}
                        </div>
                        {record.checkin_latitude && record.checkin_longitude && (
                          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                            📍 {Number(record.checkin_latitude).toFixed(4)}, {Number(record.checkin_longitude).toFixed(4)}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 16px',
                          borderRadius: '20px',
                          fontSize: '14px',
                          fontWeight: '500',
                          background: record.status === 'Present' ? '#dcfce7' : '#fee2e2',
                          color: record.status === 'Present' ? '#166534' : '#991b1b'
                        }}>
                          {record.status === 'Present' ? <CheckCircle size={14} /> : <XCircle size={14} />}
                          {record.status || 'N/A'}
                        </span>
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        <div style={{ 
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          color: '#475569',
                          fontWeight: '500'
                        }}>
                          <Clock size={14} color="#64748b" />
                          {record.first_in || 'N/A'}
                        </div>
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        <div style={{ 
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          color: '#475569',
                          fontWeight: '500'
                        }}>
                          <Clock size={14} color="#64748b" />
                          {record.last_out || 'N/A'}
                        </div>
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 16px',
                          borderRadius: '20px',
                          fontSize: '14px',
                          fontWeight: '500',
                          background: record.late_status === 'Late' ? '#fef3c7' : '#dbeafe',
                          color: record.late_status === 'Late' ? '#92400e' : '#1e40af'
                        }}>
                          {record.late_status === 'Late' ? <AlertCircle size={14} /> : <CheckCircle size={14} />}
                          {record.late_status || 'On-Time'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" style={{ 
                      padding: '48px',
                      textAlign: 'center',
                      color: '#94a3b8'
                    }}>
                      <FileText size={48} color="#cbd5e1" style={{ marginBottom: '16px' }} />
                      <div style={{ fontSize: '18px', fontWeight: '500', color: '#64748b' }}>No attendance records found</div>
                      <div style={{ fontSize: '14px', marginTop: '8px' }}>Try adjusting your filters or date range</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <div style={{ 
            marginTop: '24px',
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end',
            flexWrap: 'wrap',
            position: 'relative'
          }}>
            <div style={{ position: 'relative' }}>
              <button 
                className="btn-download" 
                onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(102, 126, 234, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <Download size={18} />
                Download Report
                <span style={{ marginLeft: '4px' }}>▼</span>
              </button>

              {showDownloadMenu && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '8px',
                  background: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
                  zIndex: 1000,
                  minWidth: '200px',
                  overflow: 'hidden'
                }}>
                  <button
                    onClick={() => {
                      handleDownloadPDF();
                      setShowDownloadMenu(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: 'none',
                      background: 'white',
                      color: '#1e293b',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      fontSize: '14px',
                      fontWeight: '500',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f1f5f9';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'white';
                    }}
                  >
                    <span style={{ color: '#667eea', fontSize: '16px' }}>📄</span>
                    Download as PDF
                  </button>
                  <div style={{ height: '1px', background: '#e2e8f0' }}></div>
                  <button
                    onClick={() => {
                      handleDownloadExcel();
                      setShowDownloadMenu(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: 'none',
                      background: 'white',
                      color: '#1e293b',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      fontSize: '14px',
                      fontWeight: '500',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f1f5f9';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'white';
                    }}
                  >
                    <span style={{ color: '#10b981', fontSize: '16px' }}>📊</span>
                    Download as Excel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceReport;
