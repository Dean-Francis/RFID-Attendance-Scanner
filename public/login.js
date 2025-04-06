document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('errorMessage');
    
    try {
        const response = await fetch('/api/teachers/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Store the token in localStorage
            localStorage.setItem('teacherToken', data.token);
            localStorage.setItem('teacherName', data.teacher.name);
            localStorage.setItem('teacherId', data.teacher.id);
            
            // Redirect to the dashboard
            window.location.href = '/index.html';
        } else {
            errorMessage.textContent = data.error || 'Login failed';
        }
    } catch (error) {
        console.error('Error:', error);
        errorMessage.textContent = 'An error occurred during login';
    }
}); 