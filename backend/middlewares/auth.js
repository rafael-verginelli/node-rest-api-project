const jwt = require('jsonwebtoken');

const tokenUtil = require('../util/token');

module.exports = (req, res, next) => {
    const authHeader = req.get('Authorization');
    if(!authHeader) {
        req.isAuth = false;
        const error = new Error('Not authenticated.');
        error.statusCode = 401;
        throw error;
    }

    if(!authHeader.startsWith('Bearer ')) {
        const error = new Error('Malformed authorization token.');
        error.statusCode = 401;
        throw error;
    }

    // Expects "Bearer sometokenvalue", splits to get only token value
    const token = authHeader.split(' ')[1];

    let decodedToken;
    
    try {
        decodedToken = jwt.verify(token, tokenUtil.getTokenSeed);
    } catch(err) {
        req.isAuth = false;
        err.statusCode = 500;
        throw err;
    }

    if(!decodedToken) {
        req.isAuth = false;
        return next();
    }

    req.userId = decodedToken.userId;
    req.isAuth = true;
    next();
}