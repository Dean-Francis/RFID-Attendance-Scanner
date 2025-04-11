const express = require('express');
const router = express.Router();
const db = require('../db');

// Endpoint for scanning RFID tags
router.post('/scan', async (req, res) => {
    try {
        const { tagId } = req.body;

        if (!tagId) {
            return res.status(400).json({ error: 'Tag ID is required' });
        }

        // Find student by RFID tag
        const [students] = await db.query(
            'SELECT * FROM students WHERE rfid_tag = ?',
            [tagId]
        );

        if (students.length === 0) {
            return res.status(404).json({ error: 'Student not found' });
        }

        const student = students[0];

        // Check if student has already checked in today
        const [existingRecords] = await db.query(
            'SELECT * FROM attendance WHERE student_id = ? AND DATE(time_in) = CURDATE()',
            [student.id]
        );

        let status;
        let message;

        if (existingRecords.length === 0) {
            // First check-in of the day
            await db.query(
                'INSERT INTO attendance (student_id, time_in) VALUES (?, NOW())',
                [student.id]
            );
            status = 'Checked In';
            message = `${student.name} has checked in`;
        } else {
            const record = existingRecords[0];
            if (!record.time_out) {
                // Check out
                await db.query(
                    'UPDATE attendance SET time_out = NOW() WHERE id = ?',
                    [record.id]
                );
                status = 'Checked Out';
                message = `${student.name} has checked out`;
            } else {
                // Already checked out
                status = 'Already Checked Out';
                message = `${student.name} has already checked out today`;
            }
        }

        res.json({
            success: true,
            student: {
                id: student.id,
                name: student.name,
                grade: student.grade
            },
            status,
            message
        });

    } catch (error) {
        console.error('Error processing RFID scan:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router; 