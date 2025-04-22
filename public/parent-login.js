document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('parentLoginForm');
    const errorMessage = document.getElementById('errorMessage');

    if (!loginForm) {
        console.error('Login form not found');
        return;
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        try {
            const response = await fetch('/api/parents/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Store auth data in localStorage
                localStorage.setItem('parentToken', data.token);
                localStorage.setItem('parentId', data.parent.id);
                localStorage.setItem('parentName', data.parent.name);
                
                // Redirect to dashboard
                window.location.href = '/parent-dashboard.html';
            } else {
                // Show error message
                errorMessage.textContent = data.error || 'Login failed';
                errorMessage.style.display = 'block';
            }
        } catch (error) {
            console.error('Login error:', error);
            errorMessage.textContent = 'An error occurred during login';
            errorMessage.style.display = 'block';
        }
    });
}); 