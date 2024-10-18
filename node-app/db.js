const mysql = require('mysql');

// MySQL connection
const db = mysql.createConnection({
    host: '18.219.84.184',
    user: 'COSC573',
    password: process.env.COSC_573_USER_PASSWORD,
    database: 'bookRecEngine'
});


// Connect to the database
db.connect((err) => {
    if (err) throw err;
    console.log('MySQL connected');
});

module.exports = db;
