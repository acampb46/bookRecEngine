const bcrypt = require('bcrypt');
const db = require('./db'); // Ensure you have your db connection

const insertUsers = async () => {
    const users = [];

    for (let i = 1; i <= 50; i++) {
        const username = `user${i}`;
        const password = `password${i}`; // Example passwords
        const hashedPassword = await bcrypt.hash(password, 10);
        users.push([username, hashedPassword]);
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
};

insertUsers();
