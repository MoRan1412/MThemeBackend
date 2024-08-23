import express from "express";
import bodyParser from "body-parser";
import csprng from "csprng";
import crypto from "crypto";
import fs, { stat } from "fs";
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

const statusData = {
    code: status.OK,
    message: ""
}

const port = 10888;

app.get('/', (req, res) => {
    res.send('Hello World!');
});


// Database Path
const userRepoPath = 'Theme/user.json';
const klwpRepoPath = 'Theme/klwp.json';

// User Management
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
        statusData.code = status.INTERNAL_SERVER_ERROR
        statusData.message = error.message
        res.status(statusData.code).json(statusData);
        console.error(`[ERR] ${req.originalUrl} \n${statusData.message}`);
    }
});

app.post('/user/add', async (req, res) => {
    // 參數
    const username = req.body.username
    const password = hashPassword(req.body.password)
    const email = req.body.email

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
            username: username,
            password: password,
            email: email,
            language: "en",
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

        statusData.code = status.CREATED
        statusData.message = 'User created successfully'
        res.status(statusData.code).json(statusData);
        console.log(`[OK] ${req.originalUrl}`);
    } catch (error) {
        statusData.code = status.INTERNAL_SERVER_ERROR
        statusData.message = error.message
        res.status(statusData.code).json(statusData);
        console.error(`[ERR] ${req.originalUrl} \n${statusData.message}`);
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
            language: req.body.language,
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
        statusData.code = status.OK
        statusData.message = 'User updated successfully'
        res.status(statusData.code).json(statusData);
        console.log(`[OK] ${req.originalUrl}`);
    } catch (error) {
        statusData.code = status.INTERNAL_SERVER_ERROR
        statusData.message = error.message
        res.status(statusData.code).json(statusData);
        console.error(`[ERR] ${req.originalUrl} \n${statusData.message}`);
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
        statusData.code = status.OK
        statusData.message = 'User deleted successfully'
        res.status(statusData.code).json(statusData);
        console.log(`[OK] ${req.originalUrl}`);
    } catch (error) {
        statusData.code = status.INTERNAL_SERVER_ERROR
        statusData.message = error.message
        res.status(statusData.code).json(statusData);
        console.error(`[ERR] ${req.originalUrl} \n${statusData.message}`);
    }
});

