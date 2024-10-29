const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../db');


// POST route for user registration
router.post('/', async (req, res) => {
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
            // Hash password and create the user
            const hashedPassword = await bcrypt.hash(password, 10);
            const [result] = await db.query('INSERT INTO userData (username, password) VALUES (?, ?)', [username, hashedPassword]);

            if (result.insertId) {
                // Set session data for the newly created user
                req.session.userId = result.insertId;
                req.session.username = username;
                req.session.loggedIn = true;

                // Save the session and respond to the user
                req.session.save((err) => {
                    if (err) {
                        console.error('Session save error:', err);
                        return res.status(500).send({ message: 'Error initializing session. Please try logging in.' });
                    }
                    res.status(201).send({ message: 'Account created and logged in successfully!' });
                });
            } else {
                res.status(500).send({ message: 'Failed to create account.' });
            }
        } catch (error) {
            console.error('Account creation error:', error);
            res.status(500).send({ message: 'An error occurred during account creation.' });
        }
    });
});

module.exports = router;