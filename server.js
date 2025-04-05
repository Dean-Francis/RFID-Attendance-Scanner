const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Create MySQL connection using environment variables
const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
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
    const createStudentsTable = `
        CREATE TABLE IF NOT EXISTS students (
            id INT AUTO_INCREMENT PRIMARY KEY,
            student_id VARCHAR(6) UNIQUE NOT NULL,
            name VARCHAR(100) NOT NULL,
            grade VARCHAR(10) NOT NULL,
            parent_phone VARCHAR(20) NOT NULL
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
    
    connection.query(createStudentsTable, (err) => {
        if (err) {
            console.error('Error creating students table:', err);
        } else {
            console.log('Students table created or already exists');
        }
    });
    
    connection.query(createAttendanceTable, (err) => {
        if (err) {
            console.error('Error creating attendance table:', err);
        } else {
            console.log('Attendance table created or already exists');
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

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
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
            res.json(results);
        }
    );
});

// Add new student
app.post('/api/students', (req, res) => {
    const student = {
        student_id: req.body.studentId,
        name: req.body.name,
        grade: req.body.grade,
        parent_phone: req.body.parentPhone
    };
    
    connection.query('INSERT INTO students SET ?', student, (err, result) => {
        if (err) {
            res.status(400).json({ message: err.message });
            return;
        }
        res.status(201).json(student);
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser`);
}); 