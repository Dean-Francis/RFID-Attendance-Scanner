const RFIDReader = require('./rfid-reader');
const config = require('./config');

// Create a new RFID reader instance
const reader = new RFIDReader(config.serialPort.port, config.serialPort.baudRate);

console.log('Starting RFID Reader Test...');
console.log('Press Ctrl+C to exit');

// Set up the tag read callback
reader.setOnTagRead((tagId) => {
    console.log('\n=== RFID Tag Detected ===');
    console.log(`Tag ID: ${tagId}`);
    console.log(`Time: ${new Date().toLocaleTimeString()}`);
    console.log('========================\n');
});

// Start the reader
reader.connect().then(() => {
    // Add error handling for serial port
    reader.serialPort.on('error', (err) => {
        console.error('Serial port error:', err);
    });

    // Add data event listener to see raw data
    reader.serialPort.on('data', (data) => {
        console.log('Raw data received:', data.toString());
    });
}).catch(error => {
    console.error('Failed to start reader:', error);
    process.exit(1);
});

// Handle process termination
process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    await reader.disconnect();
    process.exit(0);
}); 