const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcrypt');
const session = require('express-session');
const jwt = require('jsonwebtoken');
const http = require('http');
const WebSocket = require('ws');
const HardwareManager = require('./hardware/hardware-manager');

// Load environment variables from .env file
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // set to true if using https
}));

// Authentication middleware
const authenticateParent = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Invalid token format' });
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
            req.parentId = decoded.id;
            
            // Verify the parent exists
            const [parents] = await connection.promise().query(
                'SELECT id FROM parents WHERE id = ?',
                [decoded.id]
            );

            if (parents.length === 0) {
                return res.status(401).json({ error: 'Parent not found' });
            }

            next();
        } catch (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ error: 'Token expired' });
            }
            if (err.name === 'JsonWebTokenError') {
                return res.status(401).json({ error: 'Invalid token' });
            }
            throw err;
        }
    } catch (error) {
        console.error('Authentication error:', error);
        return res.status(500).json({ error: 'Internal server error during authentication' });
    }
};

// Redirect root to login page
app.get('/', (req, res) => {
    res.redirect('/login.html');
});

// Serve static files from the public directory
app.use(express.static('public'));

// Create MySQL connection using environment variables
const connection = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'rfid_attendance'
});

// Function to check database connection
function checkDatabaseConnection() {
    return new Promise((resolve, reject) => {
        connection.query('SELECT 1', (err) => {
            if (err) {
                console.error('Database connection error:', err);
                reject(err);
            } else {
                resolve(true);
            }
        });
    });
}

// Initialize tables in correct order
function initializeTables() {
    // Create tables in correct order with proper column sizes
    const createTablesSequence = [
        `CREATE TABLE IF NOT EXISTS teachers (
            id INT PRIMARY KEY AUTO_INCREMENT,
            username VARCHAR(50) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(100) NOT NULL UNIQUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS parents (
            id INT PRIMARY KEY AUTO_INCREMENT,
            username VARCHAR(50) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(100) NOT NULL UNIQUE,
            phone VARCHAR(20) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS students (
            id INT PRIMARY KEY AUTO_INCREMENT,
            student_id VARCHAR(50) NOT NULL UNIQUE,
            card_id VARCHAR(50) UNIQUE,
            name VARCHAR(100) NOT NULL,
            grade VARCHAR(20),
            parent_phone VARCHAR(20),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS attendance (
            id INT PRIMARY KEY AUTO_INCREMENT,
            student_id VARCHAR(50),
            time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            time_out TIMESTAMP NULL,
            status VARCHAR(20),
            FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS parent_student (
            id INT PRIMARY KEY AUTO_INCREMENT,
            parent_id INT,
            student_id VARCHAR(50),
            relationship VARCHAR(50),
            FOREIGN KEY (parent_id) REFERENCES parents(id) ON DELETE CASCADE,
            FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS notifications (
            id INT PRIMARY KEY AUTO_INCREMENT,
            student_id VARCHAR(50),
            parent_id INT,
            message TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
            FOREIGN KEY (parent_id) REFERENCES parents(id) ON DELETE CASCADE
        )`
    ];

    // Execute creates sequentially
    let currentCreateIndex = 0;
    function executeNextCreate() {
        if (currentCreateIndex < createTablesSequence.length) {
            connection.query(createTablesSequence[currentCreateIndex], (err) => {
                if (err) {
                    console.error(`Error creating table ${currentCreateIndex + 1}:`, err);
                } else {
                    console.log(`Table ${currentCreateIndex + 1} created successfully`);
                }
                currentCreateIndex++;
                executeNextCreate();
            });
        }
    }

    // Start the sequence
    executeNextCreate();
}

// Connect to MySQL
connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        console.error('Please check:');
        console.error('1. MySQL server is running');
        console.error('2. Database credentials are correct');
        console.error('3. Database exists');
        return;
    }
    console.log('Connected to MySQL database');
    
    // Call the initialization function
    initializeTables();
});

// Add middleware to check database connection before each request
app.use(async (req, res, next) => {
    try {
        await checkDatabaseConnection();
        next();
    } catch (err) {
        res.status(503).json({ 
            message: 'Database connection error',
            details: 'Please check if the database server is running and accessible'
        });
    }
});

// Get all students
app.get('/api/students', (req, res) => {
    connection.query('SELECT * FROM students', (err, results) => {
        if (err) {
            res.status(500).json({ message: err.message });
            return;
        }
        res.json(results);
    });
});

// Get student by ID
app.get('/api/students/:id', (req, res) => {
    const studentId = req.params.id;
    connection.query('SELECT * FROM students WHERE student_id = ?', [studentId], (err, results) => {
        if (err) {
            res.status(500).json({ message: err.message });
            return;
        }
        if (results.length === 0) {
            res.status(404).json({ message: 'Student not found' });
            return;
        }
        res.json(results[0]);
    });
});

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Store connected WebSocket clients
const clients = new Set();