app.post('/user/sendEmailVerifyCode', async (req, res) => {
    // 錯誤信息
    const usernameExistString = 'Username already exists'
    const emailExistString = 'Email already exists'
    // 成功信息
    const codeSendSuccess = 'Verification code sent successfully'
    // 參數
    const username = req.body.username
    const email = req.body.email

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
        const emailExist = jsonData.find(user => user.email === email);
        const userExist = jsonData.find(user => user.username === username);
        if (emailExist) {
            throw new Error(emailExistString);
        }
        if (userExist) {
            throw new Error(usernameExistString);
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
        verificationCodes[email] = code

        // 到指定时间删除验证码
        setTimeout(() => {
            try {
                if (verificationCodes[email]) {
                    delete verificationCodes[email];
                    console.log(`Verification code for ${email} has expired and been deleted.`);
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
        htmlContent = htmlContent.replace('{{username}}', username);

        try {
            // 发送邮箱
            await mailTransport.sendMail({
                from: `"MTheme" ${GMAIL_USER}`,
                to: email,
                subject: `${code} is your verification code`,
                html: htmlContent
            });

            statusData.code = status.OK
            statusData.message = codeSendSuccess
            res.status(statusData.code).json(statusData);
            console.log(`[OK] ${req.originalUrl} \n${statusData.message}`);
        } catch (error) {
            statusData.code = status.INTERNAL_SERVER_ERROR
            statusData.message = error.message
            res.status(statusData.code).json(statusData);
            console.error(`[ERR] ${req.originalUrl} \n${statusData.message}`);
        }

    } catch (error) {
        statusData.message = error.message
        if (statusData.message == usernameExistString || statusData.message == emailExistString) {
            statusData.code = status.CONFLICT
            res.status(statusData.code).json(statusData);
        } else {
            statusData.code = status.INTERNAL_SERVER_ERROR
            res.status(statusData.code).json(statusData);
        }
        console.error(`[ERR] ${req.originalUrl} \n${statusData.message}`);
    }
})

app.post('/user/emailVerify', async (req, res) => {
    // 參數
    const email = req.body.email
    const code = req.body.code
    if (verificationCodes[email] === code) {
        statusData.code = status.OK
        statusData.message = 'Email verified successfully'
        res.status(status.OK).json(statusData);
        delete verificationCodes[email];
        console.log(`[OK] ${req.originalUrl} \n${statusData.message}`);
    } else {
        statusData.code = status.UNAUTHORIZED
        statusData.message = 'Invalid verification code'
        res.status(statusData.code).json(statusData);
        console.log(`[ERR] ${req.originalUrl} \n${statusData.message}`);
    }
})

app.post('/user/loginVerify', async (req, res) => {
    // 參數
    const username = req.body.username
    const password = req.body.password
    // 錯誤信息
    const invalidInput = 'Invalid username or password'

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
            if (user.username === username && user.password === hashPassword(password)) {
                console.log(`[OK] Login successful: ${username}`);
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
            statusData.code = status.UNAUTHORIZED
            statusData.message = invalidInput
            console.log(`[ERR] ${req.originalUrl} \n${statusData.message}`);
            res.status(statusData.code).json(statusData);
        }
    } catch (error) {
        statusData.code = status.INTERNAL_SERVER_ERROR
        statusData.message = error.message
        res.status(statusData.code).json(statusData);
        console.error(`[ERR] ${req.originalUrl} \n${statusData.message}`);
    }
})

// KLWP Management
app.get('/klwp/get', async (req, res) => {
    try {
        const response = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
            owner: owner,
            repo: repo,
            path: klwpRepoPath,
            headers: {
                'X-GitHub-Api-Version': '2022-11-28'
            }
        })
        const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
        const jsonData = JSON.parse(content);
        res.status(status.OK).json(jsonData);
        console.log(`[OK] ${req.originalUrl}`);
    } catch (error) {
        statusData.code = status.INTERNAL_SERVER_ERROR
        statusData.message = error.message
        res.status(statusData.code).json(statusData);
        console.error(`[ERR] ${req.originalUrl} \n${statusData.message}`);
    }
});

app.get('/klwp/get/:id', async (req, res) => {
    try {
        const response = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
            owner: owner,
            repo: repo,
            path: klwpRepoPath,
            headers: {
                'X-GitHub-Api-Version': '2022-11-28'
            }
        })
        const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
        const jsonData = JSON.parse(content);
        let klwpData
        jsonData.forEach((klwp) => {
            if (klwp.id === req.params.id) {
                klwpData = klwp
            }
        });
        res.status(status.OK).json(klwpData);
        console.log(`[OK] ${req.originalUrl}`);
    } catch (error) {
        statusData.code = status.INTERNAL_SERVER_ERROR
        statusData.message = error.message
        res.status(statusData.code).json(statusData);
        console.error(`[ERR] ${req.originalUrl} \n${statusData.message}`);
    }
});

