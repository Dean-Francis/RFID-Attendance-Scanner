<?php
require_once 'db_connect.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Get all students
    try {
        $stmt = $pdo->query("SELECT * FROM students");
        $students = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($students);
    } catch(PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to fetch students']);
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Add new student
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['student_id']) || !isset($data['name']) || !isset($data['grade']) || !isset($data['parent_phone'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing required fields']);
        exit;
    }

    try {
        $stmt = $pdo->prepare("INSERT INTO students (student_id, name, grade, parent_phone) VALUES (?, ?, ?, ?)");
        $stmt->execute([$data['student_id'], $data['name'], $data['grade'], $data['parent_phone']]);
        echo json_encode(['message' => 'Student added successfully']);
    } catch(PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to add student']);
    }
}
?> 