// Function to broadcast messages to all connected clients
function broadcast(message) {
    const messageString = JSON.stringify(message);
    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(messageString);
        }
    });
}

// WebSocket connection handling
wss.on('connection', (ws) => {
    console.log('New WebSocket client connected');
    clients.add(ws);

    ws.on('close', () => {
        console.log('WebSocket client disconnected');
        clients.delete(ws);
    });
});

async function processRFIDScan(tagId) {
    try {
        console.log('Processing RFID scan for tag:', tagId);
        
        // Find student by student ID (which is the RFID tag)
        const [students] = await connection.promise().query(
            'SELECT * FROM students WHERE student_id = ?',
            [tagId]
        );
        
        if (students.length === 0) {
            console.log('Student not found in database');
            return;
        }

        const student = students[0];
        console.log('Found registered student:', student);

        // Get the most recent attendance record for today
        const [attendance] = await connection.promise().query(
            'SELECT * FROM attendance WHERE student_id = ? AND DATE(time) = CURDATE() ORDER BY time DESC LIMIT 1',
            [student.student_id]
        );

        let response;
        if (attendance.length === 0 || attendance[0].time_out !== null) {
            // Create new attendance record (check-in)
            const [result] = await connection.promise().query(
                'INSERT INTO attendance (student_id, time) VALUES (?, NOW())',
                [student.student_id]
            );
            console.log('Created new attendance record:', result);
            response = {
                type: 'scan',
                student: {
                    id: student.id,
                    student_id: student.student_id,
                    name: student.name,
                    grade: student.grade
                },
                status: 'Checked In',
                timestamp: new Date().toISOString(),
                message: `${student.name} has checked in`
            };
        } else {
            // Update existing attendance record with check-out time
            await connection.promise().query(
                'UPDATE attendance SET time_out = NOW() WHERE id = ?',
                [attendance[0].id]
            );
            response = {
                type: 'scan',
                student: {
                    id: student.id,
                    student_id: student.student_id,
                    name: student.name,
                    grade: student.grade
                },
                status: 'Checked Out',
                timestamp: new Date().toISOString(),
                message: `${student.name} has checked out`
            };
        }

        // Broadcast the response to all connected clients
        broadcast(response);
        return response;
    } catch (error) {
        console.error('Error processing RFID scan:', error);
        throw error;
    }
}

// Record attendance
app.post('/api/attendance', (req, res) => {
    const { studentId } = req.body;
    console.log('Received attendance request for student:', studentId);
    
    // First check if student exists
    connection.query('SELECT * FROM students WHERE student_id = ?', [studentId], (err, results) => {
        if (err) {
            console.error('Error checking student:', err);
            res.status(500).json({ message: err.message });
            return;
        }
        
        if (results.length === 0) {
            console.log('Student not found:', studentId);
            res.status(404).json({ message: 'Student not found' });
            return;
        }
        
        const student = results[0];
        console.log('Found student:', student);
        
        // Get the most recent attendance record for today
        connection.query(
            `SELECT * FROM attendance 
             WHERE student_id = ? 
             AND DATE(time) = CURDATE() 
             ORDER BY time DESC 
             LIMIT 1`,
            [studentId],
            (err, results) => {
                if (err) {
                    console.error('Error checking existing attendance:', err);
                    res.status(500).json({ message: err.message });
                    return;
                }
                
                const currentTime = new Date();
                
                if (results.length > 0) {
                    const lastRecord = results[0];
                    
                    // If the last record is a check-in (no time_out)
                    if (!lastRecord.time_out) {
                        // Update the check-in record with check-out time
                        connection.query(
                            'UPDATE attendance SET time_out = ?, status = ? WHERE id = ?',
                            [currentTime, 'Checked Out', lastRecord.id],
                            (err) => {
                                if (err) {
                                    console.error('Error updating attendance:', err);
                                    res.status(500).json({ message: err.message });
                                    return;
                                }
                                res.json({
                                    message: 'Check-out recorded successfully',
                                    student: {
                                        id: student.id,
                                        student_id: student.student_id,
                                        name: student.name,
                                        grade: student.grade,
                                        parent_phone: student.parent_phone
                                    },
                                    attendance: { ...lastRecord, time_out: currentTime, status: 'Checked Out' }
                                });
                            }
                        );
                    } else {
                        // If the last record is a check-out, create a new check-in
                        const attendance = {
                            student_id: studentId,
                            time: currentTime,
                            status: 'Checked In'
                        };
                        
                        connection.query('INSERT INTO attendance SET ?', attendance, (err, result) => {
                            if (err) {
                                console.error('Error inserting attendance:', err);
                                res.status(500).json({ message: err.message });
                                return;
                            }
                            res.json({
                                message: 'Check-in recorded successfully',
                                student: {
                                    id: student.id,
                                    student_id: student.student_id,
                                    name: student.name,
                                    grade: student.grade,
                                    parent_phone: student.parent_phone
                                },
                                attendance: { ...attendance, id: result.insertId }
                            });
                        });
                    }
                } else {
                    // No records for today, create a new check-in
                    const attendance = {
                        student_id: studentId,
                        time: currentTime,
                        status: 'Checked In'
                    };
                    
                    connection.query('INSERT INTO attendance SET ?', attendance, (err, result) => {
                        if (err) {
                            console.error('Error inserting attendance:', err);
                            res.status(500).json({ message: err.message });
                            return;
                        }
                        res.json({
                            message: 'Check-in recorded successfully',
                            student: {
                                id: student.id,
                                student_id: student.student_id,
                                name: student.name,
                                grade: student.grade,
                                parent_phone: student.parent_phone
                            },
                            attendance: { ...attendance, id: result.insertId }
                        });
                    });
                }
            }
        );
    });
});

