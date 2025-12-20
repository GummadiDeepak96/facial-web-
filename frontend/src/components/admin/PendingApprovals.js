import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { toast } from 'react-toastify';
import { UserPlus, X, Check, RefreshCw, Mail, Building2, Briefcase, Clock } from 'lucide-react';
import './EmployeeManagement.css';

const PendingApprovals = () => {
  const [pendingPersons, setPendingPersons] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalData, setApprovalData] = useState({
    email: '',
    department_id: '',
    role_id: '',
    shift_id: '',
  });

  // Auto-refresh when component mounts
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async (showToast = false) => {
    if (showToast) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    
    try {
      const [personsRes, deptsRes, rolesRes, shiftsRes] = await Promise.all([
        adminAPI.getPendingPersons(),
        adminAPI.getDepartments(),
        adminAPI.getRoles(),
        adminAPI.getShifts(),
      ]);

      setPendingPersons(personsRes.data || []);
      setDepartments(deptsRes.data || []);
      setRoles(rolesRes.data || []);
      setShifts(shiftsRes.data || []);
      
      if (showToast) {
        toast.success('Refreshed successfully!');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load pending approvals');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchData(true);
  };

  const handleApprove = (person) => {
    setSelectedPerson(person);
    setApprovalData({
      email: person.email || '',
      department_id: '',
      role_id: '',
      shift_id: '',
    });
    setShowApprovalModal(true);
  };

  const handleApprovalSubmit = async (e) => {
    e.preventDefault();
    
    if (!approvalData.department_id || !approvalData.role_id || !approvalData.shift_id) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      await adminAPI.approvePerson(selectedPerson.id, approvalData);
      toast.success(`${selectedPerson.name} approved successfully!`);
      setShowApprovalModal(false);
      setSelectedPerson(null);
      fetchData(); // Refresh the list
    } catch (error) {
      console.error('Error approving person:', error);
      toast.error(error.response?.data?.error || 'Failed to approve person');
    }
  };

  const handleCancel = () => {
    setShowApprovalModal(false);
    setSelectedPerson(null);
    setApprovalData({
      email: '',
      department_id: '',
      role_id: '',
      shift_id: '',
    });
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="employee-management">
      <div className="management-header">
        <div>
          <h2>🔔 Pending Approvals</h2>
          <p>Approve registered persons to create employee accounts</p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={handleRefresh}
          disabled={refreshing}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <RefreshCw size={18} className={refreshing ? 'spinning' : ''} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {pendingPersons.length === 0 ? (
        <div className="no-data" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <UserPlus size={64} color="#10b981" style={{ marginBottom: '20px' }} />
          <h3 style={{ color: '#374151', marginBottom: '10px' }}>All Caught Up!</h3>
          <p style={{ color: '#6b7280' }}>No pending approvals at the moment</p>
        </div>
      ) : (
        <>
          <div style={{ 
            background: '#f0fdf4', 
            border: '1px solid #86efac', 
            borderRadius: '8px', 
            padding: '16px', 
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <UserPlus size={24} color="#16a34a" />
            <div>
              <strong style={{ color: '#16a34a', fontSize: '18px' }}>
                {pendingPersons.length} {pendingPersons.length === 1 ? 'Person' : 'Persons'} Awaiting Approval
              </strong>
              <p style={{ margin: 0, color: '#15803d', fontSize: '14px' }}>
                Review and approve to grant employee access
              </p>
            </div>
          </div>

          <div className="table-container">
            <table className="employee-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th style={{ width: '120px' }}>Enroll ID</th>
                  <th style={{ width: '150px' }}>Registered Date</th>
                  <th style={{ width: '140px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingPersons.map((person) => (
                  <tr key={person.id} style={{ transition: 'all 0.2s' }}>
                    <td><strong>#{person.id}</strong></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: 'bold',
                          fontSize: '14px'
                        }}>
                          {person.name ? person.name.charAt(0).toUpperCase() : '?'}
                        </div>
                        <strong>{person.name || 'Unknown'}</strong>
                      </div>
                    </td>
                    <td style={{ color: '#6b7280' }}>
                      {person.email || <span style={{ fontStyle: 'italic' }}>Not provided</span>}
                    </td>
                    <td>
                      <span style={{
                        background: '#f3f4f6',
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '13px',
                        fontWeight: '500'
                      }}>
                        {person.enroll_id || 'N/A'}
                      </span>
                    </td>
                    <td style={{ color: '#6b7280' }}>
                      {person.created_at ? new Date(person.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      }) : 'N/A'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleApprove(person)}
                        title="Approve and create employee"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 16px',
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          border: 'none',
                          borderRadius: '6px',
                          color: 'white',
                          fontWeight: '500',
                          cursor: 'pointer',
                          transition: 'transform 0.2s, box-shadow 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <Check size={16} /> Approve
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Approval Modal */}
      {showApprovalModal && selectedPerson && (
        <div className="modal-overlay" style={{ 
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(8px)',
          overflowY: 'auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div className="modal-content" style={{ 
            maxWidth: '650px',
            width: '100%',
            maxHeight: 'calc(100vh - 40px)',
            borderRadius: '20px',
            boxShadow: '0 25px 70px rgba(0, 0, 0, 0.4)',
            animation: 'slideIn 0.3s ease-out',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div className="modal-header" style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              padding: '20px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '22px', fontWeight: '700', letterSpacing: '-0.5px' }}>
                  Approve {selectedPerson.name}
                </h3>
                <p style={{ margin: '4px 0 0 0', opacity: 0.95, fontSize: '14px' }}>
                  Create employee account and send credentials
                </p>
              </div>
              <button 
                className="close-btn" 
                onClick={handleCancel}
                style={{
                  background: 'rgba(255, 255, 255, 0.25)',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '10px',
                  cursor: 'pointer',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.35)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)'}
              >
                <X size={22} />
              </button>
            </div>
            
            <form onSubmit={handleApprovalSubmit} style={{ 
              display: 'flex', 
              flexDirection: 'column',
              flex: 1,
              overflow: 'hidden'
            }}>
              <div style={{ 
                padding: '24px', 
                background: '#fafbfc',
                overflowY: 'auto',
                flex: 1
              }}>
              <div className="form-group" style={{ marginBottom: '18px' }}>
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  marginBottom: '8px',
                  color: '#1f2937',
                  fontWeight: '600',
                  fontSize: '13px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  <UserPlus size={16} color="#10b981" />
                  Name
                </label>
                <input
                  type="text"
                  value={selectedPerson.name}
                  disabled
                  className="form-control"
                  style={{
                    background: '#f3f4f6',
                    border: '2px solid #d1d5db',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    fontSize: '14px',
                    color: '#6b7280',
                    fontWeight: '500',
                    cursor: 'not-allowed'
                  }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '18px' }}>
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  marginBottom: '8px',
                  color: '#1f2937',
                  fontWeight: '600',
                  fontSize: '13px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  <Mail size={16} color="#10b981" />
                  Email <span style={{ color: '#ef4444', marginLeft: '2px' }}>*</span>
                </label>
                <input
                  type="email"
                  value={approvalData.email}
                  onChange={(e) =>
                    setApprovalData({ ...approvalData, email: e.target.value })
                  }
                  required
                  className="form-control"
                  placeholder="employee@company.com"
                  style={{
                    border: '2px solid #d1d5db',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    fontSize: '14px',
                    transition: 'all 0.2s',
                    background: 'white',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#10b981';
                    e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1), 0 1px 3px rgba(0, 0, 0, 0.05)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#d1d5db';
                    e.target.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
                  }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '18px' }}>
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  marginBottom: '8px',
                  color: '#1f2937',
                  fontWeight: '600',
                  fontSize: '13px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  <Building2 size={16} color="#10b981" />
                  Department <span style={{ color: '#ef4444', marginLeft: '2px' }}>*</span>
                </label>
                <select
                  value={approvalData.department_id}
                  onChange={(e) =>
                    setApprovalData({ ...approvalData, department_id: e.target.value })
                  }
                  required
                  className="form-control"
                  style={{
                    border: '2px solid #d1d5db',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    fontSize: '14px',
                    transition: 'all 0.2s',
                    cursor: 'pointer',
                    background: 'white',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                    appearance: 'none',
                    backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2310b981\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E")',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 12px center',
                    backgroundSize: '20px',
                    paddingRight: '44px'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#10b981';
                    e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1), 0 1px 3px rgba(0, 0, 0, 0.05)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#d1d5db';
                    e.target.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
                  }}
                >
                  <option value="" style={{ color: '#9ca3af' }}>Select Department</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.departmentname}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '18px' }}>
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  marginBottom: '8px',
                  color: '#1f2937',
                  fontWeight: '600',
                  fontSize: '13px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  <Briefcase size={16} color="#10b981" />
                  Role <span style={{ color: '#ef4444', marginLeft: '2px' }}>*</span>
                </label>
                <select
                  value={approvalData.role_id}
                  onChange={(e) =>
                    setApprovalData({ ...approvalData, role_id: e.target.value })
                  }
                  required
                  className="form-control"
                  style={{
                    border: '2px solid #d1d5db',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    fontSize: '14px',
                    transition: 'all 0.2s',
                    cursor: 'pointer',
                    background: 'white',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                    appearance: 'none',
                    backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2310b981\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E")',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 12px center',
                    backgroundSize: '20px',
                    paddingRight: '44px'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#10b981';
                    e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1), 0 1px 3px rgba(0, 0, 0, 0.05)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#d1d5db';
                    e.target.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
                  }}
                >
                  <option value="" style={{ color: '#9ca3af' }}>Select Role</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.rolename}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '0' }}>
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  marginBottom: '8px',
                  color: '#1f2937',
                  fontWeight: '600',
                  fontSize: '13px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  <Clock size={16} color="#10b981" />
                  Shift <span style={{ color: '#ef4444', marginLeft: '2px' }}>*</span>
                </label>
                <select
                  value={approvalData.shift_id}
                  onChange={(e) =>
                    setApprovalData({ ...approvalData, shift_id: e.target.value })
                  }
                  required
                  className="form-control"
                  style={{
                    border: '2px solid #d1d5db',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    fontSize: '14px',
                    transition: 'all 0.2s',
                    cursor: 'pointer',
                    background: 'white',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                    appearance: 'none',
                    backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2310b981\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E")',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 12px center',
                    backgroundSize: '20px',
                    paddingRight: '44px'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#10b981';
                    e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1), 0 1px 3px rgba(0, 0, 0, 0.05)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#d1d5db';
                    e.target.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
                  }}
                >
                  <option value="" style={{ color: '#9ca3af' }}>Select Shift</option>
                  {shifts.map((shift) => (
                    <option key={shift.id} value={shift.id}>
                      {shift.name} ({shift.start_time} - {shift.end_time})
                    </option>
                  ))}
                </select>
              </div>
              </div>

              <div className="modal-actions" style={{ 
                display: 'flex', 
                gap: '12px',
                justifyContent: 'flex-end',
                padding: '20px 24px',
                borderTop: '2px solid #e5e7eb',
                background: 'white',
                flexShrink: 0
              }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={handleCancel}
                  style={{
                    padding: '11px 20px',
                    borderRadius: '10px',
                    border: '2px solid #d1d5db',
                    background: 'white',
                    color: '#4b5563',
                    fontWeight: '600',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f9fafb';
                    e.currentTarget.style.borderColor = '#9ca3af';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'white';
                    e.currentTarget.style.borderColor = '#d1d5db';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <X size={18} /> Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  style={{
                    padding: '11px 20px',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: 'white',
                    fontWeight: '600',
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(16, 185, 129, 0.5)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
                  }}
                >
                  <Check size={18} /> Approve & Create Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PendingApprovals;
