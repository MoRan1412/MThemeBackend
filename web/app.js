"use strict";

const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const app = express();
const port = 3000; // Replit doesn’t matter which port is using

const path = require("path");
const multer = require("multer");
const fs = require("fs");
const crypto = require("crypto");
const { name, render } = require("ejs");

app.use(bodyParser.json()); // Used to parse JSON bodies
app.use(bodyParser.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(express.static(__dirname + "/public")); // Client can access '/public' directly
app.use(cookieParser());

app.set("view engine", "ejs"); //Make supporting ejs

const status = {
  OK: 200,
  CREATED: 201,
  NOT_MODIFIED: 304,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
};

const cookieMaxAge = 60000 * 30;

let storage = multer.diskStorage({
  destination: function (req, file, callback) {
    let folderPath = "./public/source/image/products";
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
    callback(null, folderPath);
  },
  filename: function (req, file, callback) {
    const uniqueSuffix = Math.random().toString(36).substring(2, 9);
    const extname = path.extname(file.originalname);
    callback(null, uniqueSuffix + extname);
  },
});

let profileStorage = multer.diskStorage({
  destination: function (req, file, callback) {
    let folderPath = "./public/source/image/profile/avatar";
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
    callback(null, folderPath);
  },
  filename: function (req, file, callback) {
    const uniqueSuffix = Math.random().toString(36).substring(2, 9);
    const extname = path.extname(file.originalname);
    callback(null, uniqueSuffix + extname);
  },
});


// Login System
app.get("/login", (req, res) => {
  if (req.cookies.accessToken) {
    if (req.cookies.role === "admin") {
      res.redirect("/admin/product");
    } else {
      res.redirect("/user/profile");
    }
  } else {
    res.render("login");
  }
});

app.post("/loginProcess", (req, res) => {
  console.log(`Login the user: ${req.body.username}`);
  const options = {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      username: req.body.username,
      password: hashPassword(req.body.password),
    }),
  };
  const url = `http://localhost:10888/user/login`;
  fetch(url, options)
    .then((res) => {
      if (res.status === status.OK) {
        return res.json(); // received and pass to next layer
      } else {
        console.log(`Failed to login user`);
      }
    })
    .then((jsonData) => {
      console.log(`Validating: ${jsonData.name} `);
      console.log(jsonData);
      if (jsonData.accessToken) {
        res.cookie("accessToken", jsonData["accessToken"], {
          maxAge: cookieMaxAge,
          httpOnly: true,
        }); // 30mins
        res.cookie("userId", jsonData["_id"], {
          maxAge: cookieMaxAge,
          httpOnly: true,
        }); // 30mins
        res.cookie("role", jsonData["role"], {
          maxAge: cookieMaxAge,
          httpOnly: true,
        }); // 30mins
        res.cookie("cartId", jsonData["cartId"], {
          maxAge: cookieMaxAge,
          httpOnly: true,
        });
        res.cookie("expire", new Date().getTime() + cookieMaxAge, {
          maxAge: cookieMaxAge,
          httpOnly: true,
        }); // 30mins
        console.log("login success with token: " + jsonData["accessToken"]);
        if (jsonData.role === "admin") {
          res.status(status.OK).redirect("/admin/product");
        } else {
          res.status(status.OK).redirect("/user/profile");
        }
      } else {
        throw new Error("Incorrect username or password");
      }
    })
    .catch((err) => {
      console.error(`Failed to login user: ${err}`);
      res
        .status(status.INTERNAL_SERVER_ERROR)
        .render("login", { err: "Incorrect username or password" });
    });
});

app.get("/register", (req, res) => {
  if (req.cookies.accessToken) {
    res.redirect("/user/profile");
  } else {
    res.render("register");
  }
});

app.post("/registerProcess", (req, res) => {
  console.log(`Register user: ${req.body.username}`);
  const options = {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: req.body.username,
      password: hashPassword(req.body.password),
      role: "user",
    }),
  };
  const url = `http://localhost:10888/user/add`;
  fetch(url, options)
    .then((res) => {
      if (res.status === status.OK) {
        return res.json(); // received and pass to next layer
      } else {
        console.log(`Failed to register user`);
      }
    })
    .then((jsonData) => {
      console.log(`User "${req.body.username}" has been added`);
      res.status(status.OK).redirect("/login");
    })
    .catch((err) => {
      console.error(`Failed to register user: ${err}`);
      res.status(status.INTERNAL_SERVER_ERROR).send({ err: err.toString() });
    });
});

app.get("/signOut", (req, res) => {
  res.clearCookie("accessToken");
  res.clearCookie("userId");
  res.clearCookie("cartId");
  res.clearCookie("expire");
  res.status(status.OK).redirect("/login");
});

// User Page
app.get("/user/profile", (req, res) => {
  console.log(`Getting the user profile`);
  if (req.cookies.accessToken) {
    const options = {
      method: "GET",
      headers: { "content-type": "application/json" },
    };
    const url = `http://localhost:10888/user/profile/${req.cookies["userId"]}`;
    fetch(url, options)
      .then((res) => {
        if (res.status === status.OK) {
          return res.json();
        } else {
          console.log(`failed to get user profile`);
        }
      })
      .then((jsonData) => {
        console.log(`Succeed to get user profile`);
        res
          .status(status.OK)
          .render("user/profile", { profile: jsonData, page: "account" });
      })
      .catch((err) => {
        console.error(`Failed to get user profile: ${err}`);
        res.status(status.INTERNAL_SERVER_ERROR).send({ err: err.toString() });
      });
  } else {
    res.redirect("/login");
  }
});

app.get("/user/updatePassword", (req, res) => {
  res.render("user/editPassword");
});

app.post("/updatePasswordProcess", (req, res) => {
  console.log(`Updating user password`);
  const options = {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      password: hashPassword(req.body.new_password),
    }),
  };
  const url = `http://localhost:10888/user/update/password/${req.cookies["userId"]}`;
  fetch(url, options)
    .then((res) => {
      if (res.status === status.OK) {
        return res.json();
      } else {
        console.log("failed to update password");
      }
    })
    .then((jsonData) => {
      console.log(`Succeed to update password`);
      res.status(status.OK).redirect("/user/profile");
    })
    .catch((err) => {
      console.error(`Failed to update password: ${err}`);
      res.status(status.INTERNAL_SERVER_ERROR).send({ err: err.toString() });
    });
});

