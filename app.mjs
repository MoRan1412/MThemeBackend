import express from "express";
import bodyParser from "body-parser";
import csprng from "csprng";
import crypto from "crypto";
import fs from "fs";
import { fileURLToPath } from 'url';
import path from "path";

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const tokenUsers = []
const verificationCodes = {}
const codeExpirationTime = 48 * 60 * 60 * 1000;

import nodemailer from "nodemailer";
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_PASS = process.env.GMAIL_PASS;
const mailTransport = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: GMAIL_USER,
        pass: GMAIL_PASS
    }
})

import { Octokit } from "@octokit/core";
const octokit = new Octokit({
    auth: process.env.MThemeBackendEnv
});

const owner = 'MoRan1412';
const repo = 'MThemeDatabase';

const status = {
    OK: 200,
    CREATED: 201,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_SERVER_ERROR: 500,
};

const port = 10888;

app.get('/', (req, res) => {
    res.send('Hello World!');
});


// User Management
const userRepoPath = 'Theme/user.json';

app.get('/user/get', async (req, res) => {
    try {
        const response = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
            owner: owner,
            repo: repo,
            path: userRepoPath,
            headers: {
                'X-GitHub-Api-Version': '2022-11-28'
            }
        })
        const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
        const jsonData = JSON.parse(content);
        res.status(status.OK).json(jsonData);
        console.log(`[OK] ${req.originalUrl}`);
    } catch (error) {
        res.status(status.INTERNAL_SERVER_ERROR).json({ error: error.message });
        console.error(`[ERR] ${req.originalUrl} \n${error.message}`);
    }
});

app.post('/user/add', async (req, res) => {
    try {
        const existingFile = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
            owner: owner,
            repo: repo,
            path: userRepoPath,
            headers: {
                'X-GitHub-Api-Version': '2022-11-28'
            }
        });
        const sha = existingFile.data.sha;

        const currentContent = Buffer.from(existingFile.data.content, 'base64').toString('utf-8');
        const jsonData = JSON.parse(currentContent);
        const newUserData = {
            id: csprng(130, 36),
            username: req.body.username,
            password: hashPassword(req.body.password),
            email: req.body.email,
            role: "user"
        };

        jsonData.push(newUserData);

        const response = await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
            owner: owner,
            repo: repo,
            path: userRepoPath,
            message: 'Create user',
            content: Buffer.from(JSON.stringify(jsonData)).toString('base64'),
            sha: sha,
            headers: {
                'X-GitHub-Api-Version': '2022-11-28'
            }
        })
        res.status(status.CREATED).json({ message: 'User created successfully' });
        console.log(`[OK] ${req.originalUrl}`);
    } catch (error) {
        res.status(status.INTERNAL_SERVER_ERROR).json({ error: error.message });
        console.error(`[ERR] ${req.originalUrl} \n${error.message}`);
    }
});

app.put('/user/update/:id', async (req, res) => {
    try {
        const existingFile = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
            owner: owner,
            repo: repo,
            path: userRepoPath,
            headers: {
                'X-GitHub-Api-Version': '2022-11-28'
            }
        });
        const sha = existingFile.data.sha;

        const currentContent = Buffer.from(existingFile.data.content, 'base64').toString('utf-8');
        const jsonData = JSON.parse(currentContent);
        const newUserData = {
            id: req.params.id,
            username: req.body.username,
            password: req.body.password,
            email: req.body.email,
            role: req.body.role
        };

        jsonData.forEach(user => {
            if (user.id === newUserData.id) {
                user.username = newUserData.username;
                user.password = newUserData.password;
                user.email = newUserData.email;
                user.role = newUserData.role;
            }
        });

        const response = await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
            owner: owner,
            repo: repo,
            path: userRepoPath,
            message: 'Update user',
            content: Buffer.from(JSON.stringify(jsonData)).toString('base64'),
            sha: sha,
            headers: {
                'X-GitHub-Api-Version': '2022-11-28'
            }
        })
        res.status(status.OK).json({ message: 'User updated successfully' });
        console.log(`[OK] ${req.originalUrl}`);
    } catch (error) {
        res.status(status.INTERNAL_SERVER_ERROR).json({ error: error.message });
        console.error(`[ERR] ${req.originalUrl} \n${error.message}`);
    }
});

app.delete('/user/delete/:id', async (req, res) => {
    try {
        const existingFile = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
            owner: owner,
            repo: repo,
            path: userRepoPath,
            headers: {
                'X-GitHub-Api-Version': '2022-11-28'
            }
        });
        const sha = existingFile.data.sha;

        const currentContent = Buffer.from(existingFile.data.content, 'base64').toString('utf-8');
        const jsonData = JSON.parse(currentContent);

        jsonData.forEach((user, index) => {
            if (user.id === req.params.id) {
                jsonData.splice(index, 1);
            }
        });

        const response = await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
            owner: owner,
            repo: repo,
            path: userRepoPath,
            message: 'Delete user',
            content: Buffer.from(JSON.stringify(jsonData)).toString('base64'),
            sha: sha,
            headers: {
                'X-GitHub-Api-Version': '2022-11-28'
            }
        })
        res.status(status.OK).json({ message: 'User deleted successfully' });
        console.log(`[OK] ${req.originalUrl}`);
    } catch (error) {
        res.status(status.INTERNAL_SERVER_ERROR).json({ error: error.message });
        console.error(`[ERR] ${req.originalUrl} \n${error.message}`);
    }
});

