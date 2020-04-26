require('dotenv').config()
module.exports = {
    csrf: {
        sessionSecret: process.env.SESSION_SECRET,
        tokenLength: process.env.TOKEN_LENGTH || 32
    },
    jwt: {
        secret: process.env.JWT_SECRET
    },
    host: process.env.HOST || 'shrty.eu',
    db: {
        name: process.env.DB_NAME,
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || '3306',
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD
    }
}
