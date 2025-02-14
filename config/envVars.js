const dotenv = require('dotenv');
dotenv.config();

const ENV_VARS = {
  MONGO_URI: process.env.MONGO_URI,
  JWT_SECRET_KEY: process.env.JWT_SECRET_KEY,
  PORT: process.env.PORT || 9000
};

module.exports = { ENV_VARS };
