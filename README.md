# RFID Attendance System

A web-based attendance tracking system using RFID technology. The system allows schools to track student attendance in real-time using RFID cards, with separate portals for teachers and parents.

## Features

- Real-time attendance tracking using RFID cards
- Separate login portals for teachers and parents
- Live attendance updates via WebSocket
- Detailed attendance reports and analytics
- Parent notifications for student check-in/check-out
- Dark mode support
- Responsive design for all devices

## Technology Stack

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js, Express.js
- **Database**: MySQL
- **Real-time Updates**: WebSocket (ws)
- **Authentication**: JWT, bcrypt
- **RFID Communication**: WiFi-based RFID reader integration

## Prerequisites

- Node.js (v14 or higher)
- MySQL (v5.7 or higher)
- RFID Reader Hardware (compatible with WiFi)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/rfid-attendance-system.git
   cd rfid-attendance-system
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```env
   DB_HOST=localhost
   DB_USER=your_database_user
   DB_PASSWORD=your_database_password
   DB_NAME=rfid_attendance
   JWT_SECRET=your_jwt_secret
   PORT=3000
   ```

4. Initialize the database:
   ```bash
   # The tables will be created automatically when you first run the server
   ```

5. Start the server:
   ```bash
   node server.js
   ```

6. Access the application:
   - Open `http://localhost:3000` in your browser
   - Teacher portal: `http://localhost:3000/login.html`
   - Parent portal: `http://localhost:3000/parent-login.html`

## Project Structure

```
├── public/                 # Static files
│   ├── styles.css         # Global styles
│   ├── login.html         # Teacher login page
│   ├── parent-login.html  # Parent login page
│   └── ...               # Other frontend files
├── hardware/              # RFID hardware integration
├── server.js             # Main server file
├── package.json          # Project dependencies
└── README.md            # Project documentation
```

## Security Features

- Password hashing using bcrypt
- JWT-based authentication
- Input validation and sanitization
- Secure session handling
- CORS protection

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Thanks to all contributors who have helped with the project
- Special thanks to the open-source community for the tools and libraries used

## 🔒 Security

- Never commit the `.env` file to version control
- Use strong passwords with a mix of uppercase, lowercase, numbers, and special characters
- Change default database credentials
- Regularly update dependencies to patch security vulnerabilities
- Use environment variables for all sensitive information
- Implement proper access controls
- Regularly backup your database

## 🚀 Features

- 📱 Real-time RFID card scanning
- 📊 Automated attendance tracking
- 📱 Parent notifications via SMS
- 📈 Detailed attendance reports
- 👥 Student management system
- 🔒 Teacher access control
- ☀️ Solar-powered hardware integration
- 📱 Responsive web interface

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript
- **Backend**: Node.js, Express.js
- **Database**: MySQL
- **Hardware**: RFID Scanner, Solar Panel

## 📋 Prerequisites

- Node.js (v14 or higher)
- MySQL (v8.0 or higher)
- RFID Scanner hardware
- Solar Panel (optional)

## 🚀 Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/rfid-attendance-system.git
cd rfid-attendance-system
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```
Edit `.env` with your credentials:
```
DB_HOST=localhost
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=rfid_attendance
PORT=3000
```

4. Set up the database:
```sql
CREATE DATABASE rfid_attendance;
```

5. Start the server:
```bash
node server.js
```

## 🔧 Configuration

- Configure RFID scanner settings in `server.js`
- Set up SMS notifications in `script.js`
- Customize UI in `style.css`


## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request


## 📞 Support

For support, email [deanfrancistolero@gmail.com] or open an issue in the repository.

## 🙏 Acknowledgments
