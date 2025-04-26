// Dean Francis Tolero
// API Configuration
const API_BASE_URL = 'http://localhost:3000/api';

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
    const openLoginModalBtn = document.getElementById('openLoginModal');
    const userInfo = document.querySelector('.user-info');
    const logoutBtn = document.getElementById('logoutBtn');

    if (teacherName) {
        document.getElementById('teacherName').textContent = teacherName;
        openLoginModalBtn.style.display = 'none';
        userInfo.style.display = 'flex';
        logoutBtn.addEventListener('click', logout);
    } else {
        openLoginModalBtn.style.display = 'block';
        userInfo.style.display = 'none';
    }
}

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    if (!checkAuth()) {
        return;
    }
    updateUI();
    loadTodayAttendance();
});

// Store attendance records
let attendanceRecords = [];

// Function to handle RFID scan
async function handleRFIDScan(studentId) {
    try {
        const response = await fetch('/api/scan', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ studentId })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to process scan');
        }

        const data = await response.json();
        
        // Update the latest scan display
        const latestScanDisplay = document.getElementById('latestScanDisplay');
        if (latestScanDisplay) {
            latestScanDisplay.innerHTML = `
                <p><strong>Student:</strong> ${data.studentName}</p>
                <p><strong>Status:</strong> ${data.status}</p>
                <p><strong>Time:</strong> ${new Date(data.timestamp).toLocaleTimeString()}</p>
            `;
        }

        // Play success sound
        const successSound = new Audio('/sounds/success.mp3');
        successSound.play().catch(err => console.warn('Could not play sound:', err));

        // Show success message
        showMessage('Scan processed successfully', 'success');

        // Refresh attendance table if it exists
        const attendanceTable = document.getElementById('attendanceTable');
        if (attendanceTable) {
            loadTodayAttendance();
        }

    } catch (error) {
        console.error('Scan error:', error);
        showMessage(error.message || 'Error processing scan', 'error');
        
        // Play error sound
        const errorSound = new Audio('/sounds/error.mp3');
        errorSound.play().catch(err => console.warn('Could not play sound:', err));
    }
}

// Helper function to show messages
function showMessage(message, type = 'info') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `alert alert-${type}`;
    messageDiv.textContent = message;
    
    // Find or create message container
    let messageContainer = document.getElementById('messageContainer');
    if (!messageContainer) {
        messageContainer = document.createElement('div');
        messageContainer.id = 'messageContainer';
        messageContainer.style.position = 'fixed';
        messageContainer.style.top = '20px';
        messageContainer.style.right = '20px';
        messageContainer.style.zIndex = '1000';
        document.body.appendChild(messageContainer);
    }
    
    messageContainer.appendChild(messageDiv);
    
    // Remove message after 3 seconds
    setTimeout(() => {
        messageDiv.remove();
        if (messageContainer.children.length === 0) {
            messageContainer.remove();
        }
    }, 3000);
}

// Update the attendance table
function updateAttendanceTable() {
    const tableBody = document.getElementById('attendanceTableBody');
    if (!tableBody) {
        console.error('Attendance table body not found');
        return;
    }
    
    // Clear existing rows
    tableBody.innerHTML = '';
    
    // Add new rows
    attendanceRecords.forEach(record => {
        const row = document.createElement('tr');
        const status = record.status || (record.time_out ? 'Checked Out' : 'Checked In');
        const statusClass = `status-${status.toLowerCase().replace(/\s+/g, '-')}`;
        
        row.innerHTML = `
            <td>${record.student_id}</td>
            <td>${record.name}</td>
            <td>${record.grade}</td>
            <td>${new Date(record.time).toLocaleTimeString()}</td>
            <td>${record.time_out ? new Date(record.time_out).toLocaleTimeString() : '-'}</td>
            <td><span class="${statusClass}">${status}</span></td>
        `;
        tableBody.appendChild(row);
    });
}

// Update last scan information
function updateLastScan(studentName, time, status) {
    document.getElementById('lastScanTime').textContent = new Date(time).toLocaleTimeString();
    document.getElementById('lastStudent').textContent = `${studentName} (${status})`;
}

// Send notification to parents
function sendParentNotification(student) {
    console.log(`SMS sent to ${student.parent_phone}: Your child ${student.name} has arrived at school at ${new Date().toLocaleTimeString()}`);
}

// Load today's attendance
async function loadTodayAttendance() {
    try {
        console.log('Fetching today\'s attendance...');
        const response = await fetch(`${API_BASE_URL}/attendance/today`);
        const data = await response.json();
        
        if (!response.ok) {
            console.error('Server error:', data);
            throw new Error(`HTTP error! status: ${response.status}, message: ${data.message || 'Unknown error'}`);
        }

        // Clear the existing records array
        attendanceRecords = [];
        // Load new records from the server
        attendanceRecords = data;
        updateAttendanceTable();
    } catch (error) {
        console.error('Error loading attendance:', error);
        if (error.message.includes('Failed to fetch')) {
            alert('Cannot connect to the server. Please check if the server is running.');
        } else {
            alert('Error loading attendance: ' + error.message);
        }
    }
}

