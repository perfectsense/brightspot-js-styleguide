const term = require('terminal-kit').terminal
const notify = require('gulp-notify')
const path = require('path')

function log (callback) {
  term.defaultColor('[').cyan('BRIGHTSP').red('O').cyan('T Styleguide').defaultColor('] ')
  callback()
  term.defaultColor()
}

module.exports = {
  welcome: function () {
    term.blue(' _____ _____ _____ _____ _____ _____ _____ _____').red(' _____ ').blue('_____ \n')
    term.blue('| __  | __  |     |   __|  |  |_   _|   __|  _  ').red('|     |').blue('_   _|\n')
    term.blue('| __ -|    -|-   -|  |  |     | | | |__   |   __').red('|  |  |').blue(' | |  \n')
    term.blue('|_____|__|__|_____|_____|__|__| |_| |_____|__|  ').red('|_____|').blue(' |_|  \n')
    term.blue('            _____ _       _             _   _     \n')
    term.blue('           |   __| |_ _ _| |___ ___ _ _|_|_| |___ \n')
    term.blue('           |__   |  _| | | | -_| . | | | | . | -_|\n')
    term.blue('           |_____|_| |_  |_|___|_  |___|_|___|___|\n')
    term.blue('                     |___|     |___|              \n')
    term.defaultColor('\n')
  },

  info: function (message) {
    log(() => term.defaultColor(`${message}\n`))
  },

  success: function (message) {
    log(() => term.green(`${message}\n`))
  },

  warn: function (message) {
    log(() => term.yellow(`\u{26A0} ${message}\n`))
  },

  error: function (message, notifications = true) {
    message = `\u{1F4A5} [Error] ${message}`

    if (notifications) {
      notify.logLevel(0)

      notify.onError({
        title: `Styleguide Error`,
        message: message,
        sound: `Frog`,
        icon: path.join(__dirname, `brightspot-logo.png`)
      })(message)
    }

    log(() => term.red(`${message}\n`))
  }
}
