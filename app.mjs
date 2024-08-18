import express from "express";
import bodyParser from "body-parser";
import { Octokit } from "@octokit/core";

const octokit = new Octokit({
    auth: process.env.MThemeBackendEnv
});

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const tokenUsers = []

const status = {
    OK: 200,
    CREATED: 201,
    NOT_MODIFIED: 304,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500,
};

const port = 10888;

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.get('/test', async (req, res) => {
    try {
        const response = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
            owner: 'MoRan1412',
            repo: 'MThemeDatabase',
            path: 'test.json',
            headers: {
              'X-GitHub-Api-Version': '2022-11-28'
            }
          })
        const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
        const jsonData = JSON.parse(content);
        res.json(jsonData);
        console.log(`[OK] ${req.originalUrl}`);
    } catch (error) {
        res.status(status.INTERNAL_SERVER_ERROR).json({ error: error.message });
        console.error(`[ERR] ${req.originalUrl} \n${error.message}`);
    }
});

app.get('/user/get', async (req, res) => {
    try {
        const response = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
            owner: 'MoRan1412',
            repo: 'MThemeDatabase',
            path: 'Theme/user.json',
            headers: {
              'X-GitHub-Api-Version': '2022-11-28'
            }
          })
        const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
        const jsonData = JSON.parse(content);
        res.json(jsonData);
        console.log(`[OK] ${req.originalUrl}`);
    } catch (error) {
        res.status(status.INTERNAL_SERVER_ERROR).json({ error: error.message });
        console.error(`[ERR] ${req.originalUrl} \n${error.message}`);
    }
});

app.listen(port, () => {
    console.log(`Connected on port ${port}`);
});