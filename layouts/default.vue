<template>
  <AccessibilityProvider>
    <div class="app-layout">
      <!-- Navigation Header -->
      <header class="app-header" role="banner">
        <nav class="navbar" role="navigation" aria-label="Main navigation">
          <div class="container">
            <div class="navbar-content">
              <!-- Logo -->
              <NuxtLink to="/" class="navbar-brand">
                <div class="logo">
                  <span class="logo-icon">🎯</span>
                  <span class="logo-text">DiagramAI</span>
                </div>
              </NuxtLink>

              <!-- Desktop Navigation -->
              <div class="navbar-nav desktop-nav">
                <NuxtLink to="/" class="nav-link">Home</NuxtLink>
                <NuxtLink to="/upload" class="nav-link">Upload PDF</NuxtLink>
                <NuxtLink to="/demo" class="nav-link">Demo</NuxtLink>
                <NuxtLink to="/docs" class="nav-link">Documentation</NuxtLink>
                <NuxtLink to="/about" class="nav-link">About</NuxtLink>
              </div>

              <!-- Action Buttons -->
              <div class="navbar-actions desktop-nav">
                <button 
                  @click="toggleAccessibilityPanel"
                  class="btn btn-icon"
                  title="Accessibility Settings"
                  aria-label="Open accessibility settings"
                >
                  ♿
                </button>
                <button 
                  @click="toggleConfigPanel"
                  class="btn btn-icon"
                  title="Configuration"
                  aria-label="Open configuration panel"
                >
                  ⚙️
                </button>
                <NuxtLink to="/upload" class="btn btn-primary">
                  Get Started
                </NuxtLink>
              </div>

              <!-- Mobile Menu Button -->
              <button 
                @click="toggleMobileMenu"
                class="mobile-menu-btn mobile-nav"
                :class="{ active: isMobileMenuOpen }"
                aria-label="Toggle mobile menu"
                aria-expanded="false"
              >
                <span class="hamburger-line"></span>
                <span class="hamburger-line"></span>
                <span class="hamburger-line"></span>
              </button>
            </div>
          </div>
        </nav>

        <!-- Mobile Navigation Menu -->
        <div 
          class="mobile-menu mobile-nav"
          :class="{ open: isMobileMenuOpen }"
          role="navigation"
          aria-label="Mobile navigation"
        >
          <div class="mobile-menu-content">
            <div class="mobile-nav-links">
              <NuxtLink to="/" class="mobile-nav-link" @click="closeMobileMenu">
                Home
              </NuxtLink>
              <NuxtLink to="/upload" class="mobile-nav-link" @click="closeMobileMenu">
                Upload PDF
              </NuxtLink>
              <NuxtLink to="/demo" class="mobile-nav-link" @click="closeMobileMenu">
                Demo
              </NuxtLink>
              <NuxtLink to="/docs" class="mobile-nav-link" @click="closeMobileMenu">
                Documentation
              </NuxtLink>
              <NuxtLink to="/about" class="mobile-nav-link" @click="closeMobileMenu">
                About
              </NuxtLink>
            </div>
            <div class="mobile-actions">
              <button 
                @click="toggleAccessibilityPanel"
                class="btn btn-outline btn-full"
              >
                ♿ Accessibility Settings
              </button>
              <button 
                @click="toggleConfigPanel"
                class="btn btn-outline btn-full"
              >
                ⚙️ Configuration
              </button>
              <NuxtLink 
                to="/upload" 
                class="btn btn-primary btn-full"
                @click="closeMobileMenu"
              >
                Get Started
              </NuxtLink>
            </div>
          </div>
        </div>
      </header>

      <!-- Main Content -->
      <main id="main-content" class="app-main" role="main" tabindex="-1">
        <slot />
      </main>

      <!-- Footer -->
      <footer class="app-footer" role="contentinfo">
        <div class="container">
          <div class="footer-content">
            <div class="footer-section">
              <div class="footer-brand">
                <div class="logo">
                  <span class="logo-icon">🎯</span>
                  <span class="logo-text">DiagramAI</span>
                </div>
                <p class="footer-description">
                  Advanced PDF processing with AI-powered diagram detection
                </p>
              </div>
            </div>

            <div class="footer-section">
              <h4>Product</h4>
              <ul class="footer-links">
                <li><NuxtLink to="/upload">Upload PDF</NuxtLink></li>
                <li><NuxtLink to="/demo">Demo</NuxtLink></li>
                <li><NuxtLink to="/features">Features</NuxtLink></li>
                <li><NuxtLink to="/pricing">Pricing</NuxtLink></li>
              </ul>
            </div>

            <div class="footer-section">
              <h4>Resources</h4>
              <ul class="footer-links">
                <li><NuxtLink to="/docs">Documentation</NuxtLink></li>
                <li><NuxtLink to="/api">API Reference</NuxtLink></li>
                <li><NuxtLink to="/tutorials">Tutorials</NuxtLink></li>
                <li><NuxtLink to="/support">Support</NuxtLink></li>
              </ul>
            </div>

            <div class="footer-section">
              <h4>Company</h4>
              <ul class="footer-links">
                <li><NuxtLink to="/about">About</NuxtLink></li>
                <li><NuxtLink to="/blog">Blog</NuxtLink></li>
                <li><NuxtLink to="/careers">Careers</NuxtLink></li>
                <li><NuxtLink to="/contact">Contact</NuxtLink></li>
              </ul>
            </div>

            <div class="footer-section">
              <h4>Legal</h4>
              <ul class="footer-links">
                <li><NuxtLink to="/privacy">Privacy Policy</NuxtLink></li>
                <li><NuxtLink to="/terms">Terms of Service</NuxtLink></li>
                <li><NuxtLink to="/cookies">Cookie Policy</NuxtLink></li>
                <li><NuxtLink to="/accessibility">Accessibility</NuxtLink></li>
              </ul>
            </div>
          </div>

          <div class="footer-bottom">
            <div class="footer-bottom-content">
              <p class="copyright">
                © {{ currentYear }} DiagramAI. All rights reserved.
              </p>
              <div class="footer-social">
                <a href="#" class="social-link" aria-label="Twitter">
                  <span class="social-icon">🐦</span>
                </a>
                <a href="#" class="social-link" aria-label="GitHub">
                  <span class="social-icon">🐙</span>
                </a>
                <a href="#" class="social-link" aria-label="LinkedIn">
                  <span class="social-icon">💼</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>

      <!-- Accessibility Panel -->
      <div 
        v-if="showAccessibilityPanel"
        class="accessibility-panel"
        role="dialog"
        aria-labelledby="accessibility-title"
        aria-modal="true"
      >
        <div class="panel-content">
          <div class="panel-header">
            <h3 id="accessibility-title">Accessibility Settings</h3>
            <button 
              @click="closeAccessibilityPanel"
              class="close-btn"
              aria-label="Close accessibility panel"
            >
              ×
            </button>
          </div>
          <div class="panel-body">
            <div class="setting-group">
              <label for="font-size">Font Size:</label>
              <select id="font-size" v-model="accessibilitySettings.fontSize">
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
                <option value="extra-large">Extra Large</option>
              </select>
            </div>
            <div class="setting-group">
              <label for="color-scheme">Color Scheme:</label>
              <select id="color-scheme" v-model="accessibilitySettings.colorScheme">
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="high-contrast">High Contrast</option>
              </select>
            </div>
            <div class="setting-group">
              <label>
                <input 
                  type="checkbox" 
                  v-model="accessibilitySettings.reduceMotion"
                />
                Reduce Motion
              </label>
            </div>
            <div class="setting-group">
              <label>
                <input 
                  type="checkbox" 
                  v-model="accessibilitySettings.screenReaderMode"
                />
                Screen Reader Mode
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Mobile Menu Overlay -->
      <div 
        v-if="isMobileMenuOpen"
        class="mobile-menu-overlay"
        @click="closeMobileMenu"
        aria-hidden="true"
      ></div>
    </div>
  </AccessibilityProvider>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

