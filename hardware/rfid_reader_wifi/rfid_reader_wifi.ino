#include <SPI.h>
#include <MFRC522.h>
#include <WiFiS3.h>

// WiFi credentials
const char* ssid = "ETIC1D534-2G";     // Replace with your WiFi network name
const char* password = "7sb34eK6NM";  // Replace with your WiFi password

// Static IP configuration
IPAddress staticIP(192, 168, 1, 100);  // Choose an IP that's not in use on your network
IPAddress gateway(192, 168, 1, 1);     // Your router's IP address
IPAddress subnet(255, 255, 255, 0);    // Common subnet mask
IPAddress dns(8, 8, 8, 8);             // Google's DNS server

// Server details
const char* server = "192.168.1.68";    // Replace with your server's IP address
const int port = 3000;                    // Match your server's port
const char* endpoint = "/index.html";     // Changed back to the working endpoint

// RFID Reader pins
#define RST_PIN         9
#define SS_PIN          10

MFRC522 rfid(SS_PIN, RST_PIN);
WiFiClient client;

void setup() {
  // Give more time for Serial to initialize
  delay(3000);
  
  Serial.begin(9600);
  Serial.println("Serial communication started");
  
  // Wait longer for serial port to connect
  while (!Serial) {
    delay(100);
    Serial.println("Waiting for Serial connection...");
  }
  
  Serial.println("Starting setup...");
  
  // Initialize RFID reader
  Serial.println("Initializing RFID reader...");
  SPI.begin();
  rfid.PCD_Init();
  Serial.println("RFID reader initialized");
  
  // Configure static IP
  WiFi.config(staticIP, gateway, subnet, dns);
  
  // Connect to WiFi
  Serial.print("Attempting to connect to SSID: ");
  Serial.println(ssid);
  
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nConnected to WiFi!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
    Serial.print("Signal Strength (RSSI): ");
    Serial.println(WiFi.RSSI());
    
    // Additional network information
    Serial.print("Gateway: ");
    Serial.println(WiFi.gatewayIP());
    Serial.print("Subnet Mask: ");
    Serial.println(WiFi.subnetMask());
    
    // Test server connection
    Serial.println("\nTesting server connection...");
    if (client.connect(server, port)) {
      Serial.println("Successfully connected to server!");
      client.stop();
    } else {
      Serial.println("Failed to connect to server. Please check:");
      Serial.println("1. Server IP address is correct");
      Serial.println("2. Server is running");
      Serial.println("3. Port 3000 is open");
    }
  } else {
    Serial.println("\nFailed to connect to WiFi");
    Serial.print("Status: ");
    switch(WiFi.status()) {
      case WL_IDLE_STATUS:
        Serial.println("Idle");
        break;
      case WL_NO_SSID_AVAIL:
        Serial.println("No SSID Available");
        break;
      case WL_CONNECT_FAILED:
        Serial.println("Connection Failed");
        break;
      case WL_CONNECTION_LOST:
        Serial.println("Connection Lost");
        break;
      case WL_DISCONNECTED:
        Serial.println("Disconnected");
        break;
      default:
        Serial.println("Unknown");
        break;
    }
  }
}

void loop() {
  // Look for new cards
  if (rfid.PICC_IsNewCardPresent()) {
    Serial.println("Card detected!");
    
    if (rfid.PICC_ReadCardSerial()) {
      Serial.println("Card serial number read successfully");
      
      String tagId = "";
      
      // Convert UID to string
      for (byte i = 0; i < rfid.uid.size; i++) {
        tagId += (rfid.uid.uidByte[i] < 0x10 ? "0" : "");
        tagId += String(rfid.uid.uidByte[i], HEX);
      }
      
      Serial.print("Card ID: ");
      Serial.println(tagId);
      
      // Send to server
      Serial.println("Attempting to connect to server...");
      
      if (client.connect(server, port)) {
        Serial.println("Connected to server");
        
        // Create request and payload first
        String jsonPayload = "{\"tagId\":\"" + tagId + "\"}";
        String request = "POST " + String(endpoint) + " HTTP/1.1\r\n";
        request += "Host: " + String(server) + "\r\n";
        request += "Content-Type: application/json\r\n";
        request += "Content-Length: " + String(jsonPayload.length()) + "\r\n";
        request += "Connection: close\r\n\r\n";
        request += jsonPayload;
        
        // Print full request for debugging
        Serial.println("Sending request:");
        Serial.println(request);
        
        // Send the request
        client.print(request);
        
        Serial.println("Request sent to server");
        
        // Wait for response with timeout
        unsigned long startTime = millis();
        String response = "";
        bool headersPrinted = false;
        
        while (client.connected() && (millis() - startTime) < 5000) {
          while (client.available()) {
            char c = client.read();
            response += c;
            
            // Print headers once we have them
            if (!headersPrinted && response.indexOf("\r\n\r\n") > 0) {
              Serial.println("Response headers:");
              Serial.println(response);
              headersPrinted = true;
              response = ""; // Clear to collect body
            }
          }
        }
        
        // Print response body if any
        if (response.length() > 0) {
          Serial.println("Response body:");
          Serial.println(response);
        }
        
        client.stop();
        Serial.println("Disconnected from server");
      } else {
        Serial.println("Connection to server failed");
      }
    } else {
      Serial.println("Failed to read card serial number");
    }
    
    // Halt PICC
    rfid.PICC_HaltA();
    rfid.PCD_StopCrypto1();
    Serial.println("Card processing complete");
  }
  
  delay(50); // Reduced delay to 50ms
} 