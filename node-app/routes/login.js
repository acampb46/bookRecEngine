const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../db'); // Import database connection

// POST route for user login
router.post('/', async (req, res) => {
    console.log('Request Body:', req.body);
    const {username, password} = req.body;

    // Validate input
    if (!username || !password) {
        console.error("Username or password is missing.");
        return res.status(400).json({message: 'Username and password are required'});
    }

    try {
        // Check if the user exists
        const query = 'SELECT * FROM userData WHERE username = ?';
        const [rows] = await db.query(query, [username]);

        // Check if any user was returned
        if (rows.length === 0) {
            console.error("User not found with username:", username);
            return res.status(400).json({message: 'Invalid username or password'});
        }

        const user = rows[0]; // Access the first row
        console.log("User found:", user); // Debug log for user info

        // Check if the password from request matches the hashed password in the DB
        if (!user.password) {
            console.error("No password found for user:", user.username);
            return res.status(400).json({message: 'Invalid username or password'});
        }

        // Check password
        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            console.error("Password mismatch for user:", username);
            return res.status(400).json({message: 'Invalid username or password'});
        }

        // If the login is successful, set up the session
        req.session.userId = user.id; // Store user ID in session
        req.session.username = user.username; // Store username in session

        res.status(200).json({message: 'Login successful', success: true});
    } catch (err) {
        console.error("Server error:", err);
        res.status(500).json({message: 'Server error'});
    }
});

module.exports = router;
