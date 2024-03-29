let CONFIG = {};

CONFIG.BACK_HOSTNAME      = process.env.BACK_HOSTNAME;
CONFIG.FRONT_HOSTNAME     = process.env.FRONT_HOSTNAME;
CONFIG.MYSQL_HOST         = process.env.MYSQL_HOST;
CONFIG.MYSQL_DATABASE     = process.env.MYSQL_DATABASE;
CONFIG.MYSQL_USER         = process.env.MYSQL_USER;
CONFIG.MYSQL_PASSWORD     = process.env.MYSQL_PASSWORD;
CONFIG.API_SECRET_JWT_KEY = process.env.API_SECRET_JWT_KEY;
CONFIG.BING_API           = process.env.BING_API;
CONFIG.IPSTACK_API        = process.env.IPSTACK_API;

module.exports = CONFIG;