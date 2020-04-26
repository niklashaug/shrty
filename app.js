const express = require('express')
const bodyParser = require('body-parser')
const exHbs = require('express-handlebars')
const cryptoRandomString = require('crypto-random-string')
const path = require('path')
const shurley = require('shurley')

// SEQUELIZE
const config = require('./config')
const Sequelize = require('sequelize')
const sequelize = new Sequelize(config.db.name, config.db.username, config.db.password, {
    host: config.db.host,
    dialect: 'mysql'
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
    forward: {
        type: Sequelize.STRING,
        allowNull: false
    }
})
sequelize.sync()

// HANDLEBARS
const app = express()
const hbs = exHbs.create()

app.engine('handlebars', hbs.engine)
app.set('view engine', 'handlebars')

app.use(express.static(path.join(__dirname, '/public')))

app.use(bodyParser.urlencoded())

app.use(bodyParser.json())

// ROUTES
app.get('/', async (req, res) => {
    res.render('index')
})

app.post('/', async (req, res) => {
    const url = await URL.create({
        slug: cryptoRandomString({ length: 6 }),
        forward: shurley.parse(req.body.url)
    })

    res.render('index', {
        link: `${config.host}/${url.slug}`
    })
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

