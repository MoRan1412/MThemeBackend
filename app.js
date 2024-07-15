'use strict'
 
const express = require("express");
const bodyParser = require("body-parser");
const { MongoClient, ServerApiVersion  } = require('mongodb');
const ObjectId = require('mongodb').ObjectId
const rand = require('csprng');
const app = express();
 
app.use(bodyParser.json()); //Used to parse JSON bodies
app.use(bodyParser.urlencoded({ extended: true })); //Parse URL-encoded bodies
 
// MongoDB authentication
const dbusername = '230355121' // update YOUR db name
const dbpassword = '230355121' // update YOUR db password
const uri = `mongodb+srv://${dbusername}:${dbpassword}@cluster0.e1plgzt.mongodb.net`    // update YOUR cluster path

const tokenUsers = []

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const status = {
    OK: 200,
    CREATED: 201,
    NOT_MODIFIED: 304,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500,
  };

// API

app.get("/", (req, res) => {
    res.send("Hello, World!");
})

// User
app.post("/user/add", async (req, res) => {
    await client.connect();
    const database = client.db("shoe_shop");
    const users = database.collection("user");
    const carts = database.collection("cart");
    const inputName = req.body.name;
    const inputPassword = req.body.password;
    const inputRole = req.body.role;
    console.log("Register request for:", inputName);

    const newUser = {
        name: inputName,
        password: inputPassword,
        avatar: "/source/image/profile/avatar/default.png", 
        role: inputRole,
    };

    try {
        const userResult = await users.insertOne(newUser);
        const newCart = {
            userId: userResult.insertedId.toString(),
            products: [],
            totalProducts: 0,
            totalPrice: 0
        }
        await carts.insertOne(newCart);
        res.status(status.OK).send(userResult);
        console.log(userResult)
        console.log(`Successfully inserted user with _id: ${userResult.insertedId}`);
    } catch (err) {
        console.error(`Failed to insert user: ${err}`);
        res.status = status.INTERNAL_SERVER_ERROR;
        res.send({ err: err.toString() });
    } finally {
        await client.close();
    }
})

app.post("/user/login", async (req, res) => {
    await client.connect();
    const database = client.db("shoe_shop");
    const users = database.collection("user");
    const carts = database.collection("cart");
    const inputName = req.body.username;
    const inputPassword = req.body.password;
    console.log("Login request for:", inputName);

    try {
        const user = await users.findOne({ name: inputName });
        if (user === null) throw new Error(`cannot find user: ${inputName}`);
        if (inputPassword === user.password) {
            console.log("Login successful for:", inputName);
            const cart = await carts.findOne({ userId: user._id.toString() })
            if (cart === null) throw new Error(`cannot find cart: ${inputName}`);
            const cartId = cart._id.toString()
            user.cartId = cartId
            const token = rand(130, 36)
            user.accessToken = token
            addTokenUser(user)
            res.status(status.OK).send(user);
        } else {
            console.log("Login failed for:", inputName);
            throw new Error("Incorrect username or password")
        }
    } catch (err) {
        console.error("Failed to login:", err);
        res.status(status.INTERNAL_SERVER_ERROR).send({ err: err.toString() });
    } finally {
        await client.close();
    }
})

app.get("/user/get", async (req, res) => {
    await client.connect();
    const database = client.db("shoe_shop");
    const users = database.collection("user");
    try {
        const result = await users.find().toArray();
        if (result === null) throw "cannot retrieve user";
        res.send(result);
        console.log("Successfully retrieve users");
    } catch (err) {
        console.error(`Failed to retrieve user: ${err}`);
        res.status = status.INTERNAL_SERVER_ERROR;
        res.send({ err: err });
    } finally {
        await client.close();
    }
})

app.get("/user/get/:id", async (req, res) => {
    await client.connect();
    const database = client.db("shoe_shop");
    const users = database.collection("user");

    try {
        let regexp = /^[0-9a-fA-F]+$/;
        if (!regexp.test(req.params.id)) throw new Error("Invalid user ID");
        const query = { _id: ObjectId.createFromHexString(req.params.id) };
        const result = await users.findOne(query);
        if (result === null) throw "cannot retrieve user";
        res.send(result);
        console.log("Successfully retrieve user");
    } catch (err) {
        console.error(`Failed to retrieve user: ${err}`);
        res.status = status.INTERNAL_SERVER_ERROR;
        res.send({ err: err });
    } finally {
        await client.close();
    }
})

