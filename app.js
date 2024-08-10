'use strict'

const express = require("express");
const bodyParser = require("body-parser");
const rand = require('csprng');
const mysql = require('mysql2');
// const fs = require('fs');
// const path = require('path');
const app = express();
const port = 10888  // Replit doesn’t matter which port is using

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

const db = mysql.createConnection({
    host: 'ec2-43-199-88-244.ap-east-1.compute.amazonaws.com',
    port: '3306',
    user: 'me',
    password: 'W836rrv+',
    database: 'mtheme',
});

db.connect()

app.listen(port, () => {
    console.log(`Connected on port ${port}`)
}); 