app.get("/user/transaction", (req, res) => {
  console.log(`Getting the user transaction`);
  if (req.cookies.accessToken) {
    const options = {
      method: "GET",
      headers: { "content-type": "application/json" },
    };
    const url = `http://localhost:10888/user/profile/${req.cookies["userId"]}`;
    fetch(url, options)
      .then((res) => {
        if (res.status === status.OK) {
          return res.json();
        } else {
          console.log(`failed to get user transaction`);
        }
      })
      .then((jsonData) => {
        console.log(`Succeed to get user transaction`);
        res
          .status(status.OK)
          .render("user/profile", {
            profile: jsonData,
            transactions: jsonData.transaction,
            page: "transaction",
          });
      })
      .catch((err) => {
        console.error(`Failed to get user transaction: ${err}`);
        res.status(status.INTERNAL_SERVER_ERROR).send({ err: err.toString() });
      });
  } else {
    res.redirect("/login");
  }
});

app.get("/user/updateProfile", (req, res) => {
  console.log(`Getting the user`);
  const options = {
    method: "GET",
    headers: { "content-type": "application/json" }
  }
  const url = `http://localhost:10888/user/get/${req.cookies["userId"]}`;
  fetch(url, options)
    .then((res) => {
      if (res.status === status.OK) {
        return res.json();
      } else {
        console.log(`failed to get user`);
      }
    })
    .then((jsonData) => {
      console.log(`Succeed to get user`);
      res
        .status(status.OK)
        .render("user/profile", { profile: jsonData, page: "accountEdit" });
    })
    .catch((err) => {
      console.error(`Failed to get user: ${err}`);
      res.status(status.INTERNAL_SERVER_ERROR).send({ err: err.toString() });
    });
})

app.post("/updateProfile", multer({ storage: profileStorage }).single("avatar"), (req, res) => {
  console.log(`Updating user profile`);
  const avatarPath = req.file.path.replace(/\\/g, "/").replace("public", "");
  const options = {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: req.body.username,
      avatar: avatarPath,
    }),
  };
  const url = `http://localhost:10888/user/profile/update/${req.cookies["userId"]}`;
  fetch(url, options)
    .then((res) => {
      if (res.status === status.OK) {
        return res.json();
      } else {
        console.log("failed to update profile");
      }
    })
    .then((jsonData) => {
      if (jsonData.deletePath) {
        fs.unlink(path.join(__dirname, "public", jsonData.deletePath), (err) => {
          if (err) {
            console.error(`Failed to delete file: ${err}`);
          } else {
            console.log("Local file deleted");
          }
        })
      }
      console.log(`Succeed to update profile`);
      res.status(status.OK).redirect("/user/profile");
    })
    .catch((err) => {
      console.error(`Failed to update profile: ${err}`);
      res.status(status.INTERNAL_SERVER_ERROR).send({ err: err.toString() });
    });
})

// Product Page
app.get("/", (req, res) => {
  console.log("Retrieving all products");
  const options = {
    method: "GET",
    headers: { "content-type": "application/json" },
  };
  const url = `http://localhost:10888/product/get`;
  fetch(url, options)
    .then((res) => {
      if (res.status === status.OK) {
        return res.json();
      } else {
        console.log("failed to get product");
      }
    })
    .then((jsonData) => {
      res
        .status(status.OK)
        .render("index", {
          new_item_desc: jsonData[0].description,
          new_item_image1: jsonData[0].image[1],
          new_item_image2: jsonData[0].image[2],
          new_item_id: jsonData[0]._id,
          page: "index",
        });
    })
    .catch((err) => {
      console.error(`Failed to get product: ${err}`);
      res.status(status.INTERNAL_SERVER_ERROR).send({ err: err.toString() });
    });
});

app.get("/product", (req, res) => {
  console.log("Retrieving all products");
  const options = {
    method: "GET",
    headers: { "content-type": "application/json" },
  };
  const url = `http://localhost:10888/product/get`;
  fetch(url, options)
    .then((res) => {
      if (res.status === status.OK) {
        return res.json();
      } else {
        console.log("failed to get product");
      }
    })
    .then((jsonData) => {
      res
        .status(status.OK)
        .render("product", { products: jsonData, page: "product" });
    })
    .catch((err) => {
      console.error(`Failed to get product: ${err}`);
      res.status(status.INTERNAL_SERVER_ERROR).send({ err: err.toString() });
    });
});

app.get("/hotProduct", (req, res) => {
  console.log("Retrieving all products");
  const options = {
    method: "GET",
    headers: { "content-type": "application/json" },
  };
  const url = `http://localhost:10888/product/get`;
  fetch(url, options)
    .then((res) => {
      if (res.status === status.OK) {
        return res.json();
      } else {
        console.log("failed to get product");
      }
    })
    .then((jsonData) => {
      let hot_list = [];
      for (let i in jsonData) {
        if (jsonData[i].product_type == "hot") {
          hot_list.push(jsonData[i]);
        }
      }
      res
        .status(status.OK)
        .render("hot", { hotproducts: hot_list, page: "hotproduct" });
    })
    .catch((err) => {
      console.error(`Failed to get product: ${err}`);
      res.status(status.INTERNAL_SERVER_ERROR).send({ err: err.toString() });
    });
});

app.get("/productDetail/:id", (req, res) => {
  console.log("Retrieving product with ID: " + req.params.id);
  const options = {
    method: "GET",
    headers: { "content-type": "application/json" },
  };
  const url = `http://localhost:10888/productDetailGet/${req.params.id}`;
  fetch(url, options)
    .then((res) => {
      if (res.status === status.OK) {
        return res.json();
      } else {
        console.log("failed to get product");
      }
    })
    .then((jsonData) => {
      res.cookie("productDetailId", jsonData["_id"], {
        maxAge: cookieMaxAge,
        httpOnly: true,
      });
      res.status(status.OK).render("productDetail", { product: jsonData, userId: req.cookies["userId"] });
    })
    .catch((err) => {
      console.error(`Failed to get product: ${err}`);
      res.status(status.INTERNAL_SERVER_ERROR).send({ err: err.toString() });
    });
});

app.post("/commentProcess/:productId", (req, res) => {
  console.log("adding comment: " + req.params.productId);
  const options = {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      productId: req.params.productId,
      userId: req.cookies["userId"],
      content: req.body.commentContent,
    }),
  };
  const url = `http://localhost:10888/comment/add`;
  fetch(url, options)
    .then((res) => {
      if (res.status === status.OK) {
        return res.json(); // received and pass to next layer
      } else {
        console.log(`failed to add comment`);
      }
    })
    .then((jsonData) => {
      console.log(`Succeed to add comment: ${jsonData}`);
      res.status(status.OK).redirect("/productDetail/" + req.params.productId);
    })
    .catch((err) => {
      console.error(`Failed to add comment: ${err}`);
      res.status(status.INTERNAL_SERVER_ERROR).send({ err: err.toString() });
    });
});

