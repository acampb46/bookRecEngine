const bcrypt = require('bcrypt');
const db = require('db'); // Ensure you have your db connection

const insertUsers = async () => {
    const users = [];

    for (let i = 1; i <= 50; i++) {
        const username = `user${i}`;
        const password = `password${i}`; // Example passwords
        const hashedPassword = await bcrypt.hash(password, 10);
        users.push([username, hashedPassword]);
    }

    const insertQuery = 'INSERT INTO userData (username, password) VALUES ?';

    db.query(insertQuery, [users], (err, result) => {
        if (err) {
            console.error('Error inserting users:', err);
        } else {
            console.log('Inserted users:', result.affectedRows);
        }
    });
};

insertUsers();
