const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

class RFIDReader {
    constructor(port, baudRate = 9600) {
        this.port = port;
        this.baudRate = baudRate;
        this.serialPort = null;
        this.parser = null;
        this.onTagRead = null;
        this.lastTag = null;
        this.lastTagTime = 0;
    }

    async connect() {
        try {
            this.serialPort = new SerialPort({
                path: this.port,
                baudRate: this.baudRate,
                autoOpen: false
            });

            this.parser = this.serialPort.pipe(new ReadlineParser({ delimiter: '\r\n' }));

            this.serialPort.open((err) => {
                if (err) {
                    console.error('Error opening port:', err.message);
                    return;
                }
                console.log(`Connected to RFID reader on ${this.port}`);
            });

            this.parser.on('data', (data) => {
                console.log('Received data:', data); // Debug log
                
                // Check if the line contains "Card UID:"
                if (data.includes('Card UID:')) {
                    // Extract the UID from the line
                    const parts = data.split('Card UID:')[1].trim();
                    const tagId = parts.replace(/\s+/g, ''); // Remove all spaces
                    
                    const now = Date.now();
                    
                    // Prevent duplicate reads within 2 seconds
                    if (tagId !== this.lastTag || now - this.lastTagTime > 2000) {
                        this.lastTag = tagId;
                        this.lastTagTime = now;
                        
                        if (this.onTagRead) {
                            this.onTagRead(tagId);
                        }
                    }
                }
            });

            this.serialPort.on('error', (err) => {
                console.error('Serial port error:', err.message);
            });

            this.serialPort.on('close', () => {
                console.log('Serial port closed');
            });

        } catch (error) {
            console.error('Error connecting to RFID reader:', error);
            throw error;
        }
    }

    disconnect() {
        if (this.serialPort && this.serialPort.isOpen) {
            this.serialPort.close();
        }
    }

    setOnTagRead(callback) {
        this.onTagRead = callback;
    }
}

module.exports = RFIDReader; 