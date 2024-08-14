const express = require("express");
const app = express();

const bodyParser = require("body-parser");

const mongoose = require("mongoose");
const databaseUtil = require("./util/database");

const path = require("path");

const multer = require("multer");

const graphqlHTTP = require('graphql-http/lib/use/express');
const graphiql = require('express-graphiql-explorer');

const graphqlResolvers = require("./graphql/resolvers");
const graphqlSchema = require("./graphql/schema");

const auth = require('./middlewares/auth');

const { clearImage } = require('./util/file');

app.use(bodyParser.json());
app.use("/images", express.static(path.join(__dirname, "images")));

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "images");
  },
  filename: (req, file, cb) => {
    cb(null, new Date().toISOString() + "-" + file.originalname);
  },
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === "image/png" ||
    file.mimetype === "image/jpg" ||
    file.mimetype === "image/jpeg"
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

app.use(
  multer({ storage: fileStorage, fileFilter: fileFilter }).single("image")
);

app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, PATCH, DELETE"
    );
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if(req.method == "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

app.use(auth);

app.put('/post-image', (req, res, next) => {
    if(!req.isAuth) {
        throw new Error('User not authenticated.');
    }
    if(!req.file) {
        return res.status(200).json({ message: 'No image file provided.' });
    }
    if(req.body.oldPath) {
        clearImage(req.body.oldPath);
    }
    return res.status(201).json({ 
        message: 'Image file stored successfully.', 
        filePath: req.file.path.replace(/\\/g, '/'),
        //imagePath: req.file.path 
    });
});

app.use('/graphiql', 
    graphiql({
        graphQlEndpoint: '/graphql',
        defaultQuery: `query MyQuery {}`,
    })
)

app.all(
  "/graphql", (req, res) => {
        graphqlHTTP.createHandler({
            schema: graphqlSchema,
            rootValue: graphqlResolvers,
            context: (req, res) => {
                return { 
                    isAuth: req.raw.isAuth,
                    userId: req.raw.userId,
                };
            },
            formatError: (err) => {
                if(!err.originalError) {
                    return err;
                }
                const data = err.originalError.data;
                const message = err.message || 'An error has ocurred';
                const code = err.originalError.code || 500;

                return { message: message, status: code, data: data };
            },
        }) (req, res)
    }
);

app.use((err, req, res, next) => {
  console.log(err);
  const status = err.statusCode || 500;
  const message = err.message;
  const data = err.data;
  res.status(status).json({ message: message, data: data });
});



mongoose
  .connect(databaseUtil.getDatabaseConnectionString)
  .then((result) => {
    app.listen(8080);
  })
  .catch((err) => {
    console.log(err);
  });
