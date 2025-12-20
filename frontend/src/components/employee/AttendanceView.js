import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

const AttendanceView = () => {
  const [attendance, setAttendance] = useState([]);
  const [statistics, setStatistics] = useState({
    total_days: 0,
    present_days: 0,
    absent_days: 0,
    late_days: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const fetchAttendance = useCallback(async () => {
    try {
      setLoading(true);
      
      // Get user data from sessionStorage
      const userData = JSON.parse(sessionStorage.getItem('user'));
      const token = sessionStorage.getItem('token');
      
      console.log('👤 User data from session:', userData);
      
      if (!userData || !userData.enroll_id) {
        console.error('❌ No enroll_id found. User data:', userData);
        alert('Enroll ID not found. Please ensure your account has an enroll_id assigned.');
        setLoading(false);
        return;
      }

      console.log(`📊 Fetching attendance for enroll_id: ${userData.enroll_id}, Month: ${selectedMonth}, Year: ${selectedYear}`);

      // Fetch attendance from backend employee API
      const url = `http://localhost:8080/api/employee/attendance?month=${selectedMonth}&year=${selectedYear}`;
      console.log('🌐 API URL:', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      console.log('📥 API Response:', data);
      
      if (response.ok) {
        setAttendance(data.attendance || []);
        setStatistics(data.statistics || {
          total_days: 0,
          present_days: 0,
          absent_days: 0,
          late_days: 0
        });
        console.log('✅ Attendance data loaded:', data.attendance?.length || 0, 'records');
      } else {
        console.error('❌ Failed to fetch attendance:', data.error);
        alert('Failed to fetch attendance: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('❌ Failed to fetch attendance:', error);
      alert('Error fetching attendance: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  const getStatusIcon = (status, timeStatus) => {
    if (status === 'present') {
      return timeStatus === 'late' ? 
        <AlertCircle size={16} className="status-icon late" /> :
        <CheckCircle size={16} className="status-icon present" />;
    }
    return <XCircle size={16} className="status-icon absent" />;
  };

  if (loading) {
    return <div className="loading-spinner">Loading attendance...</div>;
  }

  return (
    <div className="attendance-view">
      <div className="attendance-header">
        <h3>Attendance History</h3>
        <div className="date-filters">
          <select 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
          >
            {Array.from({length: 12}, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {format(new Date(2000, i, 1), 'MMMM')}
              </option>
            ))}
          </select>
          <select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          >
            {Array.from({length: 5}, (_, i) => {
              const year = new Date().getFullYear() - 2 + i;
              return (
                <option key={year} value={year}>{year}</option>
              );
            })}
          </select>
        </div>
      </div>

      <div className="attendance-stats">
        <div className="stat-card">
          <div className="stat-icon">
            <Calendar size={24} />
          </div>
          <div className="stat-info">
            <h4>{statistics.total_days}</h4>
            <p>Total Days</p>
          </div>
        </div>

        <div className="stat-card present">
          <div className="stat-icon">
            <CheckCircle size={24} />
          </div>
          <div className="stat-info">
            <h4>{statistics.present_days}</h4>
            <p>Present Days</p>
          </div>
        </div>

        <div className="stat-card absent">
          <div className="stat-icon">
            <XCircle size={24} />
          </div>
          <div className="stat-info">
            <h4>{statistics.absent_days}</h4>
            <p>Absent Days</p>
          </div>
        </div>

        <div className="stat-card late">
          <div className="stat-icon">
            <AlertCircle size={24} />
          </div>
          <div className="stat-info">
            <h4>{statistics.late_days}</h4>
            <p>Late Days</p>
          </div>
        </div>
      </div>

      <div className="attendance-table-container">
        <div className="attendance-table">
          {attendance.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Day</th>
                  <th>Status</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Total Hours</th>
                  <th>Late (min)</th>
                  <th>Shift</th>
                </tr>
              </thead>
              <tbody>
                {attendance.map((record, index) => {
                  // Map attendance_summary fields
                  const status = record.attendance_status || record.status || '-';
                  const isPresent = status === 'present' || status === 'P';
                  const isAbsent = status === 'absent' || status === 'A';
                  const timeStatus = record.time_status || record.late_status || '';
                  const isLate = timeStatus === 'late' || timeStatus === 'Late' || timeStatus === 'L';
                  
                  return (
                    <tr key={index}>
                      <td>{record.date ? format(new Date(record.date), 'MMM dd, yyyy') : '-'}</td>
                      <td>{record.day || '-'}</td>
                      <td>
                        <div className="status-cell">
                          {getStatusIcon(isPresent ? 'present' : 'absent', isLate ? 'late' : 'on_time')}
                          <span className={`status ${isPresent ? 'present' : 'absent'}`}>
                            {isPresent ? 'Present' : isAbsent ? 'Absent' : status}
                          </span>
                        </div>
                      </td>
                      <td>{record.first_in || record.check_in || '-'}</td>
                      <td>{record.last_out || record.check_out || '-'}</td>
                      <td>{record.total_hours || record.work_hours || '-'}</td>
                      <td>
                        <span className={`time-status ${isLate ? 'late' : 'on_time'}`}>
                          {record.late_by || (isLate ? 'Late' : 'On Time')}
                        </span>
                      </td>
                      <td>{record.shift_name || record.shift || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="no-data">
              <Calendar size={48} />
              <p>No attendance records found for the selected period.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttendanceView;