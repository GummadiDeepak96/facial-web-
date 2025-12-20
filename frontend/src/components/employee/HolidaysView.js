import React, { useState, useEffect } from 'react';
import { employeeAPI } from '../../services/api';
import { CalendarDays, Gift } from 'lucide-react';
import { format } from 'date-fns';

const HolidaysView = () => {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState('');
  const [filteredHolidays, setFilteredHolidays] = useState([]);

  useEffect(() => {
    fetchHolidays();
  }, [selectedYear]);

  useEffect(() => {
    filterHolidaysByMonth();
  }, [holidays, selectedMonth]);

  const fetchHolidays = async () => {
    try {
      const response = await employeeAPI.getHolidays({ 
        year: selectedYear
      });
      setHolidays(response.data || []);
    } catch (error) {
      console.error('Failed to fetch holidays:', error);
      setHolidays([]);
    } finally {
      setLoading(false);
    }
  };

  const filterHolidaysByMonth = () => {
    if (!selectedMonth) {
      setFilteredHolidays(holidays);
    } else {
      const filtered = holidays.filter(holiday => {
        const holidayMonth = new Date(holiday.date_from).getMonth() + 1;
        return holidayMonth === parseInt(selectedMonth);
      });
      setFilteredHolidays(filtered);
    }
  };

  const isUpcoming = (dateFrom) => {
    return new Date(dateFrom) > new Date();
  };

  const isPast = (dateTo) => {
    return new Date(dateTo) < new Date();
  };

  const isToday = (dateFrom, dateTo) => {
    const today = new Date();
    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    return today >= from && today <= to;
  };

  if (loading) {
    return <div className="loading-spinner">Loading holidays...</div>;
  }

  return (
    <div className="holidays-view">
      <div className="holidays-header">
        <h3>Public Holidays</h3>
        <div className="date-selectors">
          <select 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="month-select"
          >
            <option value="">All Months</option>
            <option value="1">January</option>
            <option value="2">February</option>
            <option value="3">March</option>
            <option value="4">April</option>
            <option value="5">May</option>
            <option value="6">June</option>
            <option value="7">July</option>
            <option value="8">August</option>
            <option value="9">September</option>
            <option value="10">October</option>
            <option value="11">November</option>
            <option value="12">December</option>
          </select>
          <select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="year-select"
          >
            {Array.from({length: 3}, (_, i) => {
              const year = new Date().getFullYear() - 1 + i;
              return (
                <option key={year} value={year}>{year}</option>
              );
            })}
          </select>
        </div>
      </div>

      <div className="holidays-grid">
        {filteredHolidays.length > 0 ? (
          filteredHolidays.map((holiday) => {
            const dateFrom = new Date(holiday.date_from);
            const dateTo = new Date(holiday.date_to);
            const isSameDay = dateFrom.toDateString() === dateTo.toDateString();
            
            return (
              <div 
                key={holiday.id} 
                className={`holiday-card ${
                  isToday(holiday.date_from, holiday.date_to) ? 'today' :
                  isUpcoming(holiday.date_from) ? 'upcoming' : 'past'
                }`}
              >
                <div className="holiday-icon">
                  <Gift size={24} />
                </div>
                <div className="holiday-info">
                  <h4>{holiday.description}</h4>
                  <p className="holiday-date">
                    {isSameDay ? (
                      format(dateFrom, 'EEEE, MMMM dd, yyyy')
                    ) : (
                      `${format(dateFrom, 'MMM dd, yyyy')} - ${format(dateTo, 'MMM dd, yyyy')}`
                    )}
                  </p>
                  {isToday(holiday.date_from, holiday.date_to) && (
                    <span className="today-badge">Today</span>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="no-data">
            <CalendarDays size={48} />
            <p>No public holidays found {selectedMonth ? 'for selected month' : `for ${selectedYear}`}.</p>
          </div>
        )}
      </div>

      <div className="holidays-summary">
        <h4>Summary for {selectedYear}</h4>
        <div className="summary-stats">
          <div className="summary-item">
            <span className="count">{filteredHolidays.length}</span>
            <span className="label">{selectedMonth ? 'Filtered' : 'Total'} Holidays</span>
          </div>
          <div className="summary-item">
            <span className="count">
              {filteredHolidays.filter(h => isUpcoming(h.date_from)).length}
            </span>
            <span className="label">Upcoming</span>
          </div>
          <div className="summary-item">
            <span className="count">
              {filteredHolidays.filter(h => isPast(h.date_to)).length}
            </span>
            <span className="label">Past</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HolidaysView;