app.put("/user/update/:id", async (req, res) => {
    console.log("update user: " + req.params.id);
    await client.connect();
    const database = client.db("shoe_shop");
    const users = database.collection("user");

    try {
        let regexp = /^[0-9a-fA-F]+$/;
        if (!regexp.test(req.params.id)) throw new Error("Invalid user ID");
        const query = { _id: ObjectId.createFromHexString(req.params.id) };
        const newValues = {
            $set: {
                name: req.body.name,
                password: req.body.password,
                role: req.body.role,
            },
        };
        const options = { writeConcern: { w: 1, j: true, wtimeout: 1000 } };

        const result = await users.findOneAndUpdate(query, newValues, options);
        console.log(`Successfully updated user: ${result.name}`);
        console.log(result);
        res.send(result);
    } catch (err) {
        console.error(`Failed to update user: ${err}`);
        res.status = status.INTERNAL_SERVER_ERROR;
        res.send({ err: err.toString() });
    } finally {
        await client.close();
    }
})

app.put("/user/update/password/:id", async (req, res) => {
    console.log("update user password: " + req.params.id);
    await client.connect();
    const database = client.db("shoe_shop");
    const users = database.collection("user");

    try {
        let regexp = /^[0-9a-fA-F]+$/;
        if (!regexp.test(req.params.id)) throw new Error("Invalid user ID");
        const query = { _id: ObjectId.createFromHexString(req.params.id) };
        const newValues = {
            $set: {
                password: req.body.password,
            },
        };
        const options = { writeConcern: { w: 1, j: true, wtimeout: 1000 } };

        const result = await users.findOneAndUpdate(query, newValues, options);
        console.log(`Successfully updated user password: ${result.name}`);
        console.log(result);
        res.send(result);
    } catch (err) {
        console.error(`Failed to update user password: ${err}`);
        res.status = status.INTERNAL_SERVER_ERROR;
        res.send({ err: err.toString() });
    } finally {
        await client.close();
    }
})

app.put("/user/update/username/:id", async (req, res) => {
    console.log("update user username: " + req.params.id);
    await client.connect();
    const database = client.db("shoe_shop");
    const users = database.collection("user");

    try {
        let regexp = /^[0-9a-fA-F]+$/;
        if (!regexp.test(req.params.id)) throw new Error("Invalid user ID");
        const query = { _id: ObjectId.createFromHexString(req.params.id) };
        const newValues = {
            $set: {
                name: req.body.name,
            },
        };
        const options = { writeConcern: { w: 1, j: true, wtimeout: 1000 } };

        const result = await users.findOneAndUpdate(query, newValues, options);
        console.log(`Successfully updated user username: ${result.name}`);
        console.log(result);
        res.send(result);
    } catch (err) {
        console.error(`Failed to update user username: ${err}`);
        res.status = status.INTERNAL_SERVER_ERROR;
        res.send({ err: err.toString() });
    } finally {
        await client.close();
    }
})

app.delete("/user/delete/:id", async (req, res) => {
    console.log("delete user: " + req.params.id);
    await client.connect();
    const database = client.db("shoe_shop");
    const users = database.collection("user");
    const carts = database.collection("cart");

    try {
        let regexp = /^[0-9a-fA-F]+$/;
        if (!regexp.test(req.params.id)) throw new Error("Invalid user ID");
        const query = { _id: ObjectId.createFromHexString(req.params.id) };
        const options = { writeConcern: { w: 1, j: true, wtimeout: 1000 } };
        const cartQuery = { userId: req.params.id };

        const cartResult = await carts.findOneAndDelete(cartQuery, options)

        const result = await users.findOneAndDelete(query, options);
        console.log(`Successfully deleted user: ${result.name}`);
        console.log(result);
        res.send(result);
    } catch (err) {
        console.error(`Failed to delete user: ${err}`);
        res.status = status.INTERNAL_SERVER_ERROR;
        res.send({ err: err.toString() });
    } finally {
        await client.close();
    }
})

app.put("/user/profile/update/:id", async (req, res) => {
    console.log("update user profile: " + req.params.id);
    await client.connect();
    const database = client.db("shoe_shop");
    const users = database.collection("user");

    try {
        let regexp = /^[0-9a-fA-F]+$/;
        if (!regexp.test(req.params.id)) throw new Error("Invalid user ID");
        const query = { _id: ObjectId.createFromHexString(req.params.id) };
        const newValues = {
            $set: {
                avatar: req.body.avatar,
                name: req.body.name
            },
        };
        const options = { writeConcern: { w: 1, j: true, wtimeout: 1000 } };
        const oldResult = await users.findOne(query) 
        console.log(oldResult)
        const result = await users.findOneAndUpdate(query, newValues, options);
        if (oldResult.avatar !== "/source/image/profile/avatar/default.png") {
            result.deletePath = oldResult.avatar
        }
        console.log(`Successfully updated user profile: ${result.name}`);
        console.log(result);
        res.send(result);
    } catch (err) {
        console.error(`Failed to update user profile: ${err}`);
        res.status = status.INTERNAL_SERVER_ERROR;
        res.send({ err: err.toString() });
    } finally {
        await client.close();
    }
})

