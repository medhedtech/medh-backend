const dotenv = require('dotenv');
dotenv.config();

const ENV_VARS = {
  MONGO_URI: process.env.MONGO_URI,
  JWT_SECRET_KEY: process.env.JWT_SECRET_KEY,
  PORT: process.env.PORT || 8080,
  NODE_ENV: process.env.NODE_ENV || 'development',
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [],
  AWS_ACCESS_KEY: process.env.IM_AWS_ACCESS_KEY,
  AWS_SECRET_KEY: process.env.IM_AWS_SECRET_KEY
};

module.exports = { ENV_VARS };
