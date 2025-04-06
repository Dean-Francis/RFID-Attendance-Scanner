# RFID Attendance System

A web-based attendance tracking system using RFID technology for schools. The system allows teachers to track student attendance, generate reports, and provides a parent portal for monitoring their children's attendance.

## Features

- Real-time RFID card scanning for attendance
- Teacher dashboard for monitoring attendance
- Detailed attendance reports with export options (CSV/PDF)
- Parent portal for viewing child's attendance
- Battery and solar charging status monitoring
- Student management system
- Secure authentication for teachers and parents

## Technology Stack

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express.js
- Database: MySQL
- Authentication: JWT, bcrypt
- Additional Libraries: jsPDF for PDF generation

## Prerequisites

- Node.js (v14 or higher)
- MySQL (v8 or higher)
- Web browser with JavaScript enabled

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
   ```
   DB_HOST=localhost
   DB_USER=your_database_user
   DB_PASSWORD=your_database_password
   DB_NAME=rfid_attendance
   PORT=3000
   ```

4. Create the MySQL database:
   ```bash
   mysql -u root -p
   CREATE DATABASE rfid_attendance;
   ```

5. Start the server:
   ```bash
   node server.js
   ```

6. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

## Usage

### Teacher Portal

1. Register/Login through the teacher portal
2. Monitor real-time attendance
3. Add/manage students
4. Generate and export attendance reports
5. View system status

### Parent Portal

1. Register/Login through the parent portal
2. View child's attendance records
3. Receive notifications for check-in/check-out events

## Project Structure

```
├── public/
│   ├── index.html
│   ├── login.html
│   ├── reports.html
│   ├── style.css
│   ├── script.js
│   └── reports.js
├── server.js
├── package.json
└── .env
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- RFID technology documentation
- Express.js community
- MySQL community
- Contributors and testers

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