// Reactive state
const isMobileMenuOpen = ref(false)
const showAccessibilityPanel = ref(false)
const accessibilitySettings = ref({
  fontSize: 'medium',
  colorScheme: 'light',
  reduceMotion: false,
  screenReaderMode: false
})

// Computed properties
const currentYear = computed(() => new Date().getFullYear())

// Methods
const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value
  
  // Prevent body scroll when menu is open
  if (isMobileMenuOpen.value) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
}

const closeMobileMenu = () => {
  isMobileMenuOpen.value = false
  document.body.style.overflow = ''
}

const toggleAccessibilityPanel = () => {
  showAccessibilityPanel.value = !showAccessibilityPanel.value
}

const closeAccessibilityPanel = () => {
  showAccessibilityPanel.value = false
}

const toggleConfigPanel = () => {
  // This would open the DiagramDetectionProvider config panel
  // For now, we'll just show an alert
  alert('Configuration panel would open here')
}

// Handle escape key
const handleEscape = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    if (isMobileMenuOpen.value) {
      closeMobileMenu()
    }
    if (showAccessibilityPanel.value) {
      closeAccessibilityPanel()
    }
  }
}

// Lifecycle hooks
onMounted(() => {
  document.addEventListener('keydown', handleEscape)
  
  // Load accessibility settings from localStorage
  const saved = localStorage.getItem('accessibility-settings')
  if (saved) {
    try {
      accessibilitySettings.value = { ...accessibilitySettings.value, ...JSON.parse(saved) }
    } catch (error) {
      console.warn('Failed to load accessibility settings:', error)
    }
  }
  
  // Apply initial settings
  applyAccessibilitySettings()
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleEscape)
  document.body.style.overflow = ''
})

