document.getElementById('registerForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const errorMessage = document.getElementById('errorMessage');
    
    // Clear previous error
    errorMessage.textContent = '';
    
    // Validate inputs
    if (!username || !password || !name || !email) {
        errorMessage.textContent = 'All fields are required';
        return;
    }
    
    try {
        const response = await fetch('/api/teachers/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                username,
                password,
                name,
                email
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Registration successful
            alert('Registration successful! Please login.');
            window.location.href = '/login.html';
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