app.get("/commentUpdate/:id", (req, res) => {
  console.log("Retrieving comment with ID: " + req.params.id);
  const options = {
    method: "GET",
    headers: { "content-type": "application/json" },
  };
  const url = `http://localhost:10888/comment/get/${req.params.id}`;
  fetch(url, options)
    .then((res) => {
      if (res.status === status.OK) {
        return res.json();
      } else {
        console.log("failed to get comment");
      }
    })
    .then((jsonData) => {
      res.status(status.OK).render("updateWindow", { 
        updateTitle: 'Update Comment',
        updateContent: jsonData.content,
        updateBtn: `/commentUpdateProcess/${req.params.id}`
      });
    })
    .catch((err) => {
      console.error(`Failed to get comment: ${err}`);
      res.status(status.INTERNAL_SERVER_ERROR).send({ err: err.toString() });
    });
})

app.post("/commentUpdateProcess/:id", (req, res) => {
  console.log("updating comment: " + req.params.id);
  const options = {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      content: req.body.content,
    }),
  };
  const url = `http://localhost:10888/comment/update/${req.params.id}`;
  fetch(url, options)
    .then((res) => {
      if (res.status === status.OK) {
        return res.json(); // received and pass to next layer
      } else {
        console.log(`failed to update comment`);
      }
    })
    .then((jsonData) => {
      console.log(`Succeed to update comment: ${jsonData}`);
      res.status(status.OK).redirect("/productDetail/" + req.cookies["productDetailId"]);
    })
    .catch((err) => {
      console.error(`Failed to update comment: ${err}`);
      res.status(status.INTERNAL_SERVER_ERROR).send({ err: err.toString() });
    });
})

app.post("/productSearch", (req, res) => {
  console.log("search product: " + req.body.productName);
  const options = {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      productName: req.body.productName,
    }),
  };
  const url = `http://localhost:10888/product/search`;
  fetch(url, options)
    .then((res) => {
      if (res.status === status.OK) {
        return res.json(); // received and pass to next layer
      } else {
        console.log(`failed to search product`);
      }
    })
    .then((jsonData) => {
      console.log(`Succeed to search product: ${jsonData}`);
      res.status(status.OK).render("product", { products: jsonData, keyword: req.body.productName });
    })
    .catch((err) => {
      console.error(`Failed to search product: ${err}`);
      res.status(status.INTERNAL_SERVER_ERROR).send({ err: err.toString() });
    });
});


// Admin Page
// app.get("/admin/dashboard", (req, res) => {
//   res.render("admin/dashboard");
// });

app.get("/admin/product", (req, res) => {
  console.log("Retrieving all products");
  const options = {
    method: "GET",
    headers: { "content-type": "application/json" },
  };
  const url = `http://localhost:10888/product/get`;
  fetch(url, options)
    .then((res) => {
      if (res.status === status.OK) {
        return res.json();
      } else {
        console.log("failed to get product");
      }
    })
    .then((jsonData) => {
      res.status(status.OK).render("admin/product", { products: jsonData });
    })
    .catch((err) => {
      console.error(`Failed to get product: ${err}`);
      res.status(status.INTERNAL_SERVER_ERROR).send({ err: err.toString() });
    });
});

app.get("/admin/addProduct", (req, res) => {
  res.render("admin/addProduct");
});

app.post(
  "/addProductProcess",
  multer({ storage: storage }).fields([
    {
      name: "image1",
      maxCount: 1,
    },
    {
      name: "image2",
      maxCount: 1,
    },
    {
      name: "image3",
      maxCount: 1,
    },
  ]),
  (req, res) => {
    const images = req.files;
    let product_image = [
      images["image1"][0].path.replace(/\\/g, "/").replace("public", ""),
      images["image2"][0].path.replace(/\\/g, "/").replace("public", ""),
      images["image3"][0].path.replace(/\\/g, "/").replace("public", ""),
    ];
    console.log(images["image1"][0].path.replace(/\\/g, "/"));
    const options = {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: req.body.product_name,
        description: req.body.product_desc,
        image: product_image,
        price: req.body.product_price,
        publish_date: formatDate(new Date()),
        product_type: req.body.product_type,
      }),
    };
    const url = `http://localhost:10888/product/add`;
    fetch(url, options)
      .then((res) => {
        if (res.status === status.OK) {
          return res.json(); // received and pass to next layer
        } else {
          console.log("failed to add product");
        }
      })
      .then((jsonData) => {
        console.log(`Product "${req.body.product_name}" has been added`);
        res.status(status.OK).render("noticeWindow", { 
          noticeTitle: 'Success', 
          noticeContent: `Successfully added product: ${req.body.product_name}`,
          noticeBtn: '/admin/product' });
      })
      .catch((err) => {
        console.error(`Failed to add product: ${err}`);
        res.status(status.INTERNAL_SERVER_ERROR).send({ err: err.toString() });
      });
  }
);

app.get("/deleteProductProcess/:id", (req, res) => {
  console.log(`deleting product with ID: ${req.params.id}`);
  const options = {
    method: "DELETE", // set DELETE method for sending reqest
    headers: { "content-type": "application/json" },
  };
  const url = `http://localhost:10888/product/delete/${req.params.id}`;
  fetch(url, options)
    .then((res) => {
      // connect API server
      console.log(res.status);
      if (res.status === status.OK) {
        return res.json(); // received and pass to next layer
      } else {
        console.log(`failed to delete product: id = ${req.params.id}`);
      }
    })
    .then((jsonData) => {
      jsonData.image.forEach((filepath) => {
        fs.unlink(path.join(__dirname, "public", filepath), (err) => {
          if (err) {
            console.error(`Failed to delete image file: ${filepath}`, err);
          } else {
            console.log(`Successfully deleted image file: ${filepath}`);
          }
        });
      });
      console.log(`Succeed to delete product: ${jsonData.name}`);
      res.status(status.OK).render("noticeWindow", { 
        noticeTitle: 'Success', 
        noticeContent: `Successfully deleted product: ${jsonData.name}`,
        noticeBtn: '/admin/product' });
    })
    .catch((err) => {
      console.error(`Failed to delete user item: ${err}`);
      res.status(status.INTERNAL_SERVER_ERROR).send({ err: err.toString() });
    });
});

