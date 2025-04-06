// Check if parent is logged in
function checkAuth() {
    const token = localStorage.getItem('parentToken');
    if (!token) {
        window.location.href = '/parent-login.html';
        return false;
    }
    return true;
}

// Update UI with parent name
function updateUI() {
    const parentName = localStorage.getItem('parentName');
    document.getElementById('parentName').textContent = parentName || 'Parent';
}

// Load student details
async function loadStudentDetails() {
    try {
        const parentId = localStorage.getItem('parentId');
        const response = await fetch(`/api/parents/${parentId}/students`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('parentToken')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            const studentDetails = document.getElementById('studentDetails');
            
            if (data.length > 0) {
                const student = data[0]; // Assuming one student for now
                studentDetails.innerHTML = `
                    <p><strong>Name:</strong> ${student.name}</p>
                    <p><strong>Student ID:</strong> ${student.student_id}</p>
                    <p><strong>Grade:</strong> ${student.grade}</p>
                `;
            } else {
                studentDetails.innerHTML = '<p>No student information found.</p>';
            }
        } else {
            throw new Error('Failed to load student details');
        }
    } catch (error) {
        console.error('Error loading student details:', error);
        document.getElementById('studentDetails').innerHTML = 
            '<p class="error-message">Error loading student information. Please try again later.</p>';
    }
}

// Load today's attendance
async function loadTodayAttendance() {
    try {
        const parentId = localStorage.getItem('parentId');
        const response = await fetch(`/api/parents/${parentId}/attendance/today`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('parentToken')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            const tableBody = document.getElementById('attendanceTableBody');
            
            if (data.length > 0) {
                tableBody.innerHTML = data.map(record => `
                    <tr>
                        <td>${new Date(record.time).toLocaleTimeString()}</td>
                        <td>
                            <span class="status-badge ${record.status === 'Checked In' ? 'status-in' : 'status-out'}">
                                ${record.status}
                            </span>
                        </td>
                        <td>${record.time_out ? 
                            `Left at ${new Date(record.time_out).toLocaleTimeString()}` : 
                            (record.status === 'Checked In' ? 'Currently at school' : 'Not at school')}</td>
                    </tr>
                `).join('');
            } else {
                tableBody.innerHTML = '<tr><td colspan="3">No attendance records for today.</td></tr>';
            }
        } else {
            throw new Error('Failed to load attendance');
        }
    } catch (error) {
        console.error('Error loading attendance:', error);
        document.getElementById('attendanceTableBody').innerHTML = 
            '<tr><td colspan="3" class="error-message">Error loading attendance records. Please try again later.</td></tr>';
    }
}

// Load notifications
async function loadNotifications() {
    try {
        const parentId = localStorage.getItem('parentId');
        const response = await fetch(`/api/parents/${parentId}/notifications`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('parentToken')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            const notificationsList = document.getElementById('notificationsList');
            
            if (data.length > 0) {
                notificationsList.innerHTML = data.map(notification => `
                    <div class="notification-item">
                        <div>${notification.message}</div>
                        <div class="notification-time">
                            ${new Date(notification.created_at).toLocaleString()}
                        </div>
                    </div>
                `).join('');
            } else {
                notificationsList.innerHTML = '<div class="notification-item">No new notifications.</div>';
            }
        } else {
            throw new Error('Failed to load notifications');
        }
    } catch (error) {
        console.error('Error loading notifications:', error);
        document.getElementById('notificationsList').innerHTML = 
            '<div class="notification-item error-message">Error loading notifications. Please try again later.</div>';
    }
}

// Handle logout
document.getElementById('logoutButton').addEventListener('click', () => {
    localStorage.removeItem('parentToken');
    localStorage.removeItem('parentId');
    localStorage.removeItem('parentName');
    window.location.href = '/parent-login.html';
});

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    if (!checkAuth()) return;
    
    updateUI();
    loadStudentDetails();
    loadTodayAttendance();
    loadNotifications();
    
    // Refresh data every minute
    setInterval(() => {
        loadTodayAttendance();
        loadNotifications();
    }, 60000);
}); 