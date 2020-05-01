require('dotenv').config()
module.exports = {
    csrf: {
        sessionSecret: process.env.SESSION_SECRET,
        tokenLength: process.env.TOKEN_LENGTH || 32
    },
    protocol: process.env.NODE_ENV === 'production' ? 'https' : 'http',
    host: process.env.HOST || 'shrty.eu',
    db: {
        name: process.env.DB_NAME,
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || '3306',
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD
    },
    /*mail: {
        host: process.env.MAIL_HOST || 'localhost',
        port: process.env.MAIL_PORT || 465,
        user: process.env.MAIL_USER,
        password: process.env.MAIL_PASSWORD
    }*/
}
