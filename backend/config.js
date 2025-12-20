require('dotenv').config();
const mysql = require('mysql2');

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  JWT_SECRET: process.env.JWT_SECRET || 'fallback_secret',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  
  // Database configuration
  DB_CONFIG: {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'realtime',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  },
  
  // File upload configuration
  UPLOAD_PATH: process.env.UPLOAD_PATH || 'uploads/',
  MAX_FILE_SIZE: process.env.MAX_FILE_SIZE || '5MB',
  
  // Email configuration
  EMAIL_CONFIG: {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: 'tpcchandicapped@gmail.com',
      pass: 'iowh xcma tlth hdfx'
    }
  },
  EMAIL_FROM: 'tpcchandicapped@gmail.com'
};
