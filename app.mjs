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
const productRepoPath = 'Theme/product.json';
const commentRepoPath = 'Theme/comment.json';

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

app.get('/user/get/:id', async (req, res) => {
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
        const user = jsonData.find(user => user.id === req.params.id);
        res.status(status.OK).json(user);
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
    const avatar = "../source/image/avatar/default.png"
    const email = req.body.email
    const createdAt = formatDateTime(new Date())
    const updatedAt = formatDateTime(new Date())

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
            avatar: avatar,
            email: email,
            language: "en",
            role: "user",
            createdAt: createdAt,
            updatedAt: updatedAt
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
    const userId = req.params.id
    const username = req.body.username
    const password = hashPassword(req.body.password)
    const avatar = req.body.avatar
    const email = req.body.email
    const language = req.body.language
    const role = req.body.role
    const updatedAt = formatDateTime(new Date())
    const notFoundUser = `User with ID ${userId} not found`
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

        let foundUser = false
        jsonData.forEach(user => {
            if (user.id === userId) {
                user.username = username;
                user.password = password;
                user.avatar = avatar;
                user.email = email;
                user.language = language;
                user.role = role;
                user.updatedAt = updatedAt;
                foundUser = true;
            }
        });
        if (!foundUser) {
            throw new Error(notFoundUser)
        }

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
        if (error.message === notFoundUser) {
            statusData.code = status.NOT_FOUND
            statusData.message = notFoundUser
        } else {
            statusData.code = status.INTERNAL_SERVER_ERROR
            statusData.message = error.message
        }
        res.status(statusData.code).json(statusData);
        console.error(`[ERR] ${req.originalUrl} \n${statusData.message}`);
    }
});

app.delete('/user/delete/:id', async (req, res) => {
    const userId = req.params.id
    const notFoundUser = `User with ID ${userId} not found`
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

        let foundUser = false
        jsonData.forEach((user, index) => {
            if (user.id === req.params.id) {
                jsonData.splice(index, 1);
                foundUser = true;
            }
        });
        if (!foundUser) {
            throw new Error(notFoundUser)
        }

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
        if (error.message === notFoundUser) {
            statusData.code = status.NOT_FOUND
            statusData.message = notFoundUser
        } else {
            statusData.code = status.INTERNAL_SERVER_ERROR
            statusData.message = error.message
        }
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
                    avatar: user.avatar,
                    email: user.email,
                    role: user.role,
                    language: user.language,
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

app.post('/user/passwordVerifyCode', async (req, res) => {
    // 成功信息
    const codeSendSuccess = 'Verification code sent successfully'
    // 參數
    const username = req.body.username
    const email = req.body.email

    try {
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
            statusData.code = status.INTERNAL_SERVER_ERROR
            res.status(statusData.code).json(statusData);
        console.error(`[ERR] ${req.originalUrl} \n${statusData.message}`);
    }
})

// Product Management
app.get('/product/get', async (req, res) => {
    try {
        const response = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
            owner: owner,
            repo: repo,
            path: productRepoPath,
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

app.get('/product/get/:id', async (req, res) => {
    // 
    const productId = req.params.id;
    // 
    const notFoundProduct = `Product with ID ${productId} not found`

    try {
        const response = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
            owner: owner,
            repo: repo,
            path: productRepoPath,
            headers: {
                'X-GitHub-Api-Version': '2022-11-28'
            }
        })
        const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
        const jsonData = JSON.parse(content);
        let productData
        let foundProduct = false;
        jsonData.forEach((product) => {
            if (product.id === productId) {
                productData = product;
                foundProduct = true;
            }
        });
        if (!foundProduct) {
            throw new Error(notFoundProduct);
        }
        res.status(status.OK).json(productData);
        console.log(`[OK] ${req.originalUrl}`);
    } catch (error) {
        if (error.message === notFoundProduct) {
            statusData.code = status.NOT_FOUND
            statusData.message = notFoundProduct
        } else {
            statusData.code = status.INTERNAL_SERVER_ERROR
            statusData.message = error.message
        }
        res.status(statusData.code).json(statusData);
        console.error(`[ERR] ${req.originalUrl} \n${statusData.message}`);
    }
});

app.post('/product/add', async (req, res) => {
    // 參數
    const productName = req.body.name
    const author = req.body.author
    const desc = req.body.desc
    const link = req.body.link
    const image = req.body.image
    const price = req.body.price
    const requirement = req.body.requirement
    const type = req.body.type
    const article = req.body.article

    try {
        const existingFile = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
            owner: owner,
            repo: repo,
            path: productRepoPath,
            headers: {
                'X-GitHub-Api-Version': '2022-11-28'
            }
        });
        const sha = existingFile.data.sha;

        const currentContent = Buffer.from(existingFile.data.content, 'base64').toString('utf-8');
        const jsonData = JSON.parse(currentContent);
        const newKLWPData = {
            id: csprng(130, 36),
            name: productName,
            author: author,
            desc: desc,
            link: link,
            image: image,
            price: price,
            requirement: requirement,
            type: type,
            article: article
        };

        jsonData.push(newKLWPData);

        const response = await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
            owner: owner,
            repo: repo,
            path: productRepoPath,
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

app.put('/product/update/:id', async (req, res) => {

    const productId = req.params.id
    const productName = req.body.name
    const author = req.body.author
    const desc = req.body.desc
    const link = req.body.link
    const image = req.body.image
    const price = req.body.price
    const requirement = req.body.requirement
    const type = req.body.type
    const article = req.body.article

    const notFoundProduct = `Product with ID ${productId} not found`

    try {
        const existingFile = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
            owner: owner,
            repo: repo,
            path: productRepoPath,
            headers: {
                'X-GitHub-Api-Version': '2022-11-28'
            }
        });
        const sha = existingFile.data.sha;

        const currentContent = Buffer.from(existingFile.data.content, 'base64').toString('utf-8');
        const jsonData = JSON.parse(currentContent);

        let productFound = false;
        jsonData.forEach(product => {
            if (product.id === productId) {
                product.name = productName;
                product.author = author;
                product.desc = desc;
                product.link = link;
                product.image = image;
                product.price = price;
                product.requirement = requirement;
                product.type = type;
                product.article = article;
                productFound = true;
            }
        });
        if (!productFound) {
            throw new Error(notFoundProduct);
        }

        const response = await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
            owner: owner,
            repo: repo,
            path: productRepoPath,
            message: 'Update product',
            content: Buffer.from(JSON.stringify(jsonData)).toString('base64'),
            sha: sha,
            headers: {
                'X-GitHub-Api-Version': '2022-11-28'
            }
        })
        statusData.code = status.OK
        statusData.message = 'Product updated successfully'
        res.status(statusData.code).json(statusData);
        console.log(`[OK] ${req.originalUrl}`);
    } catch (error) {
        if (error.message === notFoundProduct) {
            statusData.code = status.NOT_FOUND
            statusData.message = notFoundProduct
        } else {
            statusData.code = status.INTERNAL_SERVER_ERROR
            statusData.message = error.message
        }
        res.status(statusData.code).json(statusData);
        console.error(`[ERR] ${req.originalUrl} \n${statusData.message}`);
    }
});

