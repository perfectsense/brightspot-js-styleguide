/* eslint no-eval: 0 */
const _ = require('lodash')
const Chance = require('chance')
const path = require('path')
const traverse = require('traverse')

const placeholderImage = require('./placeholder-image')
const Util = require('./util')

function DataGenerator (styleguide, seed) {
  this.styleguide = styleguide
  this.chance = (seed) ? new Chance(seed) : new Chance()
}

DataGenerator.prototype.date = function (format) {
  var date

  if (format === 'unformatted') {
    date = this.chance.date()
  } else if (format === 'short') {
    date = this.chance.date({string: true})
  } else if (format === 'iso') {
    var iso = this.chance.date({string: true})
    iso = iso.split('/')
    date = iso[2] + '-' + iso[0] + '-' + iso[1]
  } else {
    // in the format (July 23, 2075)
    var dateString, dateArray
    dateString = this.chance.date()
    dateString = dateString.toString()
    dateString = dateString.substring(0, 15)
    dateString = dateString.split(' ')

    for (let i = 1; i < 4; ++i) {
      if (i === 1) {
        dateArray = Util.getfullMonth(dateString[i])
      } else if (i === 2) {
        dateArray += dateString[i] + ', '
      } else {
        dateArray += dateString[i] + ''
      }
    }
    date = dateArray
  }
  return date
}

DataGenerator.prototype.hexColor = function (luminosity) {
  var color, hex, rgb, hsl

  luminosity = this.number(luminosity)

  if (luminosity === 0 || luminosity) {
    hex = this.chance.color({format: 'hex'})
    rgb = Util.hex2rgb(hex)
    hsl = Util.rgb2hsl(rgb[0], rgb[1], rgb[2])
    rgb = Util.hsl2rgb(hsl[0], hsl[1], luminosity / 100)
    color = Util.rgb2hex('rgba(' + rgb[0] + ', ' + rgb[1] + ', ' + rgb[2] + ')')
  } else {
    color = this.chance.color({format: 'hex'})
  }
  return color
}

DataGenerator.prototype.image = function () {
  let width
  let height
  let url

  if (arguments.length < 3) {
    const first = arguments[0]

    if (typeof first === 'number') {
      width = first
      height = arguments[1]
    } else {
      const imageSize = this.styleguide.getImageSize(first)

      if (imageSize) {
        width = imageSize.width || imageSize.previewWidth
        height = imageSize.height || imageSize.previewHeight
      }

      url = arguments[2]
    }
  } else {
    width = arguments[0]
    height = arguments[1]
    url = arguments[2]
  }

  if (!width) {
    throw new Error('Image width can\'t be 0!')
  }

  if (!height) {
    throw new Error('Image height can\'t be 0!')
  }

  if (!url) {
    const key = this.chance.guid()
    width = this.number(width)
    height = this.number(height)

    url = '/placeholder-image/' + key + '/' + width + 'x' + height + '.svg'

    placeholderImage(key, width, height, path.join(this.styleguide.path.build(), url))
  }

  return url
}

DataGenerator.prototype.name = function () {
  return this.chance.name()
}

DataGenerator.prototype.number = function (number) {
  if (Array.isArray(number)) {
    var step = number[2]
    number = this.chance.integer({
      min: number[0],
      max: number[1]
    })

    if (step) {
      number = Math.round(number / step) * step
    }
  }

  return number
}

DataGenerator.prototype._repeat = function (count, separator, callback) {
  var items = [ ]

  for (count = this.number(count); count > 0; --count) {
    items.push(callback.call(this))
  }

  return items.join(separator)
}

function capitalize (string) {
  return string.length > 0 ? string.slice(0, 1).toUpperCase() + string.slice(1) : ''
}

DataGenerator.prototype.words = function (wordCount) {
  return capitalize(this._repeat(wordCount || [ 12, 18 ], ' ', function () {
    // when the wordcount is 1, only return a word.
    // otherwise, randomly choose between names or words (boosting words)
    return this.chance.bool({ likelihood: (wordCount === 1) ? 0 : 5 })
      ? this.chance.name()
      : this.chance.word()
  }))
}

DataGenerator.prototype.sentences = function (sentenceCount, wordCount) {
  return this._repeat(sentenceCount || [ 3, 7 ], ' ', function () {
    return capitalize(this.words(wordCount)) + '.'
  })
}

DataGenerator.prototype.paragraphs = function (paragraphCount, sentenceCount, wordCount) {
  return this._repeat(paragraphCount || [ 1, 3 ], '', function () {
    return '<p>' + this.sentences(sentenceCount, wordCount) + '</p>'
  })
}

// `var` takes the provided key and looks up the value as defined in the `vars` of your styleguide config (_config.json)
// If it is found, it returns the corresponding value otherwise it returns an Error object
DataGenerator.prototype.var = function (key) {
  return this.styleguide.var(key)
}

DataGenerator.prototype.process = function (data) {
  const self = this

  traverse(data).forEach(function (value) {
    const node = this

    // If there are any objects with _repeat entry in the list,
    // clone them.
    if (Array.isArray(value)) {
      const newArray = [ ]

      value.forEach(item => {
        let repeat = item._repeat

        if (repeat) {
          for (repeat = self.number(repeat); repeat > 0; --repeat) {
            newArray.push(_.clone(item, true))
          }
        } else {
          newArray.push(item)
        }
      })

      node.update(newArray)
    } else if (typeof value === 'string') {
      // Handlebars-like variable substitution.
      node.update(value.replace(/\{\{(.*?)}}/g, (match, invocation) => {
        if (invocation.indexOf('(') < 0) {
          if (invocation === 'image') {
            invocation += `('${self.styleguide.getImageSizeName(node)}')`
          } else {
            invocation += '()'
          }
        }

        try {
          const data = eval('self.' + invocation)
          if (data instanceof Error) {
            throw data
          } else {
            return data
          }
        } catch (err) {
          throw new Error('DataGenerator execution error! ' + '\n\n' + err.stack)
        }
      }))
    }
  })

  return data
}

module.exports = DataGenerator
