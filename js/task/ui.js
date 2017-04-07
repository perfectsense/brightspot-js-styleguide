const Builder = require('systemjs-builder')
const del = require('del')
const filter = require('gulp-filter')
const fs = require('fs-extra')
const glob = require('glob')
const gutil = require('gulp-util')
const handlebars = require('handlebars')
const less = require('gulp-less')
const path = require('path')
const plugins = require('gulp-load-plugins')()
const through = require('through2')
const traverse = require('traverse')
const zip = require('gulp-zip')

const example = require('../example')
const label = require('../label')
const logger = require('../logger')
const resolver = require('../resolver')

module.exports = (styleguide, gulp) => {
  styleguide.task.ui = () => 'styleguide:ui'

  const buildDir = styleguide.path.build()
  const parentDir = styleguide.path.parent()
  const rootDir = styleguide.path.root()

  function getProjectRootPath () {
    return path.join(buildDir, 'node_modules', styleguide.project.name())
  }

  styleguide.ui = {

    // Copy all files related to producing example HTML.
    copy: done => {
      // Pretend that the project is a package.
      const packageFile = path.join(rootDir, 'package.json')
      const projectRootPath = getProjectRootPath()

      fs.mkdirsSync(projectRootPath)

      if (fs.existsSync(packageFile)) {
        fs.copySync(packageFile, path.join(projectRootPath, 'package.json'))
      } else {
        fs.writeFileSync(path.join(projectRootPath, 'package.json'), JSON.stringify({
          name: styleguide.project.name(),
          version: styleguide.project.version(),
          private: true
        }))
      }

      gulp.src([ 'styleguide/**/*.{hbs,json,md}' ], { cwd: rootDir, base: rootDir })
        .pipe(gulp.dest(projectRootPath))
        .on('end', () => {
          // Automatically create all files related to styled templates.
          const configPath = path.join(projectRootPath, 'styleguide/_config.json')
          const styledTemplates = { }
          const styles = styleguide.styles()

          if (styles) {
            Object.keys(styles).forEach(styledTemplate => {
              const style = styles[styledTemplate]
              const templates = style.templates

              // Create styled example JSON files.
              if (templates && templates.length > 0) {
                templates.forEach(template => {
                  const example = template.example || style.example
                  const examplePath = resolver.path(rootDir, configPath, example)
                  const exampleJson = JSON.parse(fs.readFileSync(examplePath, 'utf8'))

                  traverse(exampleJson).forEach(function (value) {
                    if (!value) {
                      return
                    }

                    if (this.key === '_template' &&
                      resolver.path(rootDir, examplePath, value) === resolver.path(rootDir, examplePath, styledTemplate)) {
                      this.update(template.template)
                    } else if ((this.key === '_template' ||
                      this.key === '_wrapper' ||
                      this.key === '_include' ||
                      this.key === '_dataUrl') &&
                      !value.startsWith('/')) {
                      this.update(path.resolve(path.dirname(example), value))
                    }
                  })

                  const styledExamplePath = gutil.replaceExtension(resolver.path(rootDir, configPath, template.template), '.json')

                  fs.mkdirsSync(path.dirname(styledExamplePath))
                  fs.writeFileSync(styledExamplePath, JSON.stringify(exampleJson, null, '\t'))
                })

                // Create the template that delegates to the styled ones.
                styledTemplates[styledTemplate] = ''

                const appendStyledTemplate = function (template) {
                  const templatePath = resolver.path(rootDir, configPath, template.template)

                  styledTemplates[styledTemplate] += `{{#withParentPath '${path.relative(buildDir, templatePath)}'}}`
                  styledTemplates[styledTemplate] += fs.readFileSync(templatePath, 'utf8')
                  styledTemplates[styledTemplate] += '{{/withParentPath}}'
                }

                for (let i = templates.length - 1; i > 0; --i) {
                  const template = templates[i]
                  const internalName = template.internalName || template.template

                  styledTemplates[styledTemplate] += `{{#styledTemplate '${internalName}'}}`
                  appendStyledTemplate(template)
                  styledTemplates[styledTemplate] += '{{else}}'
                }

                appendStyledTemplate(templates[0])

                for (let i = templates.length - 1; i > 0; --i) {
                  styledTemplates[styledTemplate] += '{{/styledTemplate}}'
                }
              }
            })
          }

          // Don't copy package.json from modules without the styleguide.
          const onlyStyleguidePackages = filter(file => {
            const filePath = file.path

            return path.basename(filePath) !== 'package.json' ||
              fs.existsSync(path.join(path.dirname(filePath), 'styleguide'))
          })

          const packageFiles = [
            path.join(rootDir, 'node_modules/*/package.json'),
            path.join(rootDir, 'node_modules/*/styleguide/**/*.{hbs,json}')
          ]

          gulp.src(packageFiles, { base: '.' })
            .pipe(onlyStyleguidePackages)
            .pipe(gulp.dest(buildDir))

            // Copy all files related to theming.
            .on('end', () => {
              glob.sync(path.join(projectRootPath, 'styleguide/**/_theme.json'), { absolute: true }).forEach(themeFile => {
                const theme = JSON.parse(fs.readFileSync(themeFile, 'utf8'))
                const rawSource = theme.source

                // Make sure source exists and is resolved.
                if (!rawSource) return

                const source = path.join(buildDir, rawSource)
                const themeDir = path.dirname(themeFile)
                const report = {
                  overrides: [ ],
                  errors: [ ]
                }

                // Find all templates within the theme directory.
                glob.sync('**/*.hbs', { cwd: themeDir }).forEach(overridePath => {
                  const sourcePath = path.join(source, overridePath)

                  if (fs.existsSync(sourcePath)) {
                    report.overrides.push({
                      overridePath: path.join(themeDir, overridePath),
                      sourcePath: sourcePath,
                      sourceCopy: path.resolve(path.dirname(sourcePath), '_Source' + path.basename(sourcePath))
                    })
                  } else {
                    report.errors.push({
                      message: `Can't theme [${overridePath}] because it doesn't exist in source at [${sourcePath}]!`
                    })
                  }
                })

                // Move the theme templates to the source.
                if (report.overrides.length > 0) {
                  report.overrides.forEach(override => {
                    fs.move(override.sourcePath, override.sourceCopy, { clobber: true }, error => {
                      if (error) {
                        throw error
                      }

                      fs.move(override.overridePath, override.sourcePath, { clobber: true }, error => {
                        if (error) {
                          throw error
                        }
                      })
                    })
                  })
                }

                // Throw any errors that were detected.
                if (report.errors.length > 0) {
                  throw new Error(report.errors.map(error => `\n${error.message}\n`))
                }

                // Copy all example JSON files into the theme directory.
                glob.sync('**/*.json', { cwd: source }).forEach(examplePath => {
                  if (path.basename(examplePath) !== 'package.json') {
                    const exampleJson = JSON.parse(fs.readFileSync(path.join(source, examplePath), 'utf8'))
                    exampleJson._hidden = theme.hidden

                    traverse(exampleJson).forEach(function (value) {
                      if (!value) {
                        return
                      }

                      if (this.key === '_template' ||
                        this.key === '_wrapper' ||
                        this.key === '_include' ||
                        this.key === '_dataUrl') {
                        if (!value.startsWith('/')) {
                          value = path.resolve(path.dirname(path.resolve(rawSource, examplePath)), value)
                        }

                        if (value.startsWith('/styleguide/')) {
                          value = path.join(rawSource, path.relative('/styleguide/', value))
                        }

                        this.update(value)
                      }

                      const themeExamplePath = path.join(themeDir, examplePath)

                      fs.mkdirsSync(path.dirname(themeExamplePath))
                      fs.writeFileSync(themeExamplePath, JSON.stringify(exampleJson, null, '\t'))
                    })
                  }
                })
              })

              // Override styled templates.
              Object.keys(styledTemplates).forEach(styledTemplate => {
                const styledTemplatePath = path.join(buildDir, styledTemplate)

                fs.mkdirsSync(path.dirname(styledTemplatePath))
                fs.writeFileSync(styledTemplatePath,
                  '{{#styled}}' +
                  styledTemplates[styledTemplate] +
                  '{{else}}' +
                  fs.readFileSync(styledTemplatePath, 'utf8') +
                  '{{/styled}}')
              })

              done()
            })
        })
    },

    // Copy fonts used by the styleguide UI itself.
    fonts: () => {
      return gulp.src(path.join(path.dirname(require.resolve('font-awesome/package.json')), 'fonts', '*'))
        .pipe(gulp.dest(path.join(buildDir, '_styleguide')))
    },

    // Convert example JSON files to HTML.
    html: done => {
      const displayNames = styleguide.displayNames()

      function jsonToHtml (file, encoding, callback) {
        const filePath = file.path
        const fileName = path.basename(filePath)

        if (fileName !== 'package.json' && fileName.slice(0, 1) !== '_') {
          try {
            const processedExample = example(styleguide, filePath)

            if (processedExample) {
              displayNames[filePath] = processedExample.displayName
              file.base = buildDir
              file.contents = Buffer.from(processedExample.html)
              file.path = gutil.replaceExtension(filePath, '.html')
              this.push(file)
            }
          } catch (err) {
            logger.error(`${err.message} at [${filePath}]!`)
            if (!styleguide.isWatching()) {
              process.exit(1)
            }
          }
        }

        callback()
      }

      // Build the index HTML that serves as the entry to the styleguide UI
      // after all the example HTML files are produced.
      const projectRootPath = getProjectRootPath()

      gulp.src(path.join(projectRootPath, 'styleguide/**/*.json'))
        .pipe(through.obj(jsonToHtml))
        .pipe(gulp.dest(buildDir))
        .on('end', () => {
          // Group example HTML files by their path.
          const groupByName = { }

          glob.sync('**/*.html', { cwd: buildDir }).forEach(match => {
            const displayNamePath = path.join(buildDir, gutil.replaceExtension(match, '.json'))
            const groupName = displayNames[path.dirname(displayNamePath)] || path.dirname(path.relative(path.join(projectRootPath, 'styleguide'), path.join(buildDir, match))).split('/').map(label).join(': ')
            let group = groupByName[groupName]
            let item = {}
            item.name = displayNames[displayNamePath] || label(path.basename(match, '.html'))
            item.url = '/' + gutil.replaceExtension(match, '.html')
            item.source = {'html': 'Example', 'json': 'JSON'}

            if (!group) {
              group = groupByName[groupName] = {
                name: groupName,
                examples: [ ]
              }
            }

            if (fs.existsSync(gutil.replaceExtension(path.join(buildDir, match), '.md'))) {
              item.source = Object.assign(item.source, {'md': 'Documentation'})
            }

            group.examples.push(item)
          })

          // Sort the grouping so that the display is alphabetical.
          const groups = [ ]

          Object.keys(groupByName).sort().forEach((groupName) => {
            groups.push(groupByName[groupName])
          })

          // Create the index HTML file.
          const template = handlebars.compile(fs.readFileSync(path.join(__dirname, '../', 'index.hbs'), 'utf8'), {
            preventIndent: true
          })

          fs.mkdirsSync(path.join(buildDir, '_styleguide'))
          fs.writeFileSync(path.join(buildDir, '_styleguide/index.html'), template({
            groups: groups
          }))

          // Create a project pointer for BE.
          fs.writeFileSync(
            path.join(buildDir, '_name'),
            styleguide.project.name())

          // Remove all unnecessary files.
          const packageDir = path.join(buildDir, 'node_modules/*')

          del.sync([
            path.join(packageDir, '**/_theme.json')
          ])

          done()
        })
    },

    zip: done => {
      const name = `${styleguide.project.name()}-${styleguide.project.version()}.zip`

      return gulp.src([ '**', `!${name}` ], { cwd: buildDir })
        .pipe(zip(name))
        .pipe(gulp.dest(styleguide.path.zip()))
        .on('end', done)
    },

    // Convert LESS files into CSS to be used by the styleguide UI itself.
    less: () => {
      return gulp.src(path.join(__dirname, '../', 'index.less'))
        .pipe(less({ paths: [ parentDir ] }))
        .pipe(gulp.dest(path.join(buildDir, '_styleguide')))
    },

    // JavaScript transpilation to be used by the styleguide UI itself.
    js: done => {
      let builder = new Builder()
      const indexPath = require.resolve('../index')

      builder.config({
        defaultJSExtensions: true,
        baseURL: path.dirname(indexPath),
        paths: {
          'bliss': require.resolve('blissfuljs/bliss.min.js'),
          'prism': require.resolve('prismjs/prism.js'),
          'prism-json': require.resolve('prismjs/components/prism-json.min.js'),
          'prism-markdown': require.resolve('prismjs/components/prism-markdown.min.js')
        }
      })

      let buildOptions = {
        minify: false
      }

      builder.buildStatic(indexPath, buildOptions).then(output => {
        gulp.src([ ])
          .pipe(plugins.file('index.js', output.source))
          .pipe(gulp.dest(path.join(buildDir, '_styleguide')))
          .on('end', done)
      })
    }

  }

  // Pretend that the parent is a package.
  if (parentDir !== rootDir) {
    const parentPackageFile = path.join(parentDir, 'package.json')

    if (fs.existsSync(parentPackageFile)) {
      const oldCopy = styleguide.ui.copy

      styleguide.ui.copy = done => {
        const parentFiles = [
          'package.json',
          'styleguide/**/*.{hbs,json,md}'
        ]

        gulp.src(parentFiles, { cwd: parentDir, base: parentDir })
          .pipe(gulp.dest(path.join(buildDir, 'node_modules', JSON.parse(fs.readFileSync(parentPackageFile, 'utf8')).name)))
          .on('end', () => {
            oldCopy(done)
          })
      }
    }
  }

  gulp.task(styleguide.task.ui(), [ styleguide.task.clean() ], done => {
    styleguide.ui.copy(() => {
      styleguide.ui.html(() => {
        styleguide.ui.fonts().on('end', () => {
          styleguide.ui.js(() => {
            styleguide.ui.less().on('end', () => {
              if (!styleguide.isWatching()) {
                styleguide.ui.zip(done)
              } else {
                done()
              }
            })
          })
        })
      })
    })
  })
}