app.delete('/product/delete/:id', async (req, res) => {
    const productId = req.params.id;
    const notFoundProduct = `Product with ID ${productId} not found`
    try {
        const existingFile = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
            owner: owner,
            repo: repo,
            path: productRepoPath,
            headers: {
                'X-GitHub-Api-Version': '2022-11-28'
            }
        });
        const sha = existingFile.data.sha;

        const currentContent = Buffer.from(existingFile.data.content, 'base64').toString('utf-8');
        const jsonData = JSON.parse(currentContent);

        let productFound = false;
        jsonData.forEach((product, index) => {
            if (product.id === productId) {
                jsonData.splice(index, 1);
                productFound = true;
            }
        });
        if (!productFound) {
            throw new Error(notFoundProduct);
        }

        const response = await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
            owner: owner,
            repo: repo,
            path: productRepoPath,
            message: 'Delete product',
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
        if (error.message === notFoundProduct) {
            statusData.code = status.NOT_FOUND
            statusData.message = notFoundProduct
        } else {
            statusData.code = status.INTERNAL_SERVER_ERROR
            statusData.message = error.message
        }
        res.status(statusData.code).json(statusData);
        console.error(`[ERR] ${req.originalUrl} \n${statusData.message}`);
    }
});

// Comment Management
const commentStatus = {
    pending: 'pending',
    approved: 'approved',
    rejected: 'rejected'
}