app.get("/user/profile/:id", async (req, res) => {
    await client.connect();
    const database = client.db("shoe_shop");
    const users = database.collection("user");
    const transactions = database.collection("transaction")

    try {
        const result = await users.findOne({ _id: ObjectId.createFromHexString(req.params.id) });
        if (result === null) throw "cannot retrieve user";
        const transaction = await transactions.find({ userId: req.params.id }).toArray()
        if (transaction !== null) {
            result.transaction = transaction
        } else {
            result.transaction = []
        }
        res.send(result);
        console.log("Successfully retrieve user profile");
        console.log(result)
    } catch (err) {
        console.error(`Failed to retrieve user profile: ${err}`);
        res.status = status.INTERNAL_SERVER_ERROR;
        res.send({ err: err });
    } finally {
        await client.close();
    }
})


// Product
app.get("/product/get", async (req, res) => {
    await client.connect();
    const database = client.db("shoe_shop");
    const products = database.collection("product");
    try {
        const result = await products.find().toArray();
        if (result === null) throw "cannot retrieve product";
        res.send(result);
        console.log("Successfully retrieve products");
    } catch (err) {
        console.error(`Failed to retrieve product: ${err}`);
        res.status = status.INTERNAL_SERVER_ERROR;
        res.send({ err: err });
    } finally {
        await client.close();
    }
})

app.get("/product/get/:id", async (req, res) => {
    await client.connect();
    const database = client.db("shoe_shop");
    const products = database.collection("product");

    try {
        const result = await products.findOne({ _id: ObjectId.createFromHexString(req.params.id) });
        if (result === null) throw "cannot retrieve product";
        res.send(result);
        console.log("Successfully retrieve product");
        console.log(result)
    } catch (err) {
        console.error(`Failed to retrieve product: ${err}`);
        res.status = status.INTERNAL_SERVER_ERROR;
        res.send({ err: err });
    } finally {
        await client.close();
    }
})

app.post("/product/add", async (req, res) => {
    console.log("adding product: " + req.body.name);
    await client.connect();
    const database = client.db("shoe_shop");
    const products = database.collection("product");

    const newProduct = {
        name: req.body.name,
        description: req.body.description,
        image: req.body.image,
        price: req.body.price,
        publish_date: req.body.publish_date,
        product_type: req.body.product_type
    }

    try {
        const result = await products.insertOne(newProduct);
        console.log(result);
        res.status(status.OK).send(result);
        console.log(`Successfully inserted item with _id: ${result.insertedId}`);
    } catch (err) {
        console.error(`Failed to insert item: ${err}`);
        res.status = status.INTERNAL_SERVER_ERROR; // Set an appropriate error status code
        res.send({ err: err.toString() });
    } finally {
        await client.close();
    }
})

app.delete("/product/delete/:id", async (req, res) => {
    console.log("delete product: " + req.params.id);
    await client.connect();
    const database = client.db("shoe_shop");
    const products = database.collection("product");

    try {
        let regexp = /^[0-9a-fA-F]+$/; // regular expression hex value checking
        if (!regexp.test(req.params.id)) throw new Error("Invalid product ID");
        const query = { _id: ObjectId.createFromHexString(req.params.id) };
        const options = { writeConcern: { w: 1, j: true, wtimeout: 1000 } };

        const result = await products.findOneAndDelete(query, options);
        console.log(`Successfully deleted product: ${result.name}`);
        console.log(result);
        res.send(result);
    } catch (err) {
        console.error(`Failed to delete product: ${err}`);
        res.status = status.INTERNAL_SERVER_ERROR; // Set an appropriate error status code
        res.send({ err: err.toString() });
    } finally {
        await client.close();
    }
})

app.put("/product/update/:id", async (req, res) => {
    console.log("update product: " + req.params.id);
    await client.connect();
    const database = client.db("shoe_shop");
    const products = database.collection("product");

    const newProduct = {
        name: req.body.name,
        description: req.body.description,
        price: req.body.price,
        publish_date: req.body.publish_date,
        product_type: req.body.product_type
    }

    console.log(newProduct)

    try {
        let regexp = /^[0-9a-fA-F]+$/; // regular expression hex value checking
        if (!regexp.test(req.params.id)) throw new Error("Invalid product ID");
        const query = { _id: ObjectId.createFromHexString(req.params.id) };
        const options = { writeConcern: { w: 1, j: true, wtimeout: 1000 } };

        const result = await products.findOneAndUpdate(query, { $set: newProduct }, options);
        console.log(`Successfully updated product: ${result.name}`);
        res.send(result);
    } catch (err) {
        console.error(`Failed to update product: ${err}`);
        res.status = status.INTERNAL_SERVER_ERROR; // Set an appropriate error status code
        res.send({ err: err.toString() });
    } finally {
        await client.close();
    }
})

