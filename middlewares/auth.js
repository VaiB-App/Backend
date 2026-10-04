import jwt from "jsonwebtoken";
import { ErrorHandler } from "../utils/utility.js";
import { TryCatch } from "./error.js";
import { CHATTU_TOKEN } from "../constants/config.js";
import { User } from "../models/user.js";
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const adminSecretKey = process.env.ADMIN_SECRET_KEY || "adsasdsdfsdfd";

const logAuthFailure = (context, details) => {
  console.warn(`[auth] ${context}`, details);
};

const isAuthenticated = TryCatch((req, res, next) => {
  const cookies = req.cookies || {};
  const token = cookies[CHATTU_TOKEN];

  if (!token) {
    logAuthFailure("missing token", {
      method: req.method,
      path: req.originalUrl,
      expectedCookie: CHATTU_TOKEN,
      cookieParserRan: Boolean(req.cookies),
      cookieNames: Object.keys(cookies),
      cookieHeaderPresent: Boolean(req.headers.cookie),
      authorizationHeaderPresent: Boolean(req.headers.authorization),
      origin: req.headers.origin,
      forwardedProto: req.headers["x-forwarded-proto"],
    });
    return next(new ErrorHandler("Please login to access this route", 401));
  }

  if (!process.env.JWT_SECRET) {
    logAuthFailure("JWT_SECRET is not configured", {
      method: req.method,
      path: req.originalUrl,
    });
    return next(new ErrorHandler("Please login to access this route", 401));
  }

  let decodedData;
  try {
    decodedData = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    logAuthFailure("token verification failed", {
      method: req.method,
      path: req.originalUrl,
      errorName: error?.name,
      errorMessage: error?.message,
    });
    return next(new ErrorHandler("Please login to access this route", 401));
  }

  req.user = decodedData._id;

  next();
});

const adminOnly = (req, res, next) => {
  const token = req.cookies["chattu-admin-token"];

  if (!token)
    return next(new ErrorHandler("Only Admin can access this route", 401));

  const secretKey = jwt.verify(token, process.env.JWT_SECRET);

  const isMatched = secretKey === adminSecretKey;

  if (!isMatched)
    return next(new ErrorHandler("Only Admin can access this route", 401));

  next();
};

const socketAuthenticator = async (err, socket, next) => {
  try {
    if (err) return next(err);

    const cookies = socket.request.cookies || {};
    const authToken = cookies[CHATTU_TOKEN];

    if (!authToken) {
      const headers = socket.request.headers || {};
      logAuthFailure("socket missing token", {
        socketId: socket.id,
        expectedCookie: CHATTU_TOKEN,
        cookieParserRan: Boolean(socket.request.cookies),
        cookieNames: Object.keys(cookies),
        cookieHeaderPresent: Boolean(headers.cookie),
        origin: headers.origin,
        forwardedProto: headers["x-forwarded-proto"],
      });
      return next(new ErrorHandler("Please login to access this route", 401));
    }

    if (!process.env.JWT_SECRET) {
      logAuthFailure("socket JWT_SECRET is not configured", { socketId: socket.id });
      return next(new ErrorHandler("Please login to access this route", 401));
    }

    const decodedData = jwt.verify(authToken, process.env.JWT_SECRET);

    const user = await User.findById(decodedData._id);

    if (!user) {
      logAuthFailure("socket user not found for verified token", {
        socketId: socket.id,
        userIdPresent: Boolean(decodedData._id),
      });
      return next(new ErrorHandler("Please login to access this route", 401));
    }

    socket.user = user;

    return next();
  } catch (error) {
    logAuthFailure("socket token verification or user lookup failed", {
      socketId: socket?.id,
      errorName: error?.name,
      errorMessage: error?.message,
    });
    return next(new ErrorHandler("Please login to access this route", 401));
  }
};

export { isAuthenticated, adminOnly, socketAuthenticator };