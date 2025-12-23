import React from 'react';
import { Link } from 'react-router-dom';
import { Users, Shield, Clock, BarChart3 } from 'lucide-react';
import './HomePage.css';


const HomePage = () => {
  return (
    <div className="homepage">
      <header className="homepage-header">
        <div className="container">
          <div className="logo">
            <h1>Employee Management System</h1>
          </div>
          <nav className="main-nav">
            <Link to="/login" className="nav-link">
              <Shield size={20} />
              Login
            </Link>
          </nav>
        </div>
      </header>

      <main className="homepage-main">
        <section className="hero">
          <div className="container">
            <div className="hero-content">
              <h2>Streamline Your Workforce Management</h2>
              <p>
                Comprehensive employee management solution with attendance tracking, 
                biometric integration, and real-time reporting.
              </p>
              
              {/* these buttons are not required */}
              {/* <div className="hero-actions">
                <Link to="/admin/login" className="btn btn-primary">
                  Admin Dashboard
                </Link>
                <Link to="/manager/login" className="btn btn-primary">
                  Manager Portal
                </Link>
                <Link to="/employee/login" className="btn btn-primary">
                  Employee varun
                </Link>
              </div> */}
            </div>
            <div className="hero-image">
              {/* <div className="feature-grid">
                <div className="feature-card" >
                  <Users size={48} />
                  <h3>Employee Management</h3>
                  <p>Manage employee data, roles, and departments</p>
                </div>
                <div className="feature-card">
                  <Clock size={48} />
                  <h3>Attendance Tracking</h3>
                  <p>Real-time attendance with biometric integration</p>
                </div>
                <div className="feature-card">
                  <BarChart3 size={48} />
                  <h3>Analytics & Reports</h3>
                  <p>Comprehensive reporting and analytics</p>
                </div>
              </div> */}
              <div className="feature-grid">
                <Link to="/login" className="feature-card">
                  <Users size={48} />
                  <h3>Employee Management</h3>
                  <p>Manage employee data, roles, and departments</p>
                </Link>

                <Link to="/login" className="feature-card">
                  <Clock size={48} />
                  <h3>Attendance Tracking</h3>
                  <p>Real-time attendance with biometric integration</p>
                </Link>

                <Link to="/login" className="feature-card">
                  <BarChart3 size={48} />
                  <h3>Analytics & Reports</h3>
                  <p>Comprehensive reporting and analytics</p>
                </Link>
              </div>

            </div>
          </div>
        </section>

        <section className="features">
          <div className="container">
            <h2>Key Features</h2>
            <div className="features-grid">
              <div className="feature-item">
                <div className="feature-icon">
                  <Users size={32} />
                </div>
                <h3>Employee Management</h3>
                <p>Complete employee lifecycle management with profile management, role assignment, and department organization.</p>
              </div>
              
              <div className="feature-item">
                <div className="feature-icon">
                  <Clock size={32} />
                </div>
                <h3>Attendance System</h3>
                <p>Multi-modal attendance tracking including facial recognition, biometric, ID barcode, and password access.</p>
              </div>
              
              <div className="feature-item">
                <div className="feature-icon">
                  <Shield size={32} />
                </div>
                <h3>Admin Dashboard</h3>
                <p>Comprehensive admin panel with real-time statistics, employee management, and department/role configuration.</p>
              </div>
              
              <div className="feature-item">
                <div className="feature-icon">
                  <BarChart3 size={32} />
                </div>
                <h3>Employee Portal</h3>
                <p>Self-service portal for employees to view attendance, holidays, notifications, and manage their profile.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="login-section">
          <div className="container">
            <h2>Get Started</h2>
            <div className="login-options">
              <div className="login-card">
                <div className="login-icon">
                  <Shield size={48} />
                </div>
                <h3>Administrator</h3>
                <p>Access the admin dashboard to manage employees, departments, roles, and view comprehensive reports.</p>
                <Link to="/admin/login" className="btn btn-primary">
                  Admin Login
                </Link>
              </div>
              
              <div className="login-card">
                <div className="login-icon">
                  <BarChart3 size={48} />
                </div>
                <h3>Department Manager</h3>
                <p>Access your department portal to view your team's attendance, employee details, and generate reports.</p>
                <Link to="/manager/login" className="btn btn-primary">
                  Manager Login
                </Link>
              </div>
              
              <div className="login-card">
                <div className="login-icon">
                  <Users size={48} />
                </div>
                <h3>Employee</h3>
                <p>Access your personal portal to view attendance, holidays, notifications, and manage your profile.</p>
                <Link to="/employee/login" className="btn btn-primary">
                  Employee Login
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="homepage-footer">
        <div className="container">
          <p>&copy; 2025 Avniya Cloud Solutions PVT LTD. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;