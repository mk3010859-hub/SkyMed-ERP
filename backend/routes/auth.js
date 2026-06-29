const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { pool } = require('../config/database');
const { authenticate, isAdmin, rateLimiter } = require('../middleware/auth');
require('dotenv').config();

// ============================================================
// REGISTER - User Registration (Pending Approval)
// ============================================================
router.post('/register', async (req, res) => {
    const { email, password, username } = req.body;

    if (!email || !password || password.length < 8) {
        return res.status(400).json({ error: 'Email and password (min 8 chars) required' });
    }

    try {
        // Check if user exists
        const [existing] = await pool.query('SELECT id, status FROM users WHERE email = ?', [email]);

        if (existing.length > 0) {
            if (existing[0].status === 'pending') {
                return res.status(400).json({ error: 'Registration pending approval. Please wait.' });
            } else if (existing[0].status === 'active') {
                return res.status(400).json({ error: 'User already exists. Please login.' });
            } else if (existing[0].status === 'disabled') {
                return res.status(400).json({ error: 'Account disabled. Contact admin.' });
            } else if (existing[0].status === 'rejected') {
                return res.status(400).json({ error: 'Registration rejected. Contact admin.' });
            }
        }

        // Hash password
        const salt = await bcrypt.genSalt(parseInt(process.env.SALT_ROUNDS) || 10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Create user with 'pending' status
        const [result] = await pool.query(
            `INSERT INTO users (email, username, password_hash, status)
             VALUES (?, ?, ?, 'pending')`,
            [email, username || email.split('@')[0], passwordHash]
        );

        // Log registration request
        await pool.query(
            `INSERT INTO registration_requests (email, username, request_data, status)
             VALUES (?, ?, ?, 'pending')`,
            [email, username || email.split('@')[0], JSON.stringify({ email, username, ip: req.ip })]
        );

        res.json({
            message: 'Registration submitted for admin approval. You will be notified once approved.',
            userId: result.insertId
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================================
// LOGIN - User Login
// ============================================================
router.post('/login', rateLimiter(5, 15 * 60 * 1000), async (req, res) => {
    const { email, password, twofaCode } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
    }

    try {
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);

        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = users[0];

        // Check if account is locked
        if (user.locked_until && new Date(user.locked_until) > new Date()) {
            const remaining = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
            return res.status(401).json({ error: `Account locked. Try again in ${remaining} minutes.` });
        }

        // Check status
        if (user.status === 'pending') {
            return res.status(401).json({ error: 'Account pending admin approval.' });
        }
        if (user.status === 'rejected') {
            return res.status(401).json({ error: 'Registration rejected. Contact admin.' });
        }
        if (user.status === 'disabled') {
            return res.status(401).json({ error: 'Account disabled. Contact admin.' });
        }

        // Verify password
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            // Increment failed attempts
            const newAttempts = (user.failed_attempts || 0) + 1;
            let lockUntil = null;

            if (newAttempts >= 5) {
                lockUntil = new Date(Date.now() + 15 * 60 * 1000);
            }

            await pool.query(
                'UPDATE users SET failed_attempts = ?, locked_until = ? WHERE id = ?',
                [newAttempts, lockUntil, user.id]
            );

            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check 2FA
        if (user.twofa_enabled) {
            if (!twofaCode) {
                return res.json({ requires2FA: true, userId: user.id });
            }

            const verified = speakeasy.totp.verify({
                secret: user.twofa_secret,
                encoding: 'base32',
                token: twofaCode,
                window: 1
            });

            if (!verified) {
                return res.status(401).json({ error: 'Invalid 2FA code' });
            }
        }

        // Reset failed attempts
        await pool.query(
            'UPDATE users SET failed_attempts = 0, locked_until = NULL, last_login = NOW() WHERE id = ?',
            [user.id]
        );

        // Generate JWT
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        // Audit log
        await pool.query(
            `INSERT INTO audit_log (user_id, username, action, computer_time, ip_address)
             VALUES (?, ?, 'LOGIN_SUCCESS', NOW(), ?)`,
            [user.id, user.email, req.ip]
        );

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                role: user.role,
                twofa_enabled: user.twofa_enabled
            }
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================================
// SETUP 2FA
// ============================================================
router.post('/2fa/setup', authenticate, async (req, res) => {
    try {
        const [users] = await pool.query('SELECT email FROM users WHERE id = ?', [req.user.id]);
        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const secret = speakeasy.generateSecret({
            name: `SkyMed ERP (${users[0].email})`
        });

        // Save secret temporarily
        await pool.query(
            'UPDATE users SET twofa_secret = ? WHERE id = ?',
            [secret.base32, req.user.id]
        );

        // Generate QR code
        const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

        res.json({
            secret: secret.base32,
            qrCode: qrCodeUrl,
            otpauth_url: secret.otpauth_url
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================================
// ENABLE 2FA
// ============================================================
router.post('/2fa/enable', authenticate, async (req, res) => {
    const { code } = req.body;

    try {
        const [users] = await pool.query('SELECT twofa_secret FROM users WHERE id = ?', [req.user.id]);
        if (users.length === 0 || !users[0].twofa_secret) {
            return res.status(400).json({ error: '2FA not set up yet' });
        }

        const verified = speakeasy.totp.verify({
            secret: users[0].twofa_secret,
            encoding: 'base32',
            token: code,
            window: 1
        });

        if (!verified) {
            return res.status(400).json({ error: 'Invalid 2FA code' });
        }

        await pool.query(
            'UPDATE users SET twofa_enabled = TRUE WHERE id = ?',
            [req.user.id]
        );

        res.json({ success: true, message: '2FA enabled successfully' });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================================
// GET USER PROFILE
// ============================================================
router.get('/profile', authenticate, async (req, res) => {
    try {
        const [users] = await pool.query(
            'SELECT id, email, username, role, twofa_enabled, status, created_at, last_login FROM users WHERE id = ?',
            [req.user.id]
        );
        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(users[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