// Watch for accessibility settings changes
watch(accessibilitySettings, (newSettings) => {
  applyAccessibilitySettings()
  localStorage.setItem('accessibility-settings', JSON.stringify(newSettings))
}, { deep: true })

const applyAccessibilitySettings = () => {
  const root = document.documentElement
  
  // Apply font size
  root.setAttribute('data-font-size', accessibilitySettings.value.fontSize)
  
  // Apply color scheme
  root.setAttribute('data-color-scheme', accessibilitySettings.value.colorScheme)
  
  // Apply reduced motion
  if (accessibilitySettings.value.reduceMotion) {
    root.classList.add('reduce-motion')
  } else {
    root.classList.remove('reduce-motion')
  }
  
  // Apply screen reader mode
  if (accessibilitySettings.value.screenReaderMode) {
    root.classList.add('screen-reader-mode')
  } else {
    root.classList.remove('screen-reader-mode')
  }
}
</script>

<style scoped>
.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* Header Styles */
.app-header {
  background: white;
  border-bottom: 1px solid #e0e0e0;
  position: sticky;
  top: 0;
  z-index: 1000;
}

.navbar {
  padding: 0;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

.navbar-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 70px;
}

.navbar-brand {
  text-decoration: none;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
}

.logo-icon {
  font-size: 1.5rem;
}

.logo-text {
  font-size: 1.5rem;
  font-weight: 700;
  color: #667eea;
}

.navbar-nav {
  display: flex;
  align-items: center;
  gap: 30px;
}

.nav-link {
  text-decoration: none;
  color: #333;
  font-weight: 500;
  transition: color 0.3s ease;
  position: relative;
}

.nav-link:hover,
.nav-link.router-link-active {
  color: #667eea;
}

.nav-link.router-link-active::after {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 0;
  right: 0;
  height: 2px;
  background: #667eea;
}

.navbar-actions {
  display: flex;
  align-items: center;
  gap: 15px;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  border-radius: 6px;
  text-decoration: none;
  font-weight: 500;
  transition: all 0.3s ease;
  border: 1px solid transparent;
  cursor: pointer;
  background: none;
}

.btn-icon {
  width: 40px;
  height: 40px;
  padding: 0;
  border-radius: 50%;
  font-size: 1.2rem;
}

.btn-icon:hover {
  background: #f5f5f5;
}

.btn-primary {
  background: #667eea;
  color: white;
}

.btn-primary:hover {
  background: #5a6fd8;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.btn-outline {
  border-color: #667eea;
  color: #667eea;
}

.btn-outline:hover {
  background: #667eea;
  color: white;
}

.btn-full {
  width: 100%;
  justify-content: center;
}

/* Mobile Navigation */
.mobile-nav {
  display: none;
}

.mobile-menu-btn {
  width: 40px;
  height: 40px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  cursor: pointer;
}

.hamburger-line {
  width: 20px;
  height: 2px;
  background: #333;
  transition: all 0.3s ease;
}

.mobile-menu-btn.active .hamburger-line:nth-child(1) {
  transform: rotate(45deg) translate(5px, 5px);
}

