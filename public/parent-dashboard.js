// Check if parent is logged in
function checkAuth() {
    const token = localStorage.getItem('parentToken');
    const parentId = localStorage.getItem('parentId');
    if (!token || !parentId) {
        window.location.href = '/parent-login.html';
        return false;
    }
    return true;
}

// Update UI with parent name
function updateUI() {
    const parentName = localStorage.getItem('parentName');
    const headerParentName = document.getElementById('headerParentName');
    const welcomeParentName = document.getElementById('welcomeParentName');
    
    if (headerParentName) {
        headerParentName.textContent = parentName || 'Parent';
    }
    if (welcomeParentName) {
        welcomeParentName.textContent = parentName || 'Parent';
    }
}

let ws;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;
const reconnectDelay = 3000; // 3 seconds

function setupWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;

    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        console.log('WebSocket connected');
        reconnectAttempts = 0;
        hideError();
        // Load initial data once connected
        loadInitialData();
    };

    ws.onclose = () => {
        if (reconnectAttempts < maxReconnectAttempts) {
            setTimeout(setupWebSocket, reconnectDelay);
            reconnectAttempts++;
        }
    };

    ws.onerror = () => {
        console.error('WebSocket error occurred');
    };

    ws.onmessage = (event) => {
        handleWebSocketMessage(event.data);
    };
}

// Load all initial data
function loadInitialData() {
    loadStudentDetails();
    loadNotifications();
    loadLatestScan();
}

// Show error message
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    const existingError = document.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }
    document.body.insertBefore(errorDiv, document.body.firstChild);
}

// Hide error message
function hideError() {
    const errorDiv = document.querySelector('.error-message');
    if (errorDiv) {
        errorDiv.remove();
    }
}

// Load student details
async function loadStudentDetails() {
    try {
        const parentId = localStorage.getItem('parentId');
        const token = localStorage.getItem('parentToken');
        
        if (!parentId || !token) {
            window.location.href = '/parent-login.html';
            return;
        }

        const response = await fetch(`/api/parents/${parentId}/students`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = '/parent-login.html';
                return;
            }
            throw new Error('Failed to load student details');
        }

        const data = await response.json();
        const studentDetails = document.getElementById('studentDetails');
        
        if (data.length > 0) {
            const student = data[0];
            studentDetails.innerHTML = `
                <p><strong>Name:</strong> ${student.name}</p>
                <p><strong>Student ID:</strong> ${student.student_id}</p>
                <p><strong>Grade:</strong> ${student.grade}</p>
            `;
        } else {
            studentDetails.innerHTML = '<p>No student information found.</p>';
        }
    } catch (error) {
        const studentDetails = document.getElementById('studentDetails');
        studentDetails.innerHTML = 
            '<p class="error-message">Error loading student information. Please try again later.</p>';
    }
}

// Load today's attendance
async function loadTodayAttendance() {
    try {
        const parentId = localStorage.getItem('parentId');
        const token = localStorage.getItem('parentToken');
        
        if (!parentId || !token) {
            throw new Error('Authentication required');
        }

        const response = await fetch(`/api/parents/${parentId}/attendance/today`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = '/parent-login.html';
                return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Received attendance data:', JSON.stringify(data, null, 2));

        const tableBody = document.getElementById('attendanceTableBody');
        if (!tableBody) {
            console.error('Table body not found');
            return;
        }

        if (!data || !Array.isArray(data) || data.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="3">No attendance records found for today</td></tr>';
            return;
        }

        const rows = data.map(record => {
            const time = record.time ? new Date(record.time).toLocaleTimeString() : '-';
            let status, details;
            
            if (record.time_out) {
                status = '<span class="status status-out">Checked Out</span>';
                details = `Check-out time: ${new Date(record.time_out).toLocaleTimeString()}`;
            } else {
                status = '<span class="status status-in">Present</span>';
                details = '-';
            }
            
            return `
                <tr data-student-id="${record.student_id}">
                    <td>${time}</td>
                    <td>${status}</td>
                    <td>${details}</td>
                </tr>
            `;
        });

        tableBody.innerHTML = rows.join('');
        
        // Update last scan info
        document.getElementById('lastScanTime').textContent = data[0]?.time ? 
            new Date(data[0].time).toLocaleTimeString() : '-';
        document.getElementById('lastStudent').textContent = data[0]?.student_name || '-';
        
        console.log('Updated attendance table with rows:', rows);
    } catch (error) {
        console.error('Error loading attendance:', error);
        const tableBody = document.getElementById('attendanceTableBody');
        if (tableBody) {
            tableBody.innerHTML = `<tr><td colspan="3">Error loading attendance data: ${error.message}</td></tr>`;
        }
    }
}

// Load notifications
async function loadNotifications() {
    try {
        const parentId = localStorage.getItem('parentId');
        const token = localStorage.getItem('parentToken');
        
        if (!parentId || !token) {
            window.location.href = '/parent-login.html';
            return;
        }

        const response = await fetch(`/api/parents/${parentId}/notifications`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = '/parent-login.html';
                return;
            }
            throw new Error('Failed to load notifications');
        }

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
    } catch (error) {
        const notificationsList = document.getElementById('notificationsList');
        notificationsList.innerHTML = 
            '<div class="notification-item error-message">Error loading notifications. Please try again later.</div>';
    }
}

