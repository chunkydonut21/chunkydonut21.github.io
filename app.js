const express = require('express')

const app = express()
const mangaRoutes = require('./routes/mangaRoutes')

app.use('/', mangaRoutes)


module.exports = app;
