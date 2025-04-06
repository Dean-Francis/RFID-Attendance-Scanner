const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Create MySQL connection
const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

// Hash the password and insert the user
const username = 'admin'; // Replace with your desired username
const password = 'admin123'; // Replace with your desired password

bcrypt.hash(password, 10, (err, hashedPassword) => {
    if (err) {
        console.error('Error hashing password:', err);
        return;
    }

    const query = 'INSERT INTO users (username, password) VALUES (?, ?)';
    connection.query(query, [username, hashedPassword], (err, results) => {
        if (err) {
            console.error('Error inserting user:', err);
        } else {
            console.log('User added successfully:', results);
        }
        connection.end();
    });
});
