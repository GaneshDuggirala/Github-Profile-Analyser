# Github Profile Analyzer

This is a simple node.js and express project that fetches data from github api and saves it in a mysql database.

## Setup
1. install packages: `npm install`
2. setup your mysql database using the `schema.sql` file
3. create a `.env` file and put your database details:
```
DATABASE_URL=mysql://root:yourpassword@localhost:3306/github_analyzer
PORT=3000
```
4. run the server: `node index.js`

## Endpoints

1. `POST /api/profiles/:username`
Gets the user from github and saves it to db.

2. `GET /api/profiles`
Gets all users from the db.

3. `GET /api/profiles/:username`
Gets a single user from the db.
