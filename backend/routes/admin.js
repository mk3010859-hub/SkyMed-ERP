const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');

// GET - All users with permissions
router.get('/get-requests', async (req, res) => {
    try {
        const [users] = await pool.query(`
            SELECT 
                id,
                email,
                username,
                created_at as requested_on,
                status,
                permissions,
                role
            FROM users 
            ORDER BY created_at DESC
        `);
        
        const formattedUsers = users.map(user => ({
            ...user,
            permissions: user.permissions ? 
                (typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions) : 
                {}
        }));
        
        res.json({
            success: true,
            data: formattedUsers,
            count: formattedUsers.length
        });
        
    } catch (error) {
        console.error('❌ Fetch Error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// POST - Save permissions & status
router.post('/save-requests', async (req, res) => {
    try {
        const { requests } = req.body;
        
        if (!requests || !Array.isArray(requests)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid request body'
            });
        }
        
        let updatedCount = 0;
        
        for (const user of requests) {
            const permissionsJson = JSON.stringify(user.permissions || {});
            
            const [result] = await pool.query(
                `UPDATE users 
                 SET status = ?, 
                     permissions = ?,
                     updated_at = NOW()
                 WHERE id = ?`,
                [
                    user.status || 'pending',
                    permissionsJson,
                    user.id
                ]
            );
            
            if (result.affectedRows > 0) {
                updatedCount++;
            }
        }
        
        res.json({
            success: true,
            message: `Updated ${updatedCount} users successfully`,
            updated: updatedCount,
            total: requests.length
        });
        
    } catch (error) {
        console.error('❌ Save Error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// POST - Create new user
router.post('/create-user', async (req, res) => {
    try {
        const { email, username, password, role, permissions } = req.body;
        
        if (!email || !username || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email, username and password required'
            });
        }
        
        const [existing] = await pool.query(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );
        
        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'User already exists'
            });
        }
        
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        
        const permissionsJson = JSON.stringify(permissions || {});
        const [result] = await pool.query(
            `INSERT INTO users (email, username, password_hash, role, status, permissions)
             VALUES (?, ?, ?, ?, 'active', ?)`,
            [email, username, passwordHash, role || 'user', permissionsJson]
        );
        
        res.json({
            success: true,
            message: 'User created successfully',
            userId: result.insertId
        });
        
    } catch (error) {
        console.error('❌ Create User Error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// POST - Update user permissions
router.post('/update-permissions', async (req, res) => {
    try {
        const { userId, permissions } = req.body;
        
        if (!userId || !permissions) {
            return res.status(400).json({
                success: false,
                error: 'UserId and permissions required'
            });
        }
        
        const permissionsJson = JSON.stringify(permissions);
        
        await pool.query(
            `UPDATE users SET permissions = ?, updated_at = NOW() WHERE id = ?`,
            [permissionsJson, userId]
        );
        
        res.json({
            success: true,
            message: 'Permissions updated successfully'
        });
        
    } catch (error) {
        console.error('❌ Update Permissions Error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