app.get("/admin/updateProduct/:id", (req, res) => {
  console.log("Retrieving product with ID: " + req.params.id);
  const options = {
    method: "GET",
    headers: { "content-type": "application/json" },
  };
  const url = `http://localhost:10888/product/get/${req.params.id}`;
  fetch(url, options)
    .then((res) => {
      if (res.status === status.OK) {
        return res.json();
      } else {
        console.log("failed to get product");
      }
    })
    .then((jsonData) => {
      res.status(status.OK).render("admin/editProduct", { product: jsonData });
    })
    .catch((err) => {
      console.error(`Failed to get product: ${err}`);
      res.status(status.INTERNAL_SERVER_ERROR).send({ err: err.toString() });
    });
});

app.post("/updateProductProcess/:id", (req, res) => {
  const options = {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: req.body.product_name,
      description: req.body.product_desc,
      price: req.body.product_price,
      publish_date: formatDate(new Date()),
      product_type: req.body.product_type,
    }),
  };
  const url = `http://localhost:10888/product/update/${req.params.id}`;
  fetch(url, options)
    .then((response) => {
      if (response.status === status.OK) {
        return response.json(); // received and pass to next layer
      } else {
        console.log("failed to update product");
      }
    })
    .then((jsonData) => {
      console.log(`Product "${jsonData.name}" has been updated`);
      res.status(status.OK).render("noticeWindow", {
        noticeTitle: 'Success', 
        noticeContent: `Successfully updated product: ${jsonData.name}`,
        noticeBtn: '/admin/product' });
    })
    .catch((err) => {
      console.error(`Failed to update product: ${err}`);
      res.status(status.INTERNAL_SERVER_ERROR).send({ err: err.toString() });
    });
});

app.get("/admin/user", (req, res) => {
  console.log("Retrieving all users");
  const options = {
    method: "GET",
    headers: { "content-type": "application/json" },
  };
  const url = `http://localhost:10888/user/get`;
  fetch(url, options)
    .then((res) => {
      if (res.status === status.OK) {
        return res.json();
      } else {
        console.log("failed to get user");
      }
    })
    .then((jsonData) => {
      res.status(status.OK).render("admin/user", { users: jsonData });
    })
    .catch((err) => {
      console.error(`Failed to get user: ${err}`);
      res.status(status.INTERNAL_SERVER_ERROR).send({ err: err.toString() });
    });
});

app.get("/admin/addUser", (req, res) => {
  res.render("admin/addUser");
});

app.post("/addUserProcess", (req, res) => {
  console.log(`Adding user: ${req.body.username}`);
  const options = {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: req.body.username,
      password: hashPassword(req.body.password),
      role: req.body.role,
    }),
  };
  const url = `http://localhost:10888/user/add`;
  fetch(url, options)
    .then((res) => {
      if (res.status === status.OK) {
        return res.json();
      } else {
        console.log("failed to add user");
      }
    })
    .then((jsonData) => {
      console.log(`User "${req.body.username}" has been added`);
      res.status(status.OK).render("noticeWindow", { 
        noticeTitle: 'Success', 
        noticeContent: `Successfully added user: ${req.body.username}`,
        noticeBtn: '/admin/user' });
    })
    .catch((err) => {
      console.error(`Failed to add user: ${err}`);
      res.status(status.INTERNAL_SERVER_ERROR).send({ err: err.toString() });
    });
});

app.get("/deleteUserProcess/:id", (req, res, next) => {
  console.log(`deleting user with ID: ${req.params.id}`);
  const options = {
    method: "DELETE",
    headers: { "content-type": "application/json" },
  };
  const url = `http://localhost:10888/user/delete/${req.params.id}`;
  fetch(url, options)
    .then((res) => {
      console.log(res.status);
      if (res.status === status.OK) {
        return res.json();
      } else {
        console.log(`failed to delete user: id = ${req.params.id}`);
      }
    })
    .then((jsonData) => {
      console.log(`Succeed to delete user: ${jsonData.name}`);
      res.status(status.OK).render("noticeWindow", { 
        noticeTitle: 'Success', 
        noticeContent: `Successfully deleted user: ${jsonData.name}`,
        noticeBtn: '/admin/user' });
    })
    .catch((err) => {
      console.error(`Failed to delete user item: ${err}`);
      res.status.apply(500).send({ err: err.toString() });
    });
});

app.get("/admin/updateUser/:id", (req, res) => {
  console.log(`Retrieving user with ID: ${req.params.id}`);
  const options = {
    method: "GET",
    headers: { "content-type": "application/json" },
  };
  const url = `http://localhost:10888/user/get/${req.params.id}`;
  fetch(url, options)
    .then((res) => {
      if (res.status === status.OK) {
        return res.json();
      } else {
        console.log(`failed to get user: id = ${req.params.id}`);
      }
    })
    .then((jsonData) => {
      res.status(status.OK).render("admin/editUser", { user: jsonData });
    })
    .catch((err) => {
      console.error(`Failed to get user item: ${err}`);
      res.status(status.INTERNAL_SERVER_ERROR).send({ err: err.toString() });
    });
});

app.post("/updateUserProcess/:id", (req, res) => {
  console.log(`Updating user with ID: ${req.params.id}`);
  const options = {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: req.body.username,
      password: hashPassword(req.body.password),
      role: req.body.role,
    }),
  };
  const url = `http://localhost:10888/user/update/${req.params.id}`;
  fetch(url, options)
    .then((res) => {
      if (res.status === status.OK) {
        return res.json();
      } else {
        console.log("failed to update user");
      }
    })
    .then((jsonData) => {
      console.log(`Succeed to update user: ${jsonData.name}`);
      res.status(status.OK).render("noticeWindow", { 
        noticeTitle: 'Success', 
        noticeContent: `Successfully updated user: ${jsonData.name}`,
        noticeBtn: '/admin/user' });
    })
    .catch((err) => {
      console.error(`Failed to update user item: ${err}`);
      res.status.apply(500).send({ err: err.toString() });
    });
});

app.get("/admin/transaction", (req, res) => {
  console.log("Retrieving all transactions");
  const options = {
    method: "GET",
    headers: { "content-type": "application/json" },
  };
  const url = `http://localhost:10888/transaction/get`;
  fetch(url, options)
    .then((res) => {
      if (res.status === status.OK) {
        return res.json();
      } else {
        console.log("failed to get transaction");
      }
    })
    .then((jsonData) => {
      res
        .status(status.OK)
        .render("admin/transaction", { transactions: jsonData });
    })
    .catch((err) => {
      console.error(`Failed to get transaction: ${err}`);
      res.status(status.INTERNAL_SERVER_ERROR).send({ err: err.toString() });
    });
});

