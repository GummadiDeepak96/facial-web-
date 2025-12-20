import React, { useState, useEffect } from "react";
import { adminAPI } from "../../services/api";
import { Calendar, Plus, Trash2 } from "lucide-react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import "./HolidayManagement.css";

const HolidayManagement = () => {

  // ---------------- STATE ----------------
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const [formData, setFormData] = useState({
    dateFrom: "",
    dateTo: "",
    description: "",
  });

  const [weeklyOffs, setWeeklyOffs] = useState({
    monday: { first: false, second: false, third: false, fourth: false, fifth: false },
    tuesday: { first: false, second: false, third: false, fourth: false, fifth: false },
    wednesday: { first: false, second: false, third: false, fourth: false, fifth: false },
    thursday: { first: false, second: false, third: false, fourth: false, fifth: false },
    friday: { first: false, second: false, third: false, fourth: false, fifth: false },
    saturday: { first: true, second: true, third: true, fourth: true, fifth: true },
    sunday: { first: true, second: true, third: true, fourth: true, fifth: true },
  });

  // ---------------- FETCH HOLIDAYS ----------------
  useEffect(() => {
    fetchHolidays();
  }, []);

  const fetchHolidays = async () => {
    try {
      const response = await adminAPI.getHolidays();
      const sorted = (response.data || []).sort(
        (a, b) => new Date(a.date_from) - new Date(b.date_from)
      );
      setHolidays(sorted);
    } catch (error) {
      console.error("Failed to fetch holidays:", error);
      setHolidays([]);
    } finally {
      setLoading(false);
    }
  };

  // ---------------- ADD HOLIDAY ----------------
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.dateFrom || !formData.dateTo || !formData.description) {
      alert("Please fill all fields");
      return;
    }

    try {
      await adminAPI.addHoliday({
        date_from: formData.dateFrom,
        date_to: formData.dateTo,
        description: formData.description,
      });

      alert("Holiday added successfully");

      setFormData({
        dateFrom: "",
        dateTo: "",
        description: "",
      });

      fetchHolidays();
    } catch (error) {
      console.error("Add holiday error:", error);
      alert(error.response?.data?.error || "Failed to add holiday");
    }
  };

  // ---------------- DELETE HOLIDAY ----------------
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this holiday?")) return;

    try {
      await adminAPI.deleteHoliday(id);
      alert("Holiday deleted successfully");
      fetchHolidays();
    } catch (error) {
      console.error("Delete error:", error);
      alert("Failed to delete holiday");
    }
  };

  // ---------------- WEEKLY OFF TABLE ----------------
  const handleWeeklyOffChange = (day, week) => {
    setWeeklyOffs((prev) => ({
      ...prev,
      [day]: { ...prev[day], [week]: !prev[day][week] },
    }));
  };

  const handleSaveWeeklyOffs = async () => {
    try {
      await adminAPI.saveWeeklyOffs(weeklyOffs);
      alert("Weekly offs saved successfully");
    } catch (error) {
      console.error("Save error:", error);
      alert("Failed to save weekly offs");
    }
  };

  // ---------------- WEEKLY OFF CALCULATIONS ----------------
  const getDayIndex = (day) =>
    ({
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    }[day]);

  const getDateForWeekAndDay = (year, month, weekNum, dayIndex) => {
    const first = new Date(year, month, 1);
    const firstIndex = first.getDay();
    const dateNum =
      1 + ((dayIndex - firstIndex + 7) % 7) + (weekNum - 1) * 7;

    const result = new Date(year, month, dateNum);
    if (result.getMonth() !== month) return null;
    return result;
  };

  // ---------------- BUILD CALENDAR EVENTS ----------------
  const buildCalendarEvents = () => {
    let events = [];

    // HOLIDAYS (Blue)
    holidays.forEach((h) => {
      events.push({
        title: h.description,
        start: h.date_from,
        end: h.date_to,
        color: "#1976d2",
      });
    });

    // WEEKLY OFFS (Red)
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth();

    const weekMap = {
      first: 1,
      second: 2,
      third: 3,
      fourth: 4,
      fifth: 5,
    };

    Object.keys(weeklyOffs).forEach((day) => {
      Object.keys(weekMap).forEach((order) => {
        if (weeklyOffs[day][order]) {
          const weekNum = weekMap[order];
          const dayIndex = getDayIndex(day);
          const date = getDateForWeekAndDay(y, m, weekNum, dayIndex);

          if (date) {
            events.push({
              title: "Weekly Off",
              start: date,
              color: "#ff4b4b",
            });
          }
        }
      });
    });

    return events;
  };

  const calendarEvents = buildCalendarEvents();

  // ---------------- PAGINATION ----------------
  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentHolidays = holidays.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(holidays.length / itemsPerPage);

  const handlePageChange = (num) => setCurrentPage(num);

  // ---------------- LOADING ----------------
  if (loading) return <div className="loading-spinner">Loading…</div>;

  // ---------------- RENDER ----------------
  return (
    <div className="holiday-management">
      
      <div className="page-header">
        <h2>
          <Calendar size={24} /> Holiday Calendar
        </h2>
      </div>

      <div className="holiday-content">
        
        {/* ---------------- ADD HOLIDAY FORM ---------------- */}
        <div className="holiday-form-section">
          <h3>Add Holiday</h3>

          <form onSubmit={handleSubmit}>
            <div className="date-range">
              <div className="form-group">
                <label>From:</label>
                <input
                  type="date"
                  value={formData.dateFrom}
                  onChange={(e) =>
                    setFormData({ ...formData, dateFrom: e.target.value })
                  }
                />
              </div>

              <div className="form-group">
                <label>To:</label>
                <input
                  type="date"
                  value={formData.dateTo}
                  onChange={(e) =>
                    setFormData({ ...formData, dateTo: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              ></textarea>
            </div>

            <button type="submit" className="btn-save">
              <Plus size={18} /> Save
            </button>
          </form>
        </div>

        {/* ---------------- WEEKLY OFF TABLE ---------------- */}
        <div className="weekly-off-section">
          <h3>Select Weekly Off</h3>

          <div className="weekly-table">
            <table>
              <thead>
                <tr>
                  <th>Day</th>
                  <th>1st</th>
                  <th>2nd</th>
                  <th>3rd</th>
                  <th>4th</th>
                  <th>5th</th>
                </tr>
              </thead>

              <tbody>
                {Object.keys(weeklyOffs).map((day) => (
                  <tr key={day}>
                    <td>{day.toUpperCase()}</td>

                    {["first", "second", "third", "fourth", "fifth"].map(
                      (week) => (
                        <td key={week}>
                          <input
                            type="checkbox"
                            checked={weeklyOffs[day][week]}
                            onChange={() => handleWeeklyOffChange(day, week)}
                          />
                        </td>
                      )
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button className="btn-save" onClick={handleSaveWeeklyOffs}>
            Save Weekly Offs
          </button>
        </div>
      </div>

      {/* ---------------- FULLCALENDAR ---------------- */}
      <div className="calendar-section" style={{ marginTop: "30px" }}>
        <h3>Company Calendar</h3>

        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          events={calendarEvents}
          height="550px"
          selectable={true}
          dateClick={(info) => alert("Clicked: " + info.dateStr)}
          eventClick={(info) => alert("Event: " + info.event.title)}
        />
      </div>

      {/* ---------------- HOLIDAY LIST ---------------- */}
      <div className="holiday-list-container">
        <h2>Recent Holidays</h2>

        {holidays.length > 0 ? (
          <>
            <div className="holidays-table">
              <table>
                <thead>
                  <tr>
                    <th>From</th>
                    <th>To</th>
                    <th>Description</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {currentHolidays.map((h) => (
                    <tr key={h.id}>
                      <td>{new Date(h.date_from).toLocaleDateString()}</td>
                      <td>{new Date(h.date_to).toLocaleDateString()}</td>
                      <td>{h.description}</td>
                      <td>
                        <button
                          className="btn-delete-icon"
                          onClick={() => handleDelete(h.id)}
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination">
                <button
                  className="pagination-btn"
                  disabled={currentPage === 1}
                  onClick={() => handlePageChange(currentPage - 1)}
                >
                  Prev
                </button>

                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i}
                    className={`pagination-btn ${
                      currentPage === i + 1 ? "active" : ""
                    }`}
                    onClick={() => handlePageChange(i + 1)}
                  >
                    {i + 1}
                  </button>
                ))}

                <button
                  className="pagination-btn"
                  disabled={currentPage === totalPages}
                  onClick={() => handlePageChange(currentPage + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </>
        ) : (
          <p className="no-data">No holidays found</p>
        )}
      </div>
    </div>
  );
};

export default HolidayManagement;
