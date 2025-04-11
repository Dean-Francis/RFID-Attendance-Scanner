#include <SPI.h>
#include <MFRC522.h>

#define RST_PIN         9          // Configurable, see typical pin layout above
#define SS_PIN          10         // Configurable, see typical pin layout above

MFRC522 rfid(SS_PIN, RST_PIN);    // Create MFRC522 instance

void setup() {
    Serial.begin(9600);           // Initialize serial communications with the PC
    while (!Serial);              // Do nothing if no serial port is opened (added for Arduinos based on ATMEGA32U4)
    SPI.begin();                  // Init SPI bus
    rfid.PCD_Init();              // Init MFRC522
    rfid.PCD_DumpVersionToSerial();  // Show details of PCD - MFRC522 Card Reader details
    Serial.println(F("Scan PICC to see UID, type, and data blocks..."));
}

void loop() {
    // Reset the loop if no new card present on the sensor/reader
    if (!rfid.PICC_IsNewCardPresent()) {
        return;
    }

    // Verify if the NUID has been read
    if (!rfid.PICC_ReadCardSerial()) {
        return;
    }

    // Print UID
    Serial.print(F("Card UID:"));
    for (byte i = 0; i < rfid.uid.size; i++) {
        Serial.print(rfid.uid.uidByte[i] < 0x10 ? " 0" : " ");
        Serial.print(rfid.uid.uidByte[i], HEX);
    }
    Serial.println();

    // Halt PICC
    rfid.PICC_HaltA();

    // Stop encryption on PCD
    rfid.PCD_StopCrypto1();
} 