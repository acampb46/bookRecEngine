const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../db');


// POST route for user registration
router.post('/', async (req, res) => {
	console.log('Incoming request body:', req.body);
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }

    // Check if username already exists
    const checkQuery = 'SELECT * FROM userData WHERE username = ?';
    db.query(checkQuery, [username], async (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Server error' });
        }
        if (result.length > 0) {
            return res.status(400).json({ message: 'Username already exists' });
        }

        try {
            // Hash the password with salt rounds
            const hashedPassword = await bcrypt.hash(password, 10);

            // Insert new user into userData table
            const insertQuery = 'INSERT INTO userData (username, password) VALUES (?, ?)';
            db.query(insertQuery, [username, hashedPassword], (err, result) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ message: 'Server error' });
                }

                // Set session data
                req.session.userId = result.insertId; // Store the user ID
                req.session.username = username; // Store the username

                res.status(201).json({ message: 'User registered successfully' });

            });
        } catch (hashError) {
            console.error(hashError);
            res.status(500).json({ message: 'Error hashing password' });
        }
    });
});

module.exports = router;