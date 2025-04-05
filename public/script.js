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
        const studentId = document.getElementById('studentId').value;
        if (studentId) {
            handleRFIDScan(studentId);
            document.getElementById('studentId').value = ''; // Clear input after scan
        } else {
            alert('Please enter a student ID');
        }
    });

    // Handle Enter key in student ID input
    document.getElementById('studentId').addEventListener('keypress', function(e) {
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
const openModalBtn = document.getElementById('openAddStudent');
const closeModalBtn = document.querySelector('.close-modal');

// Open modal
openModalBtn.addEventListener('click', () => {
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
});

// Close modal
closeModalBtn.addEventListener('click', () => {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    document.getElementById('addStudentForm').reset();
    document.getElementById('addStudentMessage').textContent = '';
});

// Close modal when clicking outside
window.addEventListener('click', (event) => {
    if (event.target === modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        document.getElementById('addStudentForm').reset();
        document.getElementById('addStudentMessage').textContent = '';
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

// Show confirmation modal
function showConfirmation(studentData) {
    const confirmationHtml = `
        <div class="confirmation-content">
            <h3>Confirm Student Details</h3>
            <div class="confirmation-details">
                <p><strong>Student ID:</strong> ${studentData.studentId}</p>
                <p><strong>Name:</strong> ${studentData.name}</p>
                <p><strong>Grade:</strong> ${studentData.grade}</p>
                <p><strong>Parent Phone:</strong> ${studentData.parentPhone}</p>
            </div>
            <div class="confirmation-buttons">
                <button id="confirmAdd" class="confirm-button">Confirm & Add</button>
                <button id="cancelAdd" class="cancel-button">Cancel</button>
            </div>
        </div>
    `;

    const confirmationModal = document.createElement('div');
    confirmationModal.className = 'modal';
    confirmationModal.id = 'confirmationModal';
    confirmationModal.innerHTML = confirmationHtml;
    document.body.appendChild(confirmationModal);

    // Show the confirmation modal
    confirmationModal.style.display = 'block';

    // Handle confirmation
    document.getElementById('confirmAdd').addEventListener('click', async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/students`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(studentData)
            });
            
            const data = await response.json();
            const messageDiv = document.getElementById('addStudentMessage');
            
            if (response.ok) {
                messageDiv.textContent = 'Student added successfully!';
                messageDiv.className = 'message success';
                
                // Close both modals and reset form after 2 seconds
                setTimeout(() => {
                    document.getElementById('addStudentForm').reset();
                    modal.style.display = 'none';
                    confirmationModal.remove();
                    document.body.style.overflow = 'auto';
                    messageDiv.textContent = '';
                }, 2000);
            } else {
                messageDiv.textContent = data.message || 'Error adding student';
                messageDiv.className = 'message error';
                confirmationModal.remove();
            }
        } catch (error) {
            console.error('Error:', error);
            const messageDiv = document.getElementById('addStudentMessage');
            messageDiv.textContent = 'Error adding student. Please try again.';
            messageDiv.className = 'message error';
            confirmationModal.remove();
        }
    });

    // Handle cancellation
    document.getElementById('cancelAdd').addEventListener('click', () => {
        confirmationModal.remove();
    });

    // Close confirmation modal when clicking outside
    confirmationModal.addEventListener('click', (event) => {
        if (event.target === confirmationModal) {
            confirmationModal.remove();
        }
    });
}

// Add new student form handler
document.getElementById('addStudentForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const studentId = document.getElementById('newStudentId').value;
    const name = document.getElementById('newStudentName').value;
    const grade = document.getElementById('newStudentGrade').value;
    const parentPhone = document.getElementById('newStudentPhone').value;
    
    // Validate student ID format (assuming it should be 6 digits)
    if (!/^\d{6}$/.test(studentId)) {
        const messageDiv = document.getElementById('addStudentMessage');
        messageDiv.textContent = 'Student ID must be 6 digits';
        messageDiv.className = 'message error';
        return;
    }
    
    // Validate UAE phone number format (05X XXX XXXX)
    const phoneRegex = /^05[0-9] [0-9]{3} [0-9]{4}$/;
    if (!phoneRegex.test(parentPhone)) {
        const messageDiv = document.getElementById('addStudentMessage');
        messageDiv.textContent = 'Phone number must be in UAE format: 05X XXX XXXX';
        messageDiv.className = 'message error';
        return;
    }
    
    // Check if student ID already exists
    const exists = await checkStudentIdExists(studentId);
    if (exists) {
        const messageDiv = document.getElementById('addStudentMessage');
        messageDiv.textContent = 'Student ID already exists';
        messageDiv.className = 'message error';
        return;
    }
    
    // Show confirmation modal
    showConfirmation({
        studentId,
        name,
        grade,
        parentPhone
    });
});

// Add phone number format helper
document.getElementById('newStudentPhone').addEventListener('input', function(e) {
    // Remove all non-digit characters
    let value = e.target.value.replace(/\D/g, '');
    
    // Format the number as 05X XXX XXXX
    if (value.length > 0) {
        // Ensure it starts with 05
        if (!value.startsWith('05')) {
            value = '05' + value.substring(2);
        }
        
        // Format as 05X XXX XXXX
        if (value.length > 2) value = value.substring(0, 3) + ' ' + value.substring(3);
        if (value.length > 7) value = value.substring(0, 7) + ' ' + value.substring(7);
    }
    
    // Update the input value
    e.target.value = value;
});
