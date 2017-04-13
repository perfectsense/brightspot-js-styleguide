const watch = require('gulp-debounced-watch')

const logger = require('../logger')

module.exports = (styleguide, gulp) => {
  this.watching = false

  styleguide.watch = () => {
    this.watching = true

    styleguide.watch.html()
    styleguide.watch.js()
    styleguide.watch.less()
    styleguide.watch.sketch()
  }

  styleguide.isWatching = () => this.watching

  function onChange (file) {
    logger.info(`Changed: ${file.path}`)
  }

  styleguide.watch.html = () => {
    gulp.watch(['styleguide/**/*.{hbs,json,md}'], { cwd: styleguide.path.root() }, [ styleguide.task.ui() ])
      .on('change', onChange)
  }

  // JS and Less tasks might not be defined.
  const deps = name => styleguide.buildDependencies.includes(name) ? [ name ] : [ ]

  styleguide.watch.js = () => {
    gulp.watch('styleguide/**/*.js', { cwd: styleguide.path.root() }, deps(styleguide.task.js()))
      .on('change', onChange)
  }

  styleguide.watch.less = () => {
    gulp.watch(['styleguide/**/*.less', 'sketch/**/*.less'], { cwd: styleguide.path.root() }, deps(styleguide.task.less()))
      .on('change', onChange)
  }

  styleguide.watch.sketch = () => {
    watch([`sketch/export/**/*.json`], { base: styleguide.path.root(), verbose: true, debounceTimeout: 1000 }, (file) => {
      if (file.event === `add` || file.event === `change`) {
        logger.info(`Running processExport()`)
        styleguide.sketch.processExport()
        logger.info(`Running Less task`)
      } else if (file.event === `error`) {
        logger.error(`Watch event for Sketch failed`)
        return
      }
    })
  }
}
