# RFID Attendance System

![Node.js](https://img.shields.io/badge/Node.js-14.0.0-green)
![MySQL](https://img.shields.io/badge/MySQL-8.0-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)

A modern, web-based attendance tracking system using RFID technology for educational institutions.

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
git clone https://github.com/yourusername/rfid-attendance.git
cd rfid-attendance
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
