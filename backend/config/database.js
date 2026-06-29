const mysql = require('mysql2/promise');
require('dotenv').config();

// ============================================================
// TiDB Connection Pool
// ============================================================
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 4000,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'skymed',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: process.env.DB_SSL === 'true' ? {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true
    } : undefined,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

// ============================================================
// Test Connection
// ============================================================
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ TiDB connection successful');
        connection.release();
        return true;
    } catch (error) {
        console.error('❌ TiDB connection failed:', error.message);
        console.error('📋 Please check your .env configuration');
        return false;
    }
}

// ============================================================
// Initialize Tables
// ============================================================
async function initTables() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT PRIMARY KEY AUTO_INCREMENT,
                email VARCHAR(255) UNIQUE NOT NULL,
                username VARCHAR(100) NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role VARCHAR(50) DEFAULT 'user',
                status ENUM('pending', 'active', 'rejected') DEFAULT 'pending',
                permissions JSON DEFAULT '{}',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_email (email),
                INDEX idx_status (status)
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT,
                action VARCHAR(100),
                details JSON,
                ip_address VARCHAR(45),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
                INDEX idx_user_id (user_id),
                INDEX idx_created_at (created_at)
            )
        `);

        console.log('✅ Tables initialized successfully');
        return true;
    } catch (error) {
        console.error('❌ Table initialization failed:', error.message);
        return false;
    }
}

module.exports = {
    pool,
    testConnection,
    initTables
};
