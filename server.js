const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcrypt');
const session = require('express-session');
const jwt = require('jsonwebtoken');

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

// Initialize database tables
async function initializeTables() {
    try {
        // Drop the parent_student table if it exists
        await connection.promise().query('DROP TABLE IF EXISTS parent_student');
        
        // Create the parent_student table with correct structure
        const createParentStudentTable = `
            CREATE TABLE IF NOT EXISTS parent_student (
                parent_id INT,
                student_id VARCHAR(6),
                relationship VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (parent_id, student_id),
                FOREIGN KEY (parent_id) REFERENCES parents(id) ON DELETE CASCADE,
                FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE
            )`;
        
        await connection.promise().query(createParentStudentTable);
        console.log('Parent_student table recreated');

        // Create the relationship
        await connection.promise().query(
            'INSERT INTO parent_student (parent_id, student_id, relationship) VALUES (?, ?, ?)',
            [1, '444444', 'Guardian']
        );
        console.log('Parent-student relationship created');
    } catch (error) {
        console.error('Error initializing tables:', error);
    }
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
    
    // Create tables if they don't exist
    const createTeachersTable = `
        CREATE TABLE IF NOT EXISTS teachers (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(50) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`;
    
    const createStudentsTable = `
        CREATE TABLE IF NOT EXISTS students (
            id INT AUTO_INCREMENT PRIMARY KEY,
            student_id VARCHAR(6) NOT NULL UNIQUE,
            name VARCHAR(100) NOT NULL,
            grade VARCHAR(20) NOT NULL,
            parent_phone VARCHAR(20),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`;
    
    const createAttendanceTable = `
        CREATE TABLE IF NOT EXISTS attendance (
            id INT AUTO_INCREMENT PRIMARY KEY,
            student_id VARCHAR(6) NOT NULL,
            time DATETIME NOT NULL,
            time_out DATETIME,
            status VARCHAR(50) NOT NULL,
            FOREIGN KEY (student_id) REFERENCES students(student_id)
        )`;
    
    const createParentsTable = `
        CREATE TABLE IF NOT EXISTS parents (
            id INT PRIMARY KEY AUTO_INCREMENT,
            username VARCHAR(50) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            phone VARCHAR(20),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`;
    
    const createNotificationsTable = `
        CREATE TABLE IF NOT EXISTS notifications (
            id INT PRIMARY KEY AUTO_INCREMENT,
            parent_id INT,
            student_id INT,
            type VARCHAR(50) NOT NULL,
            message TEXT NOT NULL,
            is_read BOOLEAN DEFAULT false,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (parent_id) REFERENCES parents(id) ON DELETE CASCADE,
            FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
        )`;
    
    connection.query(createTeachersTable, (err) => {
        if (err) {
            console.error('Error creating teachers table:', err);
        } else {
            console.log('Teachers table created or already exists');
        }
    });
    
    connection.query(createStudentsTable, (err) => {
        if (err) {
            console.error('Error creating students table:', err);
        } else {
            console.log('Students table created or already exists');
            
            // Create test student if not exists
            connection.query(`
                INSERT IGNORE INTO students (student_id, name, grade, parent_phone) 
                VALUES ('444444', 'T45', '4A', '050 000 0000')
            `, (err) => {
                if (err) {
                    console.error('Error creating test student:', err);
                } else {
                    console.log('Test student created or already exists');
                }
            });
        }
    });
    
    connection.query(createAttendanceTable, (err) => {
        if (err) {
            console.error('Error creating attendance table:', err);
        } else {
            console.log('Attendance table created or already exists');
        }
    });
    
    connection.query(createParentsTable, (err) => {
        if (err) {
            console.error('Error creating parents table:', err);
        } else {
            console.log('Parents table created or already exists');
        }
    });
    
    // Call the initialization function
    initializeTables();
    
    connection.query(createNotificationsTable, (err) => {
        if (err) {
            console.error('Error creating notifications table:', err);
        } else {
            console.log('Notifications table created or already exists');
        }
    });
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
    connection.query(
        `SELECT a.*, s.name, s.grade, s.parent_phone 
         FROM attendance a 
         JOIN students s ON a.student_id = s.student_id 
         WHERE DATE(a.time) = CURDATE() 
         ORDER BY a.time DESC`,
        (err, results) => {
            if (err) {
                res.status(500).json({ message: err.message });
                return;
            }
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

// Add new student
app.post('/api/students', async (req, res) => {
    console.log('Received request body:', req.body);
    console.log('Request headers:', req.headers);
    console.log('Content-Type:', req.headers['content-type']);
    
    // Check if the request body is empty
    if (!req.body || Object.keys(req.body).length === 0) {
        console.error('Empty request body received');
        return res.status(400).json({ 
            error: 'Empty request body',
            details: 'No data was received in the request'
        });
    }
    
    // Extract and validate the data
    const studentData = {
        student_id: req.body.student_id?.toString().trim(),
        name: req.body.name?.trim(),
        grade: req.body.grade?.trim(),
        parent_phone: req.body.parent_phone?.trim()
    };

    console.log('Processed student data:', studentData);

    // Validate all required fields
    if (!studentData.student_id || !studentData.name || !studentData.grade || !studentData.parent_phone) {
        console.log('Missing required fields:', studentData);
        return res.status(400).json({ 
            error: 'All fields are required',
            details: {
                student_id: !studentData.student_id ? 'Student ID is required' : null,
                name: !studentData.name ? 'Name is required' : null,
                grade: !studentData.grade ? 'Grade is required' : null,
                parent_phone: !studentData.parent_phone ? 'Parent phone is required' : null
            }
        });
    }

    // Validate student ID format
    if (!/^\d{6}$/.test(studentData.student_id)) {
        return res.status(400).json({ 
            error: 'Invalid student ID format',
            details: 'Student ID must be 6 digits'
        });
    }

    // Validate phone number format
    const phoneRegex = /^05[0-9][\s-]?[0-9]{3}[\s-]?[0-9]{4}$/;
    if (!phoneRegex.test(studentData.parent_phone)) {
        return res.status(400).json({ 
            error: 'Invalid phone number format',
            details: 'Phone number must start with 05X followed by 7 digits. Spaces between groups are optional (e.g. 050 123 4567 or 0501234567)'
        });
    }

    // Format the phone number to ensure consistent storage
    studentData.parent_phone = studentData.parent_phone.replace(/[\s-]/g, ' ').replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3');

    try {
        console.log('Attempting to insert student into database with data:', studentData);
        const query = 'INSERT INTO students (student_id, name, grade, parent_phone) VALUES (?, ?, ?, ?)';
        const values = [
            studentData.student_id,
            studentData.name,
            studentData.grade,
            studentData.parent_phone
        ];
        console.log('Executing query with values:', values);
        
        connection.query(query, values, (error, results) => {
            if (error) {
                console.error('Database error:', error);
                if (error.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ 
                        error: 'Student ID already exists',
                        details: `Student ID ${studentData.student_id} is already registered`
                    });
                } else {
                    return res.status(500).json({ 
                        error: 'Database error',
                        details: error.message
                    });
                }
            }
            
            console.log('Student inserted successfully:', results);
            return res.status(201).json({ 
                message: 'Student added successfully',
                student: studentData
            });
        });
    } catch (error) {
        console.error('Error in add student endpoint:', error);
        return res.status(500).json({ 
            error: 'Internal server error',
            details: error.message
        });
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
        // Check if username already exists
        const [existingTeachers] = await connection.promise().query(
            'SELECT * FROM teachers WHERE username = ? OR email = ?',
            [username, email]
        );

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
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert new teacher
        await connection.promise().query(
            'INSERT INTO teachers (username, password, name, email) VALUES (?, ?, ?, ?)',
            [username, hashedPassword, name, email]
        );

        console.log('Teacher registered successfully:', { username, name, email });
        res.status(201).json({ message: 'Teacher registered successfully' });
    } catch (error) {
        console.error('Registration error:', error);
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
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
        // Get parent from database
        const [parents] = await connection.promise().query(
            'SELECT * FROM parents WHERE username = ?',
            [username]
        );

        if (parents.length === 0) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const parent = parents[0];
        const validPassword = await bcrypt.compare(password, parent.password);

        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        // Create JWT token
        const token = jwt.sign(
            { id: parent.id, username: parent.username },
            'your-secret-key',
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Login successful',
            parent: {
                id: parent.id,
                name: parent.name,
                email: parent.email
            },
            token
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'An error occurred during login' });
    }
});

