'use strict'

const express = require("express");
const bodyParser = require("body-parser");
const rand = require('csprng');
// const fs = require('fs');
// const path = require('path');
const app = express();

import { Octokit } from "octokit";

const octokit = new Octokit({ 
  auth: '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',
});

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


app.get('/', (req, res) => {
    res.send('Hello World!');
});

// API Management


const port = 10888  // Replit doesn’t matter which port is using
app.listen(port, () => {
    console.log(`Connected on port ${port}`)
}); 
