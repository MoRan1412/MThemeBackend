'use strict'

const express = require("express");
const bodyParser = require("body-parser");
const rand = require('csprng');
const mysql = require('mysql2/promise');
// const fs = require('fs');
// const path = require('path');
const app = express();

app.use(bodyParser.json()); //Used to parse JSON bodies
app.use(bodyParser.urlencoded({ extended: true })); //Parse URL-encoded bodies

const tokenUsers = []

const status = {
    OK: 200,
    CREATED: 201,
    NOT_MODIFIED: 304,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500,
};

const pool = mysql.createPool({
    host: 'ec2-43-199-88-244.ap-east-1.compute.amazonaws.com',
    port: '3306',
    user: 'me',
    password: 'W836rrv+',
    database: 'mtheme',
});

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.get('/user/get', async (req, res) => {
    try {
        const conn = await pool.getConnection();
        const [result, field] = await conn.query('SELECT * FROM `user`');
        conn.release();
        res.json(result);
    } catch (err) {
        res.status(status.INTERNAL_SERVER_ERROR).json({ message: 'Internal Server Error' });
    }
})


const port = 10888  // Replit doesn’t matter which port is using
app.listen(port, () => {
    console.log(`Connected on port ${port}`)
}); 
