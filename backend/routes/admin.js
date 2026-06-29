const express = require('express');
const router = express.Router();
const { connectToTiDB } = require('../db/tidb');

// ============================================================
// GET - Fetch all users with permissions
// ============================================================
router.get('/get-requests', async (req, res) => {
    try {
        const connection = await connectToTiDB();
        
        // Fetch users (excluding admins if needed)
        const [users] = await connection.execute(`
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
        
        // Parse permissions JSON
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
        
        const connection = await connectToTiDB();
        let updatedCount = 0;
        
        // Batch update
        for (const user of requests) {
            const permissionsJson = JSON.stringify(user.permissions || {});
            
            const [result] = await connection.execute(
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
