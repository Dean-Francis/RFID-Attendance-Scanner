document.getElementById('parentLoginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    console.log('Login form submitted');
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const errorMessage = document.getElementById('errorMessage');
    
    // Clear previous error
    errorMessage.textContent = '';
    
    // Validate inputs
    if (!username || !password) {
        errorMessage.textContent = 'Username and password are required';
        return;
    }
    
    try {
        console.log('Sending login request...');
        const response = await fetch('/api/parents/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                username,
                password
            })
        });
        
        console.log('Response received:', response.status);
        const data = await response.json();
        console.log('Response data:', data);
        
        if (response.ok) {
            console.log('Login successful, storing data...');
            // Store parent info in localStorage
            localStorage.setItem('parentId', data.parent.id);
            localStorage.setItem('parentName', data.parent.name);
            localStorage.setItem('parentToken', data.token);
            
            console.log('Redirecting to dashboard...');
            // Redirect to parent dashboard
            window.location.href = '/parent-dashboard.html';
        } else {
            // Display error message
            errorMessage.textContent = data.error || 'Login failed. Please try again.';
            console.error('Login failed:', data);
        }
    } catch (error) {
        console.error('Error:', error);
        errorMessage.textContent = 'An error occurred during login. Please try again.';
    }
}); 