app.get('/comment/get', async (req, res) => {
    try {
        const response = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
            owner: owner,
            repo: repo,
            path: commentRepoPath,
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

app.post('/comment/add', async (req, res) => {
    const productId = req.body.productId
    const userId = req.body.userId
    const username = req.body.username
    const avatar = req.body.avatar
    const content = req.body.content
    const createdAt = formatDateTime(new Date())
    const updatedAt = formatDateTime(new Date())
    const commentStatus = req.body.status

    try {
        const existingFile = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
            owner: owner,
            repo: repo,
            path: commentRepoPath,
            headers: {
                'X-GitHub-Api-Version': '2022-11-28'
            }
        });
        const sha = existingFile.data.sha;

        const currentContent = Buffer.from(existingFile.data.content, 'base64').toString('utf-8');
        const jsonData = JSON.parse(currentContent);

        const newComment = {
            id: csprng(130, 36),
            productId: productId,
            userId: userId,
            username: username,
            avatar: avatar,
            content: content,
            createdAt: createdAt,
            updatedAt: updatedAt,
            status: commentStatus
        };

        jsonData.push(newComment);

        const response = await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
            owner: owner,
            repo: repo,
            path: commentRepoPath,
            message: 'Create comment',
            content: Buffer.from(JSON.stringify(jsonData)).toString('base64'),
            sha: sha,
            headers: {
                'X-GitHub-Api-Version': '2022-11-28'
            }
        })

        statusData.code = status.CREATED
        statusData.message = 'Comment created successfully'
        res.status(statusData.code).json(statusData);
        console.log(`[OK] ${req.originalUrl}`);
    } catch (error) {
        statusData.code = status.INTERNAL_SERVER_ERROR
        statusData.message = error.message
        res.status(statusData.code).json(statusData);
        console.error(`[ERR] ${req.originalUrl} \n${statusData.message}`);
    }
});

app.put('/comment/update/:id', async (req, res) => {
    const commentId = req.params.id
    const userId = req.body.userId
    const username = req.body.username
    const avatar = req.body.avatar
    const productId = req.body.productId
    const updatedAt = formatDateTime(new Date())
    const content = req.body.content
    const commentStatus = req.body.status

    const notFoundComment = `Comment with ID ${commentId} not found`

    try {
        const existingFile = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
            owner: owner,
            repo: repo,
            path: commentRepoPath,
            headers: {
                'X-GitHub-Api-Version': '2022-11-28'
            }
        });
        const sha = existingFile.data.sha;

        const currentContent = Buffer.from(existingFile.data.content, 'base64').toString('utf-8');
        const jsonData = JSON.parse(currentContent);

        let commentFound = false;
        jsonData.forEach(comment => {
            if (comment.id === commentId) {
                comment.content = content;
                comment.productId = productId;
                comment.userId = userId;
                comment.username = username;
                comment.avatar = avatar;
                comment.updatedAt = updatedAt;
                comment.status = commentStatus;
                commentFound = true;
            }
        });
        if (!commentFound) {
            throw new Error(notFoundComment);
        }

        const response = await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
            owner: owner,
            repo: repo,
            path: commentRepoPath,
            message: 'Update comment',
            content: Buffer.from(JSON.stringify(jsonData)).toString('base64'),
            sha: sha,
            headers: {
                'X-GitHub-Api-Version': '2022-11-28'
            }
        })
        statusData.code = status.OK
        statusData.message = 'Comment updated successfully'
        res.status(statusData.code).json(statusData);
        console.log(`[OK] ${req.originalUrl}`);
    } catch (error) {
        if (error.message === notFoundComment) {
            statusData.code = status.NOT_FOUND
            statusData.message = notFoundComment
        } else {
            statusData.code = status.INTERNAL_SERVER_ERROR
            statusData.message = error.message
        }
        res.status(statusData.code).json(statusData);
        console.error(`[ERR] ${req.originalUrl} \n${statusData.message}`);
    }
});

app.delete('/comment/delete/:id', async (req, res) => {
    const commentId = req.params.id;
    const notFoundComment = `Comment with ID ${commentId} not found`
    try {
        const existingFile = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
            owner: owner,
            repo: repo,
            path: commentRepoPath,
            headers: {
                'X-GitHub-Api-Version': '2022-11-28'
            }
        });
        const sha = existingFile.data.sha;

        const currentContent = Buffer.from(existingFile.data.content, 'base64').toString('utf-8');
        const jsonData = JSON.parse(currentContent);

        let commentFound = false;
        jsonData.forEach((comment, index) => {
            if (comment.id === commentId) {
                jsonData.splice(index, 1);
                commentFound = true;
            }
        });
        if (!commentFound) {
            throw new Error(notFoundComment);
        }

        const response = await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
            owner: owner,
            repo: repo,
            path: commentRepoPath,
            message: 'Delete comment',
            content: Buffer.from(JSON.stringify(jsonData)).toString('base64'),
            sha: sha,
            headers: {
                'X-GitHub-Api-Version': '2022-11-28'
            }
        })
        statusData.code = status.OK
        statusData.message = 'Comment deleted successfully'
        res.status(statusData.code).json(statusData);
        console.log(`[OK] ${req.originalUrl}`);
    } catch (error) {
        if (error.message === notFoundComment) {
            statusData.code = status.NOT_FOUND
            statusData.message = notFoundComment
        } else {
            statusData.code = status.INTERNAL_SERVER_ERROR
            statusData.message = error.message
        }
        res.status(statusData.code).json(statusData);
        console.error(`[ERR] ${req.originalUrl} \n${statusData.message}`);
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

function formatDateTime(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    return `${year}-${month}-${day} ${hours}:${minutes}`;
}