require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const axios = require('axios');

const app = express();
app.use(express.json());

// Database connection
let db;
async function connectDB() {
    db = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'github_analyzer'
    });
    console.log('connected to database');
}
connectDB();

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
        console.log(err);
        res.status(500).json({ error: 'something went wrong or user not found' });
    }
});

// 2. Get all profiles from db
app.get('/api/profiles', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM profiles');
        res.json(rows);
    } catch (err) {
        console.log(err);
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
        console.log(err);
        res.status(500).json({ error: 'database error' });
    }
});

app.listen(3000, () => {
    console.log('server started on port 3000');
});
