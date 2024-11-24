const mysql = require('mysql2');

// MySQL connection
const pool = mysql.createPool({
    connectionLimit: 10, // Adjust the limit based on your app's needs
    host: '3.147.130.188', user: 'COSC573', password: 'COSC573', database: 'bookRecEngine'
});

// Create a promise-based connection pool
const promisePool = pool.promise(); // Use promise-based pool

// Export a function to execute queries using the promise pool
module.exports = {
    query: (queryText, queryParams) => {
        return promisePool.execute(queryText, queryParams); // Returns a promise
    }
};
