module.exports = {
    // Serial port settings for Arduino Uno R4 WiFi
    serialPort: {
        // On Windows, it's usually COM3, COM4, etc.
        // On Linux/Mac, it's usually /dev/ttyUSB0 or /dev/ttyACM0
        port: 'COM4', // Change this to match your Arduino's port
        baudRate: 9600, // Must match the baud rate in the Arduino sketch
    },

    // RFID reader settings
    reader: {
        // Timeout in milliseconds for tag reads
        readTimeout: 1000,
        
        // Minimum time between consecutive reads (to prevent duplicate reads)
        debounceTime: 2000, // 2 seconds
        
        // Tag format settings
        tagFormat: {
            // The Arduino sends tags in the format "Card UID: XX XX XX XX"
            prefix: 'Card UID:',
            suffix: '',
            
            // Keep the tag ID in hexadecimal format
            isHex: false,
        }
    }
}; 