# RC522 RFID Reader - Arduino Uno R4 WiFi Wiring Guide

## Pin Connections

RC522 Pin | Arduino Uno R4 WiFi Pin
----------|------------------------
SDA (SS)  | D10
SCK       | D13
MOSI      | D11
MISO      | D12
IRQ       | Not connected
GND       | GND
RST       | D9
3.3V      | 3.3V

## Important Notes

1. **Power Supply**:
   - The RC522 must be powered with 3.3V, NOT 5V
   - Using 5V will damage the RC522 module

2. **SPI Communication**:
   - The RC522 uses SPI communication
   - The default SPI pins on Arduino Uno R4 WiFi are:
     - MOSI: D11
     - MISO: D12
     - SCK: D13
     - SS: D10 (configurable)

3. **Reset Pin**:
   - The RST pin is connected to D9
   - This pin is used to reset the RC522 module

## Wiring Steps

1. Connect the RC522's 3.3V pin to Arduino's 3.3V pin
2. Connect the RC522's GND pin to Arduino's GND pin
3. Connect the RC522's RST pin to Arduino's D9
4. Connect the RC522's SDA (SS) pin to Arduino's D10
5. Connect the RC522's SCK pin to Arduino's D13
6. Connect the RC522's MOSI pin to Arduino's D11
7. Connect the RC522's MISO pin to Arduino's D12

## Testing

1. Upload the `rfid_reader.ino` sketch to your Arduino
2. Open the Serial Monitor (Tools -> Serial Monitor)
3. Set the baud rate to 9600
4. When you place an RFID card near the reader, you should see the card's UID printed in the Serial Monitor 