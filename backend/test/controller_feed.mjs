import { expect } from "chai";
import feedController from "../controllers/feed.js";
import sinon from "sinon";
import User from "../models/user.js";
import Post from "../models/post.js";
import databaseUtil from "../util/database.js";
import mongoose from "mongoose";

describe("Feed Controller", () => {
  const USER_ID = "66ac9eae5ec8db4fd2fa18a5";

  before(function (done) {
    mongoose
      .connect(databaseUtil.getTestDatabaseConnectionString)
      .then((result) => {
        const user = new User({
          email: "example@email.com",
          password: "some-password",
          name: "some-name",
          posts: [],
          _id: USER_ID,
        });
        return user.save();
      })
      .then((result) => {
        done();
      })
      .catch((err) => {
        console.log("Error setting up tests.", err);
        done(err);
      });
  });

  after(function (done) {
    User.deleteMany({})
      .then(() => {
        return mongoose.disconnect();
      })
      .then(() => {
        done();
      })
      .catch((err) => {
        mongoose.disconnect().then(() => {
          console.log("Error after tests.", err);
          done(err);
        });
      });
  });

  it("should add a created post to the posts of a creator", function (done) {
    
    const req = {
      body: {
        title: "some-title",
        content: "some-content",
      },
      file: {
        path: 'some-path',
      },
      userId: USER_ID,
    };

    const res = { status: function() { return this; }, json: function() {} };

    feedController.createPost(req, res, () => {})
    .then((savedUser) => {
      expect(savedUser).to.have.property('posts');
      expect(savedUser.posts).to.have.length(1);
      done();
    })
    .catch((err) => {
      done(err);
    });

  });

});
