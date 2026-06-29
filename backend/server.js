const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { pool, testConnection, initTables } = require('./config/database');

// Routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const dataRoutes = require('./routes/data');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================
// MIDDLEWARE
// ============================================================
app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? ['https://yourdomain.com'] : '*',
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files (Frontend)
app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ============================================================
// API ROUTES
// ============================================================
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/data', dataRoutes);

// Health Check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '7.0.0',
        uptime: process.uptime()
    });
});

// ============================================================
// FRONTEND ROUTES
// ============================================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/login.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/register.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/dashboard.html'));
});

app.get('/:page.html', (req, res) => {
    const page = req.params.page;
    const filePath = path.join(__dirname, '../public', `${page}.html`);
    res.sendFile(filePath);
});

// ============================================================
// START SERVER
// ============================================================
async function startServer() {
    // Test database connection
    const connected = await testConnection();
    if (!connected) {
        console.error('❌ Database connection failed. Exiting...');
        process.exit(1);
    }

    // Initialize tables
    await initTables();

    // Create admin user if not exists
    try {
        const bcrypt = require('bcryptjs');
        const [admins] = await pool.query(
            'SELECT id FROM users WHERE email = ?',
            [process.env.ADMIN_EMAIL || 'mk3010859@gmail.com']
        );

        if (admins.length === 0) {
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(
                process.env.ADMIN_PASSWORD || 'SkyMed@2026',
                salt
            );

            await pool.query(
                `INSERT INTO users (email, username, password_hash, role, status)
                 VALUES (?, ?, ?, 'admin', 'active')`,
                [process.env.ADMIN_EMAIL || 'mk3010859@gmail.com', 'Admin', passwordHash]
            );

            console.log('✅ Admin user created successfully');
            console.log(`📧 Email: ${process.env.ADMIN_EMAIL || 'mk3010859@gmail.com'}`);
            console.log(`🔑 Password: ${process.env.ADMIN_PASSWORD || 'SkyMed@2026'}`);
        }
    } catch (error) {
        console.warn('⚠️ Admin creation skipped:', error.message);
    }

    // Start server
    app.listen(PORT, () => {
        console.log(`\n🚀 SkyMed ERP Server Started`);
        console.log(`📡 Port: ${PORT}`);
        console.log(`🌐 URL: http://localhost:${PORT}`);
        console.log(`💾 Database: TiDB Cloud`);
        console.log(`\n🔒 Login: ${process.env.ADMIN_EMAIL || 'mk3010859@gmail.com'} / ${process.env.ADMIN_PASSWORD || 'SkyMed@2026'}`);
        console.log(`📝 Change password after first login!\n`);
    });
}

startServer();

// ============================================================
// ERROR HANDLING
// ============================================================
process.on('unhandledRejection', (error) => {
    console.error('Unhandled Rejection:', error);
});

process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down gracefully...');
    await pool.end();
    process.exit(0);
});
