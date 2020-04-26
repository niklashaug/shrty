const express = require('express')
const bodyParser = require('body-parser')
const exHbs = require('express-handlebars')
const cryptoRandomString = require('crypto-random-string')

const app = express()
const hbs = exHbs.create()

app.engine('handlebars', hbs.engine)
app.set('view engine', 'handlebars')

app.get('/', (req, res) => {
    res.json({
        random: cryptoRandomString({ length: 10 })
    })
})

app.use(bodyParser)

app.listen(3000)
