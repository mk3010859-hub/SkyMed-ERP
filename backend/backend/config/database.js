const mysql = require('mysql2/promise');
require('dotenv').config();

// ============================================================
// TiDB Connection Pool
// ============================================================
const pool = mysql.createPool({
    host: process.env.TIDB_HOST,
    port: parseInt(process.env.TIDB_PORT) || 4000,
    user: process.env.TIDB_USER,
    password: process.env.TIDB_PASSWORD,
    database: process.env.TIDB_DATABASE || 'sys',
    ssl: { rejectUnauthorized: true },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 30000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000
});

// ============================================================
// Test Database Connection
// ============================================================
async function testConnection() {
    try {
        const conn = await pool.getConnection();
        console.log('✅ TiDB Connected successfully!');
        conn.release();
        return true;
    } catch (error) {
        console.error('❌ TiDB Connection failed:', error.message);
        console.error('📋 Please check your .env credentials');
        return false;
    }
}

// ============================================================
// Initialize Tables
// ============================================================
async function initTables() {
    const queries = [
        // Users table
        `CREATE TABLE IF NOT EXISTS users (
            id INT PRIMARY KEY AUTO_INCREMENT,
            email VARCHAR(255) UNIQUE NOT NULL,
            username VARCHAR(100),
            password_hash VARCHAR(255) NOT NULL,
            twofa_secret VARCHAR(255),
            twofa_enabled BOOLEAN DEFAULT FALSE,
            role ENUM('admin', 'manager', 'staff') DEFAULT 'staff',
            status ENUM('pending', 'active', 'disabled', 'rejected') DEFAULT 'pending',
            created_by INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            last_login TIMESTAMP,
            failed_attempts INT DEFAULT 0,
            locked_until TIMESTAMP
        )`,

        // Licenses table
        `CREATE TABLE IF NOT EXISTS licenses (
            id INT PRIMARY KEY AUTO_INCREMENT,
            license_key VARCHAR(255) UNIQUE NOT NULL,
            company_name VARCHAR(200),
            email VARCHAR(255),
            plan_type ENUM('trial', 'monthly', 'annual', 'lifetime') DEFAULT 'trial',
            max_users INT DEFAULT 5,
            status ENUM('active', 'expired', 'suspended') DEFAULT 'active',
            trial_end_date TIMESTAMP,
            expiry_date TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,

        // Audit Log table
        `CREATE TABLE IF NOT EXISTS audit_log (
            id INT PRIMARY KEY AUTO_INCREMENT,
            user_id INT,
            username VARCHAR(50),
            action VARCHAR(50),
            table_name VARCHAR(50),
            record_id INT,
            old_value TEXT,
            computer_time DATETIME,
            server_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            ip_address VARCHAR(45)
        )`,

        // Registration Requests
        `CREATE TABLE IF NOT EXISTS registration_requests (
            id INT PRIMARY KEY AUTO_INCREMENT,
            email VARCHAR(255) NOT NULL,
            username VARCHAR(100),
            request_data JSON,
            status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
            reviewed_by INT,
            review_notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            reviewed_at TIMESTAMP
        )`,

        // Vendors table
        `CREATE TABLE IF NOT EXISTS vendors (
            id INT PRIMARY KEY AUTO_INCREMENT,
            code VARCHAR(20) UNIQUE NOT NULL,
            name VARCHAR(200) NOT NULL,
            type VARCHAR(100),
            gst INT DEFAULT 18,
            payment_period INT DEFAULT 30,
            contact VARCHAR(20),
            email VARCHAR(100),
            address TEXT,
            provision_applicable BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,

        // Inventory table
        `CREATE TABLE IF NOT EXISTS inventory (
            id INT PRIMARY KEY AUTO_INCREMENT,
            name VARCHAR(200) NOT NULL,
            category VARCHAR(100),
            quantity INT DEFAULT 0,
            expiry_date DATE,
            inbound_date TIMESTAMP,
            outbound_date TIMESTAMP,
            status ENUM('active', 'deleted') DEFAULT 'active',
            deleted_by VARCHAR(50),
            deleted_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`
    ];

    try {
        for (const query of queries) {
            await pool.query(query);
        }
        console.log('✅ Tables initialized successfully');
    } catch (error) {
        console.error('❌ Table initialization failed:', error.message);
    }
}

module.exports = { pool, testConnection, initTables };
