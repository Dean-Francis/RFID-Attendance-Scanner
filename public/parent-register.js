document.getElementById('parentRegisterForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const studentId = document.getElementById('studentId').value.trim();
    const relationship = document.getElementById('relationship').value;
    const errorMessage = document.getElementById('errorMessage');
    
    // Clear previous error
    errorMessage.textContent = '';
    
    // Validate inputs
    if (!username || !password || !name || !email || !phone || !studentId || !relationship) {
        errorMessage.textContent = 'All fields are required';
        return;
    }

    // Validate phone number format
    const phoneRegex = /^05[0-9][\s-]?[0-9]{3}[\s-]?[0-9]{4}$/;
    if (!phoneRegex.test(phone)) {
        errorMessage.textContent = 'Phone number must be in format: 051 123 4567';
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

// Add phone number formatting
document.getElementById('phone').addEventListener('input', function(e) {
    // Remove all non-digit characters
    let value = e.target.value.replace(/\D/g, '');
    
    // Format the number as 05X XXX XXXX
    if (value.length > 0) {
        // Ensure it starts with 05
        if (!value.startsWith('05')) {
            value = '05';
        } else {
            // Format as 05X XXX XXXX
            if (value.length > 3) {
                value = value.substring(0, 3) + ' ' + value.substring(3);
            }
            if (value.length > 7) {
                value = value.substring(0, 7) + ' ' + value.substring(7);
            }
            // Limit to 11 digits (05X XXX XXXX)
            if (value.replace(/\D/g, '').length > 10) {
                value = value.substring(0, 12);
            }
        }
    }
    
    // Update the input value
    e.target.value = value;
}); 