app.get("/admin/updateTransaction/:id", (req, res) => {
  console.log(`Geting transaction with ID: ${req.params.id}`);
  const options = {
    method: "GET",
    headers: { "content-type": "application/json" },
  };
  const url = `http://localhost:10888/transaction/get/${req.params.id}`;
  fetch(url, options)
    .then((res) => {
      if (res.status === status.OK) {
        return res.json();
      } else {
        console.log("failed to update transaction");
      }
    })
    .then((jsonData) => {
      console.log(`Succeed to get transaction: ${jsonData._id}`);
      res
        .status(status.OK)
        .render("admin/editTransaction", { transaction: jsonData });
    })
    .catch((err) => {
      console.error(`Failed to get transaction item: ${err}`);
      res.status.apply(500).send({ err: err.toString() });
    });
});

app.get("/deleteTransactionProcess/:id", (req, res) => {
  console.log(`Deleting transaction with ID: ${req.query.id}`);
  const options = {
    method: "DELETE",
    headers: { "content-type": "application/json" },
  };
  const url = `http://localhost:10888/transaction/delete/${req.params.id}`;
  fetch(url, options)
    .then((res) => {
      if (res.status === status.OK) {
        return res.json();
      } else {
        console.log("failed to delete transaction");
      }
    })
    .then((jsonData) => {
      console.log(`Succeed to delete transaction: ${jsonData._id}`);
      if (req.cookies["role"] == "admin") {
        res.status(status.OK).render("noticeWindow", { 
          noticeTitle: 'Success', 
          noticeContent: `Successfully deleted transaction: ${jsonData._id}`,
          noticeBtn: '/admin/transaction' });
      } else {
        res.status(status.OK).render("noticeWindow", { 
          noticeTitle: 'Success', 
          noticeContent: `Successfully deleted transaction: ${jsonData._id}`,
          noticeBtn: '/user/transaction' });
      }
    })
    .catch((err) => {
      console.error(`Failed to delete transaction item: ${err}`);
      res.status.apply(500).send({ err: err.toString() });
    });
});

app.post("/updateTransactionProcess/:id", (req, res) => {
  console.log(`Updating transaction with ID: ${req.params.id}`);
  const options = {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      status: req.body.status,
    }),
  };
  const url = `http://localhost:10888/transaction/update/${req.params.id}`;
  fetch(url, options)
    .then((res) => {
      if (res.status === status.OK) {
        return res.json();
      } else {
        console.log("failed to update transaction");
      }
    })
    .then((jsonData) => {
      console.log(`Succeed to update transaction: ${jsonData._id}`);
      if (req.cookies["role"] == "admin") {
        res.status(status.OK).render("noticeWindow", { 
          noticeTitle: 'Success', 
          noticeContent: `Successfully updated transaction: ${jsonData._id}`,
          noticeBtn: '/admin/transaction' });
      } else {
        res.status(status.OK).render("noticeWindow", { 
          noticeTitle: 'Success', 
          noticeContent: `Successfully updated transaction: ${jsonData._id}`,
          noticeBtn: '/cart' });
      }
    })
    .catch((err) => {
      console.error(`Failed to update transaction item: ${err}`);
      res.status.apply(500).send({ err: err.toString() });
    });
});

app.get("/admin/addTransaction", (req, res) => {
  console.log("Retrieving all data");
  const options = {
    method: "GET",
    headers: { "content-type": "application/json" },
  };
  const url = `http://localhost:10888/user/get`;
  fetch(url, options)
    .then((res) => {
      if (res.status === status.OK) {
        return res.json();
      } else {
        console.log("failed to get data");
      }
    })
    .then((jsonData) => {
      res.status(status.OK).render("admin/addTransaction", { users: jsonData });
    })
    .catch((err) => {
      console.error(`Failed to get data: ${err}`);
      res.status(status.INTERNAL_SERVER_ERROR).send({ err: err.toString() });
    });
});

app.post("/addTransactionProcess", (req, res) => {
  console.log(`Adding transaction`);
  const options = {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      status: req.body.status,
      userId: req.body.userId,
    }),
  };
  const url = `http://localhost:10888/transaction/add`;
  fetch(url, options)
    .then((res) => {
      if (res.status === status.OK) {
        return res.json(); // received and pass to next layer
      } else {
        console.log(`failed to add transaction`);
      }
    })
    .then((jsonData) => {
      console.log(`Succeed to add transaction`);
      res.status(status.OK).render("noticeWindow", { 
        noticeTitle: 'Success', 
        noticeContent: `Successfully added transaction: ${jsonData.insertedId}`,
        noticeBtn: '/admin/transaction' });
    })
    .catch((err) => {
      console.error(`Failed to add transaction: ${err}`);
      res.status(status.INTERNAL_SERVER_ERROR).send({ err: err.toString() });
    });
});

app.get("/admin/comment", (req, res) => {
  console.log("Retrieving all comments");
  const options = {
    method: "GET",
    headers: { "content-type": "application/json" },
  };
  const url = `http://localhost:10888/comment/get`;
  fetch(url, options)
    .then((res) => {
      if (res.status === status.OK) {
        return res.json();
      } else {
        console.log("failed to get comment");
      }
    })
    .then((jsonData) => {
      res.status(status.OK).render("admin/comment", { comments: jsonData });
    })
    .catch((err) => {
      console.error(`Failed to get comment: ${err}`);
      res.status(status.INTERNAL_SERVER_ERROR).send({ err: err.toString() });
    });
});

app.get("/admin/addComment", (req, res) => {
  console.log("Retrieving all data");
  const options = {
    method: "GET",
    headers: { "content-type": "application/json" },
  };
  const url = `http://localhost:10888/comment/adminAdd`;
  fetch(url, options)
    .then((res) => {
      if (res.status === status.OK) {
        return res.json();
      } else {
        console.log("failed to get data");
      }
    })
    .then((jsonData) => {
      res.status(status.OK).render("admin/addComment", { data: jsonData });
    })
    .catch((err) => {
      console.error(`Failed to get data: ${err}`);
      res.status(status.INTERNAL_SERVER_ERROR).send({ err: err.toString() });
    });
});