app.post("/product/search", async (req, res) => {
    await client.connect();
    const database = client.db("shoe_shop");
    const products = database.collection("product");

    try {
        const result = await products.find().toArray();
        if (result === null) throw "cannot retrieve product";
        let searchResult = [];
        result.forEach((product) => {
            if (product.name.toLowerCase().includes(req.body.productName.toLowerCase().trim())) {
                searchResult.push(product);
            }
        });
        res.send(searchResult);
        console.log("Successfully retrieve products");
    } catch (err) {
        console.error(`Failed to retrieve product: ${err}`);
        res.status = status.INTERNAL_SERVER_ERROR;
        res.send({ err: err });
    } finally {
        await client.close();
    }
})

app.get("/productDetailGet/:id", async (req, res) => {
    await client.connect();
    const database = client.db("shoe_shop");
    const products = database.collection("product");
    const comments = database.collection("comment");
    const users = database.collection("user");
    try {
        const result = await products.findOne({ _id: ObjectId.createFromHexString(req.params.id) });
        if (result === null) throw "cannot retrieve product";
        const commentResult = await comments.find({ productId: req.params.id }).toArray();
        result.comments = commentResult;
        for (let i = 0; i < result.comments.length; i++) {
            const user = await users.findOne({ _id: ObjectId.createFromHexString(result.comments[i].userId) })
            if (user !== null) {
                result.comments[i].user = user
            } else {
                result.comments[i].user = []
            }
        }
        res.send(result);
        console.log("Successfully retrieve product");
        console.log(result)
    } catch (err) {
        console.error(`Failed to retrieve product: ${err}`);
        res.status = status.INTERNAL_SERVER_ERROR;
        res.send({ err: err });
    } finally {
        await client.close();
    }
})

// Cart
app.get("/cart/get", async (req, res) => {
    await client.connect();
    const database = client.db("shoe_shop");
    const carts = database.collection("cart");
    const products = database.collection("product");
    const users = database.collection("user");
    try {
        const result = await carts.find().toArray();
        if (result === null) throw "cannot retrieve cart";
        for (let i = 0; i < result.length; i++) {
            for (let j = 0; j < result[i].products.length; j++) {
                const product = await products.findOne({ _id: ObjectId.createFromHexString(result[i].products[j].productID) })
                result[i].products[j].image = product.image[0]
            }
        }
        for (let k = 0; k < result.length; k++) {
            const user = await users.findOne({ _id: ObjectId.createFromHexString(result[k].userId) })
            result[k].userName = user.name
        }
        res.send(result);
        console.log("Successfully retrieve carts");
    } catch (err) {
        console.error(`Failed to retrieve cart: ${err}`);
        res.status = status.INTERNAL_SERVER_ERROR;
        res.send({ err: err });
    } finally {
        await client.close();
    }
})

app.get("/cart/get/:id", async (req, res) => {
    await client.connect();
    const database = client.db("shoe_shop");
    const carts = database.collection("cart");
    const products = database.collection("product");
    try {
        const result = await carts.findOne({ _id: ObjectId.createFromHexString(req.params.id) });
        if (result === null) throw "cannot retrieve cart";
        for (let i = 0; i < result.products.length; i++) {
            const product = await products.findOne({ _id: ObjectId.createFromHexString(result.products[i].productID) })
            result.products[i].image = product.image[0]
        }
        res.send(result);
        console.log("Successfully retrieve carts");
    } catch (err) {
        console.error(`Failed to retrieve cart: ${err}`);
        res.status = status.INTERNAL_SERVER_ERROR;
        res.send({ err: err });
    } finally {
        await client.close();
    }
})

app.get("/cart/get/:cardId/:productId", async (req, res) => {
    await client.connect();
    const database = client.db("shoe_shop");
    const carts = database.collection("cart");
    try {
        const result = await carts.findOne({ _id: ObjectId.createFromHexString(req.params.cardId) });
        if (result === null) throw "cannot retrieve cart";
        const productInCart = result.products.find((product) => product.productID === req.params.productId);
        res.send(productInCart);
        console.log("Successfully retrieve carts");
        console.log(productInCart)
    } catch (err) {
        console.error(`Failed to retrieve cart: ${err}`);
        res.status = status.INTERNAL_SERVER_ERROR;
        res.send({ err: err });
    } finally {
        await client.close();
    }
})

