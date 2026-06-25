// Load dotenv globally so it always loads the local .env file.
// On Railway, this is safely ignored because .env is not uploaded.
require('dotenv').config();

const express = require('express');
const mysql = require('mysql2/promise');
const axios = require('axios');

const app = express();
app.use(express.json());

// We removed the hard crash for missing DATABASE_URL.
// If it's missing, it will automatically default to the local database URL below.

// Database connection
let db;

// 5. Use mysql2/promise with proper async/await.
async function connectDB() {
    try {
        // Using the cloud MYSQL_URL from Railway, or falling back to local MySQL
        const connectionUrl = process.env.MYSQL_URL || process.env.DATABASE_URL || 'mysql://root:root@localhost:3306/github_analyzer';
        db = await mysql.createConnection(connectionUrl);
        // 8. Print "Database connected successfully" when the connection succeeds.
        console.log('Database connected successfully');
    } catch (err) {
        // 6. Add proper try/catch around the database connection.
        console.error('Database connection failed:', err);
        // 7. Exit the process if the database connection fails during startup.
        process.exit(1);
    }
}

// 1. Fetch from github and save
app.post('/api/profiles/:username', async (req, res) => {
    let username = req.params.username;
    
    try {
        let response = await axios.get('https://api.github.com/users/' + username);
        let data = response.data;

        let sql = `
            INSERT INTO profiles (username, name, bio, location, public_repos, followers, following, avatar_url, github_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            name=VALUES(name), bio=VALUES(bio), location=VALUES(location), public_repos=VALUES(public_repos),
            followers=VALUES(followers), following=VALUES(following), avatar_url=VALUES(avatar_url), github_url=VALUES(github_url)
        `;
        
        let values = [
            data.login, data.name, data.bio, data.location, data.public_repos, 
            data.followers, data.following, data.avatar_url, data.html_url
        ];

        await db.query(sql, values);
        res.json({ message: 'saved to db', data: data });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'something went wrong or user not found' });
    }
});

// 2. Get all profiles from db
app.get('/api/profiles', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM profiles');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'database error' });
    }
});

// 3. Get single profile from db
app.get('/api/profiles/:username', async (req, res) => {
    try {
        let username = req.params.username;
        const [rows] = await db.query('SELECT * FROM profiles WHERE username = ?', [username]);
        
        if (rows.length > 0) {
            res.json(rows[0]);
        } else {
            res.status(404).json({ message: 'user not found in db' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'database error' });
    }
});

const PORT = process.env.PORT || 3000;

// Start server only after database connection is successful
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`server started on port ${PORT}`);
    });
});