// Handle WebSocket messages
function handleWebSocketMessage(data) {
    try {
        const message = JSON.parse(data);
        if (message.type === 'scan') {
            updateLatestScan(message);
        }
    } catch (error) {
        showError('Error processing message from server');
    }
}

// Update the latest scan display
function updateLatestScan(scanData) {
    const latestStudent = document.getElementById('latestStudent');
    const latestStatus = document.getElementById('latestStatus');
    const latestTime = document.getElementById('latestTime');
    
    if (scanData && scanData.student) {
        if (latestStudent) latestStudent.textContent = scanData.student.name;
        if (latestStatus) {
            latestStatus.textContent = scanData.status;
            latestStatus.className = `status status-${scanData.status.toLowerCase().includes('in') ? 'in' : 'out'}`;
        }
        if (latestTime) {
            const timestamp = new Date(scanData.timestamp);
            latestTime.textContent = timestamp.toLocaleTimeString() + ' ' + timestamp.toLocaleDateString();
        }
    }
}

// Function to fetch and display latest scan data
async function loadLatestScan() {
    try {
        const parentId = localStorage.getItem('parentId');
        const token = localStorage.getItem('parentToken');
        
        if (!parentId || !token) {
            window.location.href = '/parent-login.html';
            return;
        }

        const response = await fetch('/api/latest-scan', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = '/parent-login.html';
                return;
            }
            if (response.status === 404) {
                // Handle 404 specifically
                const latestStudent = document.getElementById('latestStudent');
                const latestStatus = document.getElementById('latestStatus');
                const latestTime = document.getElementById('latestTime');
                
                if (latestStudent) latestStudent.textContent = 'No Data';
                if (latestStatus) {
                    latestStatus.className = 'status';
                    latestStatus.textContent = 'Not Available';
                }
                if (latestTime) latestTime.textContent = '-';
                return;
            }
            throw new Error(`Failed to fetch latest scan data: ${response.status}`);
        }

        const scanData = await response.json();

        // Get all the elements we need to update
        const latestStudent = document.getElementById('latestStudent');
        const latestStatus = document.getElementById('latestStatus');
        const latestTime = document.getElementById('latestTime');
        const latestScanInfo = document.getElementById('latestScanInfo');

        // Make sure latestScanInfo is visible
        if (latestScanInfo) {
            latestScanInfo.style.display = 'block';
        }

        if (scanData && scanData.student) {
            if (latestStudent) {
                latestStudent.textContent = scanData.student.name;
            }
            
            if (latestStatus) {
                latestStatus.className = 'status';
                const statusClass = scanData.status.toLowerCase().includes('in') ? 'status-in' : 'status-out';
                latestStatus.classList.add(statusClass);
                latestStatus.textContent = scanData.status;
            }
            
            if (latestTime) {
                const timestamp = new Date(scanData.timestamp);
                latestTime.textContent = timestamp.toLocaleTimeString() + ' ' + timestamp.toLocaleDateString();
            }
        } else {
            if (latestStudent) latestStudent.textContent = 'No recent scans';
            if (latestStatus) {
                latestStatus.className = 'status';
                latestStatus.textContent = 'N/A';
            }
            if (latestTime) latestTime.textContent = '-';
        }
    } catch (error) {
        const latestStudent = document.getElementById('latestStudent');
        const latestStatus = document.getElementById('latestStatus');
        const latestTime = document.getElementById('latestTime');
        
        if (latestStudent) latestStudent.textContent = 'Error';
        if (latestStatus) {
            latestStatus.className = 'status';
            latestStatus.textContent = 'Error loading data';
        }
        if (latestTime) latestTime.textContent = '-';
        
        showError('Error loading latest scan data');
    }
}

// Wait for DOM to be fully loaded before initializing
document.addEventListener('DOMContentLoaded', () => {
    // Set up WebSocket connection
    setupWebSocket();

    // Load initial data
    loadInitialData();

    // Set up periodic refresh
    setInterval(loadLatestScan, 5000); // Refresh every 5 seconds

    // Handle logout
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            if (ws) {
                ws.close();
            }
            localStorage.removeItem('parentToken');
            localStorage.removeItem('parentId');
            localStorage.removeItem('parentName');
            window.location.href = '/parent-login.html';
        });
    }
}); 