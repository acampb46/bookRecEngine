const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../db');

// POST route for user registration
router.post('/', async (req, res) => {
    const {username, password} = req.body;

    if (!username || !password) {
        return res.status(400).json({message: 'Username and password are required'});
    }

    const checkQuery = 'SELECT * FROM userData WHERE username = ?';

    try {
        // Check if username already exists
        const [result] = await db.query(checkQuery, [username]);

        if (result.length > 0) {
            return res.status(400).json({message: 'Username already exists'});
        }

        // Hash the password with salt rounds
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert new user into userData table
        const insertQuery = 'INSERT INTO userData (username, password) VALUES (?, ?)';
        const [insertResult] = await db.query(insertQuery, [username, hashedPassword]);

        // Set session data
        req.session.userId = insertResult.insertId; // Store the user ID
        req.session.username = username; // Store the username

        res.status(201).json({message: 'User registered successfully'});
    } catch (error) {
        console.error(error);
        res.status(500).json({message: 'Server error'});
    }
});

module.exports = router;