// Get today's attendance
app.get('/api/attendance/today', (req, res) => {
    console.log('Fetching today\'s attendance...');
    connection.query(
        `SELECT a.*, s.name, s.grade, s.parent_phone 
         FROM attendance a 
         JOIN students s ON a.student_id = s.student_id 
         WHERE DATE(a.time) = CURDATE() 
         ORDER BY a.time DESC`,
        (err, results) => {
            if (err) {
                console.error('Database error in attendance/today:', err);
                console.error('Error code:', err.code);
                console.error('Error message:', err.message);
                console.error('Error SQL state:', err.sqlState);
                res.status(500).json({ 
                    error: 'Database error',
                    message: err.message,
                    code: err.code,
                    sqlState: err.sqlState
                });
                return;
            }
            console.log('Successfully fetched attendance records:', results.length);
            // Process the results to ensure correct status
            const processedResults = results.map(record => ({
                ...record,
                status: record.time_out ? 'Checked Out' : 'Checked In'
            }));
            res.json(processedResults);
        }
    );
});

// Get attendance by date range
app.get('/api/attendance/range', (req, res) => {
    const { start, end } = req.query;
    
    if (!start || !end) {
        return res.status(400).json({ message: 'Start and end dates are required' });
    }

    // Modified query to get only the first check-in and last check-out for each student per day
    const query = `
        SELECT 
            s.student_id,
            s.name,
            s.grade,
            DATE(a1.time) as date,
            MIN(a1.time) as first_check_in,
            MAX(CASE WHEN a2.time_out IS NOT NULL THEN a2.time_out ELSE NULL END) as last_check_out,
            CASE 
                WHEN MAX(a2.time_out) IS NOT NULL THEN 'Present'
                WHEN MIN(a1.time) IS NOT NULL THEN 'Checked In'
                ELSE 'Absent'
            END as status
        FROM students s
        LEFT JOIN attendance a1 ON s.student_id = a1.student_id 
            AND DATE(a1.time) BETWEEN ? AND ?
        LEFT JOIN attendance a2 ON s.student_id = a2.student_id 
            AND DATE(a2.time) = DATE(a1.time)
        GROUP BY s.student_id, s.name, s.grade, DATE(a1.time)
        ORDER BY DATE(a1.time) DESC, s.name`;

    connection.query(query, [start, end], (err, results) => {
        if (err) {
            console.error('Error fetching attendance range:', err);
            res.status(500).json({ message: err.message });
            return;
        }

        // Process the results to include formatted times and ensure all fields are present
        const processedResults = results.map(record => ({
            student_id: record.student_id,
            name: record.name,
            grade: record.grade,
            date: record.date,
            time: record.first_check_in,
            time_out: record.last_check_out,
            status: record.status
        })).filter(record => record.time !== null); // Only include days when student had activity

        res.json(processedResults);
    });
});

// Add/Update student endpoint
app.post('/api/students', async (req, res) => {
    const { student_id, name, grade, parent_phone } = req.body;
    
    if (!student_id || !name || !grade) {
        return res.status(400).json({ error: 'Student ID, name, and grade are required' });
    }

    try {
        // Check if student exists by student_id only
        const [existingStudents] = await connection.promise().query(
            'SELECT * FROM students WHERE student_id = ?',
            [student_id]
        );

        if (existingStudents.length > 0) {
            return res.status(400).json({ error: 'Student ID already exists' });
        }

        // Insert new student
        const [result] = await connection.promise().query(
            'INSERT INTO students (student_id, name, grade, parent_phone) VALUES (?, ?, ?, ?)',
            [student_id, name, grade, parent_phone]
        );

        res.status(201).json({ 
            message: 'Student added successfully',
            student: { 
                student_id,
                name, 
                grade, 
                parent_phone 
            }
        });
    } catch (error) {
        console.error('Error adding student:', error);
        res.status(500).json({ error: 'Database error', details: error.message });
    }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const query = 'SELECT * FROM users WHERE username = ?';
    connection.query(query, [username], async (err, results) => {
        if (err) return res.status(500).json({ success: false, message: 'Server error' });
        if (results.length === 0) return res.status(401).json({ success: false, message: 'Invalid credentials' });

        const user = results[0];
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) return res.status(401).json({ success: false, message: 'Invalid credentials' });

        req.session.user = { id: user.id, username: user.username };
        res.json({ success: true });
    });
});

