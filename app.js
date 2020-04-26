const express = require('express')
const bodyParser = require('body-parser')
const exHbs = require('express-handlebars')
const cryptoRandomString = require('crypto-random-string')
const path = require('path')
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
        primaryKey: true
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

// ROUTES
app.get('/', async (req, res) => {
    //const response = await sequelize.query('SELECT * from test')
    res.render('index')
})

app.post('/url/add', async (req, res) => {

})


app.use(express.static(path.join(__dirname, '/public')))


app.use(bodyParser.urlencoded())

app.use(bodyParser.json())

app.listen(3000)

