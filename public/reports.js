// API Configuration
const API_BASE_URL = 'http://localhost:3000/api';

// Store attendance records
let attendanceRecords = [];

// Authentication functions
function checkAuth() {
    const token = localStorage.getItem('teacherToken');
    if (!token) {
        window.location.href = '/login.html';
        return false;
    }
    return true;
}

function logout() {
    localStorage.removeItem('teacherToken');
    localStorage.removeItem('teacherName');
    localStorage.removeItem('teacherId');
    window.location.href = '/login.html';
}

function updateUI() {
    const teacherName = localStorage.getItem('teacherName');
    if (teacherName) {
        document.getElementById('teacherName').textContent = teacherName;
        document.getElementById('logoutBtn').addEventListener('click', logout);
    } else {
        window.location.href = '/login.html';
    }
}

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    if (!checkAuth()) {
        return;
    }
    updateUI();

    // Set default date range (today)
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('startDate').value = today;
    document.getElementById('endDate').value = today;

    // Load initial data
    loadAttendanceData();

    // Add event listeners
    document.getElementById('startDate').addEventListener('change', loadAttendanceData);
    document.getElementById('endDate').addEventListener('change', loadAttendanceData);
    document.getElementById('gradeFilter').addEventListener('change', filterData);
    document.getElementById('statusFilter').addEventListener('change', filterData);
    document.getElementById('exportCSV').addEventListener('click', () => exportData('csv'));
    document.getElementById('exportPDF').addEventListener('click', () => exportData('pdf'));
});

async function loadAttendanceData() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    if (!startDate || !endDate) return;
    if (startDate > endDate) {
        alert('Start date cannot be after end date');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/attendance/range?start=${startDate}&end=${endDate}`);
        if (response.ok) {
            attendanceRecords = await response.json();
            filterData();
        } else {
            const data = await response.json();
            alert('Error loading attendance: ' + (data.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error loading attendance:', error);
        alert('Error loading attendance: ' + error.message);
    }
}

function filterData() {
    const gradeFilter = document.getElementById('gradeFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;

    let filteredRecords = [...attendanceRecords];

    if (gradeFilter) {
        filteredRecords = filteredRecords.filter(record => record.grade === gradeFilter);
    }
    if (statusFilter) {
        filteredRecords = filteredRecords.filter(record => record.status === statusFilter);
    }

    updateTable(filteredRecords);
    updateSummary(filteredRecords);
}

function updateTable(records) {
    const tableBody = document.getElementById('attendanceList');
    tableBody.innerHTML = '';

    records.forEach(record => {
        const checkInTime = new Date(record.time);
        const checkOutTime = record.time_out ? new Date(record.time_out) : null;
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${record.student_id}</td>
            <td>${record.name}</td>
            <td>${record.grade}</td>
            <td>${checkInTime.toLocaleDateString()}</td>
            <td>${checkInTime.toLocaleTimeString()} ${checkOutTime ? `- ${checkOutTime.toLocaleTimeString()}` : ''}</td>
            <td class="status-${record.status.toLowerCase()}">${record.status}</td>
        `;
        tableBody.appendChild(row);
    });
}

function updateSummary(records) {
    // Get unique students per day
    const studentDays = new Map(); // Map of "studentId-date" to status
    records.forEach(record => {
        const date = new Date(record.time).toLocaleDateString();
        const key = `${record.student_id}-${date}`;
        studentDays.set(key, record.status);
    });

    // Count statuses
    const totalStudents = new Set(records.map(r => r.student_id)).size;
    const presentCount = Array.from(studentDays.values()).filter(status => status === 'Present').length;
    const checkedInCount = Array.from(studentDays.values()).filter(status => status === 'Checked In').length;
    const absentCount = Array.from(studentDays.values()).filter(status => status === 'Absent').length;

    document.getElementById('totalStudents').textContent = totalStudents;
    document.getElementById('presentCount').textContent = presentCount;
    document.getElementById('lateCount').textContent = checkedInCount;
    document.getElementById('absentCount').textContent = absentCount;
}

function exportData(format) {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const gradeFilter = document.getElementById('gradeFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;

    let filteredRecords = [...attendanceRecords];
    if (gradeFilter) {
        filteredRecords = filteredRecords.filter(record => record.grade === gradeFilter);
    }
    if (statusFilter) {
        filteredRecords = filteredRecords.filter(record => record.status === statusFilter);
    }

    if (format === 'csv') {
        exportToCSV(filteredRecords, startDate, endDate);
    } else {
        exportToPDF(filteredRecords, startDate, endDate);
    }
}

function exportToCSV(records, startDate, endDate) {
    const headers = ['Student ID', 'Name', 'Grade', 'Date', 'Time', 'Status'];
    const rows = records.map(record => {
        const date = new Date(record.time);
        return [
            record.student_id,
            record.name,
            record.grade,
            date.toLocaleDateString(),
            date.toLocaleTimeString(),
            record.status
        ];
    });

    const csvContent = [
        headers.map(h => `"${h}"`).join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `attendance_${startDate}_to_${endDate}.csv`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function exportToPDF(records, startDate, endDate) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Add title and filters
    doc.setFontSize(16);
    doc.text('Attendance Report', 14, 15);
    doc.setFontSize(12);
    doc.text(`Date Range: ${startDate} to ${endDate}`, 14, 25);

    const gradeFilter = document.getElementById('gradeFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;
    let filterText = 'Filters: ';
    filterText += gradeFilter ? `Grade: ${gradeFilter}, ` : 'All Grades, ';
    filterText += statusFilter ? `Status: ${statusFilter}` : 'All Status';
    doc.text(filterText, 14, 35);

    // Add summary
    const totalStudents = new Set(records.map(r => r.student_id)).size;
    const presentCount = records.filter(r => r.status === 'Present').length;
    const lateCount = records.filter(r => r.status === 'Late').length;
    const absentCount = records.filter(r => r.status === 'Absent').length;

    doc.text('Summary:', 14, 45);
    doc.text(`Total Students: ${totalStudents}`, 20, 55);
    doc.text(`Present: ${presentCount}`, 20, 65);
    doc.text(`Late: ${lateCount}`, 20, 75);
    doc.text(`Absent: ${absentCount}`, 20, 85);

    // Add table
    const tableData = records.map(record => {
        const date = new Date(record.time);
        return [
            record.student_id,
            record.name,
            record.grade,
            date.toLocaleDateString(),
            date.toLocaleTimeString(),
            record.status
        ];
    });

    doc.autoTable({
        head: [['Student ID', 'Name', 'Grade', 'Date', 'Time', 'Status']],
        body: tableData,
        startY: 95,
        styles: { fontSize: 10 },
        headStyles: { fillColor: [44, 62, 80] }
    });

    doc.save(`attendance_${startDate}_to_${endDate}.pdf`);
} 