// Teacher registration
app.post('/api/teachers/register', async (req, res) => {
    console.log('Registration request received:', req.body);
    
    const { username, password, name, email } = req.body;
    
    // Validate required fields
    if (!username || !password || !name || !email) {
        console.error('Registration error: Missing required fields', { username, name, email });
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        console.log('Starting teacher registration process...');
        // Check if username already exists
        const [existingTeachers] = await connection.promise().query(
            'SELECT * FROM teachers WHERE username = ? OR email = ?',
            [username, email]
        );
        console.log('Existing teachers check complete:', existingTeachers);

        if (existingTeachers.length > 0) {
            const isDuplicateUsername = existingTeachers.some(t => t.username === username);
            const isDuplicateEmail = existingTeachers.some(t => t.email === email);
            
            if (isDuplicateUsername) {
                console.error('Registration error: Username already exists', { username });
                return res.status(400).json({ error: 'Username already exists' });
            }
            
            if (isDuplicateEmail) {
                console.error('Registration error: Email already exists', { email });
                return res.status(400).json({ error: 'Email already exists' });
            }
        }

        // Hash password
        console.log('Hashing password...');
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log('Password hashed successfully');

        // Insert new teacher
        console.log('Inserting new teacher into database...');
        const [result] = await connection.promise().query(
            'INSERT INTO teachers (username, password, name, email) VALUES (?, ?, ?, ?)',
            [username, hashedPassword, name, email]
        );
        console.log('Teacher inserted successfully:', result);

        console.log('Teacher registered successfully:', { username, name, email });
        res.status(201).json({ message: 'Teacher registered successfully' });
    } catch (error) {
        console.error('Registration error:', error);
        console.error('Error details:', {
            message: error.message,
            code: error.code,
            sqlState: error.sqlState,
            sqlMessage: error.sqlMessage
        });
        res.status(500).json({ error: 'An error occurred during registration. Please try again.' });
    }
});