// Battery and Solar Panel Simulation
let batteryLevel = 100;
let isCharging = false;
let lastUpdateTime = Date.now();

function updateBatteryStatus() {
    const batteryLevelElement = document.querySelector('.battery-level');
    const solarStatusElement = document.getElementById('solarStatus');
    const batterySlider = document.getElementById('batteryLevel');
    const batteryValue = document.getElementById('batteryValue');
    
    // Add null checks for required elements
    if (!batteryLevelElement || !solarStatusElement || !batterySlider || !batteryValue) {
        return; // Exit if any required element is missing
    }

    // Update battery level based on solar status
    const currentTime = Date.now();
    const timeDiff = (currentTime - lastUpdateTime) / 1000;
    lastUpdateTime = currentTime;

    const solarStatus = solarStatusElement.value;
    
    if (solarStatus === 'charging') {
        batteryLevel = Math.min(100, batteryLevel + (timeDiff * 0.1));
        isCharging = true;
    } else if (solarStatus === 'not-charging') {
        batteryLevel = Math.max(0, batteryLevel - (timeDiff * 0.033));
        isCharging = false;
    } else if (solarStatus === 'fault') {
        batteryLevel = Math.max(0, batteryLevel - (timeDiff * 0.067));
        isCharging = false;
    }

    const roundedLevel = Math.round(batteryLevel);
    batteryLevelElement.textContent = `${roundedLevel}%`;
    batterySlider.value = roundedLevel;
    batteryValue.textContent = `${roundedLevel}%`;

    if (roundedLevel > 50) {
        batteryLevelElement.style.backgroundColor = 'var(--success-color)';
    } else if (roundedLevel > 20) {
        batteryLevelElement.style.backgroundColor = 'var(--warning-color)';
    } else {
        batteryLevelElement.style.backgroundColor = 'var(--danger-color)';
    }

    const solarIndicator = document.querySelector('.status-indicator.charging');
    if (solarIndicator) {
        solarIndicator.style.backgroundColor = isCharging ? 'var(--success-color)' : 'var(--warning-color)';
    }
}