app.put("/cart/update/:cartId/:productId", async (req, res) => {
    console.log("adding product to cart: " + req.params.productId);
    await client.connect();
    const database = client.db("shoe_shop");
    const carts = database.collection("cart");
    const products = database.collection("product");

    try {
        let regexp = /^[0-9a-fA-F]+$/;
        if (!regexp.test(req.params.productId)) throw new Error("Invalid product ID");
        if (!regexp.test(req.params.cartId)) throw new Error("Invalid cart ID");
        const query = { _id: ObjectId.createFromHexString(req.params.cartId) };
        const options = { upsert: true, returnNewDocument: true }

        const product = await products.findOne({ _id: ObjectId.createFromHexString(req.params.productId) });
        const existingProduct = await carts.findOne({ ...query, "products.productID": product._id.toString() });
        if (existingProduct) {
            await carts.findOneAndUpdate(
                { ...query, "products.productID": product._id.toString() },
                { $inc: { "products.$.quantity": parseInt(req.body.productQty) } }
            );
        } else {
            const updatedCart = {
                productID: product._id.toString(),
                name: product.name,
                price: product.price,
                quantity: parseInt(req.body.productQty)
            };
            await carts.findOneAndUpdate(
                query,
                { $push: { products: updatedCart } }
            );
        }

        const cart_product_get = await carts.findOne(query)
        const cart_product = cart_product_get.products
        let totalPrice = 0
        let totalProduct = 0
        for (let i in cart_product) {
            totalProduct += parseInt(cart_product[i].quantity)
            totalPrice += parseInt(cart_product[i].price) * totalProduct
        }
        const result = await carts.findOneAndUpdate(query, { $set: { totalPrice: totalPrice, totalProducts: totalProduct } }, options);

        res.status(status.OK).send(cart_product_get);
        console.log(`Successfully updated cart`);
        console.log(result);
    } catch (err) {
        console.error(`Failed to update cart: ${err}`);
        res.status = status.INTERNAL_SERVER_ERROR;
        res.send({ err: err.toString() });
    } finally {
        await client.close();
    }
})

app.put("/cart/update/:id", async (req, res) => {
    console.log("updating cart: " + req.params.id);
    await client.connect();
    const database = client.db("shoe_shop");
    const carts = database.collection("cart");

    try {
        let regexp = /^[0-9a-fA-F]+$/;
        if (!regexp.test(req.params.id)) throw new Error("Invalid cart ID");
        const query = { _id: ObjectId.createFromHexString(req.params.id) };
        const cart = await carts.findOne({ _id: ObjectId.createFromHexString(req.params.id) })
        let cart_product = cart.products
        for (let i in req.body.product) {
            cart_product.push(req.body.product[i])
        }
        let totalPrice = 0
        let totalProduct = 0
        for (let i in cart_product) {
            totalProduct += parseInt(cart_product[i].quantity)
            totalPrice += parseInt(cart_product[i].price) * totalProduct
        }
        const newValues = {
            $set: {
                products: cart_product,
                totalProducts: totalProduct,
                totalPrice: totalPrice
            }
        };
        const options = { writeConcern: { w: 1, j: true, wtimeout: 1000 } };

        const result = await carts.findOneAndUpdate(query, newValues, options);
        console.log(`Successfully updated cart: ${result._id}`);
        console.log(result);
        res.send(result);
    } catch (err) {
        console.error(`Failed to update cart: ${err}`);
        res.status = status.INTERNAL_SERVER_ERROR;
        res.send({ err: err.toString() });
    } finally {
        await client.close();
    }
})

app.put("/cart/updateQty/:id", async (req, res) => {
    console.log("updating cart: " + req.params.id);
    await client.connect();
    const database = client.db("shoe_shop");
    const carts = database.collection("cart");

    try {
        let regexp = /^[0-9a-fA-F]+$/;
        if (!regexp.test(req.params.id)) throw new Error("Invalid cart ID");
        const query = { _id: ObjectId.createFromHexString(req.params.id) };
        const cart = await carts.findOne({ _id: ObjectId.createFromHexString(req.params.id) })
        let cart_product = cart.products
        for (let i in cart_product) {
            if (cart_product[i].productID == req.body.productId) {
                cart_product[i].quantity = req.body.productQty
            }
        }
        let totalPrice = 0
        let totalProduct = 0
        for (let i in cart_product) {
            totalProduct += parseInt(cart_product[i].quantity)
            totalPrice += parseInt(cart_product[i].price) * totalProduct
        }
        const newValues = {
            $set: {
                products: cart_product,
                totalProducts: totalProduct,
                totalPrice: totalPrice
            }
        };
        const options = { writeConcern: { w: 1, j: true, wtimeout: 1000 } };

        const result = await carts.findOneAndUpdate(query, newValues, options);
        console.log(`Successfully updated cart: ${result._id}`);
        console.log(result);
        res.send(result);
    } catch (err) {
        console.error(`Failed to update cart: ${err}`);
        res.status = status.INTERNAL_SERVER_ERROR;
        res.send({ err: err.toString() });
    } finally {
        await client.close();
    }
})

