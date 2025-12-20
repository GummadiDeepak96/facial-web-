import React, { useState, useEffect } from 'react';
import { employeeAPI } from '../../services/api';
import { toast } from 'react-toastify';
import { Bell, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { format } from 'date-fns';

const NotificationsView = ({ onNotificationUpdate }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const notificationsPerPage = 10;

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await employeeAPI.getNotifications();
      setNotifications(response.data.notifications || []);
      if (onNotificationUpdate) {
        onNotificationUpdate(response.data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await employeeAPI.markNotificationRead(notificationId);
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, is_read: 1 }
            : notification
        )
      );
      
      if (onNotificationUpdate) {
        onNotificationUpdate();
      }
      
      toast.success('Notification marked as read');
    } catch (error) {
      toast.error('Failed to mark notification as read');
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'sms':
        return <Bell size={20} className="notification-icon info" />;
      case 'note':
        return <Info size={20} className="notification-icon info" />;
      default:
        return <Info size={20} className="notification-icon info" />;
    }
  };

  // Calculate pagination
  const indexOfLastNotification = currentPage * notificationsPerPage;
  const indexOfFirstNotification = indexOfLastNotification - notificationsPerPage;
  const currentNotifications = notifications.slice(indexOfFirstNotification, indexOfLastNotification);
  const totalPages = Math.ceil(notifications.length / notificationsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return <div className="loading-spinner">Loading notifications...</div>;
  }

  return (
    <div className="notifications-view">
      <div className="notifications-header">
        <h3>Notifications</h3>
        <div className="notifications-count">
          {notifications.filter(n => !n.is_read).length} unread
        </div>
      </div>

      <div className="notifications-list notifications-grid">
        {currentNotifications.length > 0 ? (
          currentNotifications.map((notification) => (
            <div 
              key={notification.id} 
              className={`notification-item ${!notification.is_read ? 'unread' : 'read'}`}
            >
              <div className="notification-content">
                <div className="notification-header">
                  {getNotificationIcon(notification.notification_type)}
                  <h4>{notification.subject}</h4>
                  {!notification.is_read && <span className="unread-dot"></span>}
                </div>
                <p className="notification-message">{notification.message}</p>
                {notification.url_link && (
                  <div className="notification-link">
                    <a href={notification.url_link} target="_blank" rel="noopener noreferrer">
                      🔗 {notification.url_link}
                    </a>
                  </div>
                )}
                <div className="notification-footer">
                  <span className="notification-date">
                    {format(new Date(notification.created_at), 'MMM dd, yyyy HH:mm')}
                  </span>
                  {!notification.is_read && (
                    <button 
                      className="mark-read-btn"
                      onClick={() => markAsRead(notification.id)}
                    >
                      Mark as read
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="no-data">
            <Bell size={48} />
            <p>No notifications available.</p>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="pagination-btn"
          >
            Previous
          </button>
          <div className="pagination-numbers">
            {[...Array(totalPages)].map((_, index) => (
              <button
                key={index + 1}
                onClick={() => handlePageChange(index + 1)}
                className={`pagination-number ${currentPage === index + 1 ? 'active' : ''}`}
              >
                {index + 1}
              </button>
            ))}
          </div>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="pagination-btn"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationsView;