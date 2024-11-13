const mysql = require('mysql2');

// MySQL connection
const pool = mysql.createPool({
    connectionLimit: 10, // Adjust the limit based on your app's needs
    host: '3.147.130.188',
    user: 'COSC573',
    password: 'COSC573',
    database: 'bookRecEngine'
}).promise();

// Export a function to execute queries using the pool
module.exports = {
    query: (queryText, queryParams, callback) => {
        pool.getConnection((err, connection) => {
            if (err) {
                // If there's an error getting the connection, pass it to the callback
                return callback(err);
            }

            // Execute the query
            connection.query(queryText, queryParams, (queryErr, results) => {
                // Release the connection back to the pool
                connection.release();

                // If there's an error with the query, pass it to the callback
                if (queryErr) {
                    return callback(queryErr);
                }

                // Otherwise, pass the results to the callback
                return callback(null, results);
            });
        });
    }
};