// Teacher login
app.post('/api/teachers/login', async (req, res) => {
    console.log('Login attempt:', req.body);
    const { username, password } = req.body;

    try {
        // Get teacher from database
        const [teachers] = await connection.promise().query(
            'SELECT * FROM teachers WHERE username = ?',
            [username]
        );
        console.log('Found teacher:', teachers[0]);

        if (teachers.length === 0) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const teacher = teachers[0];
        const validPassword = await bcrypt.compare(password, teacher.password);
        console.log('Password valid:', validPassword);

        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        // Create session
        req.session.teacherId = teacher.id;
        req.session.teacherName = teacher.name;

        // Send response with teacher info
        res.json({
            token: 'dummy-token', // You can implement proper JWT tokens later
            teacher: {
                id: teacher.id,
                name: teacher.name,
                username: teacher.username
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'An error occurred during login' });
    }
});

// Middleware to check if teacher is authenticated
const isAuthenticated = (req, res, next) => {
    if (req.session.teacherId) {
        next();
    } else {
        res.status(401).json({ 
            error: 'Unauthorized',
            details: 'Please login to access this resource'
        });
    }
};

// Protected route example
app.get('/api/teachers/profile', isAuthenticated, (req, res) => {
    connection.query(
        'SELECT id, username, name, email, created_at FROM teachers WHERE id = ?',
        [req.session.teacherId],
        (error, results) => {
            if (error) {
                return res.status(500).json({ 
                    error: 'Database error',
                    details: error.message
                });
            }
            
            if (results.length === 0) {
                return res.status(404).json({ 
                    error: 'Teacher not found'
                });
            }
            
            res.json(results[0]);
        }
    );
});

// Parent login
app.post('/api/parents/login', async (req, res) => {
    console.log('Parent login attempt received');
    
    const { username, password } = req.body;
    
    if (!username || !password) {
        console.log('Login failed: Missing credentials');
        return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
        console.log('Looking up parent with username:', username);
        
        // Get parent from database
        const [parents] = await connection.promise().query(
            'SELECT * FROM parents WHERE username = ?',
            [username]
        );

        if (parents.length === 0) {
            console.log('Login failed: Parent not found with username:', username);
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const parent = parents[0];
        console.log('Parent found, verifying password...');
        
        const validPassword = await bcrypt.compare(password, parent.password);
        console.log('Password verification result:', validPassword);

        if (!validPassword) {
            console.log('Login failed: Invalid password for username:', username);
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        // Get the parent's students
        console.log('Getting student information for parent ID:', parent.id);
        const [students] = await connection.promise().query(
            `SELECT s.name, s.student_id, s.grade 
             FROM students s
             JOIN parent_student ps ON s.student_id = ps.student_id
             WHERE ps.parent_id = ?`,
            [parent.id]
        );
        
        console.log('Found students for parent:', students.length);

        // Create JWT token
        const token = jwt.sign(
            { 
                id: parent.id, 
                username: parent.username,
                type: 'parent'
            },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );
        
        console.log('Login successful for username:', username);

        res.json({
            message: 'Login successful',
            parent: {
                id: parent.id,
                name: parent.name,
                email: parent.email,
                students: students
            },
            token
        });
    } catch (error) {
        console.error('Login error occurred:');
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        if (error.code) {
            console.error('Database error details:');
            console.error('Error code:', error.code);
            console.error('SQL Message:', error.sqlMessage);
            console.error('SQL State:', error.sqlState);
        }
        res.status(500).json({ 
            error: 'An error occurred during login',
            details: error.message
        });
    }
});

// Parent registration
app.post('/api/parents/register', async (req, res) => {
    try {
        console.log('Parent registration request received:', {
            ...req.body,
            password: '[REDACTED]' // Don't log the password
        });
        
        const { username, password, name, email, phone, studentId, relationship } = req.body;
        
        // Log all received fields
        console.log('Received fields:', {
            username: !!username,
            name: !!name,
            email: !!email,
            phone: !!phone,
            studentId: !!studentId,
            relationship: !!relationship,
            password: !!password
        });
        
        // Validate required fields
        const missingFields = [];
        if (!username) missingFields.push('username');
        if (!password) missingFields.push('password');
        if (!name) missingFields.push('name');
        if (!email) missingFields.push('email');
        if (!phone) missingFields.push('phone');
        if (!studentId) missingFields.push('studentId');
        if (!relationship) missingFields.push('relationship');
        
        if (missingFields.length > 0) {
            console.error('Registration error: Missing fields:', missingFields);
            return res.status(400).json({ 
                error: 'All fields are required.',
                details: `Missing fields: ${missingFields.join(', ')}`
            });
        }

        // Check if username or email already exists
        console.log('Checking for existing parent...');
        const [existingParents] = await connection.promise().query(
            'SELECT * FROM parents WHERE username = ? OR email = ?',
            [username, email]
        );

        if (existingParents.length > 0) {
            const isDuplicateUsername = existingParents.some(p => p.username === username);
            const isDuplicateEmail = existingParents.some(p => p.email === email);
            
            if (isDuplicateUsername) {
                console.log('Username already exists:', username);
                return res.status(400).json({ error: 'Username already exists' });
            }
            if (isDuplicateEmail) {
                console.log('Email already exists:', email);
                return res.status(400).json({ error: 'Email already exists' });
            }
        }

        // Check if student exists
        console.log('Checking for student:', studentId);
        const [students] = await connection.promise().query(
            'SELECT * FROM students WHERE student_id = ?',
            [studentId]
        );

        if (students.length === 0) {
            console.log('Student not found:', studentId);
            return res.status(400).json({ error: 'Student not found. Please verify the Student ID.' });
        }

        const student = students[0];
        console.log('Found student:', student.name);

        // Hash password
        console.log('Hashing password...');
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log('Password hashed successfully');

        // Start transaction
        console.log('Starting transaction...');
        const conn = await connection.promise();
        await conn.beginTransaction();

        try {
            // Insert parent
            console.log('Inserting parent record...');
            const cleanPhone = phone.replace(/\s/g, ''); // Remove spaces
            console.log('Cleaned phone number:', cleanPhone);
            
            const [parentResult] = await conn.query(
                'INSERT INTO parents (username, password, name, email, phone) VALUES (?, ?, ?, ?, ?)',
                [username, hashedPassword, name, email, cleanPhone]
            );
            console.log('Parent inserted successfully, ID:', parentResult.insertId);

            // Link parent to student
            console.log('Linking parent to student...');
            await conn.query(
                'INSERT INTO parent_student (parent_id, student_id, relationship) VALUES (?, ?, ?)',
                [parentResult.insertId, student.student_id, relationship]
            );
            console.log('Parent-student relationship created');

            await conn.commit();
            console.log('Transaction committed successfully');
            
            res.status(201).json({ 
                message: 'Parent registered successfully',
                studentName: student.name
            });
        } catch (error) {
            console.error('Transaction error occurred:');
            console.error('Error code:', error.code);
            console.error('SQL Message:', error.sqlMessage);
            console.error('SQL State:', error.sqlState);
            console.error('SQL Query:', error.sql);
            console.error('Full error:', error);
            
            await conn.rollback();
            console.log('Transaction rolled back');
            
            res.status(500).json({ 
                error: 'Database error during registration',
                details: error.sqlMessage || error.message
            });
        }
    } catch (error) {
        console.error('Registration error occurred:');
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        if (error.code) {
            console.error('Error code:', error.code);
            console.error('SQL Message:', error.sqlMessage);
            console.error('SQL State:', error.sqlState);
            console.error('SQL Query:', error.sql);
        }
        console.error('Full error:', error);
        
        res.status(500).json({ 
            error: 'An error occurred during registration',
            details: error.message
        });
    }
});

// Get parent's students
app.get('/api/parents/:parentId/students', async (req, res) => {
    try {
        const [students] = await connection.promise().query(
            `SELECT s.* 
             FROM students s
             JOIN parent_student ps ON s.student_id = ps.student_id
             WHERE ps.parent_id = ?`,
            [req.params.parentId]
        );
        
        res.json(students);
    } catch (error) {
        console.error('Error fetching student details:', error);
        res.status(500).json({ error: 'Failed to fetch student details' });
    }
});

// Get parent's child attendance for today
app.get('/api/parents/:parentId/attendance/today', async (req, res) => {
    const parentId = req.params.parentId;
    
    try {
        // First get the student ID associated with this parent
        const [parentStudent] = await connection.promise().query(
            'SELECT student_id FROM parent_student WHERE parent_id = ?',
            [parentId]
        );
        
        if (parentStudent.length === 0) {
            return res.status(404).json({ error: 'No student found for this parent' });
        }
        
        const studentId = parentStudent[0].student_id;
        
        // Get today's attendance records for this student
        const today = new Date().toISOString().split('T')[0];
        const [attendance] = await connection.promise().query(`
            SELECT a.*, s.name as student_name 
            FROM attendance a
            JOIN students s ON a.student_id = s.student_id
            WHERE a.student_id = ? 
            AND DATE(a.time) = ?
            ORDER BY a.time DESC
        `, [studentId, today]);
        
        // Process the records to determine status
        const processedRecords = attendance.map(record => ({
            ...record,
            status: record.time_out ? 'Checked Out' : 'Checked In'
        }));
        
        res.json(processedRecords);
    } catch (error) {
        console.error('Error fetching attendance:', error);
        res.status(500).json({ error: 'An error occurred while fetching attendance' });
    }
});

// Get parent's notifications
app.get('/api/parents/:parentId/notifications', async (req, res) => {
    try {
        // First get the student ID associated with this parent
        const [parentStudent] = await connection.promise().query(
            'SELECT student_id FROM parent_student WHERE parent_id = ?',
            [req.params.parentId]
        );
        
        if (parentStudent.length === 0) {
            return res.status(404).json({ error: 'No student found for this parent' });
        }
        
        const studentId = parentStudent[0].student_id;
        
        // Get notifications for this student
        const [notifications] = await connection.promise().query(
            `SELECT * FROM notifications 
             WHERE student_id = ?
             ORDER BY created_at DESC
             LIMIT 10`,
            [studentId]
        );
        
        res.json(notifications);
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

// Add endpoint for parent dashboard to fetch latest scan data
app.get('/api/latest-scan', async (req, res) => {
    try {
        // Get the most recent attendance record
        const [latestAttendance] = await connection.promise().query(`
            SELECT a.*, s.name, s.grade 
            FROM attendance a 
            JOIN students s ON a.student_id = s.student_id 
            ORDER BY a.time DESC 
            LIMIT 1
        `);

        if (latestAttendance.length === 0) {
            return res.status(404).json({ error: 'No scan data available' });
        }

        const record = latestAttendance[0];
        const response = {
            type: 'scan',
            student: {
                student_id: record.student_id,
                name: record.name,
                grade: record.grade
            },
            status: record.time_out ? 'Checked Out' : 'Checked In',
            timestamp: record.time_out || record.time,
            message: `${record.name} has ${record.time_out ? 'checked out' : 'checked in'}`
        };

        res.json(response);
    } catch (error) {
        console.error('Error fetching latest scan:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Clear today's attendance records
app.delete('/api/attendance/today', async (req, res) => {
    try {
        const [result] = await connection.promise().query(
            'DELETE FROM attendance WHERE DATE(time) = CURDATE()'
        );
        
        console.log('Cleared attendance records:', result);
        res.json({ 
            message: 'Today\'s attendance records cleared successfully',
            recordsDeleted: result.affectedRows
        });
    } catch (error) {
        console.error('Error clearing attendance records:', error);
        res.status(500).json({ error: 'Failed to clear attendance records' });
    }
});

// Temporary route for testing - DELETE THIS AFTER TESTING
app.get('/clear-attendance', async (req, res) => {
    try {
        await connection.promise().query('DELETE FROM attendance WHERE DATE(time) = CURDATE()');
        res.send('Today\'s attendance cleared. You can now test with fresh data.');
    } catch (error) {
        res.status(500).send('Error clearing attendance: ' + error.message);
    }
});

// Temporary route for debugging - DELETE THIS AFTER TESTING
app.get('/check-relationship/:parentId', async (req, res) => {
    try {
        const [relationships] = await connection.promise().query(
            `SELECT ps.*, s.name as student_name, s.student_id, p.name as parent_name 
             FROM parent_student ps
             JOIN students s ON ps.student_id = s.student_id
             JOIN parents p ON ps.parent_id = p.id
             WHERE ps.parent_id = ?`,
            [req.params.parentId]
        );
        res.json(relationships);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Temporary route to fix parent-student relationship
app.get('/fix-relationship', async (req, res) => {
    try {
        // First, check if the relationship already exists
        const [existing] = await connection.promise().query(
            'SELECT * FROM parent_student WHERE parent_id = ? AND student_id = ?',
            [1, '444444']
        );

        if (existing.length > 0) {
            return res.json({ message: 'Relationship already exists' });
        }

        // Create the relationship
        await connection.promise().query(
            'INSERT INTO parent_student (parent_id, student_id, relationship) VALUES (?, ?, ?)',
            [1, '444444', 'Guardian']
        );

        res.json({ message: 'Parent-student relationship created successfully' });
    } catch (error) {
        console.error('Error creating relationship:', error);
        res.status(500).json({ error: error.message });
    }
});

// Temporary route to create test teacher - DELETE THIS AFTER TESTING
app.get('/create-test-teacher', async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash('password123', 10);
        await connection.promise().query(
            'INSERT IGNORE INTO teachers (username, password, name, email) VALUES (?, ?, ?, ?)',
            ['admin', hashedPassword, 'Admin Teacher', 'admin@school.com']
        );
        res.send('Test teacher account created. You can now login with username: admin, password: password123');
    } catch (error) {
        res.status(500).send('Error creating test teacher: ' + error.message);
    }
});

// Store the latest scan data
let latestScanData = null;

// Handle RFID scan requests at index page
app.post('/index.html', async (req, res) => {
    try {
        const { tagId } = req.body;
        console.log('Received scan request for tag:', tagId);

        if (!tagId) {
            console.error('No tag ID provided');
            return res.status(400).json({ error: 'Tag ID is required' });
        }

        // Use the tag ID directly as the student ID
        const studentId = tagId.replace(/\s+/g, '');
        console.log('Looking up student with ID:', studentId);

        // Find student by student ID
        const [students] = await connection.promise().query(
            'SELECT * FROM students WHERE student_id = ?',
            [studentId]
        );

        if (students.length === 0) {
            console.error('Student not found');
            return res.status(404).json({ error: 'Student not found' });
        }

        const student = students[0];

        // Get latest attendance record for this student
        const [attendance] = await connection.promise().query(
            'SELECT * FROM attendance WHERE student_id = ? ORDER BY time DESC LIMIT 1',
            [student.student_id]
        );

        let response;

        if (attendance.length === 0 || attendance[0].time_out !== null) {
            // Create new attendance record (check-in)
            const [result] = await connection.promise().query(
                'INSERT INTO attendance (student_id, time) VALUES (?, NOW())',
                [student.student_id]
            );
            console.log('Created new attendance record:', result);
            response = {
                type: 'scan',
                success: true,
                student: {
                    id: student.id,
                    student_id: student.student_id,
                    name: student.name,
                    grade: student.grade
                },
                status: 'Checked In',
                message: `${student.name} has checked in`,
                timestamp: new Date().toISOString()
            };
        } else {
            // Update existing attendance record with check-out time
            await connection.promise().query(
                'UPDATE attendance SET time_out = NOW() WHERE id = ?',
                [attendance[0].id]
            );
            response = {
                type: 'scan',
                success: true,
                student: {
                    id: student.id,
                    student_id: student.student_id,
                    name: student.name,
                    grade: student.grade
                },
                status: 'Checked Out',
                message: `${student.name} has checked out`,
                timestamp: new Date().toISOString()
            };
        }

        // Store the latest scan data
        latestScanData = response;

        // Broadcast the response to all connected clients
        broadcast(response);
        return res.json(response);
    } catch (error) {
        console.error('Error processing RFID scan:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// Get parent's latest scan
app.get('/api/parents/:parentId/latest-scan', authenticateParent, async (req, res) => {
    try {
        // Verify the parent is requesting their own data
        if (req.parentId !== parseInt(req.params.parentId)) {
            return res.status(403).json({ error: 'Unauthorized access' });
        }

        // First get the student IDs associated with this parent
        const [parentStudents] = await connection.promise().query(
            'SELECT student_id FROM parent_student WHERE parent_id = ?',
            [req.parentId]
        );
        
        if (parentStudents.length === 0) {
            return res.status(404).json({ error: 'No students found for this parent' });
        }
        
        const studentIds = parentStudents.map(ps => ps.student_id);
        
        // Get the most recent attendance record for any of the parent's children
        const [latestAttendance] = await connection.promise().query(`
            SELECT a.*, s.name, s.grade 
            FROM attendance a 
            JOIN students s ON a.student_id = s.student_id 
            WHERE a.student_id IN (?)
            ORDER BY COALESCE(a.time_out, a.time) DESC 
            LIMIT 1
        `, [studentIds]);

        if (latestAttendance.length === 0) {
            return res.status(404).json({ error: 'No scan data available' });
        }

        const record = latestAttendance[0];
        const response = {
            type: 'scan',
            parentId: req.parentId,
            student: {
                student_id: record.student_id,
                name: record.name,
                grade: record.grade
            },
            status: record.time_out ? 'Checked Out' : 'Checked In',
            timestamp: record.time_out || record.time,
            message: `${record.name} has ${record.time_out ? 'checked out' : 'checked in'}`
        };

        res.json(response);
    } catch (error) {
        console.error('Error fetching latest scan:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something broke!' });
});

// Handle 404 errors
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Initialize hardware manager
const hardwareManager = new HardwareManager();

// Update the hardware initialization section
async function initializeHardware() {
    try {
        console.log('Hardware initialization started...');
        // No need to check for Arduino connection since we're using WiFi
        console.log('System ready to receive RFID scans over WiFi');
        
        // Set up RFID tag read handler
        app.post('/api/attendance/scan', async (req, res) => {
            try {
                const { tagId } = req.body;
                console.log('Received scan request for tag:', tagId);

                if (!tagId) {
                    console.error('No tag ID provided');
                    const response = {
                        success: false,
                        error: 'Tag ID is required',
                        type: 'scan',
                        status: 'Error',
                        message: 'No tag ID provided'
                    };
                    broadcast(response);
                    return res.status(400).json(response);
                }

                // Use the tag ID directly as the student ID
                const studentId = tagId.replace(/\s+/g, '');
                console.log('Looking up student with ID:', studentId);

                // Find student by student ID
                const [students] = await connection.promise().query(
                    'SELECT * FROM students WHERE student_id = ?',
                    [studentId]
                );

                if (students.length === 0) {
                    console.error('Unknown card scanned:', studentId);
                    const response = {
                        success: false,
                        error: 'Unknown card',
                        type: 'scan',
                        status: 'Error',
                        message: `Unknown card scanned (ID: ${studentId}). Please register this card first.`,
                        timestamp: new Date().toISOString()
                    };
                    broadcast(response);
                    return res.status(404).json(response);
                }

                const student = students[0];
                console.log('Found existing student:', student);

                // Get the most recent attendance record for today
                const [existingRecords] = await connection.promise().query(
                    'SELECT * FROM attendance WHERE student_id = ? AND DATE(time) = CURDATE() ORDER BY time DESC LIMIT 1',
                    [studentId]
                );

                console.log('Existing attendance records:', existingRecords);

                let status;
                let message;
                let attendanceId;

                if (existingRecords.length === 0) {
                    // No records for today, create a new check-in
                    console.log('No existing records, creating new check-in');
                    const [result] = await connection.promise().query(
                        'INSERT INTO attendance (student_id, time) VALUES (?, NOW())',
                        [studentId]
                    );
                    attendanceId = result.insertId;
                    status = 'Checked In';
                    message = `${student.name} has checked in`;
                } else {
                    const record = existingRecords[0];
                    if (!record.time_out) {
                        // Student is checked in, so check them out
                        console.log('Updating existing record with check-out time');
                        await connection.promise().query(
                            'UPDATE attendance SET time_out = NOW() WHERE id = ?',
                            [record.id]
                        );
                        attendanceId = record.id;
                        status = 'Checked Out';
                        message = `${student.name} has checked out`;
                    } else {
                        // Student is checked out, create a new check-in
                        console.log('Student checked out, creating new check-in');
                        const [result] = await connection.promise().query(
                            'INSERT INTO attendance (student_id, time) VALUES (?, NOW())',
                            [studentId]
                        );
                        attendanceId = result.insertId;
                        status = 'Checked In';
                        message = `${student.name} has checked in`;
                    }
                }

                console.log('Final status:', status);

                const response = {
                    success: true,
                    student: {
                        id: student.id,
                        name: student.name,
                        grade: student.grade
                    },
                    status,
                    message,
                    timestamp: new Date().toISOString()
                };

                // Broadcast the scan event
                broadcast({
                    type: 'scan',
                    ...response
                });

                res.json(response);

            } catch (error) {
                console.error('Error processing RFID scan:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

    } catch (error) {
        console.error('Error initializing hardware:', error);
    }
}

// Start hardware initialization
initializeHardware();

// Start the server
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0'; // Listen on all network interfaces
server.listen(PORT, HOST, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Access the webapp at:`);
    console.log(`- Local: http://localhost:${PORT}`);
    console.log(`- Network: http://<your-ip-address>:${PORT}`);
});