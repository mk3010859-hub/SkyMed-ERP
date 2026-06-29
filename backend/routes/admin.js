const express = require('express');
const router = express.Router();

// ✅ SAHI PATH - database.js use karo (jo server.js mein already hai)
const { pool } = require('../config/database');

// ============================================================
// GET - Fetch all users with permissions
// ============================================================
router.get('/get-requests', async (req, res) => {
    try {
        const [users] = await pool.query(`
            SELECT 
                id,
                email,
                username,
                created_at as requested_on,
                status,
                permissions
            FROM users 
            WHERE role != 'admin' OR role IS NULL
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
        console.error('❌ TiDB Fetch Error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================================
// POST - Save user permissions and status
// ============================================================
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
        console.error('❌ TiDB Save Error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
