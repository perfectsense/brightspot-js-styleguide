const express = require('express')
const path = require('path')

const logger = require('./logger')

module.exports = config => {
  logger.welcome()

  Object.keys(config).sort().forEach(key => {
    logger.info(`Config: ${key}: ${JSON.stringify(config[key])}`)
  })

  const app = express()

  app.use(express.static(config.build))

  app.post('/node_modules/*/styleguide/*', (req, res) => {
    res.sendFile(path.join(config.build, req.originalUrl))
  })

  const server = app.listen(config.port, config.host, () => {
    logger.success(`Server started on http://${config.host}:${config.port}/_styleguide/index.html`)
  })

  server.on('error', function (error) {
    if (error.errno === 'EADDRINUSE') {
      logger.error(`Another server already running on ${config.port}!`)
    } else {
      logger.error(`Unknown error! ${error.message}`)
    }

    this.close()
    process.exit(0)
  })
}
