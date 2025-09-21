<template>
  <div class="home-page">
    <!-- Hero Section -->
    <section class="hero">
      <div class="container">
        <div class="hero-content">
          <h1 class="hero-title">
            Advanced Diagram Detection System
          </h1>
          <p class="hero-subtitle">
            Transform your PDFs into interactive tests with AI-powered diagram detection
          </p>
          <div class="hero-features">
            <div class="feature">
              <span class="feature-icon">🤖</span>
              <span>AI-Powered Detection</span>
            </div>
            <div class="feature">
              <span class="feature-icon">📱</span>
              <span>Responsive Design</span>
            </div>
            <div class="feature">
              <span class="feature-icon">♿</span>
              <span>Fully Accessible</span>
            </div>
          </div>
          <div class="hero-actions">
            <NuxtLink to="/upload" class="btn btn-primary btn-large">
              Start Processing PDF
            </NuxtLink>
            <NuxtLink to="/demo" class="btn btn-secondary btn-large">
              View Demo
            </NuxtLink>
          </div>
        </div>
        <div class="hero-visual">
          <div class="demo-preview">
            <div class="pdf-mockup">
              <div class="pdf-page">
                <div class="pdf-content">
                  <div class="text-line"></div>
                  <div class="text-line short"></div>
                  <div class="diagram-placeholder">
                    <div class="diagram-overlay detected">
                      <span class="confidence-badge">95%</span>
                    </div>
                  </div>
                  <div class="text-line"></div>
                  <div class="text-line short"></div>
                </div>
              </div>
            </div>
            <div class="arrow">→</div>
            <div class="test-mockup">
              <div class="test-question">
                <h4>Question 1</h4>
                <p>Analyze the diagram below:</p>
                <div class="interactive-diagram">
                  <div class="diagram-rendered">
                    <span class="interactive-badge">Interactive</span>
                  </div>
                </div>
                <div class="options">
                  <div class="option">A) Option 1</div>
                  <div class="option">B) Option 2</div>
                  <div class="option">C) Option 3</div>
                  <div class="option">D) Option 4</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section class="features">
      <div class="container">
        <h2 class="section-title">Powerful Features</h2>
        <div class="features-grid">
          <div class="feature-card">
            <div class="feature-icon-large">🎯</div>
            <h3>AI Diagram Detection</h3>
            <p>Uses Google Gemini API to automatically detect and locate diagrams with precise coordinates</p>
            <ul class="feature-list">
              <li>95%+ accuracy rate</li>
              <li>Multiple diagram types</li>
              <li>Confidence scoring</li>
            </ul>
          </div>
          
          <div class="feature-card">
            <div class="feature-icon-large">⚡</div>
            <h3>Dynamic Rendering</h3>
            <p>No separate image files needed - diagrams are rendered dynamically from coordinates</p>
            <ul class="feature-list">
              <li>Faster loading times</li>
              <li>Better image quality</li>
              <li>Reduced storage needs</li>
            </ul>
          </div>
          
          <div class="feature-card">
            <div class="feature-icon-large">✏️</div>
            <h3>Manual Review</h3>
            <p>Interactive interface to review and edit AI-detected diagrams with precision</p>
            <ul class="feature-list">
              <li>Drag & drop editing</li>
              <li>Real-time validation</li>
              <li>Undo/redo support</li>
            </ul>
          </div>
          
          <div class="feature-card">
            <div class="feature-icon-large">🎓</div>
            <h3>CBT Presets</h3>
            <p>Pre-configured settings for JEE, NEET, and other competitive examinations</p>
            <ul class="feature-list">
              <li>JEE & NEET presets</li>
              <li>Custom configurations</li>
              <li>Auto-updated schemas</li>
            </ul>
          </div>
          
          <div class="feature-card">
            <div class="feature-icon-large">♿</div>
            <h3>Accessibility First</h3>
            <p>WCAG 2.1 AA compliant with full keyboard navigation and screen reader support</p>
            <ul class="feature-list">
              <li>Screen reader support</li>
              <li>Keyboard navigation</li>
              <li>High contrast mode</li>
            </ul>
          </div>
          
          <div class="feature-card">
            <div class="feature-icon-large">📱</div>
            <h3>Responsive Design</h3>
            <p>Works perfectly on all devices with touch optimization and fluid layouts</p>
            <ul class="feature-list">
              <li>Mobile-first design</li>
              <li>Touch gestures</li>
              <li>Fluid typography</li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <!-- How It Works Section -->
    <section class="how-it-works">
      <div class="container">
        <h2 class="section-title">How It Works</h2>
        <div class="steps">
          <div class="step">
            <div class="step-number">1</div>
            <div class="step-content">
              <h3>Upload PDF</h3>
              <p>Upload your educational PDF containing diagrams and questions</p>
            </div>
          </div>
          
          <div class="step">
            <div class="step-number">2</div>
            <div class="step-content">
              <h3>AI Detection</h3>
              <p>Our AI analyzes each page and detects diagram locations with coordinates</p>
            </div>
          </div>
          
          <div class="step">
            <div class="step-number">3</div>
            <div class="step-content">
              <h3>Manual Review</h3>
              <p>Review and edit detected diagrams using our interactive interface</p>
            </div>
          </div>
          
          <div class="step">
            <div class="step-number">4</div>
            <div class="step-content">
              <h3>Configure Test</h3>
              <p>Choose CBT presets or custom settings for your examination</p>
            </div>
          </div>
          
          <div class="step">
            <div class="step-number">5</div>
            <div class="step-content">
              <h3>Generate Test</h3>
              <p>Create interactive tests with dynamically rendered diagrams</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Stats Section -->
    <section class="stats">
      <div class="container">
        <div class="stats-grid">
          <div class="stat">
            <div class="stat-number">95%+</div>
            <div class="stat-label">Detection Accuracy</div>
          </div>
          <div class="stat">
            <div class="stat-number">50%</div>
            <div class="stat-label">Faster Processing</div>
          </div>
          <div class="stat">
            <div class="stat-number">100%</div>
            <div class="stat-label">WCAG Compliant</div>
          </div>
          <div class="stat">
            <div class="stat-number">6</div>
            <div class="stat-label">Responsive Breakpoints</div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="cta">
      <div class="container">
        <div class="cta-content">
          <h2>Ready to Transform Your PDFs?</h2>
          <p>Start creating interactive tests with AI-powered diagram detection today</p>
          <div class="cta-actions">
            <NuxtLink to="/upload" class="btn btn-primary btn-large">
              Get Started Now
            </NuxtLink>
            <NuxtLink to="/docs" class="btn btn-outline btn-large">
              View Documentation
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
// Meta tags for SEO
useHead({
  title: 'Advanced Diagram Detection System - AI-Powered PDF Processing',
  meta: [
    {
      name: 'description',
      content: 'Transform educational PDFs into interactive tests with AI-powered diagram detection. WCAG compliant, responsive design, and dynamic rendering.'
    },
    {
      name: 'keywords',
      content: 'PDF processing, diagram detection, AI, Gemini API, accessibility, responsive design, CBT, JEE, NEET'
    },
    {
      property: 'og:title',
      content: 'Advanced Diagram Detection System'
    },
    {
      property: 'og:description',
      content: 'AI-powered PDF processing with diagram detection and interactive test generation'
    },
    {
      property: 'og:type',
      content: 'website'
    }
  ]
})