app.post('/klwp/add', async (req, res) => {
    // 參數
    const klwpname = req.body.name
    const author = req.body.author
    const desc = req.body.desc
    const link = req.body.link
    const image = req.body.image
    const price = req.body.price

    try {
        const existingFile = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
            owner: owner,
            repo: repo,
            path: klwpRepoPath,
            headers: {
                'X-GitHub-Api-Version': '2022-11-28'
            }
        });
        const sha = existingFile.data.sha;

        const currentContent = Buffer.from(existingFile.data.content, 'base64').toString('utf-8');
        const jsonData = JSON.parse(currentContent);
        const newKLWPData = {
            id: csprng(130, 36),
            name: klwpname,
            author: author,
            desc: desc,
            link: link,
            image: image,
            price: price
        };

        jsonData.push(newKLWPData);

        const response = await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
            owner: owner,
            repo: repo,
            path: klwpRepoPath,
            message: 'Create klwp',
            content: Buffer.from(JSON.stringify(jsonData)).toString('base64'),
            sha: sha,
            headers: {
                'X-GitHub-Api-Version': '2022-11-28'
            }
        })

        statusData.code = status.CREATED
        statusData.message = 'KLWP created successfully'
        res.status(statusData.code).json(statusData);
        console.log(`[OK] ${req.originalUrl}`);
    } catch (error) {
        statusData.code = status.INTERNAL_SERVER_ERROR
        statusData.message = error.message
        res.status(statusData.code).json(statusData);
        console.error(`[ERR] ${req.originalUrl} \n${statusData.message}`);
    }
});

app.put('/klwp/update/:id', async (req, res) => {
    const klwpname = req.body.name
    const author = req.body.author
    const desc = req.body.desc
    const link = req.body.link
    const image = req.body.image
    const price = req.body.price
    try {
        const existingFile = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
            owner: owner,
            repo: repo,
            path: klwpRepoPath,
            headers: {
                'X-GitHub-Api-Version': '2022-11-28'
            }
        });
        const sha = existingFile.data.sha;

        const currentContent = Buffer.from(existingFile.data.content, 'base64').toString('utf-8');
        const jsonData = JSON.parse(currentContent);
        const newKLWPData = {
            id: req.params.id,
            name: klwpname,
            author: author,
            desc: desc,
            link: link,
            image: image,
            price: price
        };

        jsonData.forEach(klwp => {
            if (klwp.id === newKLWPData.id) {
                klwp.name = newKLWPData.name;
                klwp.author = newKLWPData.author;
                klwp.desc = newKLWPData.desc;
                klwp.link = newKLWPData.link;
                klwp.image = newKLWPData.image;
            }
        });

        const response = await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
            owner: owner,
            repo: repo,
            path: klwpRepoPath,
            message: 'Update klwp',
            content: Buffer.from(JSON.stringify(jsonData)).toString('base64'),
            sha: sha,
            headers: {
                'X-GitHub-Api-Version': '2022-11-28'
            }
        })
        statusData.code = status.OK
        statusData.message = 'KLWP updated successfully'
        res.status(statusData.code).json(statusData);
        console.log(`[OK] ${req.originalUrl}`);
    } catch (error) {
        statusData.code = status.INTERNAL_SERVER_ERROR
        statusData.message = error.message
        res.status(statusData.code).json(statusData);
        console.error(`[ERR] ${req.originalUrl} \n${statusData.message}`);
    }
});

app.delete('/klwp/delete/:id', async (req, res) => {
    try {
        const existingFile = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
            owner: owner,
            repo: repo,
            path: klwpRepoPath,
            headers: {
                'X-GitHub-Api-Version': '2022-11-28'
            }
        });
        const sha = existingFile.data.sha;

        const currentContent = Buffer.from(existingFile.data.content, 'base64').toString('utf-8');
        const jsonData = JSON.parse(currentContent);

        jsonData.forEach((klwp, index) => {
            if (klwp.id === req.params.id) {
                jsonData.splice(index, 1);
            }
        });

        const response = await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
            owner: owner,
            repo: repo,
            path: klwpRepoPath,
            message: 'Delete klwp',
            content: Buffer.from(JSON.stringify(jsonData)).toString('base64'),
            sha: sha,
            headers: {
                'X-GitHub-Api-Version': '2022-11-28'
            }
        })
        statusData.code = status.OK
        statusData.message = 'KLWP deleted successfully'
        res.status(statusData.code).json(statusData);
        console.log(`[OK] ${req.originalUrl}`);
    } catch (error) {
        statusData.code = status.INTERNAL_SERVER_ERROR
        statusData.message = error.message
        res.status(statusData.code).json(statusData);
        console.error(`[ERR] ${req.originalUrl} \n${statusData.message}`);
    }
});

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