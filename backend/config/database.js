const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com',
    port: 4000,
    user: '2YhNuY9x9YR1dry.root',
    password: '1dUtzHOX5FrbzmKe',
    database: 'skymed_db',
    ssl: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true
    },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ TiDB Connected Successfully!');
        console.log('🗄️  Database: skymed_db');
        connection.release();
        return true;
    } catch (error) {
        console.error('❌ TiDB Connection Failed:', error.message);
        return false;
    }
}

async function initTables() {
    try {
        const [tables] = await pool.query(`
            SELECT COUNT(*) as count 
            FROM information_schema.tables 
            WHERE table_schema = 'skymed_db' 
            AND table_name = 'users'
        `);

        if (tables[0].count === 0) {
            console.log('📋 Creating users table...');
            await pool.query(`
                CREATE TABLE users (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    username VARCHAR(100) NOT NULL,
                    password_hash VARCHAR(255) NOT NULL,
                    role VARCHAR(50) DEFAULT 'user',
                    status ENUM('pending', 'active', 'rejected') DEFAULT 'pending',
                    permissions JSON,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_email (email),
                    INDEX idx_status (status)
                )
            `);
            console.log('✅ Users table created');
        } else {
            console.log('✅ Users table already exists');
        }
        return true;
    } catch (error) {
        console.error('❌ Table init failed:', error.message);
        return false;
    }
}

module.exports = {
    pool,
    testConnection,
    initTables
};
