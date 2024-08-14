const User = require("../models/user");
const Post = require("../models/post");

const { clearImage } = require("../util/file");

const bcrypt = require("bcryptjs");
const validator = require("validator");
const jwt = require("jsonwebtoken");
const tokenUtil = require("../util/token");

module.exports = {
  createUser: async ({ userInput }, _context, _info) => {
    const errors = [];
    if (!validator.isEmail(userInput.email)) {
      errors.push("Invalid e-mail address.");
    }
    if (
      validator.isEmpty(userInput.password) ||
      !validator.isLength(userInput.password, { min: 5 })
    ) {
      errors.push("Password is too short. Minimum 5 characters.");
    }
    if (errors.length > 0) {
      const error = new Error("Invalid input.");
      error.data = errors;
      error.code = 422;
      throw error;
    }

    const existingUser = await User.findOne({ email: userInput.email });
    if (existingUser) {
      const error = new Error("E-mail address already in use.");
      throw error;
    }

    const hashedPwd = await bcrypt.hash(userInput.password, 12);
    const user = new User({
      email: userInput.email,
      password: hashedPwd,
      name: userInput.name,
    });

    const createdUser = await user.save();
    return {
      ...createdUser._doc,
      _id: createdUser._id.toString(),
    };
  },

  login: async ({ email, password }, _context, _info) => {
    const user = await User.findOne({ email: email });
    if (!user) {
      const error = new Error("User not found.");
      error.code = 401;
      throw error;
    }

    const isEqual = await bcrypt.compare(password, user.password);
    if (!isEqual) {
      const error = new Error("Invalid password.");
      error.code = 401;
      throw error;
    }

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
      },
      tokenUtil.getTokenSeed,
      { expiresIn: "1h" }
    );

    return {
      token: token,
      userId: user._id.toString(),
    };
  },

  createPost: async ({ postInput }, context) => {
    if (!context.isAuth) {
      const error = new Error("User not authenticated.");
      error.code = 401;
      throw error;
    }
    const errors = [];
    if (
      validator.isEmpty(postInput.title) ||
      !validator.isLength(postInput.content, { min: 5 })
    ) {
      errors.push("Title is too short, minimum of 5 characters required.");
    }
    if (
      validator.isEmpty(postInput.content) ||
      !validator.isLength(postInput.content, { min: 5 })
    ) {
      errors.push("Content is too short, minimum of 5 characters required.");
    }
    if (errors.length > 0) {
      const error = new Error("Invalid input.");
      error.data = errors;
      error.code = 422;
      throw error;
    }

    const user = await User.findById(context.userId);

    if (!user) {
      const error = new Error("User not found.");
      error.code = 401;
      throw error;
    }

    const post = new Post({
      title: postInput.title,
      content: postInput.content,
      imageUrl: postInput.imageUrl,
      creator: user,
    });

    const createdPost = await post.save();
    user.posts.push(createdPost);
    await user.save();

    return {
      ...createdPost._doc,
      _id: createdPost._id.toString(),
      createdAt: createdPost.createdAt.toISOString(),
      updatedAt: createdPost.updatedAt.toISOString(),
    };
  },

  loadPosts: async ({ page }, context) => {
    if (!context.isAuth) {
      const error = new Error("User not authenticated.");
      error.code = 401;
      throw error;
    }

    if (!page) {
      page = 1;
    }
    const perPage = 2;

    const posts = await Post.find()
      .skip((page - 1) * perPage)
      .limit(perPage)
      .sort({ createdAt: -1 })
      .populate("creator");

    return {
      totalItems: posts.length,
      posts: posts.map((post) => {
        return {
          ...post._doc,
          _id: post._id.toString(),
          createdAt: post.createdAt.toISOString(),
          updatedAt: post.updatedAt.toISOString(),
        };
      }),
    };
  },

  loadPost: async ({ id }, context) => {
    if (!context.isAuth) {
      const error = new Error("User not authenticated.");
      error.code = 401;
      throw error;
    }

    const post = await Post.findById(id).populate("creator");
    if (!post) {
      const error = new Error("Post not found.");
      error.code = 404;
      throw error;
    }

    return {
      ...post._doc,
      _id: post._id.toString(),
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
    };
  },

  updatePost: async ({ id, postInput }, context) => {
    if (!context.isAuth) {
      const error = new Error("User not authenticated.");
      error.code = 401;
      throw error;
    }

    const post = await Post.findById(id).populate("creator");
    if (!post) {
      const error = new Error("Post not found.");
      error.code = 404;
      throw error;
    }

    if (post.creator._id.toString() !== context.userId.toString()) {
      const error = new Error("Not authorized.");
      error.code = 403;
      throw error;
    }

    const errors = [];
    if (
      validator.isEmpty(postInput.title) ||
      !validator.isLength(postInput.content, { min: 5 })
    ) {
      errors.push("Title is too short, minimum of 5 characters required.");
    }
    if (
      validator.isEmpty(postInput.content) ||
      !validator.isLength(postInput.content, { min: 5 })
    ) {
      errors.push("Content is too short, minimum of 5 characters required.");
    }
    if (errors.length > 0) {
      const error = new Error("Invalid input.");
      error.data = errors;
      error.code = 422;
      throw error;
    }

    post.title = postInput.title;
    post.content = postInput.content;

    if (postInput.imageUrl !== "undefined") {
      post.imageUrl = postInput.imageUrl;
    }

    const updatedPost = await post.save();

    return {
      ...updatedPost._doc,
      _id: updatedPost._id.toString(),
      createdAt: updatedPost.createdAt.toISOString(),
      updatedAt: updatedPost.updatedAt.toISOString(),
    };
  },

  deletePost: async ({ id }, context) => {
    if (!context.isAuth) {
      const error = new Error("User not authenticated.");
      error.code = 401;
      throw error;
    }

    const post = await Post.findById(id);
    if (!post) {
      const error = new Error("Post not found.");
      error.code = 404;
      throw error;
    }

    if (post.creator.toString() !== context.userId.toString()) {
      const error = new Error("Not authorized.");
      error.code = 403;
      throw error;
    }

    clearImage(post.imageUrl);
    await Post.findByIdAndDelete(id);
    const user = await User.findById(context.userId);
    user.posts.pull(id);
    await user.save();
    return true;
  },

  getStatus: async ( args, context) => {
    if (!context.isAuth) {
      const error = new Error("User not authenticated.");
      error.code = 401;
      throw error;
    }

    const user = await User.findById(context.userId);
    if (!user) {
      const error = new Error("User not found.");
      error.code = 404;
      throw error;
    }

    return {
        ...user._doc,
        _id: user._id.toString(),
    };
  },

  updateStatus: async ( { status }, context) => {
    if (!context.isAuth) {
      const error = new Error("User not authenticated.");
      error.code = 401;
      throw error;
    }

    const user = await User.findById(context.userId);
    if (!user) {
      const error = new Error("User not found.");
      error.code = 404;
      throw error;
    }

    user.status = status;
    await user.save();

    return {
        ...user._doc,
        _id: user._id.toString(),
    };
  },
};
