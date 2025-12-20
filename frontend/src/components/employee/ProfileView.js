import React, { useState, useEffect } from 'react';
import { employeeAPI } from '../../services/api';
import { User, Mail, Building, Briefcase, Calendar } from 'lucide-react';

const ProfileView = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await employeeAPI.getProfile();
      setProfile(response.data);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading-spinner">Loading profile...</div>;
  }

  if (!profile) {
    return <div className="error-message">Failed to load profile</div>;
  }

  return (
    <div className="profile-view">
      <div className="profile-card">
        <div className="profile-header">
          <div className="profile-photo">
            {profile.photograph ? (
              <img 
                src={`http://localhost:8080${profile.photograph}`} 
                alt={profile.name}
              />
            ) : (
              <div className="no-photo">
                <User size={40} />
              </div>
            )}
          </div>
          <div className="profile-info">
            <h2>{profile.name}</h2>
            <p className="employee-id">Employee ID: {profile.person_id}</p>
          </div>
        </div>

        <div className="profile-details">
          <div className="profile-details-grid">
            <div className="detail-item">
              <div className="detail-icon">
                <Mail size={20} />
              </div>
              <div className="detail-content">
                <label>Email</label>
                <span>{profile.email}</span>
              </div>
            </div>

            <div className="detail-item">
              <div className="detail-icon">
                <Building size={20} />
              </div>
              <div className="detail-content">
                <label>Department</label>
                <span>{profile.departmentname}</span>
              </div>
            </div>

            <div className="detail-item">
              <div className="detail-icon">
                <Briefcase size={20} />
              </div>
              <div className="detail-content">
                <label>Role</label>
                <span>{profile.rolename}</span>
              </div>
            </div>

            <div className="detail-item">
              <div className="detail-icon">
                <Calendar size={20} />
              </div>
              <div className="detail-content">
                <label>Joined Date</label>
                <span>{new Date(profile.created_date).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileView;