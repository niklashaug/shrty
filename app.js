const express = require('express')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const exHbs = require('express-handlebars')
const cryptoRandomString = require('crypto-random-string')
const path = require('path')
const shurley = require('shurley')
const jwt = require('jsonwebtoken')
const session = require('express-session')
const bcrypt = require('bcrypt')

// SEQUELIZE CONFIG
const config = require('./config')
const Sequelize = require('sequelize')
const sequelize = new Sequelize(config.db.name, config.db.username, config.db.password, {
    host: config.db.host,
    dialect: 'mysql'
})

// SEQUELIZE MODELS
const User = sequelize.define('user', {
    // attributes
    ID: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
    },
    username: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
    },
    password: {
        type: Sequelize.STRING,
        allowNull: false
    },
    activated: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: true
    }
})

const URL = sequelize.define('url', {
    // attributes
    slug: {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: true,
        unique: true,
        autoIncrement: false
    },
    userID: {
        type: Sequelize.INTEGER,
        references: {
            model: 'users',
            key: 'ID'
        },
        allowNull: false
    },
    forward: {
        type: Sequelize.STRING,
        allowNull: false
    }
})

// SEQUELIZE RELATIONS
User.hasMany(URL)
URL.belongsTo(User)

// SYNC DB
sequelize.sync()

// HANDLEBARS
const app = express()
const hbs = exHbs.create()

app.engine('handlebars', hbs.engine)
app.set('view engine', 'handlebars')

app.use(express.static(path.join(__dirname, '/public')))

app.use(bodyParser.urlencoded())

app.use(bodyParser.json())

app.use(cookieParser())

app.use(session({
    secret: config.csrf.sessionSecret,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
}))

// JWT MIDDLEWARE
async function AuthenticationPolicy (req, res, next) {
    let token = req.cookies.Authentication
    let verify = token ? jwt.verify(token, config.jwt.secret) : null

    if(verify) {
        //success
        req.user = verify
        next()
    } else {
        //authentication failed
        res.redirect('/login')
    }
}

// ROUTES
app.get('/register', (req, res) => {
    req.session.csrf = cryptoRandomString({ length: config.csrf.tokenLength })
    console.log(req.session.csrf)
    res.render('register', {
        csrfToken: req.session.csrf
    })
})

app.post('/register', async (req, res) => {
    if(req.body.csrf === req.session.csrf) {
        const hash = await bcrypt.hash(req.body.password, 10)

        try {
            const user = await User.create({
                username: req.body.username,
                password: hash
            })

            if(user) {
                res.status(200).redirect('/login')
            }
        } catch(err) {
            if(err.name === 'SequelizeUniqueConstraintError') {
                res.render('register', {
                    error: 'This username has already been taken.'
                })
            }
        }
    } else {
        res.status(401).send()
    }
})

app.get('/login', (req, res) => {
    req.session.csrf = cryptoRandomString({ length: config.csrf.tokenLength })
    res.render('login', {
        csrfToken: req.session.csrf
    })
})

app.post('/login', async (req, res) => {
    if(req.body.csrf === req.session.csrf) {
        const user = await User.findOne({
            where: {
                username: req.body.username
            }
        })

        if(user && user.activated) {
            if(await bcrypt.compare(req.body.password, user.password)) {
                //success
                const token = jwt.sign({
                    ID: user.ID,
                    username: user.username
                }, config.jwt.secret)
                res.cookie('Authentication', token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production'
                })
                return res.redirect('/')
            }
        }

        //wrong credentials
        res.status(200).redirect('/login')
    } else {
        res.status(401).send()
    }
})

app.get('/', AuthenticationPolicy, (req, res) => {
    req.session.csrf = cryptoRandomString({ length: config.csrf.tokenLength })
    res.render('index', {
        username: req.user.username,
        csrfToken: req.session.csrf
    })
})

app.post('/', AuthenticationPolicy, async (req, res) => {
    if(req.body.csrf === req.session.csrf) {
        const url = await URL.create({
            slug: cryptoRandomString({ length: 6 }),
            userID: req.user.ID,
            forward: shurley.parse(req.body.url)
        })

        req.session.csrf = cryptoRandomString({ length: config.csrf.tokenLength })

        res.render('index', {
            username: req.user.username,
            csrfToken: req.session.csrf,
            link: `${config.host}/${url.slug}`
        })
    } else {
        res.redirect('/')
    }
})

app.get('/:slug', async (req, res) => {
    const url = await URL.findOne({
        where: {
            slug: req.params.slug
        }
    })

    if(url) {
        res.status(200).redirect(url.forward)
    } else {
        res.status(404).send()
    }
})

app.listen(3000)