app.post("/addCommentProcess", (req, res) => {
  console.log(`Adding comment for: ${req.body.name}`);
  const options = {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      productId: req.body.productId,
      content: req.body.content,
    }),
  };
  const url = `http://localhost:10888/comment/add/${req.body.userId}`;
  fetch(url, options)
    .then((res) => {
      if (res.status === status.OK) {
        return res.json();
      } else {
        console.log("failed to add comment");
      }
    })
    .then((jsonData) => {
      console.log(`Comment has been added with id: ${jsonData.insertedId}`);
      res.status(status.OK).render("noticeWindow", { 
        noticeTitle: 'Success', 
        noticeContent: `Successfully added comment.`,
        noticeBtn: '/admin/comment' });
    })
    .catch((err) => {
      console.error(`Failed to add comment: ${err}`);
      res.status(status.INTERNAL_SERVER_ERROR).send({ err: err.toString() });
    });
});

app.get("/admin/updateComment/:id", (req, res) => {
  console.log(`Geting comment with ID: ${req.params.id}`);
  const options = {
    method: "GET",
    headers: { "content-type": "application/json" },
  };
  const url = `http://localhost:10888/comment/get/${req.params.id}`;
  fetch(url, options)
    .then((res) => {
      if (res.status === status.OK) {
        return res.json();
      } else {
        console.log("failed to update comment");
      }
    })
    .then((jsonData) => {
      console.log(`Succeed to get comment`);
      res.status(status.OK).render("admin/editComment", { comment: jsonData });
    })
    .catch((err) => {
      console.error(`Failed to get comment item: ${err}`);
      res.status.apply(500).send({ err: err.toString() });
    });
});

app.post("/updateCommentProcess/:id", (req, res) => {
  console.log(`Updating comment with id: ${req.params.id}`);
  const options = {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      content: req.body.content,
    }),
  };
  const url = `http://localhost:10888/comment/update/${req.params.id}`;
  fetch(url, options)
    .then((res) => {
      if (res.status === status.OK) {
        return res.json();
      } else {
        console.log("failed to update comment");
      }
    })
    .then((jsonData) => {
      console.log(`Succeed to update comment: ${jsonData._id}`);
      res.status(status.OK).render("noticeWindow", { 
        noticeTitle: 'Success', 
        noticeContent: `Successfully updated comment`,
        noticeBtn: '/admin/comment' });
    })
    .catch((err) => {
      console.error(`Failed to update comment item: ${err}`);
      res.status.apply(500).send({ err: err.toString() });
    });
});

app.get("/deleteCommentProcess/:id", (req, res) => {
  console.log(`deleting comment with id: ${req.params.id}`);
  const options = {
    method: "DELETE",
    headers: { "content-type": "application/json" },
  };
  const url = `http://localhost:10888/comment/delete/${req.params.id}`;
  fetch(url, options)
    .then((res) => {
      console.log(res.status);
      if (res.status === status.OK) {
        return res.json();
      } else {
        console.log(`failed to delete comment: id = ${req.params.id}`);
      }
    })
    .then((jsonData) => {
      console.log(`Succeed to delete comment with id: ${jsonData._id}`);
      let noticeBtn
      if (req.cookies['role'] == 'admin') {
        noticeBtn = '/admin/comment'
      } else {
        noticeBtn = `/productDetail/${req.cookies['productDetailId']}`
      }
      res.status(status.OK).render("noticeWindow", { 
        noticeTitle: 'Success', 
        noticeContent: `Successfully deleted comment`,
        noticeBtn: noticeBtn });
    })
    .catch((err) => {
      console.error(`Failed to delete comment item: ${err}`);
      res.status.apply(500).send({ err: err.toString() });
    });
});

app.get("/admin/cart", (req, res) => {
  console.log("Retrieving all carts");
  const options = {
    method: "GET",
    headers: { "content-type": "application/json" },
  };
  const url = `http://localhost:10888/cart/get`;
  fetch(url, options)
    .then((res) => {
      if (res.status === status.OK) {
        return res.json();
      } else {
        console.log("failed to get cart");
      }
    })
    .then((jsonData) => {
      res.status(status.OK).render("admin/cart", { carts: jsonData });
    })
    .catch((err) => {
      console.error(`Failed to get cart: ${err}`);
      res.status(status.INTERNAL_SERVER_ERROR).send({ err: err.toString() });
    });
});

app.get("/admin/updateCart/:id", (req, res) => {
  console.log(`Geting cart with ID: ${req.params.id}`);
  const options = {
    method: "GET",
    headers: { "content-type": "application/json" },
  };
  const url = `http://localhost:10888/cart/get/${req.params.id}`;
  fetch(url, options)
    .then((res) => {
      if (res.status === status.OK) {
        return res.json();
      } else {
        console.log("failed to update cart");
      }
    })
    .then((jsonData) => {
      console.log(`Succeed to get cart`);
      res
        .status(status.OK)
        .render("admin/editCart", {
          cart: jsonData,
          products: jsonData.products,
        });
    })
    .catch((err) => {
      console.error(`Failed to get cart item: ${err}`);
      res.status.apply(500).send({ err: err.toString() });
    });
});

app.get("/deleteCartProductProcess/:id/:productID", (req, res) => {
  console.log(`deleting cart product with ID: ${req.params.productID}`);
  const options = {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      productId: req.params.productID,
    }),
  };
  const url = `http://localhost:10888/cart/delete/${req.params.id}`;
  fetch(url, options)
    .then((res) => {
      console.log(res.status);
      if (res.status === status.OK) {
        return res.json();
      } else {
        console.log(`failed to delete cart product: id = ${req.params.id}`);
      }
    })
    .then((jsonData) => {
      console.log(`Succeed to delete product to cart with id: ${jsonData._id}`);
      res.status(status.OK).render("noticeWindow", { 
        noticeTitle: 'Success', 
        noticeContent: `Successfully deleted product to cart`,
        noticeBtn: `/admin/updateCart/${req.params.id}`,
        cssLoad: '../../css/style.css' });
    })
    .catch((err) => {
      console.error(`Failed to delete cart product item: ${err}`);
      res.status.apply(500).send({ err: err.toString() });
    });
});

app.get("/admin/updateCartAddProduct/:id", (req, res) => {
  console.log(`Geting cart with ID: ${req.params.id}`);
  const options = {
    method: "GET",
    headers: { "content-type": "application/json" },
  };
  const url = `http://localhost:10888/product/get`;
  fetch(url, options)
    .then((res) => {
      if (res.status === status.OK) {
        return res.json();
      } else {
        console.log("failed to update cart");
      }
    })
    .then((jsonData) => {
      console.log(`Succeed to get cart`);
      res
        .status(status.OK)
        .render("admin/editCartAddProduct", {
          products: jsonData,
          cartId: req.params.id,
        });
    })
    .catch((err) => {
      console.error(`Failed to get cart item: ${err}`);
      res.status.apply(500).send({ err: err.toString() });
    });
});

