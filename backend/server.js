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
// MIDDLEWARE - FIXED CORS
// ============================================================
const corsOptions = {
    origin: [
        'https://skymed-erp-production.up.railway.app',  // ✅ RAILWAY APP URL
        'http://localhost:3000',                          // ✅ LOCAL DEV
        'http://localhost:5500',                          // ✅ VS CODE LIVE SERVER
        process.env.FRONTEND_URL                         // ✅ .env se bhi le sakte ho
    ].filter(Boolean),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// CORS middleware
app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files (Frontend)
app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ============================================================
// LOGGING MIDDLEWARE (Debug)
// ============================================================
app.use((req, res, next) => {
    console.log(`📡 ${req.method} ${req.url}`);
    next();
});

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
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
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

// Catch-all for .html pages
app.get('/:page.html', (req, res) => {
    const page = req.params.page;
    const filePath = path.join(__dirname, '../public', `${page}.html`);
    res.sendFile(filePath, (err) => {
        if (err) {
            res.status(404).json({ error: 'Page not found' });
        }
    });
});

// ============================================================
// 404 Handler
// ============================================================
app.use((req, res) => {
    res.status(404).json({ 
        error: 'Not Found',
        path: req.url 
    });
});

// ============================================================
// ERROR HANDLER
// ============================================================
app.use((err, req, res, next) => {
    console.error('❌ Server Error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// ============================================================
// START SERVER
// ============================================================
async function startServer() {
    try {
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
                    `INSERT INTO users (email, username, password_hash, role, status, permissions)
                     VALUES (?, ?, ?, 'admin', 'active', ?)`,
                    [
                        process.env.ADMIN_EMAIL || 'mk3010859@gmail.com', 
                        'Admin', 
                        passwordHash,
                        JSON.stringify({}) // Empty permissions for admin
                    ]
                );

                console.log('✅ Admin user created successfully');
                console.log(`📧 Email: ${process.env.ADMIN_EMAIL || 'mk3010859@gmail.com'}`);
                console.log(`🔑 Password: ${process.env.ADMIN_PASSWORD || 'SkyMed@2026'}`);
            }
        } catch (error) {
            console.warn('⚠️ Admin creation skipped:', error.message);
        }

        // Start server
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`\n🚀 SkyMed ERP Server Started`);
            console.log(`📡 Port: ${PORT}`);
            console.log(`🌐 URL: ${process.env.RAILWAY_PUBLIC_DOMAIN || `http://localhost:${PORT}`}`);
            console.log(`💾 Database: TiDB Cloud`);
            console.log(`\n🔒 Login: ${process.env.ADMIN_EMAIL || 'mk3010859@gmail.com'} / ${process.env.ADMIN_PASSWORD || 'SkyMed@2026'}`);
            console.log(`📝 Change password after first login!\n`);
        });

    } catch (error) {
        console.error('❌ Server startup failed:', error);
        process.exit(1);
    }
}

startServer();

// ============================================================
// GRACEFUL SHUTDOWN
// ============================================================
process.on('unhandledRejection', (error) => {
    console.error('❌ Unhandled Rejection:', error);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
});

process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down gracefully...');
    try {
        await pool.end();
        console.log('✅ Database connections closed');
    } catch (error) {
        console.error('❌ Error closing connections:', error);
    }
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Shutting down gracefully...');
    try {
        await pool.end();
        console.log('✅ Database connections closed');
    } catch (error) {
        console.error('❌ Error closing connections:', error);
    }
    process.exit(0);
});
