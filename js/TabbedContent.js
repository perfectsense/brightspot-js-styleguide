/* eslint-disable no-unused-vars */
import Bliss from 'bliss'
import Prism from 'prism'
import PrismJson from 'prism-json'
import PrismMarkdown from 'prism-markdown'

export class TabbedContent {
  get selectors () {
    return this.settings.selectors
  }

  get dataType () {
    return this._dataType
  }

  set dataType (data) {
    this._dataType = data
  }

  constructor (ctx, options = {}) {
    this.ctx = ctx
    this.settings = Object.assign({}, {
      selectors: {
        tabList: '.StyleguideTabs',
        languageClass: 'language-',
        iframeContent: 'StyleguideExample'
      },
      prismHighlight: ['json', 'markdown']
    }, options)
  }

  init () {
    let self = this
    // Event listener for the tabs
    $('.StyleguideTabs').addEventListener('Styleguide:tabsInit', function (e) {
      let hashTab = window.location.hash
      if (hashTab !== '') {
        this.querySelector('[name=' + hashTab.replace('#', '') + ']').click()
      } else {
        this.querySelector('a').click()
      }
    })

    // event listener for iframed content; uses Prism plugin to highlight elements
    $(`.${this.selectors.iframeContent}`).addEventListener('load', function (event) {
      if (self.settings.prismHighlight.indexOf(self.dataType) > 0) {
        var prismElement = this.contentWindow.document.querySelector('pre')
        prismElement.className = self.selectors.languageClass + self.dataType
        Prism.highlightElement(prismElement)
        let cssAppend = $.clone($('link[href="/_styleguide/index.css"]'))
        this.contentWindow.document.head.append(cssAppend)
      }
    })
  }

  initTabs (element) {
    this.createTabs(element)
    // set an event for tabs init
    let tabCreationEvent = document.createEvent('Event')
    tabCreationEvent.initEvent('Styleguide:tabsInit', false, true)
    $(this.selectors.tabList).dispatchEvent(tabCreationEvent)
  }

  createTabs (element) {
    let dataSources = JSON.parse(element.getAttribute('data-source'))
    let baseURL = element.getAttribute('href').split('.html')
    let tabList = $(this.selectors.tabList)
    let self = this
    // unbind old tabs
    tabList.querySelectorAll('li').forEach((element) => {
      element._.unbind('click')
    })
    // remove old tabs
    while (tabList.lastChild) {
      tabList.removeChild(tabList.lastChild)
    }
    // loop through json object to generate tabs
    for (var key in dataSources) {
      if (dataSources.hasOwnProperty(key)) {
        let iframeSrc = baseURL[0] + '.' + key
        let index = Object.keys(dataSources).indexOf(key)
        let tabItem = $.create('li',
          {
            delegate: {
              click: {
                a: function () {
                  let tabsList = this.parentNode
                  // remove active indicator from all tabs
                  tabsList.querySelectorAll('li').forEach((element) => {
                    element.removeAttribute('data-active')
                  })
                  // set active indicator to active tabs
                  this.setAttribute('data-active', '')
                  self.dataType = this.querySelector('a').name
                  history.replaceState({}, this.getAttribute('title'), '#' + self.dataType)
                }
              }
            },
            contents: {
              tag: 'a', href: iframeSrc, textContent: dataSources[key], target: 'StyleguideExample', name: dataSources[key].toLowerCase()
            }
          })
        if (index === 0) {
          tabItem.setAttribute('data-active', '')
        }
        $(this.selectors.tabList)._.contents(tabItem)
      }
    }
  }

}
