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
    origin: [
        'https://skymed-erp-production.up.railway.app',
        'http://localhost:3000',
        'http://localhost:5500'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.options('*', cors());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
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

app.get('/:page.html', (req, res) => {
    const page = req.params.page;
    const filePath = path.join(__dirname, '../public', `${page}.html`);
    res.sendFile(filePath);
});

// ============================================================
// START SERVER
// ============================================================
async function startServer() {
    const connected = await testConnection();
    if (!connected) {
        console.error('❌ Database connection failed. Exiting...');
        process.exit(1);
    }

    await initTables();

    try {
        const bcrypt = require('bcryptjs');
        const [admins] = await pool.query(
            'SELECT id FROM users WHERE email = ?',
            ['mk3010859@gmail.com']
        );

        if (admins.length === 0) {
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash('SkyMed@2026', salt);

            await pool.query(
                `INSERT INTO users (email, username, password_hash, role, status, permissions)
                 VALUES (?, ?, ?, 'admin', 'active', ?)`,
                ['mk3010859@gmail.com', 'Admin', passwordHash, JSON.stringify({})]
            );

            console.log('✅ Admin user created');
            console.log('📧 Email: mk3010859@gmail.com');
            console.log('🔑 Password: SkyMed@2026');
        }
    } catch (error) {
        console.warn('⚠️ Admin creation skipped:', error.message);
    }

    app.listen(PORT, '0.0.0.0', () => {
        console.log(`\n🚀 SkyMed Server Started`);
        console.log(`📡 Port: ${PORT}`);
        console.log(`🌐 URL: https://skymed-erp-production.up.railway.app`);
        console.log(`💾 Database: TiDB (skymed_db)`);
        console.log(`🔒 Login: mk3010859@gmail.com / SkyMed@2026\n`);
    });
}

startServer();

process.on('unhandledRejection', (error) => {
    console.error('❌ Unhandled Rejection:', error);
});

process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down...');
    await pool.end();
    process.exit(0);
});
