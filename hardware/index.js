const HardwareManager = require('./hardware-manager');
const config = require('./config');
const http = require('http');

// Create a new hardware manager instance
const hardwareManager = new HardwareManager();

// Function to send attendance data to the server
async function sendAttendanceData(tagId) {
    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/attendance/scan',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        }
    };

    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    resolve(response);
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.write(JSON.stringify({ tagId }));
        req.end();
    });
}

// Initialize the hardware manager
async function initializeHardware() {
    try {
        await hardwareManager.initialize();
        
        // Set up the tag read callback
        hardwareManager.setOnTagRead(async (tagId) => {
            console.log(`RFID Tag detected: ${tagId}`);
            try {
                const response = await sendAttendanceData(tagId);
                console.log('Attendance recorded:', response);
            } catch (error) {
                console.error('Error recording attendance:', error);
            }
        });

        console.log('Hardware system ready');
    } catch (error) {
        console.error('Failed to initialize hardware system:', error);
    }
}

// Handle process termination
process.on('SIGINT', async () => {
    console.log('Shutting down hardware system...');
    await hardwareManager.shutdown();
    process.exit(0);
});

// Start the hardware system
initializeHardware(); 