app.put("/cart/delete/:id", async (req, res) => {
    console.log("deleting product from cart: " + req.body.productId);
    await client.connect();
    const database = client.db("shoe_shop");
    const carts = database.collection("cart");

    try {
        let regexp = /^[0-9a-fA-F]+$/;
        if (!regexp.test(req.body.productId)) throw new Error("Invalid product ID");
        const query = { _id: ObjectId.createFromHexString(req.params.id) };
        const options = { upsert: true, returnNewDocument: true }

        const result = await carts.findOneAndUpdate(query, { $pull: { products: { productID: req.body.productId } } }, options);

        const cart_product_get = await carts.findOne(query)
        const cart_product = cart_product_get.products
        let totalPrice = 0
        let totalProduct = 0
        for (let i in cart_product) {
            totalProduct += parseInt(cart_product[i].quantity)
            totalPrice += parseInt(cart_product[i].price) * totalProduct
        }
        await carts.findOneAndUpdate(query, { $set: { totalPrice: totalPrice, totalProducts: totalProduct } }, options);

        res.status(status.OK).send(result);
        console.log(`Successfully deleted product from cart`);
        console.log(result);
    } catch (err) {
        console.error(`Failed to update cart: ${err}`);
        res.status = status.INTERNAL_SERVER_ERROR;
        res.send({ err: err.toString() });
    } finally {
        await client.close();
    }
})

app.post("/cart/add", async (req, res) => {
    console.log("adding cart: " + req.body.userId);
    await client.connect();
    const database = client.db("shoe_shop");
    const carts = database.collection("cart");

    const newCart = {
        userId: req.session.userid,
        products: [],
        totalProducts: 0,
        totalPrice: 0
    }

    try {
        const result = await carts.insertOne(newCart);
        res.status(status.OK).send(result);
        console.log(`Successfully inserted item with _id: ${result.insertedId}`);
        console.log(result);
    } catch (err) {
        console.error(`Failed to insert item: ${err}`);
        res.status = status.INTERNAL_SERVER_ERROR;
        res.send({ err: err.toString() });
    } finally {
        await client.close();
    }
})

// Transaction
app.get("/transaction/get", async (req, res) => {
    await client.connect();
    const database = client.db("shoe_shop");
    const transactions = database.collection("transaction");
    try {
        const result = await transactions.find().toArray();
        if (result === null) throw "cannot retrieve transaction";
        res.send(result);
        console.log("Successfully retrieve transactions");
    } catch (err) {
        console.error(`Failed to retrieve transaction: ${err}`);
        res.status = status.INTERNAL_SERVER_ERROR;
        res.send({ err: err });
    } finally {
        await client.close();
    }
})

app.get("/transaction/get/:transactionId", async (req, res) => {
    await client.connect();
    const database = client.db("shoe_shop");
    const transactions = database.collection("transaction");
    try {
        const result = await transactions.findOne({ _id: ObjectId.createFromHexString(req.params.transactionId) });
        if (result === null) throw "cannot retrieve transaction";
        res.send(result);
        console.log("Successfully retrieve transaction");
    } catch (err) {
        console.error(`Failed to retrieve transaction: ${err}`);
        res.status = status.INTERNAL_SERVER_ERROR;
        res.send({ err: err });
    } finally {
        await client.close();
    }
})

