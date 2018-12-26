const http = require('http')
const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const session = require("express-session")
const config = require('./config.js')
const fs = require('fs')
const app = express()

app.set('view engine', 'html')
app.use(cookieParser())
app.use(express.static('views'))

app.use(session({
    secret: "myOwnSecret",
    cookie: { maxAge: 1000 * 60 * 60 * 1 }, // 24 hours 
    resave: true,
    saveUninitialized: true
}))

app.use(cors())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json());

require('./routes')(app)

http.createServer(app)
  .listen(process.env.PORT || config.port, function () {
    console.log(`Go to http://localhost:${process.env.PORT || config.port}`)
  })
