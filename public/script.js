// Dean Francis Tolero
// API Configuration
const API_BASE_URL = 'http://localhost:3000/api';

// Store attendance records
let attendanceRecords = [];

// Function to handle RFID scan
async function handleRFIDScan(studentId) {
    try {
        const response = await fetch(`${API_BASE_URL}/attendance`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ studentId })
        });

        const data = await response.json();

        if (response.ok) {
            // Create a combined record with both attendance and student info
            const combinedRecord = {
                ...data.attendance,
                name: data.student.name,
                grade: data.student.grade,
                parent_phone: data.student.parent_phone
            };
            
            // Update attendance records with the combined record
            attendanceRecords.unshift(combinedRecord);
            updateAttendanceTable();
            updateLastScan(data.student.name, data.attendance.time, data.attendance.status);
            sendParentNotification(data.student);
        } else {
            // Handle specific error messages
            if (response.status === 503) {
                alert('Database connection error. Please check if the database server is running.');
            } else {
                alert(data.message || 'Error recording attendance');
            }
        }
    } catch (error) {
        console.error('Error:', error);
        if (error.message.includes('Failed to fetch')) {
            alert('Cannot connect to the server. Please check if the server is running.');
        } else {
            alert('Error recording attendance: ' + error.message);
        }
    }
}

// Update the attendance table
function updateAttendanceTable() {
    const tableBody = document.getElementById('attendanceTable');
    tableBody.innerHTML = '';

    attendanceRecords.forEach(record => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${record.student_id}</td>
            <td>${record.name}</td>
            <td>${new Date(record.time).toLocaleTimeString()}</td>
            <td>${record.time_out ? new Date(record.time_out).toLocaleTimeString() : '-'}</td>
            <td>${record.status}</td>
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
        const response = await fetch(`${API_BASE_URL}/attendance/today`);
        if (response.ok) {
            // Clear the existing records array
            attendanceRecords = [];
            // Load new records from the server
            const newRecords = await response.json();
            attendanceRecords = newRecords;
            updateAttendanceTable();
        } else {
            const data = await response.json();
            if (response.status === 503) {
                alert('Database connection error. Please check if the database server is running.');
            } else {
                alert('Error loading attendance: ' + (data.message || 'Unknown error'));
            }
        }
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
    if (isCharging) {
        solarIndicator.style.backgroundColor = 'var(--success-color)';
    } else {
        solarIndicator.style.backgroundColor = 'var(--warning-color)';
    }
}

// Initialize the system
document.addEventListener('DOMContentLoaded', async () => {
    // Start battery simulation
    setInterval(updateBatteryStatus, 1000);

    // Handle battery slider changes
    document.getElementById('batteryLevel').addEventListener('input', function() {
        batteryLevel = parseInt(this.value);
        document.getElementById('batteryValue').textContent = `${batteryLevel}%`;
    });

    // Handle solar status changes
    document.getElementById('solarStatus').addEventListener('change', function() {
        updateBatteryStatus();
    });

    // Handle simulate scan button
    document.getElementById('simulateScan').addEventListener('click', function() {
        const studentId = document.getElementById('simulatorStudentId').value;
        if (studentId) {
            handleRFIDScan(studentId);
            document.getElementById('simulatorStudentId').value = ''; // Clear input after scan
        } else {
            alert('Please enter a student ID');
        }
    });

    // Handle Enter key in student ID input
    document.getElementById('simulatorStudentId').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('simulateScan').click();
        }
    });

    // Teacher login button
    document.getElementById('teacherLogin').addEventListener('click', () => {
        const password = prompt('Enter teacher password:');
        if (password === 'teacher123') {
            alert('Login successful! Teacher access granted.');
        } else {
            alert('Invalid password');
        }
    });

    // Toggle notifications button
    document.getElementById('toggleNotifications').addEventListener('click', function() {
        this.textContent = this.textContent === 'Enabled' ? 'Disabled' : 'Enabled';
    });

    // Load today's attendance
    await loadTodayAttendance();
});

// Modal functionality
const modal = document.getElementById('addStudentModal');
const openModalBtn = document.getElementById('addStudentBtn');
const closeModalBtn = document.getElementById('closeModal');
const addStudentForm = document.getElementById('addStudentForm');
const messageDiv = document.getElementById('message');

// Open modal
openModalBtn.addEventListener('click', () => {
    console.log('Opening modal');
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
});

// Close modal
closeModalBtn.addEventListener('click', () => {
    console.log('Closing modal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    addStudentForm.reset();
    messageDiv.textContent = '';
});

// Close modal when clicking outside
window.addEventListener('click', (event) => {
    if (event.target === modal) {
        console.log('Closing modal (clicked outside)');
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        addStudentForm.reset();
        messageDiv.textContent = '';
    }
});

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

// Add phone number format helper
document.getElementById('newParentPhone').addEventListener('input', function(e) {
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

// Add new student form handler
addStudentForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    console.log('Form submitted');
    
    const studentId = document.getElementById('newStudentId').value;
    const name = document.getElementById('newStudentName').value;
    const grade = document.getElementById('newStudentGrade').value;
    const parentPhone = document.getElementById('newParentPhone').value;
    
    // Validate student ID format (6 digits)
    if (!/^\d{6}$/.test(studentId)) {
        messageDiv.textContent = 'Student ID must be 6 digits';
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
        student_id: studentId,
        name: name,
        grade: grade,
        parent_phone: parentPhone
    };
    console.log('Form data:', formData);

    try {
        console.log('Sending request to /api/students');
        const response = await fetch(`${API_BASE_URL}/students`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
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
