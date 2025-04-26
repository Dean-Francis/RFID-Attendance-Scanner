document.getElementById('parentRegisterForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const studentId = document.getElementById('studentId').value.trim();
    const cardId = document.getElementById('cardId').value.trim();
    const relationship = document.getElementById('relationship').value;
    const errorMessage = document.getElementById('errorMessage');
    
    // Clear previous error
    errorMessage.textContent = '';
    
    // Validate inputs
    if (!username || !password || !name || !email || !phone || !relationship) {
        errorMessage.textContent = 'All fields except Student ID or Card ID are required';
        return;
    }

    // Validate that at least one ID is provided
    if (!studentId && !cardId) {
        errorMessage.textContent = 'Either Student ID or Card ID must be provided';
        return;
    }
    
    try {
        const response = await fetch('/api/parents/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                username,
                password,
                name,
                email,
                phone,
                studentId,
                cardId,
                relationship
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Registration successful
            alert(`Registration successful! Your account has been linked to ${data.studentName}. Please login to access your account.`);
            window.location.href = '/parent-login.html';
        } else {
            // Display error message
            errorMessage.textContent = data.error || 'Registration failed. Please try again.';
            console.error('Registration failed:', data);
        }
    } catch (error) {
        console.error('Error:', error);
        errorMessage.textContent = 'An error occurred during registration. Please try again.';
    }
}); 