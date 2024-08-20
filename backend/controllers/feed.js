const { validationResult } = require("express-validator");

const Post = require("../models/post");
const User = require("../models/user");

const fs = require("fs");
const path = require("path");

exports.getPosts = async (req, res, next) => {
  const currentPage = req.query.page;
  const perPage = 2; // hardcoded here and in the FE
  let totalItems;

  try {
    const count = await Post.find().countDocuments();
    totalItems = count;

    const posts = await Post.find()
      .populate("creator")
      .sort({ createdAt: -1 })
      .skip((currentPage - 1) * perPage)
      .limit(perPage);

    res.status(200).json({
      message: "Posts fetched successfully",
      posts: posts,
      totalItems: totalItems,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.createPost = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error("Data validation failed.");
    error.statusCode = 422;
    throw error;
  }
  if (!req.file) {
    const error = new Error("No image provided.");
    error.statusCode = 422;
    throw error;
  }
  const imageUrl = req.file.path;
  const title = req.body.title;
  const content = req.body.content;
  let creator;
  const post = new Post({
    title: title,
    imageUrl: imageUrl,
    content: content,
    creator: req.userId,
  });

  try {
    await post.save();
    const user = await User.findById(req.userId);

    creator = user;
    user.posts.push(post);
    const savedUser = await user.save();

    res.status(201).json({
      message: "Post created successfully",
      post: post,
      creator: {
        _id: creator._id,
        name: creator.name,
      },
    });
    return savedUser;
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
    return err;
  }
};

exports.getPost = async (req, res, next) => {
  const postId = req.params.postId;

  const post = await Post.findById(postId);

  try {
    if (!post) {
      const error = new Error("Post not found.");
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json({
      message: "Post fetched successfully.",
      post: post,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.updatePost = async (req, res, next) => {
  const postId = req.params.postId;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error("Data validation failed.");
    error.statusCode = 422;
    throw error;
  }

  const title = req.body.title;
  const content = req.body.content;
  let imageUrl = req.body.image;
  if (req.file) {
    imageUrl = req.file.path;
  }
  if (!imageUrl) {
    const error = new Error("No image provided.");
    error.statusCode = 422;
    throw error;
  }

  try {
    const post = await Post.findById(postId).populate('creator');

    if (!post) {
      const error = new Error("Post not found.");
      error.statusCode = 404;
      throw error;
    }
    if (post.creator._id.toString() !== req.userId) {
      const error = new Error("Operation not authorized.");
      error.statusCode = 403;
      throw error;
    }
    if (imageUrl !== post.imageUrl) {
      clearImage(post.imageUrl);
    }
    post.title = title;
    post.imageUrl = imageUrl;
    post.content = content;
    const result = await post.save();

    res.status(200).json({
      message: "Post updated successfully",
      post: result,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.deletePost = async (req, res, next) => {
  const postId = req.params.postId;

  try {
    const post = await Post.findById(postId);

    if (!post) {
      const error = new Error("Post not found.");
      error.statusCode = 404;
      throw error;
    }

    if (post.creator.toString() !== req.userId) {
      const error = new Error("Operation not authorized.");
      error.statusCode = 403;
      throw error;
    }

    clearImage(post.imageUrl);

    await Post.findByIdAndDelete(postId);

    const user = await User.findById(req.userId);

    user.posts.pull(postId);
    await user.save();

    res.status(200).json({
      message: "Post deleted successfully",
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

const clearImage = (filePath) => {
  filePath = path.join(__dirname, "..", filePath);
  fs.unlink(filePath, (err) => console.log(err));
};