app.post('/user/sendEmailVerifyCode', async (req, res) => {
    try {
        // 获取存在的用户数据库
        const existingFile = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
            owner: owner,
            repo: repo,
            path: userRepoPath,
            headers: {
                'X-GitHub-Api-Version': '2022-11-28'
            }
        });

        const currentContent = Buffer.from(existingFile.data.content, 'base64').toString('utf-8');
        const jsonData = JSON.parse(currentContent);

        // 检查用户或邮箱是否存在
        const emailExist = jsonData.find(user => user.email === req.body.email);
        const userExist = jsonData.find(user => user.username === req.body.username);
        if (emailExist) {
            throw new Error('Email already exists');
        }
        if (userExist) {
            throw new Error('Username already exists');
        }

        // 邮箱验证码生成
        const characters = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const charactersLength = characters.length;
        let code = '';
        for (let i = 0; i < 5; i++) {
            const randomBytes = crypto.randomBytes(1);
            code += characters[randomBytes[0] % charactersLength];
        }

        // 将验证码储存到对象
        verificationCodes[req.body.email] = code

        // 到指定时间删除验证码
        setTimeout(() => {
            try {
                if (verificationCodes[req.body.email]) {
                    delete verificationCodes[req.body.email];
                    console.log(`Verification code for ${req.body.email} has expired and been deleted.`);
                }
            } catch (error) {
                console.error(`Error while deleting expired verification code: ${error}`);
            }
        }, codeExpirationTime);

        // 获取邮箱样式HTML文件
        const __dirname = path.dirname(fileURLToPath(import.meta.url));
        const filePath = path.join(__dirname, 'emailContent.html');
        let htmlContent = fs.readFileSync(filePath, 'utf8');
        htmlContent = htmlContent.replace('{{code}}', code);
        htmlContent = htmlContent.replace('{{username}}', req.body.username);

        try {
            // 发送邮箱
            await mailTransport.sendMail({
                from: `"MTheme" ${GMAIL_USER}`,
                to: req.body.email,
                subject: `${code} is your verification code`,
                html: htmlContent
            });

            res.status(status.OK).json({ message: 'Verification code sent successfully' });
            console.log(`[OK] ${req.originalUrl}`);
        } catch (error) {
            res.status(status.INTERNAL_SERVER_ERROR).json({ error: error.message });
            console.error(`[ERR] ${req.originalUrl} \n${error.message}`);
        }

    } catch (error) {
        res.status(status.INTERNAL_SERVER_ERROR).json({ error: error.message });
        console.error(`[ERR] ${req.originalUrl} \n${error.message}`);
        return;
    }
})

app.post('/user/emailVerify', async (req, res) => {
    if (verificationCodes[req.body.email] === req.body.code) {
        res.status(status.OK).json({ message: 'Email verified successfully' });
        delete verificationCodes[req.body.email];
        console.log(`[OK] ${req.originalUrl}`);
    } else {
        res.status(status.UNAUTHORIZED).json({ error: 'Invalid verification code' });
        console.log(`[ERR] ${req.originalUrl}`);
    }
})

app.post('/user/loginVerify', async (req, res) => {
    try {
        const existingFile = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
            owner: owner,
            repo: repo,
            path: userRepoPath,
            headers: {
                'X-GitHub-Api-Version': '2022-11-28'
            }
        });

        const currentContent = Buffer.from(existingFile.data.content, 'base64').toString('utf-8');
        const jsonData = JSON.parse(currentContent);

        let userFound = false;
        jsonData.forEach((user, index) => {
            if (user.username === req.body.username && user.password === hashPassword(req.body.password)) {
                console.log(`[OK] Login successful: ${req.body.username}`);
                const userData = {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    accessToken: csprng(130, 36)
                };
                addTokenUser(userData);
                res.status(status.OK).send(userData);
                userFound = true;
            }
        });
        if (!userFound) {
            console.log(`[ERR] ${req.originalUrl} \nInvalid username or password`);
            return res.status(status.UNAUTHORIZED).json({ error: 'Invalid username or password' });
        }
    } catch (error) {
        res.status(status.INTERNAL_SERVER_ERROR).json({ error: error.message });
        console.error(`[ERR] ${req.originalUrl} \n${error.message}`);
    }
})

app.listen(port, () => {
    console.log(`Connected on port ${port}`);
});


/* functions */
function addTokenUser(user) {
    for (let i = 0; i < tokenUsers.length; i++) {
        if (tokenUsers[i].id === user.id) {
            tokenUsers[i].accessToken = user.accessToken
            console.log(tokenUsers)
            return
        }
    }
    tokenUsers.push(user)
    console.log(tokenUsers)
    return
}

const hashPassword = (passwd) => {
    return crypto.createHash("sha256").update(passwd).digest("hex");
};