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

// Constants
const MAX_RECONNECT_ATTEMPTS = 5;
const MESSAGE_TIMEOUT = 3000; // 3 seconds
const REFRESH_INTERVAL = 5000; // 5 seconds

// Global WebSocket variable
let ws = null;
let reconnectAttempts = 0;
let reconnectTimeout = null;

function showMessage(message, type = 'info') {
    const messageContainer = document.getElementById('messageContainer');
    if (!messageContainer) {
        console.error('Message container not found');
        return;
    }

    const messageElement = document.createElement('div');
    messageElement.className = `message ${type}`;
    messageElement.textContent = message;

    messageContainer.innerHTML = '';
    messageContainer.appendChild(messageElement);

    // Auto-dismiss after 3 seconds
    setTimeout(() => {
        if (messageElement.parentNode === messageContainer) {
            messageContainer.removeChild(messageElement);
        }
    }, 3000);
}

function updateHardwareStatus(status) {
    const statusElement = document.getElementById('hardwareStatus');
    if (statusElement) {
        statusElement.textContent = status;
        statusElement.className = status === 'Connected' ? 'status-connected' : 'status-disconnected';
    }
}

function setupWebSocket() {
    if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) {
        console.log('WebSocket is already connected or connecting');
        return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;

    try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log('WebSocket connected');
            updateHardwareStatus(true);
            showMessage('Connected to hardware', 'success');
            reconnectAttempts = 0;
            if (reconnectTimeout) {
                clearTimeout(reconnectTimeout);
                reconnectTimeout = null;
            }
        };

        ws.onclose = () => {
            console.log('WebSocket disconnected');
            updateHardwareStatus(false);
            ws = null;

            if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000);
                reconnectTimeout = setTimeout(() => {
                    reconnectAttempts++;
                    setupWebSocket();
                }, delay);
            } else {
                showMessage('Connection lost. Please refresh the page.', 'error');
            }
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            showMessage('Connection error occurred', 'error');
        };

        ws.onmessage = handleWebSocketMessage;
    } catch (error) {
        console.error('Error setting up WebSocket:', error);
        showMessage('Failed to connect to hardware', 'error');
    }
}

function handleWebSocketMessage(event) {
    try {
        const data = JSON.parse(event.data);
        console.log('WebSocket message received:', data);

        if (data.type === 'scan') {
            if (!data.success) {
                // Handle error cases
                showMessage(data.message, 'error');
                updateHardwareStatus('Connected');
                return;
            }

            // Handle successful scan
            showMessage(data.message, 'success');
            updateHardwareStatus('Connected');
            
            // Refresh the latest scan data
            loadLatestScan();
            
            // Refresh attendance data if it's today's scan
            const scanDate = new Date(data.timestamp);
            const today = new Date();
            if (scanDate.toDateString() === today.toDateString()) {
                loadTodayAttendance();
            }
        } else if (data.type === 'error') {
            showMessage(data.message || 'An error occurred', 'error');
        }
    } catch (error) {
        console.error('Error handling WebSocket message:', error);
        showMessage('Error processing scan data', 'error');
    }
}

function updateLatestScan(data) {
    const studentElement = document.getElementById('latestStudent');
    const statusElement = document.getElementById('latestStatus');
    const timeElement = document.getElementById('latestTime');

    if (studentElement && statusElement && timeElement) {
        studentElement.textContent = data.studentName || '-';
        statusElement.textContent = data.status || '-';
        
        const timestamp = data.timestamp ? new Date(data.timestamp) : new Date();
        timeElement.textContent = timestamp.toLocaleString();
    }

    // Refresh attendance table if it exists
    loadTodayAttendance().catch(error => {
        console.error('Error refreshing attendance:', error);
    });
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
        console.log('Received attendance data:', data);

        // Update the latest scan display instead of trying to update a non-existent table
        if (data.length > 0) {
            const latestRecord = data[0];
            const latestStudent = document.getElementById('latestStudent');
            const latestStatus = document.getElementById('latestStatus');
            const latestTime = document.getElementById('latestTime');

            if (latestStudent) latestStudent.textContent = latestRecord.student_name || 'Unknown';
            if (latestStatus) latestStatus.textContent = latestRecord.time_out ? 'Checked Out' : 'Checked In';
            if (latestTime) {
                const timestamp = new Date(latestRecord.time_out || latestRecord.time);
                latestTime.textContent = timestamp.toLocaleTimeString();
            }
        }
    } catch (error) {
        console.error('Error loading attendance:', error);
        showError('Error loading attendance data: ' + error.message);
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

// Function to fetch and display latest scan data
async function loadLatestScan() {
    try {
        const parentId = localStorage.getItem('parentId');
        const token = localStorage.getItem('parentToken');
        
        if (!parentId || !token) {
            window.location.href = '/parent-login.html';
            return;
        }

        const response = await fetch(`/api/parents/${parentId}/latest-scan`, {
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
                if (latestStatus) latestStatus.textContent = 'Not Available';
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

        if (scanData && scanData.student) {
            if (latestStudent) latestStudent.textContent = scanData.student.name;
            if (latestStatus) latestStatus.textContent = scanData.status;
            if (latestTime) {
                const timestamp = new Date(scanData.timestamp);
                latestTime.textContent = timestamp.toLocaleTimeString();
            }
        } else {
            if (latestStudent) latestStudent.textContent = 'No recent scans';
            if (latestStatus) latestStatus.textContent = 'N/A';
            if (latestTime) latestTime.textContent = '-';
        }
    } catch (error) {
        console.error('Error loading latest scan:', error);
        const latestStudent = document.getElementById('latestStudent');
        const latestStatus = document.getElementById('latestStatus');
        const latestTime = document.getElementById('latestTime');
        
        if (latestStudent) latestStudent.textContent = 'Error';
        if (latestStatus) latestStatus.textContent = 'Error loading data';
        if (latestTime) latestTime.textContent = '-';
        
        showError('Error loading latest scan data');
    }
}

// Logout functionality
function logout() {
    localStorage.removeItem('parentId');
    localStorage.removeItem('parentToken');
    window.location.href = '/parent-login.html';
}

document.getElementById('logoutButton').addEventListener('click', logout);

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    if (!checkAuth()) {
        return;
    }

    try {
        setupWebSocket();
        loadInitialData();
        
        // Set up periodic refresh
        setInterval(() => {
            if (!document.hidden) {
                loadLatestScan().catch(error => {
                    console.error('Error refreshing latest scan:', error);
                });
            }
        }, REFRESH_INTERVAL);
    } catch (error) {
        console.error('Initialization error:', error);
        showMessage('Failed to initialize dashboard', 'error');
    }

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