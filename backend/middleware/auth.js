const jwt = require('jsonwebtoken');
require('dotenv').config();

// ============================================================
// AUTHENTICATE - Verify JWT Token
// ============================================================
function authenticate(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired. Please login again.' });
        }
        return res.status(401).json({ error: 'Invalid token' });
    }
}

// ============================================================
// IS ADMIN - Check Admin Role
// ============================================================
function isAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
}

// ============================================================
// IS ADMIN OR MANAGER - Check Admin or Manager Role
// ============================================================
function isAdminOrManager(req, res, next) {
    if (!req.user || !['admin', 'manager'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Admin or Manager access required' });
    }
    next();
}

// ============================================================
// RATE LIMITER - Prevent Brute Force
// ============================================================
function rateLimiter(maxAttempts = 5, windowMs = 15 * 60 * 1000) {
    const attempts = new Map();

    return function(req, res, next) {
        const key = req.ip + (req.body.email || '');
        const now = Date.now();

        // Clean old entries
        for (const [k, v] of attempts) {
            if (now - v.firstAttempt > windowMs) {
                attempts.delete(k);
            }
        }

        if (!attempts.has(key)) {
            attempts.set(key, { count: 1, firstAttempt: now });
            return next();
        }

        const record = attempts.get(key);

        if (now - record.firstAttempt > windowMs) {
            attempts.set(key, { count: 1, firstAttempt: now });
            return next();
        }

        if (record.count >= maxAttempts) {
            return res.status(429).json({
                error: `Too many attempts. Try again after ${Math.ceil(windowMs/60000)} minutes.`
            });
        }

        record.count++;
        next();
    };
}

module.exports = {
    authenticate,
    isAdmin,
    isAdminOrManager,
    rateLimiter
};
