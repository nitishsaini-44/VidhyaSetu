import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { FiDownload, FiCalendar, FiTrendingUp, FiUsers } from 'react-icons/fi';

const ManagementReports = () => {
  const [attendanceData, setAttendanceData] = useState([]);
  const [performanceData, setPerformanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState('');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  const classes = ['9-A', '9-B', '10-A', '10-B', '11-A', '11-B', '12-A', '12-B'];

  useEffect(() => {
    fetchReportData();
  }, [selectedClass, dateRange]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      let attendanceUrl = `/attendance?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`;
      if (selectedClass) attendanceUrl += `&class_id=${selectedClass}`;

      const [attendanceRes] = await Promise.all([
        api.get(attendanceUrl)
      ]);

      setAttendanceData(attendanceRes.data);

      // Process attendance by date - handle the nested records structure
      const byDate = {};
      attendanceRes.data.forEach(attendance => {
        const dateKey = new Date(attendance.date).toISOString().split('T')[0];
        
        if (!byDate[dateKey]) {
          byDate[dateKey] = { present: 0, absent: 0, late: 0, excused: 0, total: 0 };
        }
        
        // Check if attendance has summary object (pre-calculated stats)
        if (attendance.summary && attendance.summary.totalStudents > 0) {
          byDate[dateKey].present += attendance.summary.present || 0;
          byDate[dateKey].absent += attendance.summary.absent || 0;
          byDate[dateKey].late += attendance.summary.late || 0;
          byDate[dateKey].excused += attendance.summary.excused || 0;
          byDate[dateKey].total += attendance.summary.totalStudents || 0;
        } 
        // Otherwise, process individual records array
        else if (attendance.records && attendance.records.length > 0) {
          attendance.records.forEach(record => {
            const status = record.status?.toLowerCase();
            if (status === 'present') byDate[dateKey].present++;
            else if (status === 'absent') byDate[dateKey].absent++;
            else if (status === 'late') byDate[dateKey].late++;
            else if (status === 'excused') byDate[dateKey].excused++;
            byDate[dateKey].total++;
          });
        }
        // Handle flat attendance structure (for student view)
        else if (attendance.status) {
          const status = attendance.status.toLowerCase();
          if (status === 'present') byDate[dateKey].present++;
          else if (status === 'absent') byDate[dateKey].absent++;
          else if (status === 'late') byDate[dateKey].late++;
          else if (status === 'excused') byDate[dateKey].excused++;
          byDate[dateKey].total++;
        }
      });

      setPerformanceData(Object.entries(byDate).map(([date, stats]) => ({
        date,
        ...stats,
        percentage: stats.total > 0 ? Math.round(((stats.present + stats.late) / stats.total) * 100) : 0
      })).sort((a, b) => new Date(b.date) - new Date(a.date)));

    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (performanceData.length === 0) return;

    const headers = ['Date', 'Present', 'Absent', 'Late', 'Total', 'Attendance %'];
    const rows = performanceData.map(row => [
      row.date,
      row.present,
      row.absent,
      row.late,
      row.total,
      row.percentage + '%'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_report_${selectedClass || 'all'}_${dateRange.startDate}_${dateRange.endDate}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading reports...</p>
      </div>
    );
  }

  // Calculate summary stats
  const summaryStats = performanceData.reduce((acc, day) => ({
    totalPresent: acc.totalPresent + day.present,
    totalAbsent: acc.totalAbsent + day.absent,
    totalLate: acc.totalLate + day.late,
    totalRecords: acc.totalRecords + day.total
  }), { totalPresent: 0, totalAbsent: 0, totalLate: 0, totalRecords: 0 });

  const overallPercentage = summaryStats.totalRecords > 0
    ? Math.round(((summaryStats.totalPresent + summaryStats.totalLate) / summaryStats.totalRecords) * 100)
    : 0;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Reports & Analytics</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            View and export attendance and performance reports
          </p>
        </div>
        <button className="btn btn-primary" onClick={exportToCSV} disabled={performanceData.length === 0}>
          <FiDownload /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-body">
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Class</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                style={{ padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)', minWidth: '150px' }}
              >
                <option value="">All Classes</option>
                {classes.map(cls => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Start Date</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                style={{ padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>End Date</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                style={{ padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="dashboard-grid">
        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon primary">
              <FiCalendar size={24} />
            </div>
          </div>
          <div className="stat-value">{overallPercentage}%</div>
          <div className="stat-label">Overall Attendance</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon success">
              <FiUsers size={24} />
            </div>
          </div>
          <div className="stat-value">{summaryStats.totalPresent}</div>
          <div className="stat-label">Total Present</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon danger">
              <FiUsers size={24} />
            </div>
          </div>
          <div className="stat-value">{summaryStats.totalAbsent}</div>
          <div className="stat-label">Total Absent</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon warning">
              <FiTrendingUp size={24} />
            </div>
          </div>
          <div className="stat-value">{performanceData.length}</div>
          <div className="stat-label">Days Recorded</div>
        </div>
      </div>

      {/* Daily Breakdown Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Daily Attendance Breakdown</h3>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {performanceData.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📊</div>
              <p className="empty-state-text">No attendance data for selected period</p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Present</th>
                    <th>Absent</th>
                    <th>Late</th>
                    <th>Total</th>
                    <th>Attendance %</th>
                  </tr>
                </thead>
                <tbody>
                  {performanceData.map((row) => (
                    <tr key={row.date}>
                      <td>{row.date}</td>
                      <td>
                        <span className="badge badge-success">{row.present}</span>
                      </td>
                      <td>
                        <span className="badge badge-danger">{row.absent}</span>
                      </td>
                      <td>
                        <span className="badge badge-warning">{row.late}</span>
                      </td>
                      <td>{row.total}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{
                            width: '100px',
                            height: '8px',
                            background: 'var(--border-color)',
                            borderRadius: '4px',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              width: `${row.percentage}%`,
                              height: '100%',
                              background: row.percentage >= 80 ? 'var(--secondary-color)' :
                                         row.percentage >= 60 ? 'var(--warning-color)' : 'var(--danger-color)'
                            }} />
                          </div>
                          <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>{row.percentage}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManagementReports;