// Page-specific styles
definePageMeta({
  layout: 'default'
})
</script>

<style scoped>
.home-page {
  min-height: 100vh;
}

/* Hero Section */
.hero {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 80px 0;
  min-height: 100vh;
  display: flex;
  align-items: center;
}

.hero .container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 60px;
  align-items: center;
}

.hero-title {
  font-size: 3.5rem;
  font-weight: 700;
  margin-bottom: 20px;
  line-height: 1.2;
}

.hero-subtitle {
  font-size: 1.25rem;
  margin-bottom: 30px;
  opacity: 0.9;
  line-height: 1.6;
}

.hero-features {
  display: flex;
  gap: 30px;
  margin-bottom: 40px;
}

.feature {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
}

.feature-icon {
  font-size: 1.2rem;
}

.hero-actions {
  display: flex;
  gap: 20px;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12px 24px;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 600;
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.btn-large {
  padding: 16px 32px;
  font-size: 1.1rem;
}

.btn-primary {
  background: #ffffff;
  color: #667eea;
}

.btn-primary:hover {
  background: #f8f9ff;
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.btn-secondary {
  background: transparent;
  color: white;
  border-color: rgba(255, 255, 255, 0.3);
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: white;
}

.btn-outline {
  background: transparent;
  color: #667eea;
  border-color: #667eea;
}

.btn-outline:hover {
  background: #667eea;
  color: white;
}

/* Hero Visual */
.demo-preview {
  display: flex;
  align-items: center;
  gap: 30px;
  justify-content: center;
}

.pdf-mockup, .test-mockup {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  color: #333;
}

.pdf-page {
  width: 200px;
  height: 280px;
  background: #f9f9f9;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
}

.text-line {
  height: 8px;
  background: #ddd;
  border-radius: 4px;
  margin-bottom: 8px;
}

.text-line.short {
  width: 60%;
}

.diagram-placeholder {
  position: relative;
  height: 80px;
  background: #e8f4f8;
  border: 2px dashed #4a90e2;
  border-radius: 6px;
  margin: 16px 0;
}

.diagram-overlay {
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  border: 2px solid #4caf50;
  border-radius: 6px;
  background: rgba(76, 175, 80, 0.1);
}

.confidence-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  background: #4caf50;
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: bold;
}

.arrow {
  font-size: 2rem;
  color: rgba(255, 255, 255, 0.7);
}

.test-mockup {
  width: 250px;
}

.test-question h4 {
  margin: 0 0 8px 0;
  color: #333;
}

.test-question p {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #666;
}

.interactive-diagram {
  position: relative;
  height: 60px;
  background: linear-gradient(45deg, #f0f8ff, #e6f3ff);
  border: 1px solid #4a90e2;
  border-radius: 6px;
  margin-bottom: 12px;
}

.diagram-rendered {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.interactive-badge {
  background: #2196f3;
  color: white;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: bold;
}

.options {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.option {
  padding: 6px 8px;
  background: #f5f5f5;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.option:hover {
  background: #e0e0e0;
}

/* Features Section */
.features {
  padding: 80px 0;
  background: #f8f9fa;
}

.section-title {
  text-align: center;
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 60px;
  color: #333;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 40px;
}

.feature-card {
  background: white;
  padding: 40px 30px;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  text-align: center;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.feature-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
}

.feature-icon-large {
  font-size: 3rem;
  margin-bottom: 20px;
}

.feature-card h3 {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 15px;
  color: #333;
}

.feature-card p {
  color: #666;
  margin-bottom: 20px;
  line-height: 1.6;
}

.feature-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.feature-list li {
  padding: 5px 0;
  color: #4caf50;
  font-size: 0.9rem;
}

.feature-list li::before {
  content: "✓ ";
  font-weight: bold;
  margin-right: 5px;
}

/* How It Works Section */
.how-it-works {
  padding: 80px 0;
  background: white;
}

.steps {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 30px;
  margin-top: 60px;
}

.step {
  flex: 1;
  text-align: center;
  position: relative;
}

.step:not(:last-child)::after {
  content: "→";
  position: absolute;
  top: 30px;
  right: -15px;
  font-size: 1.5rem;
  color: #ddd;
}

.step-number {
  width: 60px;
  height: 60px;
  background: #667eea;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: bold;
  margin: 0 auto 20px;
}

.step h3 {
  font-size: 1.3rem;
  font-weight: 600;
  margin-bottom: 10px;
  color: #333;
}

.step p {
  color: #666;
  line-height: 1.6;
}

/* Stats Section */
.stats {
  padding: 60px 0;
  background: #667eea;
  color: white;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 40px;
  text-align: center;
}

.stat-number {
  font-size: 3rem;
  font-weight: 700;
  margin-bottom: 10px;
}

.stat-label {
  font-size: 1.1rem;
  opacity: 0.9;
}

/* CTA Section */
.cta {
  padding: 80px 0;
  background: #f8f9fa;
  text-align: center;
}

.cta-content h2 {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 20px;
  color: #333;
}

.cta-content p {
  font-size: 1.2rem;
  color: #666;
  margin-bottom: 40px;
}

.cta-actions {
  display: flex;
  gap: 20px;
  justify-content: center;
}

/* Responsive Design */
@media (max-width: 768px) {
  .hero .container {
    grid-template-columns: 1fr;
    gap: 40px;
    text-align: center;
  }
  
  .hero-title {
    font-size: 2.5rem;
  }
  
  .hero-features {
    flex-direction: column;
    gap: 15px;
  }
  
  .hero-actions {
    flex-direction: column;
    align-items: center;
  }
  
  .demo-preview {
    flex-direction: column;
    gap: 20px;
  }
  
  .arrow {
    transform: rotate(90deg);
  }
  
  .features-grid {
    grid-template-columns: 1fr;
  }
  
  .steps {
    flex-direction: column;
    gap: 40px;
  }
  
  .step:not(:last-child)::after {
    content: "↓";
    top: auto;
    bottom: -20px;
    right: auto;
    left: 50%;
    transform: translateX(-50%);
  }
  
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .cta-actions {
    flex-direction: column;
    align-items: center;
  }
}

@media (max-width: 480px) {
  .hero {
    padding: 60px 0;
  }
  
  .hero-title {
    font-size: 2rem;
  }
  
  .section-title {
    font-size: 2rem;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>