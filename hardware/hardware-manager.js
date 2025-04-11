const RFIDReader = require('./rfid-reader');
const config = require('./config');

class HardwareManager {
    constructor() {
        this.reader = null;
        this.lastReadTime = 0;
        this.isConnected = false;
    }

    async initialize() {
        try {
            this.reader = new RFIDReader(
                config.serialPort.port,
                config.serialPort.baudRate
            );

            await this.reader.connect();
            this.isConnected = true;
            console.log('Hardware manager initialized successfully');

            // Set up the tag read callback
            this.reader.setOnTagRead(this.handleTagRead.bind(this));

        } catch (error) {
            console.error('Failed to initialize hardware:', error);
            this.isConnected = false;
        }
    }

    async handleTagRead(tagId) {
        // Prevent duplicate reads within the debounce time
        const now = Date.now();
        if (now - this.lastReadTime < config.reader.debounceTime) {
            return;
        }
        this.lastReadTime = now;

        // Format the tag ID according to configuration
        let formattedTagId = tagId;
        
        // Remove prefix and suffix if configured
        if (config.reader.tagFormat.prefix && formattedTagId.startsWith(config.reader.tagFormat.prefix)) {
            formattedTagId = formattedTagId.slice(config.reader.tagFormat.prefix.length);
        }
        if (config.reader.tagFormat.suffix && formattedTagId.endsWith(config.reader.tagFormat.suffix)) {
            formattedTagId = formattedTagId.slice(0, -config.reader.tagFormat.suffix.length);
        }

        // Convert from hex to decimal if needed
        if (config.reader.tagFormat.isHex) {
            formattedTagId = parseInt(formattedTagId, 16).toString();
        }

        // Emit the tag read event
        if (this.onTagRead) {
            this.onTagRead(formattedTagId);
        }
    }

    setOnTagRead(callback) {
        this.onTagRead = callback;
    }

    async shutdown() {
        if (this.reader) {
            this.reader.disconnect();
            this.isConnected = false;
        }
    }
}

module.exports = HardwareManager; 