.mobile-menu-btn.active .hamburger-line:nth-child(2) {
  opacity: 0;
}

.mobile-menu-btn.active .hamburger-line:nth-child(3) {
  transform: rotate(-45deg) translate(7px, -6px);
}

.mobile-menu {
  position: fixed;
  top: 70px;
  left: 0;
  right: 0;
  background: white;
  border-bottom: 1px solid #e0e0e0;
  transform: translateY(-100%);
  transition: transform 0.3s ease;
  z-index: 999;
}

.mobile-menu.open {
  transform: translateY(0);
}

.mobile-menu-content {
  padding: 20px;
}

.mobile-nav-links {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 30px;
}

.mobile-nav-link {
  text-decoration: none;
  color: #333;
  font-weight: 500;
  padding: 10px 0;
  border-bottom: 1px solid #f0f0f0;
}

.mobile-nav-link:hover,
.mobile-nav-link.router-link-active {
  color: #667eea;
}

.mobile-actions {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.mobile-menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 998;
}

/* Main Content */
.app-main {
  flex: 1;
  outline: none;
}

/* Footer Styles */
.app-footer {
  background: #2c3e50;
  color: white;
  padding: 60px 0 20px;
  margin-top: auto;
}

.footer-content {
  display: grid;
  grid-template-columns: 2fr repeat(4, 1fr);
  gap: 40px;
  margin-bottom: 40px;
}

.footer-section h4 {
  margin-bottom: 20px;
  font-weight: 600;
}

.footer-description {
  color: #bdc3c7;
  line-height: 1.6;
  margin-top: 15px;
}

.footer-links {
  list-style: none;
  padding: 0;
  margin: 0;
}

.footer-links li {
  margin-bottom: 10px;
}

.footer-links a {
  color: #bdc3c7;
  text-decoration: none;
  transition: color 0.3s ease;
}

.footer-links a:hover {
  color: white;
}

.footer-bottom {
  border-top: 1px solid #34495e;
  padding-top: 20px;
}

.footer-bottom-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.copyright {
  color: #bdc3c7;
  margin: 0;
}

.footer-social {
  display: flex;
  gap: 15px;
}

.social-link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: #34495e;
  border-radius: 50%;
  text-decoration: none;
  transition: background 0.3s ease;
}

.social-link:hover {
  background: #667eea;
}

.social-icon {
  font-size: 1.2rem;
}

/* Accessibility Panel */
.accessibility-panel {
  position: fixed;
  top: 0;
  right: 0;
  width: 350px;
  height: 100vh;
  background: white;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.15);
  z-index: 10000;
  transform: translateX(100%);
  transition: transform 0.3s ease;
}

.accessibility-panel {
  transform: translateX(0);
}

.panel-content {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
}

.panel-header h3 {
  margin: 0;
  color: #333;
}

.close-btn {
  width: 30px;
  height: 30px;
  border: none;
  background: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #666;
}

.close-btn:hover {
  color: #333;
}

.panel-body {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.setting-group {
  margin-bottom: 20px;
}

.setting-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #333;
}

.setting-group select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: white;
}

.setting-group input[type="checkbox"] {
  margin-right: 8px;
}

/* Responsive Design */
@media (max-width: 768px) {
  .desktop-nav {
    display: none;
  }
  
  .mobile-nav {
    display: flex;
  }
  
  .footer-content {
    grid-template-columns: 1fr;
    gap: 30px;
  }
  
  .footer-bottom-content {
    flex-direction: column;
    gap: 20px;
    text-align: center;
  }
  
  .accessibility-panel {
    width: 100%;
  }
}

/* High Contrast Mode */
.high-contrast .app-header {
  background: #000000;
  border-color: #ffffff;
}

.high-contrast .nav-link {
  color: #ffffff;
}

.high-contrast .btn-icon:hover {
  background: #333333;
}

/* Reduced Motion */
.reduce-motion * {
  animation-duration: 0.01ms !important;
  animation-iteration-count: 1 !important;
  transition-duration: 0.01ms !important;
}

/* Screen Reader Mode */
.screen-reader-mode .mobile-menu-btn {
  position: relative;
}

.screen-reader-mode .mobile-menu-btn::after {
  content: attr(aria-label);
  position: absolute;
  left: -9999px;
}
</style>