app.post("/admin/updateCartAddProductProcess/:id", (req, res) => {
  console.log(`Adding product to cart with id: ${req.params.id}`);
  const options = {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      productQty: req.body.productQty,
    }),
  };
  const url = `http://localhost:10888/cart/update/${req.params.id}/${req.body.productId}`;
  fetch(url, options)
    .then((res) => {
      console.log(res.status);
      if (res.status === status.OK) {
        return res.json();
      } else {
        console.log(`failed to add product to cart: id = ${req.params.id}`);
      }
    })
    .then((jsonData) => {
      console.log(`Succeed to add product to cart with id: ${jsonData._id}`);
      res.status(status.OK).render("noticeWindow", { 
        noticeTitle: 'Success', 
        noticeContent: `Successfully added product to cart`,
        noticeBtn: `/admin/updateCart/${req.params.id}`,
        cssLoad: '../../css/style.css' });
    })
    .catch((err) => {
      console.error(`Failed to add product to cart item: ${err}`);
      res.status.apply(500).send({ err: err.toString() });
    });
});

// Cart Page
app.get("/cart", (req, res) => {
  console.log(`Getting the cart`);
  const cartCookie = req.cookies["cart"];
  if (req.cookies["accessToken"]) {
    if (cartCookie) {
      const parseCart = JSON.parse(cartCookie);
      const options = {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          product: parseCart.products,
        }),
      };
      const url = `http://localhost:10888/cart/update/${req.cookies["cartId"]}`;
      fetch(url, options)
        .then((response) => {
          if (response.status === status.OK) {
            return response.json();
          } else {
            console.log(`failed to add product to cart`);
          }
        })
        .then((jsonData) => {
          console.log(`Succeed to add product to cart`);
          res.clearCookie("cart");
          res.status(status.OK).redirect("/cart");
        })
        .catch((err) => {
          console.error(`Failed to add product to cart: ${err}`);
          res
            .status(status.INTERNAL_SERVER_ERROR)
            .send({ error: err.toString() });
        });
    } else {
      const options = {
        method: "GET",
        headers: { "content-type": "application/json" },
      };
      const url = `http://localhost:10888/cart/get/${req.cookies["cartId"]}`;
      fetch(url, options)
        .then((response) => {
          console.log(response.status);
          if (response.status === status.OK) {
            return response.json();
          } else {
            console.log(`failed to get cart`);
          }
        })
        .then((jsonData) => {
          console.log(`Succeed to get cart`);
          res.status(status.OK).render("user/cart", {
            products: jsonData.products,
            totalAmount: jsonData.totalPrice,
          });
        })
        .catch((err) => {
          console.error(`Failed to get cart: ${err}`);
          res
            .status(status.INTERNAL_SERVER_ERROR)
            .send({ error: err.toString() });
        });
    }
  } else {
    if (cartCookie) {
      const parseCart = JSON.parse(cartCookie);
      res.status(status.OK).render("user/cart", {
        products: parseCart.products,
        totalAmount: parseCart.totalPrice,
      });
    } else {
      const jsonCart = {
        userId: req.cookies["userId"],
        products: [],
        totalProducts: 0,
        totalPrice: 0,
      };
      const cart = JSON.stringify(jsonCart);
      res.cookie("cart", cart, { maxAge: cookieMaxAge, httpOnly: true });
      res.status(status.OK).render("user/cart", {
        products: jsonCart.products,
        totalAmount: jsonCart.totalPrice,
      });
    }
  }
});

app.post("/addCartProcess/:id", (req, res) => {
  console.log(`Adding product to cart`);
  const cartCookie = req.cookies["cart"];
  if (req.cookies["accessToken"]) {
    const options = {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        productQty: req.body.productQty,
      }),
    };
    const url = `http://localhost:10888/cart/update/${req.cookies["cartId"]}/${req.params.id}`;
    fetch(url, options)
      .then((res) => {
        if (res.status === status.OK) {
          return res.json(); // received and pass to next layer
        } else {
          console.log(`failed to add product to cart`);
        }
      })
      .then((jsonData) => {
        console.log(`Succeed to add product to cart`);
        res.status(status.OK).redirect("/cart");
      })
      .catch((err) => {
        console.error(`Failed to add product to cart: ${err}`);
        res.status(status.INTERNAL_SERVER_ERROR).send({ err: err.toString() });
      });
  } else {
    const options = {
      method: "GET",
      headers: { "content-type": "application/json" },
    };
    const url = `http://localhost:10888/product/get/${req.params.id}`;
    fetch(url, options)
      .then((res) => {
        if (res.status === status.OK) {
          return res.json();
        } else {
          console.log(`failed to get product`);
        }
      })
      .then((jsonData) => {
        console.log(`Succeed to get product`);

        const updatedCart = {
          productID: jsonData._id.toString(),
          name: jsonData.name,
          price: jsonData.price,
          quantity: parseInt(req.body.productQty),
          image: jsonData.image[0],
        };

        if (cartCookie) {
          const parseCart = JSON.parse(cartCookie);
          parseCart.totalPrice += req.body.productQty * jsonData.price;
          if (parseCart.products.length > 0) {
            let existItem = parseCart.products.find(
              (item) => item.productID === req.params.id
            );
            if (existItem) {
              existItem.quantity += parseInt(req.body.productQty);
            } else {
              parseCart.products.push(updatedCart);
              parseCart.totalProducts += 1;
            }
          } else {
            parseCart.products.push(updatedCart);
            parseCart.totalProducts += 1;
          }
          const cart = JSON.stringify(parseCart);
          res.cookie("cart", cart, { maxAge: cookieMaxAge, httpOnly: true });
        } else {
          const jsonCart = {
            userId: req.cookies["userId"],
            products: [],
            totalProducts: 0,
            totalPrice: 0,
          };
          jsonCart.totalPrice += req.body.productQty * jsonData.price;
          if (jsonCart.products.length > 0) {
            let existItem = jsonCart.products.find(
              (item) => item.productID === req.params.id
            );
            if (existItem) {
              existItem.quantity += parseInt(req.body.productQty);
            } else {
              jsonCart.products.push(updatedCart);
              jsonCart.totalProducts += 1;
            }
          } else {
            jsonCart.products.push(updatedCart);
            jsonCart.totalProducts += 1;
          }
          const cart = JSON.stringify(jsonCart);
          res.cookie("cart", cart, { maxAge: cookieMaxAge, httpOnly: true });
        }

        res.status(status.OK).redirect("/cart");
      })
      .catch((err) => {
        console.error(`Failed to get product: ${err}`);
        res.status(status.INTERNAL_SERVER_ERROR).send({ err: err.toString() });
      });
  }
});

