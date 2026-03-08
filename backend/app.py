from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
import sys
import os

# Add this to help with imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from models import db, User, Student

# Initialize Flask app
app = Flask(__name__)

# Configuration - Use environment variables in production
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'your-super-secret-key-change-this-12345')
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///database.db').replace('postgres://', 'postgresql://')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_SECURE'] = True  # Set to True in production

# Get frontend URL from environment variable
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:8000')

# Initialize extensions with production frontend URL
CORS(app, supports_credentials=True, origins=[FRONTEND_URL])
db.init_app(app)

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# Create tables
with app.app_context():
    db.create_all()
    print("Database created successfully!")

# ============= HOME ROUTE =============
@app.route('/')
def home():
    return jsonify({
        'message': 'Student Management API is running',
        'endpoints': {
            'register': '/api/register (POST)',
            'login': '/api/login (POST)',
            'logout': '/api/logout (POST)',
            'check-auth': '/api/check-auth (GET)',
            'students': '/api/students (GET, POST, PUT, DELETE)'
        }
    })

# ============= AUTH ROUTES =============
@app.route('/api/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')
        
        if not username or not email or not password:
            return jsonify({'error': 'Missing required fields'}), 400
        
        # Check if user exists
        if User.query.filter_by(username=username).first():
            return jsonify({'error': 'Username already exists'}), 400
        if User.query.filter_by(email=email).first():
            return jsonify({'error': 'Email already exists'}), 400
        
        # Create new user
        hashed_password = generate_password_hash(password, method='pbkdf2:sha256')
        new_user = User(username=username, email=email, password=hashed_password)
        db.session.add(new_user)
        db.session.commit()
        
        return jsonify({'message': 'User created successfully'}), 201
    except Exception as e:
        print(f"Error in register: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return jsonify({'error': 'Missing username or password'}), 400
        
        user = User.query.filter_by(username=username).first()
        
        if user and check_password_hash(user.password, password):
            login_user(user)
            return jsonify({
                'message': 'Login successful',
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email
                }
            }), 200
        else:
            return jsonify({'error': 'Invalid credentials'}), 401
    except Exception as e:
        print(f"Error in login: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/logout', methods=['POST'])
@login_required
def logout():
    logout_user()
    return jsonify({'message': 'Logged out successfully'}), 200

@app.route('/api/check-auth', methods=['GET'])
def check_auth():
    if current_user.is_authenticated:
        return jsonify({
            'authenticated': True,
            'user': {
                'id': current_user.id,
                'username': current_user.username,
                'email': current_user.email
            }
        })
    return jsonify({'authenticated': False}), 401

# ============= STUDENT CRUD ROUTES =============
@app.route('/api/students', methods=['GET'])
@login_required
def get_students():
    try:
        students = Student.query.filter_by(user_id=current_user.id).all()
        students_list = [{
            'id': student.id,
            'name': student.name,
            'standard': student.standard,
            'roll_number': student.roll_number,
            'created_at': student.created_at.isoformat() if student.created_at else None
        } for student in students]
        return jsonify(students_list)
    except Exception as e:
        print(f"Error in get_students: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/students', methods=['POST'])
@login_required
def create_student():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        name = data.get('name')
        standard = data.get('standard')
        roll_number = data.get('roll_number')
        
        if not name or not standard or not roll_number:
            return jsonify({'error': 'Name, standard, and roll number are required'}), 400
        
        # Check if roll number already exists for this user
        existing_student = Student.query.filter_by(user_id=current_user.id, roll_number=roll_number).first()
        if existing_student:
            return jsonify({'error': 'Roll number already exists'}), 400
        
        new_student = Student(
            name=name,
            standard=standard,
            roll_number=roll_number,
            user_id=current_user.id
        )
        db.session.add(new_student)
        db.session.commit()
        
        return jsonify({
            'id': new_student.id,
            'name': new_student.name,
            'standard': new_student.standard,
            'roll_number': new_student.roll_number,
            'created_at': new_student.created_at.isoformat() if new_student.created_at else None
        }), 201
    except Exception as e:
        print(f"Error in create_student: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/students/<int:student_id>', methods=['PUT'])
@login_required
def update_student(student_id):
    try:
        student = Student.query.filter_by(id=student_id, user_id=current_user.id).first()
        if not student:
            return jsonify({'error': 'Student not found'}), 404
        
        data = request.get_json()
        
        if 'name' in data:
            student.name = data['name']
        if 'standard' in data:
            student.standard = data['standard']
        if 'roll_number' in data:
            # Check if new roll number already exists for another student
            if data['roll_number'] != student.roll_number:
                existing = Student.query.filter_by(user_id=current_user.id, roll_number=data['roll_number']).first()
                if existing:
                    return jsonify({'error': 'Roll number already exists'}), 400
            student.roll_number = data['roll_number']
        
        db.session.commit()
        
        return jsonify({
            'id': student.id,
            'name': student.name,
            'standard': student.standard,
            'roll_number': student.roll_number,
            'created_at': student.created_at.isoformat() if student.created_at else None
        })
    except Exception as e:
        print(f"Error in update_student: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/students/<int:student_id>', methods=['DELETE'])
@login_required
def delete_student(student_id):
    try:
        student = Student.query.filter_by(id=student_id, user_id=current_user.id).first()
        if not student:
            return jsonify({'error': 'Student not found'}), 404
        
        db.session.delete(student)
        db.session.commit()
        
        return jsonify({'message': 'Student deleted successfully'})
    except Exception as e:
        print(f"Error in delete_student: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)