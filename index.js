// 10. Ensure dotenv is loaded only for local development
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const express = require('express');
const mysql = require('mysql2/promise');
const axios = require('axios');

const app = express();
app.use(express.json());

// 4. If any environment variable is missing, log a clear error explaining which variable is missing.
const requiredEnvVars = ['DATABASE_URL'];
for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        console.error(`Error: Missing required environment variable: ${envVar}`);
        process.exit(1); // 7. Exit the process if environment variable is missing
    }
}

// Database connection
let db;

// 5. Use mysql2/promise with proper async/await.
async function connectDB() {
    try {
        // 2 & 3. Remove hardcoded values and use environment variables instead
        // Using a single connection string (DATABASE_URL)
        db = await mysql.createConnection(process.env.DATABASE_URL);
        // 8. Print "Database connected successfully" when the connection succeeds.
        console.log('Database connected successfully');
    } catch (err) {
        // 6. Add proper try/catch around the database connection.
        console.error('Database connection failed:', err.message);
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
