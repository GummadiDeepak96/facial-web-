import React, { useState, useEffect } from 'react';
import './ShiftManagement.css';
import { Edit, Trash2 } from 'lucide-react';
import { adminAPI } from '../../services/api';
import { toast } from 'react-toastify';

const ShiftManagement = () => {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState({
    id: null,
    name: '',
    code: '',
    start_time: '',
    end_time: '',
    lunch_start_time: '',
    lunch_end_time: ''
  });

  useEffect(() => {
    fetchShifts();
  }, []);

  const fetchShifts = async () => {
    try {
      const response = await adminAPI.getShifts();
      setShifts(response.data);
    } catch (error) {
      toast.error('Failed to fetch shifts');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (shift = null) => {
    if (shift) {
      setModalData({
        id: shift.id,
        name: shift.name,
        code: shift.code,
        start_time: shift.start_time,
        end_time: shift.end_time,
        lunch_start_time: shift.lunch_start_time || '',
        lunch_end_time: shift.lunch_end_time || ''
      });
    } else {
      setModalData({ 
        id: null, 
        name: '', 
        code: '', 
        start_time: '', 
        end_time: '', 
        lunch_start_time: '', 
        lunch_end_time: '' 
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setModalData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      if (modalData.id) {
        // Update existing shift
        await adminAPI.updateShift(modalData.id, modalData);
        toast.success('Shift updated successfully');
      } else {
        // Add new shift
        await adminAPI.addShift(modalData);
        toast.success('Shift added successfully');
      }
      await fetchShifts();
      closeModal();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save shift');
    }
  };

  const handleEdit = (shift) => {
    openModal(shift);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this shift?')) {
      try {
        await adminAPI.deleteShift(id);
        toast.success('Shift deleted successfully');
        await fetchShifts();
      } catch (error) {
        toast.error('Failed to delete shift');
      }
    }
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        Loading shifts...
      </div>
    );
  }

  return (
    <div className="shift-management">
      <div className="shift-header">
        <h2>Define Shift</h2>
        <button className="add-shift-btn" onClick={() => openModal()}>Add Shift</button>
      </div>
      <div className="shift-table-container">
        <table className="shift-table">
          <thead>
            <tr>
              <th>ShiftName</th>
              <th>ShiftCode</th>
              <th>StartTime</th>
              <th>EndTime</th>
              <th>LunchStartTime</th>
              <th>LunchEndTime</th>
              <th>Edit</th>
            </tr>
          </thead>
          <tbody>
            {shifts.map((shift) => (
              <tr key={shift.id}>
                <td data-label="ShiftName">{shift.name}</td>
                <td data-label="ShiftCode">{shift.code}</td>
                <td data-label="StartTime">{shift.start_time}</td>
                <td data-label="EndTime">{shift.end_time}</td>
                <td data-label="LunchStartTime">{shift.lunch_start_time || '-'}</td>
                <td data-label="LunchEndTime">{shift.lunch_end_time || '-'}</td>
                <td>
                  <button className="icon-btn" onClick={() => handleEdit(shift)}>
                    <Edit size={18} /> <span className="btn-text">Edit</span>
                  </button>
                  <button className="icon-btn" onClick={() => handleDelete(shift.id)}>
                    <Trash2 size={18} /> <span className="btn-text">Delete</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showModal && (
        <div className="modal-overlay">
          <div className="shift-modal">
            <div className="modal-header">
              <span>Save Shift</span>
              <button className="close-btn" onClick={closeModal}>&times;</button>
            </div>
            <div className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Shift Name *</label>
                  <input name="name" value={modalData.name} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label>Shift Code *</label>
                  <input name="code" value={modalData.code} onChange={handleChange} required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Start Time</label>
                  <input type="time" name="start_time" value={modalData.start_time} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>End Time</label>
                  <input type="time" name="end_time" value={modalData.end_time} onChange={handleChange} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Lunch Start Time</label>
                  <input type="time" name="lunch_start_time" value={modalData.lunch_start_time} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Lunch End Time</label>
                  <input type="time" name="lunch_end_time" value={modalData.lunch_end_time} onChange={handleChange} />
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="close-btn-modal" onClick={closeModal}>Close</button>
              <button className="save-btn-modal" onClick={handleSave}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShiftManagement;
