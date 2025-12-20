import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { toast } from 'react-toastify';
import { Bell, Send, Users, Building2, UserPlus } from 'lucide-react';

const NotificationManagement = () => {
  const [messageType, setMessageType] = useState('multiple');
  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedDepartmentForSingle, setSelectedDepartmentForSingle] = useState('');
  const [selectedRoleForSingle, setSelectedRoleForSingle] = useState('');
  const [selectAllDept, setSelectAllDept] = useState(false);
  const [selectAllRoles, setSelectAllRoles] = useState(false);
  const [messageTemplate, setMessageTemplate] = useState('attendance');
  const [selectedContact, setSelectedContact] = useState(0);
  
  // Form data
  const [formData, setFormData] = useState({
    subject: '',
    message: '',
    signature: 'Thanks and Regards,\nAVNIYA CLOUD SOLUTIONS',
    urlLink: '',
    imageFiles: [],
    videoFile: null,
    audioFile: null,
    documentFile: null
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // Filter employees based on selected department and role for single contact mode
    if (messageType === 'single') {
      let filtered = employees;
      
      if (selectedDepartmentForSingle) {
        const selectedDeptId = parseInt(selectedDepartmentForSingle);
        // Find the department name from the selected ID
        const selectedDept = departments.find(d => d.id === selectedDeptId);
        const selectedDeptName = selectedDept?.departmentname;
        
        filtered = filtered.filter(emp => {
          // Support both department_id (numeric) and departmentname (text)
          return emp.department_id === selectedDeptId || 
                 emp.departmentname === selectedDeptName ||
                 emp.department === selectedDeptName;
        });
      }
      
      if (selectedRoleForSingle) {
        const selectedRoleId = parseInt(selectedRoleForSingle);
        // Find the role name from the selected ID
        const selectedRole = roles.find(r => r.id === selectedRoleId);
        const selectedRoleName = selectedRole?.rolename;
        
        filtered = filtered.filter(emp => {
          // Support both role_id (numeric) and rolename (text)
          return emp.role_id === selectedRoleId || 
                 emp.rolename === selectedRoleName ||
                 emp.role === selectedRoleName;
        });
      }
      
      setFilteredEmployees(filtered);
      setSelectedEmployee(''); // Reset employee selection when filters change
    }
  }, [messageType, selectedDepartmentForSingle, selectedRoleForSingle, employees, departments, roles]);

  const fetchData = async () => {
    try {
      const [deptRes, rolesRes, empRes] = await Promise.all([
        adminAPI.getDepartments(),
        adminAPI.getRoles(),
        adminAPI.getEmployees()
      ]);
      setDepartments(deptRes.data);
      setRoles(rolesRes.data);
      setEmployees(empRes.data);
    } catch (error) {
      toast.error('Failed to fetch data');
    }
  };

  const handleDepartmentChange = (deptId) => {
    if (selectedDepartments.includes(deptId)) {
      setSelectedDepartments(selectedDepartments.filter(id => id !== deptId));
    } else {
      setSelectedDepartments([...selectedDepartments, deptId]);
    }
  };

  const handleRoleChange = (roleId) => {
    if (selectedRoles.includes(roleId)) {
      setSelectedRoles(selectedRoles.filter(id => id !== roleId));
    } else {
      setSelectedRoles([...selectedRoles, roleId]);
    }
  };

  const handleSelectAllDept = () => {
    if (selectAllDept) {
      setSelectedDepartments([]);
    } else {
      setSelectedDepartments(departments.map(d => d.id));
    }
    setSelectAllDept(!selectAllDept);
  };

  const handleSelectAllRoles = () => {
    if (selectAllRoles) {
      setSelectedRoles([]);
    } else {
      setSelectedRoles(roles.map(r => r.id));
    }
    setSelectAllRoles(!selectAllRoles);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (messageType === 'single') {
      if (!selectedEmployee) {
        toast.error('Please select an employee');
        return;
      }
    } else {
      if (selectedDepartments.length === 0 && selectedRoles.length === 0) {
        toast.error('Please select at least one department or role');
        return;
      }
    }

    if (!formData.subject || !formData.message) {
      toast.error('Subject and message are required');
      return;
    }

    try {
      const notificationData = {
        departments: messageType === 'multiple' ? selectedDepartments : [],
        roles: messageType === 'multiple' ? selectedRoles : [],
        employeeId: messageType === 'single' ? selectedEmployee : null,
        subject: formData.subject,
        message: formData.message,
        signature: formData.signature,
        urlLink: formData.urlLink
      };

      await adminAPI.sendNotification(notificationData);
      toast.success('Notification sent successfully!');
      
      // Reset form
      setFormData({
        subject: '',
        message: '',
        signature: 'Thanks and Regards,\nAVNIYA CLOUD SOLUTIONS',
        urlLink: '',
        imageFiles: [],
        videoFile: null,
        audioFile: null,
        documentFile: null
      });
      setSelectedDepartments([]);
      setSelectedRoles([]);
      setSelectedEmployee('');
      setSelectedDepartmentForSingle('');
      setSelectedRoleForSingle('');
      setSelectAllDept(false);
      setSelectAllRoles(false);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to send notification');
    }
  };

  const messageTemplates = {
    attendance: 'Your attendance has been marked for today.',
    announcement: 'Important announcement from management.'
  };

  const handleFileChange = (e, fileType) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      if (fileType === 'images') {
        setFormData({...formData, imageFiles: Array.from(files)});
        toast.success(`${files.length} image(s) selected`);
      } else if (fileType === 'video') {
        setFormData({...formData, videoFile: files[0]});
        toast.success('Video file selected');
      } else if (fileType === 'audio') {
        setFormData({...formData, audioFile: files[0]});
        toast.success('Audio file selected');
      } else if (fileType === 'document') {
        setFormData({...formData, documentFile: files[0]});
        toast.success('Document file selected');
      }
    }
  };

  return (
    <div className="notification-management">
      <div className="page-header">
        <h2>
          <Bell size={24} style={{ marginRight: '10px', verticalAlign: 'middle' }} />
          Send Notification
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="notification-form">
        <div className="form-row">
          <div className="form-section">
            <h3>Send Message To</h3>
            <select 
              value={messageType} 
              onChange={(e) => setMessageType(e.target.value)}
              className="form-select"
            >
              <option value="multiple">Multiple Group</option>
              <option value="single">Single Contact</option>
            </select>

            {messageType === 'multiple' ? (
              <>
                <div className="selection-box">
                  <div className="selection-header">
                    <h4>Select Department</h4>
                    <label>
                      <input 
                        type="checkbox" 
                        checked={selectAllDept}
                        onChange={handleSelectAllDept}
                      />
                      Select All
                    </label>
                  </div>
                  <div className="checkbox-list">
                    {departments.map(dept => (
                      <label key={dept.id} className="checkbox-item">
                        <input
                          type="checkbox"
                          checked={selectedDepartments.includes(dept.id)}
                          onChange={() => handleDepartmentChange(dept.id)}
                        />
                        {dept.departmentname}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="selection-box">
                  <div className="selection-header">
                    <h4>Select Role</h4>
                    <label>
                      <input 
                        type="checkbox"
                        checked={selectAllRoles}
                        onChange={handleSelectAllRoles}
                      />
                      Select All
                    </label>
                  </div>
                  <div className="checkbox-list">
                    {roles.map(role => (
                      <label key={role.id} className="checkbox-item">
                        <input
                          type="checkbox"
                          checked={selectedRoles.includes(role.id)}
                          onChange={() => handleRoleChange(role.id)}
                        />
                        {role.rolename}
                      </label>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="selection-box">
                  <div className="selection-header">
                    <h4>Select Department</h4>
                  </div>
                  <select
                    value={selectedDepartmentForSingle}
                    onChange={(e) => setSelectedDepartmentForSingle(e.target.value)}
                    className="form-select"
                    style={{ marginTop: '10px' }}
                  >
                    <option value="">--All Departments--</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>
                        {dept.departmentname}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="selection-box">
                  <div className="selection-header">
                    <h4>Select Role</h4>
                  </div>
                  <select
                    value={selectedRoleForSingle}
                    onChange={(e) => setSelectedRoleForSingle(e.target.value)}
                    className="form-select"
                    style={{ marginTop: '10px' }}
                  >
                    <option value="">--All Roles--</option>
                    {roles.map(role => (
                      <option key={role.id} value={role.id}>
                        {role.rolename}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="selection-box">
                  <div className="selection-header">
                    <h4>Select Employee</h4>
                  </div>
                  <select
                    value={selectedEmployee}
                    onChange={(e) => setSelectedEmployee(e.target.value)}
                    className="form-select"
                    style={{ marginTop: '10px' }}
                  >
                    <option value="">--Select Employee--</option>
                    {filteredEmployees.map(emp => {
                      // Support multiple ID field names
                      const empId = emp.person_id || emp.employeeid || emp.id;
                      // Support multiple name field formats
                      const empName = emp.name || emp.person_name || emp.email?.split('@')[0] || 'Employee';
                      return (
                        <option key={empId} value={empId}>
                          {empName} - {emp.email}
                        </option>
                      );
                    })}
                  </select>
                  <small style={{ display: 'block', marginTop: '5px', color: '#7f8c8d' }}>
                    Showing {filteredEmployees.length} employee(s)
                  </small>
                </div>
              </>
            )}
          </div>

          <div className="form-section">
            <h3>Select Message Template</h3>

            <div className="note-section">
              <div className="form-group">
                <label>Subject:</label>
                <input
                  type="text"
                  placeholder="provide subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({...formData, subject: e.target.value})}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Message:</label>
                <input
                  type="text"
                  placeholder="Dear ..."
                  className="form-input"
                  style={{ marginBottom: '10px' }}
                />
                <textarea
                  placeholder="Provide Note Text here"
                  value={formData.message}
                  onChange={(e) => setFormData({...formData, message: e.target.value})}
                  rows="6"
                  className="form-textarea"
                />
              </div>

              <div className="form-group">
                <label>Signature:</label>
                <textarea
                  value={formData.signature}
                  onChange={(e) => setFormData({...formData, signature: e.target.value})}
                  rows="3"
                  className="form-textarea"
                />
              </div>

              <div className="form-group">
                <label>Url Link:</label>
                <input
                  type="text"
                  placeholder="ex: https://www.google.com,http://Attendance.acculekhaa.com"
                  value={formData.urlLink}
                  onChange={(e) => setFormData({...formData, urlLink: e.target.value})}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Attachments:</label>
                <div className="attachment-row">
                  <span className="attachment-icon">🖼️</span>
                  <input
                    type="file"
                    id="image-files"
                    multiple
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'images')}
                    style={{ display: 'none' }}
                  />
                  <button 
                    type="button" 
                    className="btn-file"
                    onClick={() => document.getElementById('image-files').click()}
                  >
                    Choose Files
                  </button>
                  {formData.imageFiles.length > 0 && (
                    <span className="file-count">{formData.imageFiles.length} file(s)</span>
                  )}
                </div>
                <div className="attachment-row">
                  <span className="attachment-icon">🎥</span>
                  <input
                    type="file"
                    id="video-file"
                    accept="video/*"
                    onChange={(e) => handleFileChange(e, 'video')}
                    style={{ display: 'none' }}
                  />
                  <button 
                    type="button" 
                    className="btn-file"
                    onClick={() => document.getElementById('video-file').click()}
                  >
                    Choose File
                  </button>
                  {formData.videoFile && (
                    <span className="file-name">{formData.videoFile.name}</span>
                  )}
                </div>
                <div className="attachment-row">
                  <span className="attachment-icon">🔊</span>
                  <input
                    type="file"
                    id="audio-file"
                    accept="audio/*"
                    onChange={(e) => handleFileChange(e, 'audio')}
                    style={{ display: 'none' }}
                  />
                  <button 
                    type="button" 
                    className="btn-file"
                    onClick={() => document.getElementById('audio-file').click()}
                  >
                    Choose File
                  </button>
                  {formData.audioFile && (
                    <span className="file-name">{formData.audioFile.name}</span>
                  )}
                </div>
                <div className="attachment-row">
                  <span className="attachment-icon">📄</span>
                  <input
                    type="file"
                    id="document-file"
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={(e) => handleFileChange(e, 'document')}
                    style={{ display: 'none' }}
                  />
                  <button 
                    type="button" 
                    className="btn-file"
                    onClick={() => document.getElementById('document-file').click()}
                  >
                    Choose File
                  </button>
                  {formData.documentFile && (
                    <span className="file-name">{formData.documentFile.name}</span>
                  )}
                </div>
              </div>
            </div>

            <button type="submit" className="btn-send">
              <Send size={18} />
              Send
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default NotificationManagement;
