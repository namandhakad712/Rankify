/**
 * Browser Compatibility Checker and Polyfill Loader
 * Ensures compatibility with Chrome, Firefox, and Edge browsers
 */

export class BrowserCompatibility {
  constructor() {
    this.supportedBrowsers = {
      chrome: { min: 80, name: 'Chrome' },
      firefox: { min: 75, name: 'Firefox' },
      safari: { min: 13, name: 'Safari' },
      edge: { min: 80, name: 'Edge' }
    }
    
    this.requiredFeatures = {
      // Core JavaScript features
      'ES6 Classes': () => this.checkES6Classes(),
      'Arrow Functions': () => this.checkArrowFunctions(),
      'Template Literals': () => this.checkTemplateLiterals(),
      'Destructuring': () => this.checkDestructuring(),
      'Async/Await': () => this.checkAsyncAwait(),
      'Promises': () => 'Promise' in window,
      'Map/Set': () => 'Map' in window && 'Set' in window,
      
      // Web APIs
      'Fetch API': () => 'fetch' in window,
      'IndexedDB': () => 'indexedDB' in window,
      'Web Workers': () => 'Worker' in window,
      'File API': () => 'File' in window && 'FileReader' in window && 'Blob' in window,
      'Canvas API': () => this.checkCanvasSupport(),
      'WebGL': () => this.checkWebGLSupport(),
      
      // Storage APIs
      'Local Storage': () => 'localStorage' in window,
      'Session Storage': () => 'sessionStorage' in window,
      'Cache API': () => 'caches' in window,
      
      // Modern APIs
      'Intersection Observer': () => 'IntersectionObserver' in window,
      'Performance Observer': () => 'PerformanceObserver' in window,
      'Resize Observer': () => 'ResizeObserver' in window,
      'Mutation Observer': () => 'MutationObserver' in window,
      
      // CSS Features
      'CSS Grid': () => this.checkCSSGrid(),
      'CSS Flexbox': () => this.checkCSSFlexbox(),
      'CSS Custom Properties': () => this.checkCSSCustomProperties(),
      
      // PDF and Image processing
      'ArrayBuffer': () => 'ArrayBuffer' in window,
      'Uint8Array': () => 'Uint8Array' in window,
      'URL.createObjectURL': () => 'URL' in window && 'createObjectURL' in URL,
      'FileReader': () => 'FileReader' in window
    }
    
    this.polyfills = {
      'Fetch API': 'https://cdn.jsdelivr.net/npm/whatwg-fetch@3.6.2/dist/fetch.umd.js',
      'Promises': 'https://cdn.jsdelivr.net/npm/es6-promise@4.2.8/dist/es6-promise.auto.min.js',
      'IndexedDB': 'https://cdn.jsdelivr.net/npm/fake-indexeddb@4.0.2/lib/fdb-core.js',
      'Intersection Observer': 'https://cdn.jsdelivr.net/npm/intersection-observer@0.12.0/intersection-observer.js',
      'Resize Observer': 'https://cdn.jsdelivr.net/npm/resize-observer-polyfill@1.5.1/dist/ResizeObserver.js',
      'Web Workers': null, // Cannot be polyfilled
      'WebGL': null, // Cannot be polyfilled
      'CSS Grid': null, // CSS feature, handled differently
      'CSS Flexbox': null // CSS feature, handled differently
    }
    
    this.loadedPolyfills = new Set()
    this.compatibilityReport = null
  }

  /**
   * Check overall browser compatibility
   */
  async checkCompatibility() {
    const browserInfo = this.detectBrowser()
    const featureSupport = this.checkFeatureSupport()
    const cssSupport = this.checkCSSSupport()
    
    const report = {
      timestamp: Date.now(),
      browser: browserInfo,
      features: featureSupport,
      css: cssSupport,
      overall: {
        isSupported: true,
        issues: [],
        warnings: [],
        recommendations: []
      }
    }
    
    // Check browser version compatibility
    if (!this.isBrowserSupported(browserInfo)) {
      report.overall.isSupported = false
      report.overall.issues.push(
        `${browserInfo.name} ${browserInfo.version} is below minimum supported version ${this.supportedBrowsers[browserInfo.key]?.min || 'unknown'}`
      )
    }
    
    // Check feature support
    const unsupportedFeatures = Object.entries(featureSupport)
      .filter(([, supported]) => !supported)
      .map(([feature]) => feature)
    
    if (unsupportedFeatures.length > 0) {
      const criticalFeatures = ['Fetch API', 'Promises', 'IndexedDB', 'File API', 'ArrayBuffer']
      const criticalUnsupported = unsupportedFeatures.filter(f => criticalFeatures.includes(f))
      
      if (criticalUnsupported.length > 0) {
        report.overall.isSupported = false
        report.overall.issues.push(`Critical features not supported: ${criticalUnsupported.join(', ')}`)
      } else {
        report.overall.warnings.push(`Some features not supported: ${unsupportedFeatures.join(', ')}`)
      }
    }
    
    // Check CSS support
    const unsupportedCSS = Object.entries(cssSupport)
      .filter(([, supported]) => !supported)
      .map(([feature]) => feature)
    
    if (unsupportedCSS.length > 0) {
      report.overall.warnings.push(`CSS features not supported: ${unsupportedCSS.join(', ')}`)
      report.overall.recommendations.push('Some layout features may not work correctly')
    }
    
    this.compatibilityReport = report
    return report
  }

