// Configuration file for different environments
const CONFIG = {
    // For local development
    development: {
        API_URL: 'http://127.0.0.1:5000/api'
    },
    // For production (will be updated after backend deployment)
    production: {
        API_URL: 'https://your-backend-url.onrender.com/api'  // Update this later
    }
};

// Determine environment
const ENV = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'development' 
    : 'production';

// Set the API URL
const API_URL = CONFIG[ENV].API_URL;