app.get("/deleteCartProcess/:productID", (req, res) => {
  console.log(`Deleting product from cart`);
  const cartCookie = req.cookies["cart"];
  if (req.cookies["accessToken"]) {
    const options = {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        productId: req.params.productID,
      }),
    };
    const url = `http://localhost:10888/cart/delete/${req.cookies["cartId"]}`;
    fetch(url, options)
      .then((res) => {
        if (res.status === status.OK) {
          return res.json(); // received and pass to next layer
        } else {
          console.log(`failed to delete product from cart`);
        }
      })
      .then((jsonData) => {
        console.log(`Succeed to delete product from cart`);
        res.status(status.OK).redirect("/cart");
      })
      .catch((err) => {
        console.error(`Failed to delete product from cart: ${err}`);
        res.status(status.INTERNAL_SERVER_ERROR).send({ err: err.toString() });
      });
  } else {
    const parseCart = JSON.parse(cartCookie);
    let productIndex = parseCart.products.findIndex(
      (p) => p.productID === req.params.productID
    );
    parseCart.totalPrice -=
      parseCart.products[productIndex].price *
      parseCart.products[productIndex].quantity;
    parseCart.products.splice(productIndex, 1);
    parseCart.totalProducts -= 1;
    const cart = JSON.stringify(parseCart);
    res.cookie("cart", cart, { maxAge: cookieMaxAge, httpOnly: true });
    res.status(status.OK).redirect("/cart");
  }
});

app.get("/updateCartNum/:productId", (req, res) => {
  console.log(`Updating cart item quantity`);
  if (req.cookies["accessToken"]) {
    const options = {
      method: "GET",
      headers: { "content-type": "application/json" }
    };
    const url = `http://localhost:10888/cart/get/${req.cookies["cartId"]}/${req.params.productId}`;
    fetch(url, options)
      .then((res) => {
        if (res.status === status.OK) {
          return res.json(); // received and pass to next layer
        } else {
          console.log(`failed to update cart item quantity`);
        }
      })
      .then((jsonData) => {
        console.log(`Succeed to update cart item quantity`);
        res.status(status.OK).render("updateNumWindow", {
          updateNum: jsonData.quantity,
          updateTitle: 'Update Quantity',
          updateBtn: `/updateCartProcess/${req.params.productId}`,
        });
      })
      .catch((err) => {
        console.error(`Failed to update cart item quantity: ${err}`);
        res.status(status.INTERNAL_SERVER_ERROR).send({ err: err.toString() });
      });
  }
})

app.post("/updateCartProcess/:productId", (req, res) => {
  console.log(`Updating cart item quantity`);
  if (req.cookies["accessToken"]) {
    const options = {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        productQty: req.body.num,
        productId: req.params.productId
      }),
    };
    const url = `http://localhost:10888/cart/updateQty/${req.cookies["cartId"]}`;
    fetch(url, options)
      .then((res) => {
        if (res.status === status.OK) {
          return res.json(); // received and pass to next layer
        } else {
          console.log(`failed to update cart item quantity`);
        }
      })
      .then((jsonData) => {
        console.log(`Succeed to update cart item quantity`);
        res.status(status.OK).redirect("/cart");
      })
      .catch((err) => {
        console.error(`Failed to update cart item quantity: ${err}`);
        res.status(status.INTERNAL_SERVER_ERROR).send({ err: err.toString() });
      });
  }
})

app.get("/addTransactionProcess", (req, res) => {
  console.log(`Adding transaction`);
  if (req.cookies["accessToken"]) {
    const options = {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        status: "pending",
        userId: req.cookies["userId"],
      }),
    };
    const url = `http://localhost:10888/transaction/add`;
    fetch(url, options)
      .then((res) => {
        if (res.status === status.OK) {
          return res.json(); // received and pass to next layer
        } else {
          console.log(`failed to add transaction`);
        }
      })
      .then((jsonData) => {
        console.log(`Succeed to add transaction`);
        res
          .status(status.OK)
          .redirect(`/transactionDetail/${jsonData.insertedId}`);
      })
      .catch((err) => {
        console.error(`Failed to add transaction: ${err}`);
        res.status(status.INTERNAL_SERVER_ERROR).send({ err: err.toString() });
      });
  } else {
    res.redirect("/login");
  }
});

app.get("/transactionDetail/:id", (req, res) => {
  console.log(`Getting transaction detail`);
  if (req.cookies["accessToken"]) {
    const options = {
      method: "GET",
      headers: { "content-type": "application/json" }
    };
    const url = `http://localhost:10888/transaction/get/${req.params.id}`;
    fetch(url, options)
      .then((res) => {
        if (res.status === status.OK) {
          return res.json(); // received and pass to next layer
        } else {
          console.log(`failed to add transaction`);
        }
      })
      .then((jsonData) => {
        console.log(`Succeed to add transaction`);
        res
          .status(status.OK)
          .render("user/transaction", { transaction: jsonData });
      })
      .catch((err) => {
        console.error(`Failed to add transaction: ${err}`);
        res.status(status.INTERNAL_SERVER_ERROR).send({ err: err.toString() });
      });
  } else {
    res.redirect("/login");
  }
})

app.get('/transactionCheckoutProcess/:id', (req, res) => {
  console.log(`Checkouts transaction`);
  if (req.cookies["accessToken"]) {
    const options = {
      method: "GET",
      headers: { "content-type": "application/json" }
    };
    const url = `http://localhost:10888/transaction/get/${req.params.id}`;
    fetch(url, options)
      .then((res) => {
        if (res.status === status.OK) {
          return res.json(); // received and pass to next layer
        } else {
          console.log(`failed to get transaction`);
        }
      })
      .then((jsonData) => {
        console.log(`Succeed to get transaction`);
        res
          .status(status.OK)
          .render("user/transaction", { transaction: jsonData });
      })
      .catch((err) => {
        console.error(`Failed to add transaction: ${err}`);
        res.status(status.INTERNAL_SERVER_ERROR).send({ err: err.toString() });
      });
  } else {
    res.redirect("/login");
  }
})

// About Page
app.get("/about", (req, res) => {
  console.log(`Getting the about page`);
  res.status(status.OK).render("about", { page: "about" });
});

app.listen(port, () => {
  console.log(`Connected on port ${port}`);
});

// function
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

const hashPassword = (passwd) => {
  return crypto.createHash("sha256").update(passwd).digest("hex");
};
