const bcrypt = require('bcrypt');
const db = require('./db'); // Ensure you have your db connection

const insertUsers = async () => {
    const users = [];

    for (let i = 1; i <= 50; i++) {
        const username = `user${i}`;
        const password = `password${i}`; // Example passwords
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert new user into userData table
        const insertQuery = 'INSERT INTO userData (username, password) VALUES (?, ?)';

        try {
            await new Promise((resolve, reject) => {
                db.query(insertQuery, [username, hashedPassword], (err, result) => {
                    if (err) {
                        console.error(`Error inserting user ${username}:`, err);
                        return reject(err); // Reject the promise on error
                    }
                    resolve(result); // Resolve the promise on success
                });
            });
            console.log(`User ${username} inserted successfully.`);
        } catch (error) {
            console.error(`Failed to insert user ${username}:`, error);
        }
    }
};

insertUsers().then(() => {
    console.log('User insertion completed.');
}).catch(error => {
    console.error('Error during user insertion:', error);
});