app.post("/transaction/add", async (req, res) => {
    console.log("adding transaction for: " + req.body.userId);
    await client.connect();
    const database = client.db("shoe_shop");
    const carts = database.collection("cart");
    const products = database.collection("product");
    const transactions = database.collection("transaction");
    const date = new Date();
    const year = date.getFullYear();
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const day = ('0' + date.getDate()).slice(-2);
    const hours = ('0' + date.getHours()).slice(-2);
    const minutes = ('0' + date.getMinutes()).slice(-2);
    const seconds = ('0' + date.getSeconds()).slice(-2);

    const formattedTimestamp = year + '-' + month + '-' + day + 'T' + hours + ':' + minutes + ':' + seconds + 'Z';

    try {
        const cartGet = await carts.findOne({ userId: req.body.userId })
        for (let i in cartGet.products) {
            const product = await products.findOne({ _id: ObjectId.createFromHexString(cartGet.products[i].productID) })
            cartGet.products[i].image = product.image[0]
        }
        const newTransaction = {
            userId: req.body.userId,
            status: req.body.status,
            timestamp: formattedTimestamp,
            products: cartGet.products,
            totalProducts: cartGet.totalProducts,
            totalPrice: cartGet.totalPrice
        }
        const result = await transactions.insertOne(newTransaction);
        await carts.findOneAndUpdate({ userId: req.body.userId }, { $set: { products: [], totalProducts: 0, totalPrice: 0 } });
        console.log(`Successfully added transaction`);
        console.log(result);
        res.status(status.OK).send(result);
    } catch (err) {
        console.error(`Failed to retrieve transaction: ${err}`);
        res.status = status.INTERNAL_SERVER_ERROR;
        res.send({ err: err });
    } finally {
        await client.close();
    }
})

app.put("/transaction/update/:transactionId", async (req, res) => {
    console.log("updating : " + req.params.transactionId);
    await client.connect();
    const database = client.db("shoe_shop");
    const transactions = database.collection("transaction");

    try {
        const result = await transactions.findOneAndUpdate(
            { _id: ObjectId.createFromHexString(req.params.transactionId) },
            { $set: { status: req.body.status } },
            { returnNewDocument: true }
        );
        res.status(status.OK).send(result);
    } catch (err) {
        console.error(`Failed to retrieve transaction: ${err}`);
        res.status = status.INTERNAL_SERVER_ERROR;
        res.send({ err: err });
    } finally {
        await client.close();
    }
})

app.delete("/transaction/delete/:transactionId", async (req, res) => {
    await client.connect();
    const database = client.db("shoe_shop");
    const transactions = database.collection("transaction");

    try {
        const result = await transactions.findOneAndDelete(
            { _id: ObjectId.createFromHexString(req.params.transactionId) }
        );
        res.status(status.OK).send(result);
    } catch (err) {
        console.error(`Failed to retrieve transaction: ${err}`);
        res.status = status.INTERNAL_SERVER_ERROR;
        res.send({ err: err });
    } finally {
        await client.close();
    }
})


// Comment
app.get("/comment/get", async (req, res) => {
    await client.connect();
    const database = client.db("shoe_shop");
    const comments = database.collection("comment");
    const products = database.collection("product")
    try {
        const result = await comments.find().toArray();
        if (result === null) throw "cannot retrieve comment";
        for (let i in result) {
            const product = await products.findOne({ _id: ObjectId.createFromHexString(result[i].productId) })
            result[i].productName = product.name
        }
        res.send(result);
        console.log("Successfully retrieve comments");
    } catch (err) {
        console.error(`Failed to retrieve comment: ${err}`);
        res.status = status.INTERNAL_SERVER_ERROR;
        res.send({ err: err });
    } finally {
        await client.close();
    }
})

app.get("/comment/get/:commentId", async (req, res) => {
    await client.connect();
    const database = client.db("shoe_shop");
    const comments = database.collection("comment");
    try {
        const result = await comments.findOne({ _id: ObjectId.createFromHexString(req.params.commentId) });
        if (result === null) throw "cannot retrieve comment";
        res.send(result);
        console.log("Successfully retrieve comments");
    } catch (err) {
        console.error(`Failed to retrieve comment: ${err}`);
        res.status = status.INTERNAL_SERVER_ERROR;
        res.send({ err: err });
    } finally {
        await client.close();
    }
})

app.post("/comment/add", async (req, res) => {
    await client.connect();
    const database = client.db("shoe_shop");
    const comments = database.collection("comment");
    const users = database.collection("user");

    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, "0");
    const day = String(currentDate.getDate()).padStart(2, "0");
    const hours = String(currentDate.getHours()).padStart(2, "0");
    const minutes = String(currentDate.getMinutes()).padStart(2, "0");
    const seconds = String(currentDate.getSeconds()).padStart(2, "0");

    try {

        const query = { _id: ObjectId.createFromHexString(req.body.userId) };
        const options = { writeConcern: { w: 1, j: true, wtimeout: 1000 } };
        const user = await users.findOne(query, options)
        const newComment = {
            productId: req.body.productId,
            name: user.name,
            userId: req.body.userId,
            content: req.body.content,
            date: `${year}-${month}-${day}`,
            time: `${hours}:${minutes}:${seconds}`
        }
        const result = await comments.insertOne(newComment);
        res.status(status.OK).send(result);
        console.log(`Successfully inserted comment`);
        console.log(result);
    } catch (err) {
        console.error(`Failed to insert comment: ${err}`);
        res.status = status.INTERNAL_SERVER_ERROR;
        res.send({ err: err.toString() });
    } finally {
        await client.close();
    }
})