// Initialize the system
document.addEventListener('DOMContentLoaded', async () => {
    if (!checkAuth()) {
        return;
    }
    updateUI();
    
    // Start battery simulation
    setInterval(updateBatteryStatus, 1000);

    // Handle battery slider changes
    const batteryLevelSlider = document.getElementById('batteryLevel');
    const batteryValueDisplay = document.getElementById('batteryValue');
    if (batteryLevelSlider) {
        batteryLevelSlider.addEventListener('input', function() {
            batteryLevel = parseInt(this.value);
            if (batteryValueDisplay) {
                batteryValueDisplay.textContent = `${batteryLevel}%`;
            }
        });
    }

    // Handle solar status changes
    const solarStatusElement = document.getElementById('solarStatus');
    if (solarStatusElement) {
        solarStatusElement.addEventListener('change', updateBatteryStatus);
    }

    // Modal elements
    const modal = document.getElementById('addStudentModal');
    const openModalBtn = document.getElementById('addStudentBtn');
    const closeModalBtn = document.getElementById('closeModal');
    const addStudentForm = document.getElementById('addStudentForm');
    const messageDiv = document.getElementById('message');
    const loginModal = document.getElementById('loginModal');
    const openLoginModalBtn = document.getElementById('openLoginModal');
    const closeLoginModalBtn = document.getElementById('closeLoginModal');
    const loginForm = document.getElementById('loginForm');
    const newParentPhone = document.getElementById('newParentPhone');

    // Add Student Modal handlers
    if (openModalBtn && modal && addStudentForm && messageDiv) {
        openModalBtn.addEventListener('click', () => {
            modal.style.display = 'block';
            modal.setAttribute('aria-hidden', 'false');
            const newStudentId = document.getElementById('newStudentId');
            if (newStudentId) newStudentId.focus();
        });

        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => {
                modal.style.display = 'none';
                modal.setAttribute('aria-hidden', 'true');
                addStudentForm.reset();
                messageDiv.textContent = '';
            });
        }

        // Close modal when clicking outside
        window.addEventListener('click', (event) => {
            if (event.target === modal) {
                modal.style.display = 'none';
                modal.setAttribute('aria-hidden', 'true');
                addStudentForm.reset();
                messageDiv.textContent = '';
            }
        });

        // Add new student form handler
        addStudentForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            console.log('Form submitted');
            
            const studentId = document.getElementById('newStudentId').value;
            const name = document.getElementById('newStudentName').value;
            const grade = document.getElementById('newStudentGrade').value;
            const parentPhone = document.getElementById('newParentPhone').value;
            
            // Validate student ID is not empty
            if (!studentId) {
                messageDiv.textContent = 'Student ID is required';
                messageDiv.className = 'message error';
                return;
            }
            
            // Validate UAE phone number format
            const phoneRegex = /^05[0-9][\s-]?[0-9]{3}[\s-]?[0-9]{4}$/;
            if (!phoneRegex.test(parentPhone)) {
                messageDiv.textContent = 'Phone number must start with 05X followed by 7 digits (e.g. 050 123 4567 or 0501234567)';
                messageDiv.className = 'message error';
                return;
            }

            const formData = {
                student_id: studentId.trim(),
                name: name.trim(),
                grade: grade.trim(),
                parent_phone: parentPhone.trim()
            };
            console.log('Form data:', formData);

            try {
                console.log('Sending request to /api/students');
                const response = await fetch(`${API_BASE_URL}/students`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });
                console.log('Request sent with data:', JSON.stringify(formData));
                console.log('Response status:', response.status);
                const data = await response.json();
                console.log('Response data:', data);

                if (response.ok) {
                    messageDiv.textContent = 'Student added successfully!';
                    messageDiv.className = 'message success';
                    addStudentForm.reset();
                    setTimeout(() => {
                        modal.style.display = 'none';
                        messageDiv.textContent = '';
                        document.body.style.overflow = 'auto';
                    }, 2000);
                } else {
                    messageDiv.textContent = data.error || 'Error adding student';
                    messageDiv.className = 'message error';
                }
            } catch (error) {
                console.error('Error:', error);
                messageDiv.textContent = 'Error connecting to server';
                messageDiv.className = 'message error';
            }
        });
    }

    // Login Modal handlers
    if (openLoginModalBtn && loginModal && closeLoginModalBtn && loginForm) {
        openLoginModalBtn.addEventListener('click', () => {
            loginModal.style.display = 'block';
        });

        closeLoginModalBtn.addEventListener('click', () => {
            loginModal.style.display = 'none';
        });

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username');
            const password = document.getElementById('password');
            const messageDiv = document.getElementById('loginMessage');

            if (!username || !password || !messageDiv) return;

            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        username: username.value, 
                        password: password.value 
                    }),
                });

                const result = await response.json();
                
                if (result.success) {
                    messageDiv.className = 'message success';
                    messageDiv.textContent = 'Login successful!';
                    setTimeout(() => {
                        loginModal.style.display = 'none';
                    }, 1000);
                } else {
                    messageDiv.className = 'message error';
                    messageDiv.textContent = 'Invalid username or password.';
                }
            } catch (error) {
                console.error('Login error:', error);
                messageDiv.className = 'message error';
                messageDiv.textContent = 'Error connecting to server';
            }
        });
    }

    // Phone number format helper
    if (newParentPhone) {
        newParentPhone.addEventListener('input', function(e) {
            // Remove all non-digit characters
            let value = e.target.value.replace(/\D/g, '');
            
            // Format the number as 05X XXX XXXX
            if (value.length > 0) {
                // Ensure it starts with 05
                if (!value.startsWith('05')) {
                    value = '05';
                } else {
                    // Format as 05X XXX XXXX
                    if (value.length > 3) {
                        value = value.substring(0, 3) + ' ' + value.substring(3);
                    }
                    if (value.length > 7) {
                        value = value.substring(0, 7) + ' ' + value.substring(7);
                    }
                    // Limit to 11 digits (05X XXX XXXX)
                    if (value.replace(/\D/g, '').length > 10) {
                        value = value.substring(0, 12);
                    }
                }
            }
            
            // Update the input value
            e.target.value = value;
        });
    }

    // Handle simulate scan functionality
    const simulateScanBtn = document.getElementById('simulateScan');
    const simulatorStudentIdInput = document.getElementById('simulatorStudentId');
    if (simulateScanBtn && simulatorStudentIdInput) {
        simulateScanBtn.addEventListener('click', function() {
            const studentId = simulatorStudentIdInput.value;
            if (studentId) {
                handleRFIDScan(studentId);
                simulatorStudentIdInput.value = ''; // Clear input after scan
            } else {
                alert('Please enter a student ID');
            }
        });

        // Handle Enter key in student ID input
        simulatorStudentIdInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                simulateScanBtn.click();
            }
        });
    }

    // Toggle notifications button
    const toggleNotificationsBtn = document.getElementById('toggleNotifications');
    if (toggleNotificationsBtn) {
        toggleNotificationsBtn.addEventListener('click', function() {
            this.textContent = this.textContent === 'Enabled' ? 'Disabled' : 'Enabled';
        });
    }

    // Set default date range (today) - only if we're on the reports page
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    if (startDateInput && endDateInput) {
        const today = new Date().toISOString().split('T')[0];
        startDateInput.value = today;
        endDateInput.value = today;
    }

    // Load today's attendance
    await loadTodayAttendance();
});

async function loadAttendanceByDateRange(startDate, endDate) {
    try {
        const response = await fetch(`${API_BASE_URL}/attendance/range?start=${startDate}&end=${endDate}`);
        if (response.ok) {
            const newRecords = await response.json();
            attendanceRecords = newRecords;
            updateAttendanceTable();
        } else {
            const data = await response.json();
            alert('Error loading attendance: ' + (data.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error loading attendance:', error);
        alert('Error loading attendance: ' + error.message);
    }
}

// Check if student ID already exists
async function checkStudentIdExists(studentId) {
    try {
        const response = await fetch(`${API_BASE_URL}/students/${studentId}`);
        return response.ok;
    } catch (error) {
        console.error('Error checking student ID:', error);
        return false;
    }
}