  /**
   * Detect browser information
   */
  detectBrowser() {
    const userAgent = navigator.userAgent
    let browser = { name: 'Unknown', version: 0, key: 'unknown' }
    
    // Chrome (must check before Safari since Chrome includes Safari in UA)
    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
      const match = userAgent.match(/Chrome\/(\d+)/)
      browser = {
        name: 'Chrome',
        version: match ? parseInt(match[1]) : 0,
        key: 'chrome'
      }
    }
    // Edge (Chromium-based)
    else if (userAgent.includes('Edg')) {
      const match = userAgent.match(/Edg\/(\d+)/)
      browser = {
        name: 'Edge',
        version: match ? parseInt(match[1]) : 0,
        key: 'edge'
      }
    }
    // Firefox
    else if (userAgent.includes('Firefox')) {
      const match = userAgent.match(/Firefox\/(\d+)/)
      browser = {
        name: 'Firefox',
        version: match ? parseInt(match[1]) : 0,
        key: 'firefox'
      }
    }
    // Safari
    else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      const match = userAgent.match(/Version\/(\d+)/)
      browser = {
        name: 'Safari',
        version: match ? parseInt(match[1]) : 0,
        key: 'safari'
      }
    }
    
    return browser
  }

  /**
   * Check if browser is supported
   */
  isBrowserSupported(browserInfo) {
    const supportInfo = this.supportedBrowsers[browserInfo.key]
    if (!supportInfo) {
      return false // Unknown browser
    }
    
    return browserInfo.version >= supportInfo.min
  }

  /**
   * Check feature support
   */
  checkFeatureSupport() {
    const support = {}
    
    Object.entries(this.requiredFeatures).forEach(([feature, checkFn]) => {
      try {
        support[feature] = checkFn()
      } catch (error) {
        support[feature] = false
        console.warn(`Error checking feature ${feature}:`, error)
      }
    })
    
    return support
  }

  /**
   * Check CSS support
   */
  checkCSSSupport() {
    return {
      'CSS Grid': this.checkCSSGrid(),
      'CSS Flexbox': this.checkCSSFlexbox(),
      'CSS Custom Properties': this.checkCSSCustomProperties(),
      'CSS Transforms': this.checkCSSTransforms(),
      'CSS Animations': this.checkCSSAnimations()
    }
  }

  /**
   * Feature check methods
   */
  checkES6Classes() {
    try {
      eval('class TestClass {}')
      return true
    } catch (error) {
      return false
    }
  }

  checkArrowFunctions() {
    try {
      eval('() => {}')
      return true
    } catch (error) {
      return false
    }
  }

  checkTemplateLiterals() {
    try {
      eval('`template`')
      return true
    } catch (error) {
      return false
    }
  }

  checkDestructuring() {
    try {
      eval('const {a} = {a: 1}')
      return true
    } catch (error) {
      return false
    }
  }

  checkAsyncAwait() {
    try {
      eval('async function test() { await Promise.resolve() }')
      return true
    } catch (error) {
      return false
    }
  }

  checkCanvasSupport() {
    try {
      const canvas = document.createElement('canvas')
      return !!(canvas.getContext && canvas.getContext('2d'))
    } catch (error) {
      return false
    }
  }

  checkWebGLSupport() {
    try {
      const canvas = document.createElement('canvas')
      return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    } catch (error) {
      return false
    }
  }

  checkCSSGrid() {
    return CSS.supports('display', 'grid')
  }

  checkCSSFlexbox() {
    return CSS.supports('display', 'flex')
  }

  checkCSSCustomProperties() {
    return CSS.supports('--custom-property', 'value')
  }

  checkCSSTransforms() {
    return CSS.supports('transform', 'translateX(1px)')
  }

  checkCSSAnimations() {
    return CSS.supports('animation', 'test 1s')
  }

  /**
   * Load polyfills for unsupported features
   */
  async loadPolyfills(features = null) {
    if (!this.compatibilityReport) {
      await this.checkCompatibility()
    }
    
    const unsupportedFeatures = features || Object.entries(this.compatibilityReport.features)
      .filter(([, supported]) => !supported)
      .map(([feature]) => feature)
    
    const polyfillsToLoad = []
    
    unsupportedFeatures.forEach(feature => {
      const polyfillUrl = this.polyfills[feature]
      if (polyfillUrl && !this.loadedPolyfills.has(feature)) {
        polyfillsToLoad.push({ feature, url: polyfillUrl })
      }
    })
    
    if (polyfillsToLoad.length === 0) {
      console.log('No polyfills needed')
      return { loaded: [], failed: [] }
    }
    
    console.log(`Loading ${polyfillsToLoad.length} polyfills...`)
    
    const results = await Promise.allSettled(
      polyfillsToLoad.map(({ feature, url }) => this.loadPolyfill(feature, url))
    )
    
    const loaded = []
    const failed = []
    
    results.forEach((result, index) => {
      const { feature } = polyfillsToLoad[index]
      if (result.status === 'fulfilled') {
        loaded.push(feature)
        this.loadedPolyfills.add(feature)
      } else {
        failed.push({ feature, error: result.reason })
      }
    })
    
    console.log(`Polyfills loaded: ${loaded.length}, failed: ${failed.length}`)
    
    return { loaded, failed }
  }

  /**
   * Load individual polyfill
   */
  loadPolyfill(feature, url) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = url
      script.async = true
      
      script.onload = () => {
        console.log(`Polyfill loaded: ${feature}`)
        resolve(feature)
      }
      
      script.onerror = () => {
        console.error(`Failed to load polyfill: ${feature}`)
        reject(new Error(`Failed to load polyfill for ${feature}`))
      }
      
      document.head.appendChild(script)
    })
  }

  /**
   * Apply CSS fallbacks
   */
  applyCSSFallbacks() {
    const style = document.createElement('style')
    let css = ''
    
    // CSS Grid fallback
    if (!this.checkCSSGrid()) {
      css += `
        .grid-fallback {
          display: flex;
          flex-wrap: wrap;
        }
        .grid-fallback > * {
          flex: 1 1 auto;
        }
      `
    }
    
    // CSS Flexbox fallback
    if (!this.checkCSSFlexbox()) {
      css += `
        .flex-fallback {
          display: block;
        }
        .flex-fallback::after {
          content: "";
          display: table;
          clear: both;
        }
        .flex-fallback > * {
          float: left;
        }
      `
    }
    
    // CSS Custom Properties fallback
    if (!this.checkCSSCustomProperties()) {
      css += `
        :root {
          /* Fallback values for custom properties */
        }
      `
    }
    
    if (css) {
      style.textContent = css
      document.head.appendChild(style)
      console.log('Applied CSS fallbacks')
    }
  }

  /**
   * Show compatibility warning to user
   */
  showCompatibilityWarning(report) {
    if (report.overall.isSupported && report.overall.warnings.length === 0) {
      return // No warning needed
    }
    
    const warningDiv = document.createElement('div')
    warningDiv.id = 'browser-compatibility-warning'
    warningDiv.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #f59e0b;
      color: white;
      padding: 12px;
      text-align: center;
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.4;
    `
    
    let message = ''
    
    if (!report.overall.isSupported) {
      message = `⚠️ Your browser (${report.browser.name} ${report.browser.version}) may not be fully compatible with this application. `
      if (report.overall.issues.length > 0) {
        message += `Issues: ${report.overall.issues.join(', ')}. `
      }
      message += 'Please consider updating to a newer version or using Chrome, Firefox, or Edge.'
    } else if (report.overall.warnings.length > 0) {
      message = `⚠️ Some features may not work optimally in your browser. ${report.overall.warnings.join(' ')}`
    }
    
    warningDiv.innerHTML = `
      <div style="max-width: 1200px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between;">
        <span>${message}</span>
        <button onclick="this.parentElement.parentElement.remove()" style="
          background: rgba(255,255,255,0.2);
          border: none;
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          cursor: pointer;
          margin-left: 12px;
        ">×</button>
      </div>
    `
    
    document.body.insertBefore(warningDiv, document.body.firstChild)
    
    // Auto-hide after 10 seconds for warnings (not for critical issues)
    if (report.overall.isSupported) {
      setTimeout(() => {
        if (warningDiv.parentElement) {
          warningDiv.remove()
        }
      }, 10000)
    }
  }

  /**
   * Initialize browser compatibility checking
   */
  async initialize(options = {}) {
    const {
      loadPolyfills = true,
      applyCSSFallbacks = true,
      showWarning = true,
      autoLoad = true
    } = options
    
    console.log('Checking browser compatibility...')
    
    const report = await this.checkCompatibility()
    
    if (showWarning) {
      this.showCompatibilityWarning(report)
    }
    
    if (loadPolyfills && autoLoad) {
      await this.loadPolyfills()
    }
    
    if (applyCSSFallbacks) {
      this.applyCSSFallbacks()
    }
    
    console.log('Browser compatibility check complete:', {
      browser: `${report.browser.name} ${report.browser.version}`,
      supported: report.overall.isSupported,
      issues: report.overall.issues.length,
      warnings: report.overall.warnings.length
    })
    
    return report
  }

  /**
   * Get compatibility report
   */
  getCompatibilityReport() {
    return this.compatibilityReport
  }

  /**
   * Check if specific feature is supported
   */
  isFeatureSupported(feature) {
    if (!this.compatibilityReport) {
      console.warn('Compatibility check not run yet')
      return null
    }
    
    return this.compatibilityReport.features[feature] || false
  }

  /**
   * Get browser recommendations
   */
  getBrowserRecommendations() {
    const recommendations = []
    
    if (!this.compatibilityReport) {
      return recommendations
    }
    
    const { browser } = this.compatibilityReport
    
    if (!this.isBrowserSupported(browser)) {
      recommendations.push({
        type: 'update',
        message: `Update ${browser.name} to version ${this.supportedBrowsers[browser.key]?.min || 'latest'} or higher`,
        priority: 'high'
      })
    }
    
    if (browser.key === 'unknown') {
      recommendations.push({
        type: 'switch',
        message: 'Switch to a supported browser: Chrome 80+, Firefox 75+, or Edge 80+',
        priority: 'high'
      })
    }
    
    const unsupportedCritical = Object.entries(this.compatibilityReport.features)
      .filter(([feature, supported]) => !supported && ['Fetch API', 'Promises', 'IndexedDB'].includes(feature))
    
    if (unsupportedCritical.length > 0) {
      recommendations.push({
        type: 'polyfill',
        message: 'Some critical features are missing and may require polyfills',
        priority: 'medium'
      })
    }
    
    return recommendations
  }
}

// Create singleton instance
let browserCompatibilityInstance = null

/**
 * Get browser compatibility singleton
 */
export function getBrowserCompatibility() {
  if (!browserCompatibilityInstance) {
    browserCompatibilityInstance = new BrowserCompatibility()
  }
  return browserCompatibilityInstance
}

/**
 * Initialize browser compatibility checking
 */
export async function initializeBrowserCompatibility(options = {}) {
  const compatibility = getBrowserCompatibility()
  return await compatibility.initialize(options)
}

/**
 * Check if browser is compatible
 */
export async function checkBrowserCompatibility() {
  const compatibility = getBrowserCompatibility()
  return await compatibility.checkCompatibility()
}

/**
 * Load polyfills for unsupported features
 */
export async function loadPolyfills(features = null) {
  const compatibility = getBrowserCompatibility()
  return await compatibility.loadPolyfills(features)
}

/**
 * Check if specific feature is supported
 */
export function isFeatureSupported(feature) {
  const compatibility = getBrowserCompatibility()
  return compatibility.isFeatureSupported(feature)
}