app.get("/comment/adminAdd", async (req, res) => {
    await client.connect();
    const database = client.db("shoe_shop");
    const users = database.collection("user");
    const products = database.collection("product")
    try {
        let result = {
            user: [],
            product: []}
        const user = await users.find().toArray();
        result.user = user
        const product = await products.find().toArray();
        result.product = product
        res.send(result);
        console.log("Successfully retrieve comments");
    } catch (err) {
        console.error(`Failed to retrieve comment: ${err}`);
        res.status = status.INTERNAL_SERVER_ERROR;
        res.send({ err: err });
    } finally {
        await client.close();
    }
})

app.post("/comment/add/:userId", async (req, res) => {
    await client.connect();
    const database = client.db("shoe_shop");
    const comments = database.collection("comment");
    const users = database.collection("user");

    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, "0");
    const day = String(currentDate.getDate()).padStart(2, "0");
    const hours = String(currentDate.getHours()).padStart(2, "0");
    const minutes = String(currentDate.getMinutes()).padStart(2, "0");
    const seconds = String(currentDate.getSeconds()).padStart(2, "0");

    try {
        const query = { _id: ObjectId.createFromHexString(req.params.userId) };
        const options = { writeConcern: { w: 1, j: true, wtimeout: 1000 } };
        const user = await users.findOne(query, options)
        const newComment = {
            productId: req.body.productId,
            name: user.name,
            userId: req.params.userId,
            content: req.body.content,
            date: `${year}-${month}-${day}`,
            time: `${hours}:${minutes}:${seconds}`
        }
        const result = await comments.insertOne(newComment);
        res.status(status.OK).send(result);
        console.log(`Successfully inserted comment`);
        console.log(result);
    } catch (err) {
        console.error(`Failed to insert comment: ${err}`);
        res.status = status.INTERNAL_SERVER_ERROR;
        res.send({ err: err.toString() });
    } finally {
        await client.close();
    }
})

app.put("/comment/update/:commentId", async (req, res) => {
    console.log("update comment: " + req.params.commentId);
    await client.connect();
    const database = client.db("shoe_shop");
    const comments = database.collection("comment");

    try {
        let regexp = /^[0-9a-fA-F]+$/;
        if (!regexp.test(req.params.commentId)) throw new Error("Invalid comment ID");
        const query = { _id: ObjectId.createFromHexString(req.params.commentId) };
        const options = { writeConcern: { w: 1, j: true, wtimeout: 1000 } };

        const updatedComment = {
            $set: {
                content: req.body.content
            }
        };

        const result = await comments.findOneAndUpdate(query, updatedComment, options);
        console.log(`Successfully updated comment: ${result._id}`);
        console.log(result);
        res.send(result);
    } catch (err) {
        console.error(`Failed to update comment: ${err}`);
        res.status = status.INTERNAL_SERVER_ERROR;
        res.send({ err: err.toString() });
    } finally {
        await client.close();
    }
})

app.delete("/comment/delete/:commentId", async (req, res) => {
    console.log("delete comment: " + req.params.commentId);
    await client.connect();
    const database = client.db("shoe_shop");
    const comments = database.collection("comment");

    try {
        let regexp = /^[0-9a-fA-F]+$/;
        if (!regexp.test(req.params.commentId)) throw new Error("Invalid comment ID");
        const query = { _id: ObjectId.createFromHexString(req.params.commentId) };
        const options = { writeConcern: { w: 1, j: true, wtimeout: 1000 } };

        const result = await comments.findOneAndDelete(query, options);
        console.log(`Successfully deleted comment: ${result._id}`);
        console.log(result);
        res.send(result);
    } catch (err) {
        console.error(`Failed to delete comment: ${err}`);
        res.status = status.INTERNAL_SERVER_ERROR;
        res.send({ err: err.toString() });
    } finally {
        await client.close();
    }
})



// const port = 10888
// app.listen(port, () => {
//     console.log(`Connected on port ${port}`)
// }); 
export default app;



/* functions */
function addTokenUser(user){
    for(let i=0;i<tokenUsers.length;i++) {  
        if(tokenUsers[i].id === user.id){
            tokenUsers[i].accessToken = user.accessToken
            console.log(tokenUsers)
            return
        }
    }
    tokenUsers.push(user)
    console.log(tokenUsers)
    return
}




