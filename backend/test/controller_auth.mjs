import { expect } from "chai";
import authController from "../controllers/auth.js";
import sinon from "sinon";
import User from "../models/user.js";
import databaseUtil from "../util/database.js";
import mongoose from "mongoose";

describe("Auth Controller", () => {
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

  it("should throw an error if accessing the database fails", function (done) {
    sinon.stub(User, "findOne");
    // learn how to call async functions here
    User.findOne.throws();

    const req = {
      body: {
        email: "example@email.com",
        password: "some-password",
      },
    };

    authController
      .login(req, {}, () => {})
      .then((result) => {
        expect(result).to.be.an("error");
        expect(result).to.have.property("statusCode", 500);
        done();
      })
      .catch((err) => {
        done(err);
      });

    User.findOne.restore();
  });

  it("should send a response with a valid user status for an existing user", function (done) {
    const req = { userId: USER_ID };
    const res = {
      statusCode: 500,
      userStatus: null,
      status: function (code) {
        this.statusCode = code;
        return this;
      },
      json: function (data) {
        this.userStatus = data.status;
      },
    };

    authController
      .getUserStatus(req, res, () => {})
      .then(() => {
        expect(res.statusCode).to.be.equal(200);
        expect(res.userStatus).to.be.equal("I am new!");
        done();
      });
  });
});
