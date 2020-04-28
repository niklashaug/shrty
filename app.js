const express = require('express')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const handlebars = require('express-handlebars')
const cryptoRandomString = require('crypto-random-string')
const path = require('path')
const shurley = require('shurley')
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
const hbs = handlebars.create()

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

// AUTHENTICATION MIDDLEWARE
async function AuthenticationPolicy (req, res, next) {
    if(req.session && req.session.user && req.session.user.ID) {
        //success
        User.findByPk(req.session.user.ID, {
            include: [URL],
            order: [
            [URL,
            'createdAt',
            'DESC']
            ]
        }).then(user => {
            let userData = user.toJSON()

            req.session.user = {
                ID: userData.ID,
                username: userData.username,
                urls: userData.urls
            }

            next()
        })
    } else {
        //authentication failed
        res.redirect('/login')
    }
}

// CSRF MIDDLEWARE
function csrfPolicy(req, res, next) {
    if(req.body.csrf === req.session.csrf) {
        next()
    } else {
        res.status(401).send()
    }
}

// ROUTES
app.get('/register', (req, res) => {
    if(req.session && req.session.user) {
        return res.redirect('/')
    }

    req.session.csrf = cryptoRandomString({ length: config.csrf.tokenLength })

    res.render('register', {
        csrfToken: req.session.csrf
    })
})

app.post('/register', csrfPolicy, async (req, res) => {
    const hash = await bcrypt.hash(req.body.password, 10)

    try {
        const user = await User.create({
            user: req.body.user,
            password: hash
        })

        if(user) {
            res.status(200).redirect('/login')
        }
    } catch(err) {
        if(err.name === 'SequelizeUniqueConstraintError') {
            req.session.csrf = cryptoRandomString({ length: config.csrf.tokenLength })
            res.render('register', {
                error: 'This username has already been taken.',
                csrfToken: req.session.csrf
            })
        }
    }
})

app.get('/login', (req, res) => {
    if(req.session && req.session.user) {
        return res.redirect('/')
    }
    req.session.csrf = cryptoRandomString({ length: config.csrf.tokenLength })
    res.render('login', {
        csrfToken: req.session.csrf
    })
})

app.post('/login', csrfPolicy, async (req, res) => {
    const user = await User.findOne({
        where: {
            username: req.body.username
        },
        include: [URL]
    })

    if(user && user.activated) {
        if(await bcrypt.compare(req.body.password, user.password)) {
            //success
            req.session.user = {
                ID: user.ID,
                username: user.username,
                urls: user.urls
            }

            return res.redirect('/')
        }
    }

    //wrong credentials
    res.status(200).redirect('/login')

})

app.post('/logout', csrfPolicy, AuthenticationPolicy, (req, res) => {
    req.session.destroy()
    res.redirect('/login')
})

app.get('/', AuthenticationPolicy, (req, res) => {
    req.session.csrf = cryptoRandomString({ length: config.csrf.tokenLength })
    res.render('index', {
        protocol: config.protocol,
        user: req.session.user,
        csrfToken: req.session.csrf,
        link: req.session.link ? req.session.link : null
    })
    if(req.session.link) {
        req.session.link = undefined
    }
})

app.post('/', csrfPolicy, AuthenticationPolicy, async (req, res) => {

    const url = await URL.create({
        slug: cryptoRandomString({ length: 6 }),
        userID: req.session.user.ID,
        forward: shurley.parse(req.body.url)
    })

    req.session.csrf = cryptoRandomString({ length: config.csrf.tokenLength })

    req.session.link = `${config.host}/${url.slug}`
    res.redirect('/')

})

app.get('/my-urls', AuthenticationPolicy, async (req, res) => {
    req.session.csrf = cryptoRandomString({ length: config.csrf.tokenLength })

    res.render('list', {
        host: config.host,
        user: req.session.user,
        csrfToken: req.session.csrf,
        listView: true,
        helpers: {
            host: () => config.host
        }
    })
})

app.post('/:slug', AuthenticationPolicy, async (req, res) => {
    const url = await URL.findByPk(req.params.slug, { include: [User] })
    if(url.toJSON().user.ID === req.session.user.ID) {
        url.destroy()
        res.redirect('/my-urls')
    } else {
        res.status(401).send()
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