// Parent registration
app.post('/api/parents/register', async (req, res) => {
    console.log('Parent registration request received:', req.body);
    
    const { username, password, name, email, phone, studentId, relationship } = req.body;
    
    // Validate required fields
    if (!username || !password || !name || !email || !phone || !studentId || !relationship) {
        console.error('Registration error: Missing required fields');
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        // Check if username or email already exists
        const [existingParents] = await connection.promise().query(
            'SELECT * FROM parents WHERE username = ? OR email = ?',
            [username, email]
        );

        if (existingParents.length > 0) {
            const isDuplicateUsername = existingParents.some(p => p.username === username);
            const isDuplicateEmail = existingParents.some(p => p.email === email);
            
            if (isDuplicateUsername) {
                return res.status(400).json({ error: 'Username already exists' });
            }
            if (isDuplicateEmail) {
                return res.status(400).json({ error: 'Email already exists' });
            }
        }

        // Check if student exists
        const [students] = await connection.promise().query(
            'SELECT * FROM students WHERE student_id = ?',
            [studentId]
        );

        if (students.length === 0) {
            return res.status(400).json({ error: 'Student ID not found' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Start transaction
        const conn = await connection.promise();
        await conn.beginTransaction();

        try {
            // Insert parent
            const [parentResult] = await conn.query(
                'INSERT INTO parents (username, password, name, email, phone) VALUES (?, ?, ?, ?, ?)',
                [username, hashedPassword, name, email, phone]
            );

            // Link parent to student using student_id
            await conn.query(
                'INSERT INTO parent_student (parent_id, student_id, relationship) VALUES (?, ?, ?)',
                [parentResult.insertId, studentId, relationship]
            );

            await conn.commit();
            console.log('Parent registered successfully:', { username, name, email });
            res.status(201).json({ message: 'Parent registered successfully' });
        } catch (error) {
            await conn.rollback();
            throw error;
        }
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'An error occurred during registration' });
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

// Get parent's student attendance for today
app.get('/api/parents/:parentId/attendance/today', async (req, res) => {
    try {
        console.log('Fetching attendance for parent:', req.params.parentId);
        
        // First check the parent-student relationship
        const [relationships] = await connection.promise().query(
            'SELECT student_id FROM parent_student WHERE parent_id = ?',
            [req.params.parentId]
        );
        console.log('Parent-student relationships:', relationships);

        if (relationships.length === 0) {
            console.log('No students found for parent');
            return res.json([]);
        }

        // Get attendance records
        const [attendance] = await connection.promise().query(
            `SELECT a.*, s.name, s.grade 
             FROM attendance a
             JOIN students s ON a.student_id = s.student_id
             WHERE a.student_id IN (
                SELECT student_id 
                FROM parent_student 
                WHERE parent_id = ?
             )
             AND DATE(a.time) = CURDATE()
             ORDER BY a.time DESC`,
            [req.params.parentId]
        );
        
        console.log('Found attendance records:', attendance);

        // Process the results to ensure correct status
        const processedAttendance = attendance.map(record => ({
            ...record,
            status: record.time_out ? 'Checked Out' : 'Checked In',
            time: new Date(record.time).toISOString(),
            time_out: record.time_out ? new Date(record.time_out).toISOString() : null
        }));
        
        console.log('Processed attendance records:', processedAttendance);
        res.json(processedAttendance);
    } catch (error) {
        console.error('Error fetching attendance:', error);
        res.status(500).json({ error: 'Failed to fetch attendance records' });
    }
});

// Get parent's notifications
app.get('/api/parents/:parentId/notifications', async (req, res) => {
    try {
        const [notifications] = await connection.promise().query(
            `SELECT * FROM notifications 
             WHERE parent_id = ?
             ORDER BY created_at DESC
             LIMIT 10`,
            [req.params.parentId]
        );
        
        res.json(notifications);
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
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

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something broke!' });
});

// Handle 404 errors
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser`);
});