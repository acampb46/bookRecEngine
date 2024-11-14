const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../db'); // Import database connection


// Helper function to fetch recommendations
async function fetchRecommendations(userId) {
    try {
        // Simulate a fetch call to the recommendations route for the user
        const response = await fetch(`http://wwww.gerardcosc573.com:12348/recommendations`, {
            method: 'GET',
            credentials: 'include' // To include cookies if necessary
        });

        if (!response.ok) {
            throw new Error('Failed to fetch recommendations');
        }

        const data = await response.json();
        return data.recommendations;
    } catch (error) {
        console.error('Error fetching recommendations:', error);
        return [];
    }
}

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

        // Fetch recommendations immediately after successful login using the recommendations route
        const recommendationsResponse = await fetchRecommendations(req.session.userId);

        // Send login response along with the recommendations
        res.status(200).json({
            message: 'Login successful',
            success: true,
            recommendations: recommendationsResponse // Include recommendations in the response
        });
    } catch (err) {
        console.error("Server error:", err);
        res.status(500).json({message: 'Server error'});
    }
});

module.exports = router;
