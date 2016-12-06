const path = require('path')
const expect = require('chai').expect
const assert = require('chai').assert
const ExampleFile = require('../js/example-file')

describe('Path Resolution', () => {
  const basePath = path.join(__dirname, 'mockProject')

  describe('called without `basePath`', () => {
    it('should return null', () => {
      assert.typeOf(ExampleFile.resolvePath(null, ''), 'null', 'it is null')
    })
  })

  describe('called without `filePath`', () => {
    it('should return null', () => {
      assert.typeOf(ExampleFile.resolvePath('', null), 'null', 'it is null')
    })
  })

  describe(`filePath and/or basePath argument are non-existent paths`, () => {
    let filePath = '/node_modules/fooProject/styleguide/foo/Foo.hbs'

    it('should throw an Error', () => {
      expect(() => { ExampleFile.resolvePath('asdfghjkl', filePath) }).to.throw()
      expect(() => { ExampleFile.resolvePath('./mockProject/styleguide/testArticle', 'asdfghjkl') }).to.throw()
    })
  })

  describe(`filePath starts with '/node_modules'`, () => {
    let filePath = '/node_modules/fooProject/styleguide/foo/Foo.hbs'
    let resolvedPath = path.join(basePath, 'node_modules/fooProject/styleguide/foo/Foo.hbs')

    it('should return a real path', () => {
      assert.strictEqual(ExampleFile.resolvePath(basePath, filePath), resolvedPath, 'it is equal')
    })
  })

  describe(`filePath is absolute and exists`, () => {
    let filePath = path.join(__dirname, '/mockProject/styleguide/Article.json')

    it('should return the filePath', () => {
      assert.strictEqual(ExampleFile.resolvePath(basePath, filePath), filePath, 'it is absolute')
    })
  })

  describe(`filePath starts with /styleguide`, () => {
    let filePath = '/styleguide/Article.json'
    let subPath = 'mockProject/node_modules/fooProject/styleguide'
    let parentPath = path.join(__dirname, subPath)
    let resolvedPath = path.join(parentPath, 'Article.json')

    it('should return the filePath', () => {
      assert.strictEqual(ExampleFile.resolvePath(basePath, filePath), path.join(basePath, filePath), 'it matches')
    })

    it('should return a filePath from within node_modules when parentPath is provided', () => {
      assert.strictEqual(ExampleFile.resolvePath(basePath, filePath, null, parentPath), resolvedPath, 'it matches')
    })
  })

  describe(`filePath is relative`, () => {
    let filePath = 'Bar.json'
    let reqPath = path.join(basePath, 'styleguide/bar/Bar.json')

    it('should return the relatively resolved filePath', () => {
      assert.strictEqual(ExampleFile.resolvePath(basePath, filePath, reqPath), reqPath, 'it matches')
    })
  })

  describe(`filePath is relative to a parentPath`, () => {
    let filePath = '../Article.json'
    let subPath = 'styleguide/bar'
    let parentPath = path.join(basePath, subPath)
    let resolvedPath = path.join(parentPath, '../Article.json')

    it('should return the relatively resolved filePath', () => {
      assert.strictEqual(ExampleFile.resolvePath(basePath, filePath, null, parentPath), resolvedPath, 'it matches')
    })
  })
})
