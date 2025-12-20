import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { toast } from 'react-toastify';
import { UserPlus, Plus, Users, Trash2, Edit } from 'lucide-react';
import './DepartmentManagement.css';

const RoleManagement = () => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showEmployeesModal, setShowEmployeesModal] = useState(false);
  const [roleName, setRoleName] = useState('');
  const [selectedRole, setSelectedRole] = useState(null);
  const [roleEmployees, setRoleEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState([]);
  // const [editRoleId, setEditRoleId] = useState(null);
  // const [editRoleName, setEditRoleName] = useState('');const [showEditModal, setShowEditModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    id: null,
    name: '',
    email: '',
    department: '',
    role: '',
    status: 'active',
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const response = await adminAPI.getRoles();
      setRoles(response.data);
    } catch (error) {
      toast.error('Failed to fetch roles');
    } finally {
      setLoading(false);
    }
  };

  // Add Role
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!roleName.trim()) {
      toast.error('Role name is required');
      return;
    }

    try {
      await adminAPI.addRole({ rolename: roleName });
      toast.success('Role added successfully');
      setRoleName('');
      setShowModal(false);
      fetchRoles();
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to add role';
      toast.error(message);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setRoleName('');
  };

  const handleRoleClick = async (role) => {
    setSelectedRole(role);
    setShowEmployeesModal(true);
    setLoadingEmployees(true);

    try {
      const response = await adminAPI.getEmployees();
      // Filter by role_id (FK) or role (VARCHAR name)
      const filtered = response.data.filter(emp =>
        emp.role_id === role.id ||
        emp.role === role.rolename ||
        emp.rolename === role.rolename
      );
      setRoleEmployees(filtered);
    } catch (error) {
      toast.error('Failed to fetch employees');
      setRoleEmployees([]);
    } finally {
      setLoadingEmployees(false);
    }
  };


  // DELETE ROLES
  // const handleDeleteSelected = async () => {
  //   if (selectedRoles.length === 0) return;

  //   if (!window.confirm(`Delete ${selectedRoles.length} roles?`)) return;

  //   try {
  //     for (const roleId of selectedRoles) {
  //       await adminAPI.deleteRole(roleId);
  //     }
  //     toast.success("Roles deleted");
  //     setSelectedRoles([]);
  //     setDeleteMode(false);
  //     fetchRoles();
  //   } catch (err) {
  //     toast.error("Delete failed");
  //   }
  // };

  const handleDeleteSelected = async () => {
    console.log("Selected role IDs:", selectedRoles);

    if (selectedRoles.length === 0) return;

    if (!window.confirm(`Delete ${selectedRoles.length} roles?`)) return;

    try {
      for (const roleId of selectedRoles) {
        console.log("Deleting role ID:", roleId);
        await adminAPI.deleteRole(roleId);
      }

      toast.success("Roles deleted successfully");
      setSelectedRoles([]);
      setDeleteMode(false);
      fetchRoles();
    } catch (err) {
      console.error("Delete failed:", err);
      toast.error("Delete failed");
    }
  };

  // FILTER ROLES
  const filteredRoles = roles.filter(r =>
    (r.rolename || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  // EMPLOYEE EDIT 
  const handleEditEmployee = (employee) => {
    const employeeId =
      employee.employeeid ||
      employee.person_id ||
      employee.enroll_id ||
      employee.id;

    const status = employee.status || (employee.statusflag ? 'active' : 'inactive');
    const employeeName = employee.person_name || employee.name || '';
    const department = employee.departmentname || employee.department || '';
    const role = employee.rolename || employee.role || '';

    setEditFormData({
      id: employeeId,
      name: employeeName,
      email: employee.email || '',
      department,
      role,
      status,
    });

    setShowEditModal(true);
  };

  //edit employee submit
  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();

    if (!editFormData.id) {
      toast.error('Invalid employee');
      return;
    }

    setIsSavingEdit(true);

    try {
      // Call your backend to update employee
      await adminAPI.updateEmployee(editFormData.id, {
        name: editFormData.name,
        email: editFormData.email,
        // send department/role as names, backend maps them
        department: editFormData.department,
        departmentname: editFormData.department,
        department_name: editFormData.department,
        role: editFormData.role,
        rolename: editFormData.role,
        role_name: editFormData.role,
        status: editFormData.status,
      });

      toast.success('Employee updated successfully');

      // update local list in modal so UI refreshes
      setRoleEmployees((prev) =>
        prev.map((emp) => {
          const empId =
            emp.employeeid || emp.person_id || emp.enroll_id || emp.id;
          if (empId !== editFormData.id) return emp;

          return {
            ...emp,
            name: editFormData.name,
            person_name: editFormData.name,
            email: editFormData.email,
            department: editFormData.department,
            departmentname: editFormData.department,
            role: editFormData.role,
            rolename: editFormData.role,
            status: editFormData.status,
            statusflag: editFormData.status === 'active' ? 1 : 0,
          };
        })
      );

      setShowEditModal(false);
    } catch (error) {
      console.error(error);
      toast.error('Failed to update employee');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
  };

  const handleDeleteRole = async (role) => {
    if (!window.confirm(`Delete role: ${role.rolename}?`)) return;

    try {
      await adminAPI.deleteRole(role.role_id);   // ✅ FIXED
      toast.success("Role deleted successfully");
      fetchRoles();
    } catch (err) {
      console.error("Role delete failed:", err);
      toast.error("Failed to delete role");
    }
  };



  // DELETE EMPLOYEE
  //   const handleDeleteEmployee = async (employee) => {
  //   const employeeId =
  //     employee.person_id ||
  //     employee.employeeid ||
  //     employee.enroll_id ||
  //     employee.id;

  //   if (!employeeId) {
  //     toast.error("Invalid Employee ID");
  //     return;
  //   }

  //   if (!window.confirm(`Deactivate ${employee.name}?`)) return;

  //   try {
  //     await adminAPI.deleteEmployee(employeeId);
  //     toast.success("Employee deactivated");

  //     const updated = roleEmployees.filter(emp => {
  //       const id = emp.person_id || emp.employeeid || emp.enroll_id || emp.id;
  //       return id !== employeeId;
  //     });

  //     setRoleEmployees(updated);
  //   } catch (err) {
  //     toast.error("Failed to deactivate");
  //   }
  // };
  const handleDeleteEmployee = async (employee) => {
    if (!employee) {
      toast.error("Employee not found");
      return;
    }

    const employeeId =
      employee.employeeid ||
      employee.person_id ||
      employee.enroll_id ||
      employee.id;

    if (!employeeId) {
      toast.error("Invalid employee ID");
      return;
    }

    if (!window.confirm(`Deactivate ${employee.role}?`)) return;

    try {
      await adminAPI.deleteEmployee(employeeId);
      toast.success("Employee deactivated");

      // remove from UI
      setRoleEmployees(prev =>
        prev.filter(emp =>
          (emp.employeeid || emp.person_id || emp.enroll_id || emp.id) !== employeeId
        )
      );
    } catch (err) {
      toast.error("Failed to deactivate");
    }
  };



  const handleCloseEmployeesModal = () => {
    setShowEmployeesModal(false);
    setSelectedRole(null);
    setRoleEmployees([]);
  };

  if (loading) {
    return <div className="loading-spinner">Loading roles...</div>;
  }

  return (
    <div className="role-management department-management">
      <div className="page-header">
        <h2>Role Management</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="btn btn-primary"
            onClick={() => setShowModal(true)}
          >
            <Plus size={20} />
            Add Role
          </button>
          <button
            className="btn btn-danger"
            onClick={() => setDeleteMode(!deleteMode)}
            title="Delete Mode"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </div>
      {deleteMode && (
        <div className="delete-options" style={{ display: "flex", gap: "10px", margin: "10px 0" }}>
          <button
            className="btn btn-secondary"
            onClick={() => {
              if (selectedRoles.length === roles.length) {
                setSelectedRoles([]);
              } else {
                setSelectedRoles(roles.map(r => r.id));
              }
            }}
          >
            {selectedRoles.length === roles.length ? "Unselect All" : "Select All"}
          </button>


          <button
            className="btn btn-danger"
            disabled={selectedRoles.length === 0}
            onClick={handleDeleteSelected}
          >
            Delete Selected ({selectedRoles.length})
          </button>

          <input
            className="form-control"
            style={{ width: '250px' }}
            placeholder="Search Roles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      )}

      <div className="roles-grid departments-grid">
        {filteredRoles.map((role) => (
          <div
            key={role.id}
            className={`role-card department-card ${selectedRoles.includes(role.id) ? "selected" : ""
              }`}
            style={{ position: 'relative', cursor: deleteMode ? "default" : "pointer" }}
            onClick={() => !deleteMode && handleRoleClick(role)}
          >
            {deleteMode && (
              <input
                type="checkbox"
                checked={selectedRoles.includes(role.id)}
                onChange={() => {
                  setSelectedRoles(prev =>
                    prev.includes(role.id)
                      ? prev.filter(id => id !== role.id)
                      : [...prev, role.id]
                  );
                }}
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: "absolute",
                  top: "10px",
                  right: "10px",
                  width: "20px",
                  height: "20px",
                  cursor: "pointer"
                }}
              />
            )}

            <div className="role-icon department-icon">
              <UserPlus size={24} />
            </div>
            <div className="role-info department-info">
              <h3>{role.rolename}</h3>
              <p>Created: {new Date(role.created_date).toLocaleDateString()}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay modal-overlay-shifted">
          <div className="modal">
            <div className="modal-header">
              <h3>Add New Role</h3>
              <button className="close-btn" onClick={handleCloseModal}>×</button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label>Role Name</label>
                <input
                  type="text"
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  placeholder="Enter role name"
                  required
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Add Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Employees Modal */}
      {showEmployeesModal && (
        <div className="modal-overlay modal-overlay-shifted">
          <div className="modal" style={{ maxWidth: '900px' }}>
            <div className="modal-header">
              <h3>
                <Users size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                Employees with {selectedRole?.rolename} Role
              </h3>
              <button className="close-btn" onClick={handleCloseEmployeesModal}>×</button>
            </div>

            <div className="modal-form" style={{ maxHeight: '500px', overflowY: 'auto' }}>
              {loadingEmployees ? (
                <div className="loading-spinner">Loading employees...</div>
              ) : roleEmployees.length > 0 ? (
                <div className="employees-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Department</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {roleEmployees.map((employee) => {
                        const employeeId = employee.employeeid || employee.person_id || employee.enroll_id || employee.id;
                        const status = employee.status || (employee.statusflag ? 'active' : 'inactive');
                        const employeeName = employee.person_name || employee.name || 'N/A';
                        const department = employee.departmentname || employee.department || 'N/A';
                        const role = employee.rolename || employee.role || 'N/A';

                        return (
                          <tr key={employeeId}>
                            <td>{employeeName}</td>
                            <td>{employee.email || 'N/A'}</td>
                            <td>{department}</td>
                            <td>{role}</td>
                            <td>
                              <span className={`status ${status === 'active' ? 'active' : 'inactive'}`}>
                                {status === 'active' ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td>
                              <button className="btn-icon btn-edit" onClick={() => handleEditEmployee(employee)}>
                                <Edit size={16} />
                              </button>

                              <button className="btn-icon btn-delete" onClick={() => handleDeleteEmployee(employee)}>
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>
                  <Users size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                  <p>No employees found with this role</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}{showEditModal && (
        <div className="modal-overlay modal-overlay-shifted">
          <div className="modal">
            <div className="modal-header">
              <h3>Edit Employee</h3>
              <button className="close-btn" onClick={handleCloseEditModal}>
                ×
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="modal-form">
              <div className="form-grid">
                <div className="form-group">
                  <label>Name</label>
                  <input
                    type="text"
                    name="name"
                    value={editFormData.name}
                    onChange={handleEditInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={editFormData.email}
                    onChange={handleEditInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Department</label>
                  <input
                    type="text"
                    name="department"
                    value={editFormData.department}
                    onChange={handleEditInputChange}
                    placeholder="Department name"
                  />
                </div>

                <div className="form-group">
                  <label>Role</label>
                  <input
                    type="text"
                    name="role"
                    value={editFormData.role}
                    onChange={handleEditInputChange}
                    placeholder="Role name"
                  />
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <select
                    name="status"
                    value={editFormData.status}
                    onChange={handleEditInputChange}
                  >
                    <option value="pending">Pending</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCloseEditModal}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSavingEdit}
                >
                  {isSavingEdit ? 'Saving...' : 'Update Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleManagement;