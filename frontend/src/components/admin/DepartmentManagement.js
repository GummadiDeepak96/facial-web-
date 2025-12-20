import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { toast } from 'react-toastify';
import { Building2, Plus, X, Users, Trash2, Edit } from 'lucide-react';
import './DepartmentManagement.css';

const DepartmentManagement = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showEmployeesModal, setShowEmployeesModal] = useState(false);
  const [departmentName, setDepartmentName] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [departmentEmployees, setDepartmentEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [roleEmployees, setRoleEmployees] = useState([]);
const [editFormData, setEditFormData] = useState({
  id: null,
  name: "",
  email: "",
  department: "",
  role: "",
  status: "active",
});
const [isSavingEdit, setIsSavingEdit] = useState(false);
const [roles, setRoles] = useState([]);


  useEffect(() => {
    fetchDepartments();
    fetchRoles();
  }, []);

  const fetchDepartments = async () => {
    try {
      const response = await adminAPI.getDepartments();
      setDepartments(response.data);
    } catch (error) {
      toast.error('Failed to fetch departments');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
  try {
    const response = await adminAPI.getRoles();
    setRoles(response.data);
  } catch (error) {
    console.error("Failed to fetch roles:", error);
    toast.error("Failed to load roles");
  }
};

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!departmentName.trim()) {
      toast.error('Department name is required');
      return;
    }

    try {
      await adminAPI.addDepartment({ departmentname: departmentName });
      toast.success('Department added successfully');
      setDepartmentName('');
      setShowModal(false);
      fetchDepartments();
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to add department';
      toast.error(message);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setDepartmentName('');
  };


  // NEW HANDLE DELETE SELECTED FUNCTION 
 const handleDeleteSelected = async () => {
  if (selectedDepartments.length === 0) return;

  if (!window.confirm(`Delete ${selectedDepartments.length} departments?`)) return;

  try {
    for (const deptId of selectedDepartments) {
      await adminAPI.deleteDepartment(deptId);  // FIXED
    }

    toast.success("Departments deleted successfully");

    setSelectedDepartments([]);
    setDeleteMode(false);
    fetchDepartments();

  } catch (error) {
    console.error(error);
    toast.error("Delete failed");
  }
};


  const filteredDepartments = departments.filter(dept =>
    (dept?.departmentname ?? "").toLowerCase().includes(searchTerm.toLowerCase())
  );


 const handleEditEmployee = (employee) => {
  const employeeId =
    employee.employeeid ||
    employee.person_id ||
    employee.enroll_id ||
    employee.id;

  setEditFormData({
    id: employeeId || employee.person_id,
    name: employee.person_name || employee.name || "",
    email: employee.email || "",
    department: employee.departmentname || employee.department || "",
    role: employee.rolename || employee.role || "",
    status: employee.status || (employee.statusflag ? "active" : "inactive"),
  });

  setShowEditModal(true);
};
const handleEditInputChange = (e) => {
  const { name, value } = e.target;
  setEditFormData((prev) => ({ ...prev, [name]: value }));
};
const handleCloseEditModal = () => {
  setShowEditModal(false);
  setEditFormData({
    id: null,
    name: "",
    email: "",
    department: "",
    role: "",
    status: "active",
  });
};
const handleEditSubmit = async (e) => {
  e.preventDefault();
  setIsSavingEdit(true);

  try {
    await adminAPI.updateEmployee(editFormData.id, editFormData);

    toast.success("Employee updated successfully");

    // Update table instantly
    setRoleEmployees((prev) =>
      prev.map((emp) => {
        const eid =
          emp.employeeid || emp.person_id || emp.enroll_id || emp.id;
        if (eid !== editFormData.id) return emp;

        return {
          ...emp,
          name: editFormData.name,
          email: editFormData.email,
          departmentname: editFormData.department,
          rolename: editFormData.role,
          status: editFormData.status,
        };
      })
    );

    setShowEditModal(false);
  } catch (err) {
    console.error(err);
    toast.error("Failed to update employee");
  } finally {
    setIsSavingEdit(false);
  }
};


 const handleDeleteEmployee = async (employee) => {
  const employeeId = employee.person_id;  // FIXED

  if (!employeeId) {
    toast.error("Invalid employee id");
    return;
  }

  if (!window.confirm("Are you sure you want to deactivate this employee?"))
    return;

  try {
    await adminAPI.deleteEmployee(employeeId);

    toast.success("Employee deactivated");

    // instantly remove from UI
    setDepartmentEmployees((prev) =>
      prev.filter((emp) => emp.person_id !== employeeId)
    );

  } catch (error) {
    console.error(error);
    toast.error("Failed to delete employee");
  }
};





  const handleDepartmentClick = async (department) => {
    setSelectedDepartment(department);
    setShowEmployeesModal(true);
    setLoadingEmployees(true);

    try {
      const response = await adminAPI.getEmployees();
      // Filter by department_id (FK) or department (VARCHAR name)
      const filtered = response.data.filter(emp =>
        emp.department_id === department.id ||
        emp.department === department.departmentname
      );
      setDepartmentEmployees(filtered);
    } catch (error) {
      toast.error('Failed to fetch employees');
      setDepartmentEmployees([]);
    } finally {
      setLoadingEmployees(false);
    }
  };

  const handleCloseEmployeesModal = () => {
    setShowEmployeesModal(false);
    setSelectedDepartment(null);
    setDepartmentEmployees([]);
  };

  if (loading) {
    return <div className="loading-spinner">Loading departments...</div>;
  }

  return (
    <div className="department-management">
      <div className="page-header">
        <h2>Department Management</h2>
        <div>
          <button
            className="btn btn-primary"
            onClick={() => setShowModal(true)}
          >
            <Plus size={20} />
            Add Department
          </button>
          {/* NEW DELETE MODE BUTTON */}
          <button
            className="btn btn-danger"
            style={{ marginLeft: "1px" }}
            onClick={() => setDeleteMode(!deleteMode)}
            title="Enable delete mode"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </div>
      {deleteMode && (
        <div style={{ display: "flex", gap: "10px", margin: "10px 0" }}>

          <button
            className="btn btn-secondary"
            onClick={() => {
              if (selectedDepartments.length === departments.length) {
                setSelectedDepartments([]);
              } else {
                setSelectedDepartments(departments.map((d) => d.id));

              }
            }}
          >
            {selectedDepartments.length === departments.length
              ? "Unselect All"
              : "Select All"}
          </button>

          <button
            className="btn btn-danger"
            disabled={selectedDepartments.length === 0}
            onClick={handleDeleteSelected}
          >
            Delete Selected ({selectedDepartments.length})
          </button>

          <input
            type="text"
            placeholder="Search..."
            className="form-control"
            style={{ width: "250px" }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

        </div>
      )}

      <div className="departments-grid">
        {filteredDepartments.map((department) => (
          <div
            key={department.id}
            className={`department-card ${selectedDepartments.includes(department.id) ? "selected-card" : ""}`}
            onClick={() => !deleteMode && handleDepartmentClick(department)}
            style={{ position: "relative", cursor: deleteMode ? "default" : "pointer" }}
          >
            {deleteMode && (
              <input
                type="checkbox"
                checked={selectedDepartments.includes(department.id)}
                onChange={() => {
                  setSelectedDepartments((prev) =>
                    prev.includes(department.id)
                      ? prev.filter((x) => x !== department.id)
                      : [...prev, department.id]
                  );
                }}
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
            <div className="department-icon">
              <Building2 size={24} />
            </div>
            <div className="department-info">
              <h3>{department.departmentname}</h3>
              <p>Created: {new Date(department.created_date).toLocaleDateString()}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay modal-overlay-shifted">
          <div className="modal">
            <div className="modal-header">
              <h3>Add New Department</h3>
              <button className="close-btn" onClick={handleCloseModal}>×</button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label>Department Name</label>
                <input
                  type="text"
                  value={departmentName}
                  onChange={(e) => setDepartmentName(e.target.value)}
                  placeholder="Enter department name"
                  required
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Add Department
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
                Employees in {selectedDepartment?.departmentname}
              </h3>
              <button className="close-btn" onClick={handleCloseEmployeesModal}>×</button>
            </div>
            <div className="modal-form" style={{ maxHeight: '500px', overflowY: 'auto' }}>
              {loadingEmployees ? (
                <div className="loading-spinner">Loading employees...</div>
              ) : departmentEmployees.length > 0 ? (
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
                      {departmentEmployees.map((employee) => {
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
                              <button className="btn-icon btn-edit" onClick={() => handleEditEmployee(employee)} title="Edit">
                                <Edit size={16} />
                              </button>
                              <button className="btn-icon btn-delete" onClick={() => handleDeleteEmployee(employee)} title="Deactivate">
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
                  <p>No employees found in this department</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
{showEditModal && (
  <div className="modal-overlay modal-overlay-shifted">
    <div className="modal">
      <div className="modal-header">
        <h3>Edit Employee</h3>
        <button className="close-btn" onClick={handleCloseEditModal}>×</button>
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
            <select
              name="department"
              value={editFormData.department}
              onChange={handleEditInputChange}
              required
            >
              <option value="">Select Department</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.departmentname}>
                  {dept.departmentname}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Role</label>
            <select
              name="role"
              value={editFormData.role}
              onChange={handleEditInputChange}
              required
            >
              <option value="">Select Role</option>
              {roles.map((r) => (
                <option key={r.id} value={r.rolename}>
                  {r.rolename}
                </option>
              ))}
            </select>
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

          <button type="submit" className="btn btn-primary" disabled={isSavingEdit}>
            {isSavingEdit ? "Saving..." : "Update Employee"}
          </button>
        </div>
      </form>
    </div>
  </div>
)}

    </div>
  );
};

export default DepartmentManagement;