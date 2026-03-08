
// Load configuration
if (typeof CONFIG === 'undefined') {
    // If config not loaded, use default
    var API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://127.0.0.1:5000/api'
        : 'https://your-backend-url.onrender.com/api';  // Update this later
}




const API_URL = 'http://127.0.0.1:5000/api';




async function apiCall(endpoint, method = 'GET', data = null) {
    const url = `${API_URL}${endpoint}`;
    console.log(`Making ${method} request to: ${url}`);
    
    const options = {
        method,
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
        },
        mode: 'cors'
    };
    
    if (data) {
        options.body = JSON.stringify(data);
    }
    
    try {
        const response = await fetch(url, options);
        console.log('Response status:', response.status);
        
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('Response data:', result);
        return result;
    } catch (error) {
        console.error('API Error Details:', error);
        throw error;
    }
}

function showAlert(message, type) {
    
    const existingAlerts = document.querySelectorAll('.alert');
    existingAlerts.forEach(alert => alert.remove());
    
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    alertDiv.style.cssText = `
        padding: 12px;
        border-radius: 5px;
        margin-bottom: 20px;
        text-align: center;
        animation: slideIn 0.3s ease;
    `;
    
    if (type === 'error') {
        alertDiv.style.background = '#fee2e2';
        alertDiv.style.color = '#dc2626';
        alertDiv.style.border = '1px solid #fecaca';
    } else {
        alertDiv.style.background = '#dcfce7';
        alertDiv.style.color = '#16a34a';
        alertDiv.style.border = '1px solid #bbf7d0';
    }
    
    const container = document.querySelector('.container, .dashboard-container');
    if (container) {
        container.insertBefore(alertDiv, container.firstChild);
        
        setTimeout(() => {
            alertDiv.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => alertDiv.remove(), 300);
        }, 3000);
    }
}


async function checkAuth() {
    try {
        const result = await apiCall('/check-auth');
        return result.authenticated ? result.user : null;
    } catch (error) {
        console.log('Not authenticated:', error.message);
        return null;
    }
}


if (window.location.pathname.includes('register.html')) {
    document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        if (password !== confirmPassword) {
            showAlert('Passwords do not match', 'error');
            return;
        }
        
        try {
            const result = await apiCall('/register', 'POST', { username, email, password });
            console.log('Registration success:', result);
            showAlert('Registration successful! Redirecting to login...', 'success');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        } catch (error) {
            console.error('Registration error:', error);
            showAlert(error.message || 'Registration failed', 'error');
        }
    });
}


if (window.location.pathname.includes('login.html')) {
    document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        try {
            const result = await apiCall('/login', 'POST', { username, password });
            console.log('Login success:', result);
            showAlert('Login successful! Redirecting to dashboard...', 'success');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
        } catch (error) {
            console.error('Login error:', error);
            showAlert(error.message || 'Login failed', 'error');
        }
    });
}


if (window.location.pathname.includes('dashboard.html')) {
   
    checkAuth().then(user => {
        if (!user) {
            window.location.href = 'login.html';
        } else {
            document.getElementById('username').textContent = user.username;
            loadStudents();
        }
    }).catch(() => {
        window.location.href = 'login.html';
    });
    
  
    document.getElementById('logoutBtn')?.addEventListener('click', async () => {
        try {
            await apiCall('/logout', 'POST');
            window.location.href = 'login.html';
        } catch (error) {
            showAlert('Error logging out', 'error');
        }
    });
    
   
    document.getElementById('addStudentForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('studentName').value;
        const standard = document.getElementById('studentStandard').value;
        const roll_number = document.getElementById('studentRoll').value;
        
        if (!name.trim() || !standard.trim() || !roll_number.trim()) {
            showAlert('Please fill in all fields', 'error');
            return;
        }
        
        try {
            await apiCall('/students', 'POST', { name, standard, roll_number });
            document.getElementById('studentName').value = '';
            document.getElementById('studentStandard').value = '';
            document.getElementById('studentRoll').value = '';
            loadStudents();
            showAlert('Student added successfully!', 'success');
        } catch (error) {
            showAlert('Error adding student: ' + error.message, 'error');
        }
    });
    
   
    async function loadStudents() {
        try {
            const students = await apiCall('/students');
            displayStudents(students);
            updateStats(students);
        } catch (error) {
            console.error('Error loading students:', error);
            showAlert('Error loading students', 'error');
        }
    }
    
  
    function updateStats(students) {
        const totalStudents = document.getElementById('totalStudents');
        const uniqueClasses = document.getElementById('uniqueClasses');
        
        if (totalStudents) {
            totalStudents.textContent = students.length;
        }
        
        if (uniqueClasses) {
            const classes = new Set(students.map(s => s.standard));
            uniqueClasses.textContent = classes.size;
        }
    }
    

    function displayStudents(students) {
        const tableBody = document.getElementById('studentsTableBody');
        if (!tableBody) return;
        
        tableBody.innerHTML = '';
        
        if (students.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `<td colspan="4" style="text-align: center; padding: 30px; color: #6b7280;">No students added yet. Add your first student above!</td>`;
            tableBody.appendChild(row);
            return;
        }
        
       
        students.sort((a, b) => {
            if (a.roll_number < b.roll_number) return -1;
            if (a.roll_number > b.roll_number) return 1;
            return 0;
        });
        
        students.forEach(student => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${student.roll_number}</strong></td>
                <td>${student.name}</td>
                <td>${student.standard}</td>
                <td>
                    <div class="action-buttons">
                        <button class="edit-btn" onclick="editStudent(${student.id}, '${student.name}', '${student.standard}', '${student.roll_number}')">Edit</button>
                        <button class="delete-btn" onclick="deleteStudent(${student.id})">Delete</button>
                    </div>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }
    
    
    window.editStudent = async (id, currentName, currentStandard, currentRoll) => {
        const newName = prompt('Enter new name:', currentName);
        if (newName === null) return;
        
        const newStandard = prompt('Enter new standard:', currentStandard);
        if (newStandard === null) return;
        
        const newRoll = prompt('Enter new roll number:', currentRoll);
        if (newRoll === null) return;
        
        if (!newName.trim() || !newStandard.trim() || !newRoll.trim()) {
            showAlert('All fields are required', 'error');
            return;
        }
        
        try {
            await apiCall(`/students/${id}`, 'PUT', { 
                name: newName, 
                standard: newStandard, 
                roll_number: newRoll 
            });
            loadStudents();
            showAlert('Student updated successfully!', 'success');
        } catch (error) {
            showAlert('Error updating student: ' + error.message, 'error');
        }
    };
    

    window.deleteStudent = async (id) => {
        if (confirm('Are you sure you want to delete this student?')) {
            try {
                await apiCall(`/students/${id}`, 'DELETE');
                loadStudents();
                showAlert('Student deleted successfully!', 'success');
            } catch (error) {
                showAlert('Error deleting student', 'error');
            }
        }
    };
}

const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateY(-20px);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateY(0);
            opacity: 1;
        }
        to {
            transform: translateY(-20px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);