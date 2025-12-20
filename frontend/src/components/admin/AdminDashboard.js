import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { adminAPI } from '../../services/api';
import { toast } from 'react-toastify';
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  Building2,
  UserPlus,
  Search,
  Filter,
  Bell,
  Mail,
  Calendar,
  MessageSquare,
  FileText,
  Menu,
  X
} from 'lucide-react';
import './AdminDashboard.css';
import EmployeeManagement from './EmployeeManagement';
import DepartmentManagement from './DepartmentManagement';
import RoleManagement from './RoleManagement';
import ShiftManagement from './ShiftManagement';
import NotificationManagement from './NotificationManagement';
import HolidayManagement from './HolidayManagement';
import AttendanceReport from './AttendanceReport';
import PendingApprovals from './PendingApprovals';
import './NotificationManagement.css';
import './HolidayManagement.css';
import './AttendanceReport.css';


const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  // PHP persons API - returns JSON array of persons
  const PHP_PERSONS_API = process.env.REACT_APP_PHP_PERSONS_API || 'http://localhost/Realtime_Mysql/get_persons.php';
  // PHP attendance summary API - optional. If not provided we try to derive it from PHP_PERSONS_API
  const PHP_ATT_SUMMARY_API = process.env.REACT_APP_PHP_ATT_SUMMARY_API || PHP_PERSONS_API.replace('get_persons.php', 'attendance_summary.php');
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('tab') || 'dashboard';
  });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    absentToday: 0,
    halfday: 0,
    leave: 0,
  });
  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(true);
  const [summaryType, setSummaryType] = useState("weekly");
  const [summaryData, setSummaryData] = useState([]);

  
  useEffect(() => {
    fetchSummary("weekly");
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, []);


const fetchSummary = async (type) => {
  try {
    const res = await adminAPI.getAttendanceSummary(type);
    if (res.data.success) {
      setSummaryData(res.data.data);
    }
  } catch (err) {
    console.error(err);
  }
};



  const fetchDashboardData = async () => {
    // Only use PHP persons API for My Contacts
    let persons = [];
    try {
      const resp = await fetch(PHP_PERSONS_API);
      if (!resp.ok) throw new Error(`HTTP error! status: ${resp.status}`);
      const json = await resp.json();
      console.log('Raw PHP API response:', json);  // Debug log

      // Handle different response formats
      if (json && json.data && Array.isArray(json.data)) {
        // If response is wrapped in {data: [...]}
        persons = json.data;
      } else if (Array.isArray(json)) {
        // If response is direct array
        persons = json;
      } else {
        console.error('Unexpected API response format:', json);
        toast.error('Invalid data format received from contacts API');
      }
      console.log('Processed persons data:', persons);
    } catch (phpErr) {
      console.error('Failed to load PHP persons API:', phpErr);
      // toast.error('Failed to load contacts data: ' + phpErr.message);
    }

    try {
      console.log('🔵 Fetching dashboard data from backend...');
      const [statsRes, deptRes, rolesRes, employeesRes, pendingRes] = await Promise.all([
        adminAPI.getDashboardStats().catch(e => {
          console.error('❌ getDashboardStats failed:', e);
          return { data: {} };
        }),
        adminAPI.getDepartments().catch(e => {
          console.error('❌ getDepartments failed:', e);
          return { data: [] };
        }),
        adminAPI.getRoles().catch(e => {
          console.error('❌ getRoles failed:', e);
          return { data: [] };
        }),
        adminAPI.getEmployees().catch(e => {
          console.error('❌ getEmployees failed:', e);
          return { data: [] };
        }),
        adminAPI.getPendingPersons().catch(e => {
          console.error('❌ getPendingPersons failed:', e);
          return { data: [] };
        })
      ]);
      console.log('✅ Backend data fetched:', { stats: statsRes.data, depts: deptRes.data?.length, roles: rolesRes.data?.length, employees: employeesRes.data?.length, pending: pendingRes.data?.length });



      // Only use PHP persons data for My Contacts preview. Also fetch employees
      // from the admin API to compute status-based counts (active/pending/inactive).
      const baseStats = statsRes.data || {};
      const personsCount = persons.length; // Only use PHP persons count for contact list

      const employees = (employeesRes && employeesRes.data) || [];
      // Compute status counts. Prefer string `status` when present, otherwise use statusflag.
      // ---- STEP 1: Employees table status counting ----
      let activeCount = 0;
      let pendingCount = 0;
      let inactiveCount = 0;

      employees.forEach(emp => {
        const statusText = emp.status ? emp.status.toLowerCase() : null;

        if (statusText === "active") {
          activeCount++;
          return;
        }

        if (statusText === "pending") {
          pendingCount++;
          return;
        }

        if (statusText === "inactive") {
          inactiveCount++;
          return;
        }

        // fallback using statusflag ONLY when status column missing
        if (!statusText) {
          if (emp.statusflag === 1) activeCount++;
          else if (emp.statusflag === 0) pendingCount++;
        }
      });

      // ---- STEP 2: Count persons with ID > 100 (face-registered persons) ----
      const registeredPersonsCount = persons.filter(p => {
        const pid = p.id || p.person_id;
        return pid && pid > 100; // Face-registered persons have high IDs
      }).length;

      // ---- STEP 3: My Contacts should reflect active employees only ----
      const totalContacts = activeCount;
      
      // Get actual pending count directly from backend API
      const actualPendingCount = pendingRes.data?.length || 0;
      
      console.log('🔢 Pending persons from backend API:', actualPendingCount);
      
      console.log('📊 Dashboard Counts:', {
        personsFromPHP: persons.length,
        personsData: persons.slice(0, 3), // Show first 3 persons for debugging
        registeredPersons: registeredPersonsCount,
        activeEmployees: activeCount,
        pendingEmployees: pendingCount,
        actualPendingCount: actualPendingCount,
        inactiveEmployees: inactiveCount,
        totalContacts: totalContacts
      });

      const preview = persons.slice(0, 10).map((p, idx) => ({
        sno: p.id || p.enroll_id || idx + 1,
        employee_name: p.name || p.fullname || `Person ${idx + 1}`,
        departmentname: p.roll_id === '0' ? 'Staff' : 'Other',
        attendance_status: '',
        time_status: '',
        check_in_time: '',
        device_accessed: ''
      }));

      // Try to fetch attendance summary from the realtime PHP DB (tolerant)
      let presentToday = baseStats.presentToday || 0;
      let absentToday = baseStats.absentToday || 0;
      try {
        // Use backend proxy to avoid CORS issues. Backend will in turn request the PHP API.
        const attResp = await fetch('/api/php/attendance-summary');
        if (attResp.ok) {
          const attJson = await attResp.json();
          // Tolerant parsing: support { presentToday, absentToday }, { present, absent }, or an array of records
          if (attJson && typeof attJson === 'object' && !Array.isArray(attJson)) {
            presentToday = attJson.presentToday ?? attJson.present ?? attJson.present_count ?? presentToday;
            absentToday = attJson.absentToday ?? attJson.absent ?? attJson.absent_count ?? absentToday;
          } else if (Array.isArray(attJson)) {
            const total = attJson.length;
            const present = attJson.filter(r => {
              const s = (r.attendance_status || r.status || r.present || '').toString().toLowerCase();
              return s === 'present' || s === 'p' || s === '1' || s === 'true';
            }).length;
            presentToday = present;
            absentToday = total - present;
          }
        } else {
          console.warn('Attendance proxy responded with status', attResp.status);
        }
      } catch (attErr) {
        console.warn('Failed to fetch PHP attendance summary:', attErr.message);
      }

      setStats({
        totalEmployees: totalContacts, // Show active employees only
        presentToday,
        absentToday,
        lateToday: baseStats.lateToday || 0,
        recentAttendance: preview,
        contactsByStatus: {
          active: activeCount,
          pending: actualPendingCount, // Show employees with pending status + unregistered persons
          inactive: inactiveCount
        }
      });

      setDepartments(deptRes.data || []);
      setRoles(rolesRes.data || []);
      console.log('✅ Dashboard data loaded successfully');
    } catch (error) {
      console.error('❌ Dashboard data error:', error);
      toast.error('Failed to fetch dashboard data: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
      // varun
    }
  };

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(true);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    navigate(`/admin/dashboard?tab=${tab}`, { replace: true });
    closeSidebar();
  };

  // keep state in sync if the user manually navigates to a tabbed URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabFromUrl = params.get('tab');
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [location.search, activeTab]);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboard();
      case 'employees':
        return <EmployeeManagement />;
      case 'pending-approvals':
        return <PendingApprovals key={Date.now()} />;
      case 'departments':
        return <DepartmentManagement />;
      case 'roles':
        return <RoleManagement />;
      case 'shifts':
        return <ShiftManagement />;
      case 'notifications':
        return <NotificationManagement />;
      case 'holidays':
        return <HolidayManagement />;
      case 'attendance-report':
        return <AttendanceReport />;
      default:
        return renderDashboard();
    }
  };

  const renderDashboard = () => (
    <div className="dashboard-content">
      <div className="dashboard-header">
        <h2>Dashboard Overview</h2>
        <p>Welcome back, {user?.name}</p>
      </div>

      {/* Top Stats Cards */}
      <div className="top-stats-grid">
        <div
          className="stat-card contacts"
          onClick={() => handleTabChange('employees')}
          style={{ cursor: 'pointer' }}
        >
          <div className="stat-icon">
            <Users size={32} />
          </div>
          <div className="stat-content">
            <h3>{stats.totalEmployees}</h3>
            <p>My Contacts</p>
          </div>
        </div>

        <div
          className="stat-card groups"
          onClick={() => handleTabChange('pending-approvals')}
          style={{ cursor: 'pointer' }}
        >
          <div className="stat-icon">
            <UserPlus size={32} />
          </div>
          <div className="stat-content">
            <h3>{stats.contactsByStatus?.pending ?? 0}</h3>
            <p>Pending Approvals</p>
          </div>
        </div>

        <div className="stat-card subscription">
          <div className="stat-icon">
            <UserCheck size={32} />
          </div>
          <div className="stat-content">
            <h3>Validity {new Date().toLocaleDateString()}</h3>
            <p>365 Days</p>
            <small>My Subscription</small>
          </div>
        </div>
      </div>
      {/* Middle Section with Attendance and Staff Info */}
      <div className="middle-section">
        <div className="attendance-card">
          <div className="attendance-header">
            <div className="tabs">
              <div className="tab active">Today's Attendance</div>
             
            </div>
            <div className="total-count">*Total Employees: {stats.totalEmployees + stats.contactsByStatus?.pending || 0}</div>
          </div>
          <div className="attendance-stats">
            <div className="stat-box">
              <span className="count">{stats.presentToday}</span>
              <span className="label">Today's Attendance</span>
            </div>
            <div className="stat-box">
              <span className="count">{stats.leave || 0}</span>
              <span className="label">Leaves</span>
            </div>
            <div className="stat-box">
              <span className="count">{stats.absentToday}</span>
              <span className="label">Total Absence</span>
            </div>
          </div>
        </div>
      </div>

    <div className="recent-attendance">
      <h3>Attendance Summary</h3>

      {/* Dropdown */}
      <select
        value={summaryType}
        onChange={(e) => {
          setSummaryType(e.target.value);
          fetchSummary(e.target.value);
        }}
        className='select-dropdown'
      >
        <option value="weekly">Weekly</option>
        <option value="monthly">Monthly</option>
      </select>

      <div className="attendance-table">
        <table>
          <thead>
            <tr>
              <th>Period</th>
              <th>Present</th>
              <th>Absent</th>
              <th>Halfday</th>
            </tr>
          </thead>
          <tbody>
            {summaryData.map((row, index) => (
              <tr key={index}>
                <td>{row.period}</td>
                <td>{row.present}</td>
                <td>{row.absent}</td>
                <td>{row.halfday}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
    </div>
  );

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
  <div 
    className={`admin-dashboard 
      ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'} 
      ${collapsed ? 'collapsed' : ''}`}
  >
    {/* Hamburger - mobile only */}
    <button className="mobile-menu-toggle" onClick={toggleSidebar}>
      {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
    </button>

 


    {/* Sidebar Overlay - only mobile */}
    {sidebarOpen && <div className="sidebar-overlay" onClick={closeSidebar}></div>}

    <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
     
     <div 
  className="sidebar-header logo-area"
  onClick={() => {
    // Collapse toggles only on desktop
    if (window.innerWidth > 768) setCollapsed(!collapsed);
  }}
  style={{ cursor: "pointer" }}
>
  <div className="logo-wrapper">
    {/* If you have a logo image */}
    {/* <img src={logo} alt="Admin Panel" className="admin-logo" /> */}

    {/* Fallback: Text Logo */}
    <div className="logo-circle"><Menu size={20} /></div>

    {!collapsed && (
      <div className="logo-text">
        <h2>Admin Panel</h2>
        <p>Management</p>
      </div>
    )}
  </div>
</div>


      <nav className="sidebar-nav">
        <ul>
          <li>
            <button 
              className={activeTab === 'dashboard' ? 'active' : ''} 
              onClick={() => handleTabChange('dashboard')}
              title="Dashboard"
            >
              <Building2 size={20} />
              {!collapsed && <span>Dashboard</span>}
            </button>
          </li>

          <li>
            <button 
              className={activeTab === 'employees' ? 'active' : ''} 
              onClick={() => handleTabChange('employees')}
              title="Employees"
            >
              <Users size={20} />
              {!collapsed && <span>Employees</span>}
            </button>
          </li>

          <li>
            <button 
              className={activeTab === 'pending-approvals' ? 'active' : ''} 
              onClick={() => handleTabChange('pending-approvals')}
              title="Pending Approvals"
            >
              <UserCheck size={20} />
              {!collapsed && <span>Pending Approvals</span>}
            </button>
          </li>

          <li>
            <button 
              className={activeTab === 'departments' ? 'active' : ''} 
              onClick={() => handleTabChange('departments')}
              title="Departments"
            >
              <Building2 size={20} />
              {!collapsed && <span>Departments</span>}
            </button>
          </li>

          <li>
            <button 
              className={activeTab === 'roles' ? 'active' : ''} 
              onClick={() => handleTabChange('roles')}
              title="Roles"
            >
              <UserPlus size={20} />
              {!collapsed && <span>Roles</span>}
            </button>
          </li>

          <li>
            <button 
              className={activeTab === 'shifts' ? 'active' : ''} 
              onClick={() => handleTabChange('shifts')}
              title="Shifts"
            >
              <Clock size={20} />
              {!collapsed && <span>Define Shift</span>}
            </button>
          </li>

          <li>
            <button 
              className={activeTab === 'notifications' ? 'active' : ''} 
              onClick={() => handleTabChange('notifications')}
              title="Notifications"
            >
              <Bell size={20} />
              {!collapsed && <span>Notifications</span>}
            </button>
          </li>

          <li>
            <button 
              className={activeTab === 'holidays' ? 'active' : ''} 
              onClick={() => handleTabChange('holidays')}
              title="Holidays"
            >
              <Calendar size={20} />
              {!collapsed && <span>Holidays</span>}
            </button>
          </li>

          <li>
            <button 
              className={activeTab === 'attendance-report' ? 'active' : ''} 
              onClick={() => handleTabChange('attendance-report')}
              title="Attendance Report"
            >
              <FileText size={20} />
              {!collapsed && <span>Attendance Report</span>}
            </button>
          </li>
        </ul>
      </nav>

      <div className="sidebar-footer">
        {!collapsed && (
          <>
            <div className="user-info">
              <p>{user?.name}</p>
              <small>{user?.email}</small>
            </div>
            <button className="logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </>
        )}
      </div>
    </div>

    <div className="main-content">{renderContent()}</div>
  </div>
);
};

export default AdminDashboard;