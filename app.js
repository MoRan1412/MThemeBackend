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
    host: 'ec2-43-199-88-244.ap-east-1.compute.amazonaws.com', //DNS IPv4
    port: '3306',
    user: 'root',
    password: 'W836rrv+',
    database: 'tgc',
});

app.get('/', (req, res) => {
    res.send('Hello World!');
});

// API Management
app.get('/api/get', async (req, res) => {
    try {
        const conn = await pool.getConnection();
        const [result, field] = await conn.query('SELECT * FROM `apiData`');
        conn.release();
        res.json(result);
        console.log('[OK] APIs retrieved successfully');
    } catch (err) {
        res.status(status.INTERNAL_SERVER_ERROR).json({ message: 'Internal Server Error' });
        console.log(`[ERR] Fail to get api`)
        console.log(err)
    }
})

app.post('/api/add', async (req, res) => {
    try {
        const conn = await pool.getConnection();
        const [result, field] = await conn.execute('INSERT INTO `apiData` (`apiName`, `apiUrl`, `apiMethod`, `apiParams`, `apiType`) VALUES (?, ?, ?, ?, ?)', [req.body.apiName, req.body.apiUrl, req.body.apiMethod, req.body.apiParams, req.body.apiType]);
        conn.release();
        res.status(status.CREATED).json({ message: 'API added successfully' });
        console.log('[OK] API added successfully');
    } catch (err) {
        res.status(status.INTERNAL_SERVER_ERROR).json({ message: 'Internal Server Error' });
        console.log(`[ERR] Fail to add api`)
        console.log(err)
    }
})

app.put('/api/update/:id', async (req, res) => {
    try {
        const conn = await pool.getConnection();
        const [result, field] = await conn.execute('UPDATE `apiData` SET `apiName` = ?, `apiUrl` = ?, `apiMethod` = ?, `apiParams` = ?, `apiType` = ? WHERE `id` = ?', [req.body.apiName, req.body.apiUrl, req.body.apiMethod, req.body.apiParams, req.body.apiType, req.params.id]);
        conn.release();
        res.json({ message: 'API updated successfully' });
        console.log('[OK] API updated successfully');
    } catch (err) {
        res.status(status.INTERNAL_SERVER_ERROR).json({ message: 'Internal Server Error' });
        console.log(`[ERR] Fail to update api`)
        console.log(err)
    }
})

app.delete('/api/delete/:id', async (req, res) => {
    try {
        const conn = await pool.getConnection();
        const [result, field] = await conn.execute('DELETE FROM `apiData` WHERE `id` = ?', [req.params.id]);
        conn.release();
        res.json({ message: 'API deleted successfully' });
        console.log('[OK] API deleted successfully');
    } catch (err) {
        res.status(status.INTERNAL_SERVER_ERROR).json({ message: 'Internal Server Error' });
        console.log(`[ERR] Fail to delete api`)
        console.log(err)
    }
})


const port = 10888  // Replit doesn’t matter which port is using
app.listen(port, () => {
    console.log(`Connected on port ${port}`)
}); 
