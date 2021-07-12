const dotenv = require('dotenv');

const NODE_ENV = process.env.NODE_ENV || 'development';

dotenv.config({
    path: `.env.${NODE_ENV}`
});

console.log('ProcessEnv', process.env.NODE_ENV);

module.exports = {
    NODE_ENV,
    HOST: process.env.HOST || '127.0.0.1',
    PORT: process.env.PORT || 3000
};
