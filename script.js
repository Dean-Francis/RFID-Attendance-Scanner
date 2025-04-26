// Add new student form handler
addStudentForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    console.log('Form submitted');
    
    const studentId = document.getElementById('newStudentId').value;
    const name = document.getElementById('newStudentName').value;
    const grade = document.getElementById('newStudentGrade').value;
    const parentPhone = document.getElementById('newParentPhone').value;
    
    // Validate student ID is not empty
    if (!studentId) {
        messageDiv.textContent = 'Student ID is required';
        messageDiv.className = 'message error';
        return;
    }
    
    // Check if student ID already exists
    try {
        const checkResponse = await fetch(`${API_BASE_URL}/students/${studentId}`);
        if (checkResponse.ok) {
            messageDiv.textContent = 'This Student ID already exists. Please use a different ID.';
            messageDiv.className = 'message error';
            return;
        }
    } catch (error) {
        console.error('Error checking student ID:', error);
    }
    
    // Validate UAE phone number format
    const phoneRegex = /^05[0-9][\s-]?[0-9]{3}[\s-]?[0-9]{4}$/;
    if (!phoneRegex.test(parentPhone)) {
        messageDiv.textContent = 'Phone number must start with 05X followed by 7 digits (e.g. 050 123 4567 or 0501234567)';
        messageDiv.className = 'message error';
        return;
    }

    const formData = {
        student_id: studentId.trim(),
        name: name.trim(),
        grade: grade.trim(),
        parent_phone: parentPhone.trim()
    };
    console.log('Form data:', formData);

    try {
        console.log('Sending request to /api/students');
        const response = await fetch(`${API_BASE_URL}/students`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        console.log('Request sent with data:', JSON.stringify(formData));
        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('Response data:', data);

        if (response.ok) {
            messageDiv.textContent = 'Student added successfully!';
            messageDiv.className = 'message success';
            addStudentForm.reset();
            setTimeout(() => {
                modal.style.display = 'none';
                messageDiv.textContent = '';
                document.body.style.overflow = 'auto';
            }, 2000);
        } else {
            messageDiv.textContent = data.error || 'Error adding student';
            messageDiv.className = 'message error';
        }
    } catch (error) {
        console.error('Error:', error);
        messageDiv.textContent = 'Error connecting to server';
        messageDiv.className = 'message error';
    }
}); 