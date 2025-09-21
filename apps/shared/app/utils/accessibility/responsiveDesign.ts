/**
 * Responsive Design Manager for Advanced Diagram Detection System
 * Handles responsive layouts, breakpoints, and adaptive UI components
 */

export interface Breakpoint {
  name: string;
  minWidth: number;
  maxWidth?: number;
  columns: number;
  gutters: number;
  margins: number;
}

export interface ResponsiveConfig {
  breakpoints: Breakpoint[];
  enableFluidTypography: boolean;
  enableResponsiveImages: boolean;
  enableTouchOptimization: boolean;
  enableContainerQueries: boolean;
  baseFont: number;
  scaleRatio: number;
}

export interface ViewportInfo {
  width: number;
  height: number;
  orientation: 'portrait' | 'landscape';
  devicePixelRatio: number;
  touchSupport: boolean;
  currentBreakpoint: Breakpoint;
}

export interface ResponsiveElement {
  element: HTMLElement;
  breakpointRules: Map<string, CSSStyleDeclaration>;
  containerQueries: ContainerQuery[];
}

export interface ContainerQuery {
  condition: string;
  styles: Partial<CSSStyleDeclaration>;
}

export class ResponsiveDesignManager {
  private config: ResponsiveConfig;
  private viewport: ViewportInfo;
  private responsiveElements: Map<string, ResponsiveElement> = new Map();
  private resizeObserver: ResizeObserver | null = null;
  private mediaQueryLists: Map<string, MediaQueryList> = new Map();
  private touchStartTime: number = 0;

  constructor(config: Partial<ResponsiveConfig> = {}) {
    this.config = {
      breakpoints: [
        { name: 'xs', minWidth: 0, maxWidth: 575, columns: 1, gutters: 16, margins: 16 },
        { name: 'sm', minWidth: 576, maxWidth: 767, columns: 2, gutters: 20, margins: 20 },
        { name: 'md', minWidth: 768, maxWidth: 991, columns: 3, gutters: 24, margins: 24 },
        { name: 'lg', minWidth: 992, maxWidth: 1199, columns: 4, gutters: 28, margins: 28 },
        { name: 'xl', minWidth: 1200, maxWidth: 1399, columns: 5, gutters: 32, margins: 32 },
        { name: 'xxl', minWidth: 1400, columns: 6, gutters: 36, margins: 36 }
      ],
      enableFluidTypography: true,
      enableResponsiveImages: true,
      enableTouchOptimization: true,
      enableContainerQueries: true,
      baseFont: 16,
      scaleRatio: 1.25,
      ...config
    };

    this.viewport = this.getViewportInfo();
    this.initialize();
  }

  /**
   * Initialize responsive design features
   */
  private initialize(): void {
    this.setupBreakpoints();
    this.setupFluidTypography();
    this.setupResponsiveImages();
    this.setupTouchOptimization();
    this.setupContainerQueries();
    this.setupViewportTracking();
    this.applyResponsiveStyles();
  }

  /**
   * Get current viewport information
   */
  private getViewportInfo(): ViewportInfo {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    return {
      width,
      height,
      orientation: height > width ? 'portrait' : 'landscape',
      devicePixelRatio: window.devicePixelRatio || 1,
      touchSupport: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      currentBreakpoint: this.getCurrentBreakpoint(width)
    };
  }

  /**
   * Get current breakpoint based on viewport width
   */
  private getCurrentBreakpoint(width: number): Breakpoint {
    return this.config.breakpoints.find(bp => 
      width >= bp.minWidth && (bp.maxWidth === undefined || width <= bp.maxWidth)
    ) || this.config.breakpoints[0];
  }

  /**
   * Setup breakpoint monitoring
   */
  private setupBreakpoints(): void {
    this.config.breakpoints.forEach(breakpoint => {
      const mediaQuery = breakpoint.maxWidth 
        ? `(min-width: ${breakpoint.minWidth}px) and (max-width: ${breakpoint.maxWidth}px)`
        : `(min-width: ${breakpoint.minWidth}px)`;
      
      const mql = window.matchMedia(mediaQuery);
      this.mediaQueryLists.set(breakpoint.name, mql);
      
      mql.addEventListener('change', (e) => {
        if (e.matches) {
          this.handleBreakpointChange(breakpoint);
        }
      });
    });
  }

  /**
   * Handle breakpoint changes
   */
  private handleBreakpointChange(newBreakpoint: Breakpoint): void {
    const previousBreakpoint = this.viewport.currentBreakpoint;
    this.viewport.currentBreakpoint = newBreakpoint;
    
    // Update CSS custom properties
    this.updateBreakpointProperties(newBreakpoint);
    
    // Apply responsive styles
    this.applyResponsiveStyles();
    
    // Emit breakpoint change event
    this.emitBreakpointChange(previousBreakpoint, newBreakpoint);
    
    // Update diagram layouts
    this.updateDiagramLayouts();
  }

  /**
   * Update CSS custom properties for current breakpoint
   */
  private updateBreakpointProperties(breakpoint: Breakpoint): void {
    const root = document.documentElement;
    
    root.style.setProperty('--current-breakpoint', breakpoint.name);
    root.style.setProperty('--columns', breakpoint.columns.toString());
    root.style.setProperty('--gutters', `${breakpoint.gutters}px`);
    root.style.setProperty('--margins', `${breakpoint.margins}px`);
    root.style.setProperty('--viewport-width', `${this.viewport.width}px`);
    root.style.setProperty('--viewport-height', `${this.viewport.height}px`);
  }

  /**
   * Setup fluid typography
   */
  private setupFluidTypography(): void {
    if (!this.config.enableFluidTypography) return;

    const root = document.documentElement;
    const minViewport = this.config.breakpoints[0].minWidth;
    const maxViewport = this.config.breakpoints[this.config.breakpoints.length - 1].minWidth;
    
    // Calculate fluid font sizes
    const fontSizes = this.calculateFluidFontSizes();
    
    fontSizes.forEach((size, level) => {
      const minSize = size.min;
      const maxSize = size.max;
      
      // Create clamp() function for fluid scaling
      const fluidSize = `clamp(${minSize}rem, ${minSize}rem + ${(maxSize - minSize) * 100 / (maxViewport - minViewport)}vw, ${maxSize}rem)`;
      
      root.style.setProperty(`--font-size-${level}`, fluidSize);
    });

    // Set base font size
    root.style.setProperty('--font-size-base', `${this.config.baseFont}px`);
  }

  /**
   * Calculate fluid font sizes using modular scale
   */
  private calculateFluidFontSizes(): Map<string, { min: number; max: number }> {
    const sizes = new Map();
    const levels = ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl'];
    const baseIndex = levels.indexOf('base');
    
    levels.forEach((level, index) => {
      const scale = Math.pow(this.config.scaleRatio, index - baseIndex);
      const baseSize = this.config.baseFont / 16; // Convert to rem
      
      sizes.set(level, {
        min: Math.max(0.75, baseSize * scale * 0.875), // Minimum size
        max: baseSize * scale * 1.125 // Maximum size
      });
    });
    
    return sizes;
  }

  /**
   * Setup responsive images
   */
  private setupResponsiveImages(): void {
    if (!this.config.enableResponsiveImages) return;

    // Setup intersection observer for lazy loading
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.loadResponsiveImage(entry.target as HTMLImageElement);
          imageObserver.unobserve(entry.target);
        }
      });
    }, { rootMargin: '50px' });

    // Observe all images with data-src
    document.querySelectorAll('img[data-src]').forEach(img => {
      imageObserver.observe(img);
    });

    // Setup responsive image sizing
    this.setupResponsiveImageSizing();
  }

  /**
   * Load responsive image based on current viewport
   */
  private loadResponsiveImage(img: HTMLImageElement): void {
    const breakpoint = this.viewport.currentBreakpoint;
    const baseSrc = img.dataset.src;
    
    if (!baseSrc) return;

    // Generate responsive image URL based on breakpoint
    const responsiveSrc = this.generateResponsiveImageUrl(baseSrc, breakpoint);
    
    img.src = responsiveSrc;
    img.classList.add('loaded');
  }

  /**
   * Generate responsive image URL
   */
  private generateResponsiveImageUrl(baseSrc: string, breakpoint: Breakpoint): string {
    // This would integrate with your image processing service
    // For now, return the base source
    return baseSrc;
  }

  /**
   * Setup responsive image sizing
   */
  private setupResponsiveImageSizing(): void {
    const images = document.querySelectorAll('.responsive-image');
    
    images.forEach(img => {
      this.makeImageResponsive(img as HTMLImageElement);
    });
  }

  /**
   * Make an image responsive
   */
  private makeImageResponsive(img: HTMLImageElement): void {
    const container = img.parentElement;
    if (!container) return;

    // Set up responsive container
    container.style.position = 'relative';
    container.style.overflow = 'hidden';
    
    // Set up image
    img.style.width = '100%';
    img.style.height = 'auto';
    img.style.display = 'block';
    
    // Add loading placeholder
    if (!img.complete) {
      container.classList.add('loading');
      
      img.addEventListener('load', () => {
        container.classList.remove('loading');
        container.classList.add('loaded');
      });
    }
  }

  /**
   * Setup touch optimization
   */
  private setupTouchOptimization(): void {
    if (!this.config.enableTouchOptimization || !this.viewport.touchSupport) return;

    document.body.classList.add('touch-device');
    
    // Optimize touch targets
    this.optimizeTouchTargets();
    
    // Setup touch gestures for diagrams
    this.setupTouchGestures();
    
    // Optimize scrolling
    this.optimizeScrolling();
  }

  /**
   * Optimize touch targets for accessibility
   */
  private optimizeTouchTargets(): void {
    const minTouchSize = 44; // 44px minimum touch target size
    
    const touchTargets = document.querySelectorAll('button, a, input, [role="button"]');
    
    touchTargets.forEach(target => {
      const element = target as HTMLElement;
      const rect = element.getBoundingClientRect();
      
      if (rect.width < minTouchSize || rect.height < minTouchSize) {
        element.style.minWidth = `${minTouchSize}px`;
        element.style.minHeight = `${minTouchSize}px`;
        element.classList.add('touch-optimized');
      }
    });
  }

  /**
   * Setup touch gestures for diagram interaction
   */
  private setupTouchGestures(): void {
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;
    
    document.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchStartTime = Date.now();
      }
    }, { passive: true });
    
    document.addEventListener('touchend', (e) => {
      if (e.changedTouches.length === 1) {
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const touchEndTime = Date.now();
        
        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;
        const deltaTime = touchEndTime - touchStartTime;
        
        // Detect swipe gestures
        if (Math.abs(deltaX) > 50 && deltaTime < 300) {
          this.handleSwipeGesture(deltaX > 0 ? 'right' : 'left', e.target as HTMLElement);
        }
        
        // Detect tap gestures
        if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10 && deltaTime < 300) {
          this.handleTapGesture(e.target as HTMLElement);
        }
      }
    }, { passive: true });
  }

  /**
   * Handle swipe gestures
   */
  private handleSwipeGesture(direction: 'left' | 'right', target: HTMLElement): void {
    // Navigate between diagrams or questions
    if (target.closest('.diagram-overlay')) {
      this.navigateDiagrams(direction);
    } else if (target.closest('.question-panel')) {
      this.navigateQuestions(direction);
    }
  }

  /**
   * Handle tap gestures
   */
  private handleTapGesture(target: HTMLElement): void {
    // Activate diagram or UI element
    if (target.classList.contains('diagram-overlay')) {
      target.click();
    }
  }

  /**
   * Navigate diagrams with swipe
   */
  private navigateDiagrams(direction: 'left' | 'right'): void {
    const diagrams = Array.from(document.querySelectorAll('.diagram-overlay')) as HTMLElement[];
    const currentIndex = diagrams.findIndex(d => d.classList.contains('active'));
    
    let nextIndex: number;
    if (direction === 'right') {
      nextIndex = Math.min(diagrams.length - 1, currentIndex + 1);
    } else {
      nextIndex = Math.max(0, currentIndex - 1);
    }
    
    if (nextIndex !== currentIndex) {
      diagrams[currentIndex]?.classList.remove('active');
      diagrams[nextIndex]?.classList.add('active');
      diagrams[nextIndex]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  /**
   * Navigate questions with swipe
   */
  private navigateQuestions(direction: 'left' | 'right'): void {
    // Emit navigation event for parent components to handle
    const event = new CustomEvent('question-navigate', {
      detail: { direction }
    });
    document.dispatchEvent(event);
  }

  /**
   * Optimize scrolling for touch devices
   */
  private optimizeScrolling(): void {
    // Enable momentum scrolling on iOS
    document.body.style.webkitOverflowScrolling = 'touch';
    
    // Optimize scroll containers
    const scrollContainers = document.querySelectorAll('.scroll-container, .question-panel');
    
    scrollContainers.forEach(container => {
      const element = container as HTMLElement;
      element.style.webkitOverflowScrolling = 'touch';
      element.style.overscrollBehavior = 'contain';
    });
  }

  /**
   * Setup container queries
   */
  private setupContainerQueries(): void {
    if (!this.config.enableContainerQueries) return;

    // Polyfill for container queries if not supported
    if (!('container' in document.documentElement.style)) {
      this.polyfillContainerQueries();
    }
    
    this.setupResizeObserver();
  }

  /**
   * Polyfill container queries using ResizeObserver
   */
  private polyfillContainerQueries(): void {
    this.resizeObserver = new ResizeObserver((entries) => {
      entries.forEach(entry => {
        this.handleContainerResize(entry.target as HTMLElement, entry.contentRect);
      });
    });

    // Observe containers with container queries
    const containers = document.querySelectorAll('[data-container-query]');
    containers.forEach(container => {
      this.resizeObserver?.observe(container);
    });
  }

  /**
   * Handle container resize for container queries
   */
  private handleContainerResize(container: HTMLElement, rect: DOMRectReadOnly): void {
    const queries = container.dataset.containerQuery?.split(',') || [];
    
    queries.forEach(query => {
      const [condition, className] = query.split(':').map(s => s.trim());
      const matches = this.evaluateContainerQuery(condition, rect);
      
      if (matches) {
        container.classList.add(className);
      } else {
        container.classList.remove(className);
      }
    });
  }

  /**
   * Evaluate container query condition
   */
  private evaluateContainerQuery(condition: string, rect: DOMRectReadOnly): boolean {
    const match = condition.match(/(min-width|max-width|min-height|max-height):\s*(\d+)px/);
    if (!match) return false;
    
    const [, property, value] = match;
    const numValue = parseInt(value);
    
    switch (property) {
      case 'min-width':
        return rect.width >= numValue;
      case 'max-width':
        return rect.width <= numValue;
      case 'min-height':
        return rect.height >= numValue;
      case 'max-height':
        return rect.height <= numValue;
      default:
        return false;
    }
  }

  /**
   * Setup resize observer for general responsive updates
   */
  private setupResizeObserver(): void {
    if (this.resizeObserver) return;

    this.resizeObserver = new ResizeObserver((entries) => {
      entries.forEach(entry => {
        this.handleElementResize(entry.target as HTMLElement, entry.contentRect);
      });
    });
  }

  /**
   * Handle element resize
   */
  private handleElementResize(element: HTMLElement, rect: DOMRectReadOnly): void {
    // Update element-specific responsive properties
    element.style.setProperty('--element-width', `${rect.width}px`);
    element.style.setProperty('--element-height', `${rect.height}px`);
    
    // Apply responsive classes based on size
    this.applyResponsiveClasses(element, rect);
  }

  /**
   * Apply responsive classes based on element size
   */
  private applyResponsiveClasses(element: HTMLElement, rect: DOMRectReadOnly): void {
    const classes = ['xs', 'sm', 'md', 'lg', 'xl'];
    const breakpoints = [0, 300, 600, 900, 1200];
    
    classes.forEach((cls, index) => {
      const minWidth = breakpoints[index];
      const maxWidth = breakpoints[index + 1] || Infinity;
      
      if (rect.width >= minWidth && rect.width < maxWidth) {
        element.classList.add(`size-${cls}`);
      } else {
        element.classList.remove(`size-${cls}`);
      }
    });
  }

  /**
   * Setup viewport tracking
   */
  private setupViewportTracking(): void {
    window.addEventListener('resize', () => {
      this.updateViewport();
    });

    window.addEventListener('orientationchange', () => {
      setTimeout(() => this.updateViewport(), 100);
    });
  }

  /**
   * Update viewport information
   */
  private updateViewport(): void {
    const newViewport = this.getViewportInfo();
    const oldBreakpoint = this.viewport.currentBreakpoint;
    
    this.viewport = newViewport;
    
    if (oldBreakpoint.name !== newViewport.currentBreakpoint.name) {
      this.handleBreakpointChange(newViewport.currentBreakpoint);
    }
    
    this.updateBreakpointProperties(newViewport.currentBreakpoint);
  }

  /**
   * Apply responsive styles
   */
  private applyResponsiveStyles(): void {
    const root = document.documentElement;
    
    // Apply breakpoint-specific styles
    this.config.breakpoints.forEach(bp => {
      root.classList.remove(`bp-${bp.name}`);
    });
    root.classList.add(`bp-${this.viewport.currentBreakpoint.name}`);
    
    // Apply orientation class
    root.classList.remove('portrait', 'landscape');
    root.classList.add(this.viewport.orientation);
    
    // Apply touch support class
    if (this.viewport.touchSupport) {
      root.classList.add('touch-support');
    } else {
      root.classList.remove('touch-support');
    }
  }

  /**
   * Update diagram layouts for current breakpoint
   */
  private updateDiagramLayouts(): void {
    const diagrams = document.querySelectorAll('.diagram-container');
    
    diagrams.forEach(diagram => {
      this.updateDiagramLayout(diagram as HTMLElement);
    });
  }

  /**
   * Update individual diagram layout
   */
  private updateDiagramLayout(diagram: HTMLElement): void {
    const breakpoint = this.viewport.currentBreakpoint;
    
    // Adjust diagram size based on breakpoint
    if (breakpoint.name === 'xs' || breakpoint.name === 'sm') {
      diagram.classList.add('mobile-layout');
      diagram.classList.remove('desktop-layout');
    } else {
      diagram.classList.add('desktop-layout');
      diagram.classList.remove('mobile-layout');
    }
    
    // Update grid layout
    const grid = diagram.querySelector('.diagram-grid') as HTMLElement;
    if (grid) {
      grid.style.gridTemplateColumns = `repeat(${breakpoint.columns}, 1fr)`;
      grid.style.gap = `${breakpoint.gutters}px`;
    }
  }

  /**
   * Emit breakpoint change event
   */
  private emitBreakpointChange(oldBreakpoint: Breakpoint, newBreakpoint: Breakpoint): void {
    const event = new CustomEvent('breakpoint-change', {
      detail: {
        oldBreakpoint,
        newBreakpoint,
        viewport: this.viewport
      }
    });
    
    document.dispatchEvent(event);
  }

  /**
   * Register responsive element
   */
  registerResponsiveElement(id: string, element: HTMLElement, rules: Map<string, CSSStyleDeclaration>): void {
    this.responsiveElements.set(id, {
      element,
      breakpointRules: rules,
      containerQueries: []
    });
    
    if (this.resizeObserver) {
      this.resizeObserver.observe(element);
    }
  }

  /**
   * Get current viewport information
   */
  getViewport(): ViewportInfo {
    return { ...this.viewport };
  }

  /**
   * Get current breakpoint
   */
  getCurrentBreakpoint(): Breakpoint {
    return { ...this.viewport.currentBreakpoint };
  }

  /**
   * Check if current viewport matches breakpoint
   */
  matchesBreakpoint(breakpointName: string): boolean {
    return this.viewport.currentBreakpoint.name === breakpointName;
  }

  /**
   * Check if viewport is mobile size
   */
  isMobile(): boolean {
    return this.viewport.currentBreakpoint.name === 'xs' || this.viewport.currentBreakpoint.name === 'sm';
  }

  /**
   * Check if viewport is tablet size
   */
  isTablet(): boolean {
    return this.viewport.currentBreakpoint.name === 'md';
  }

  /**
   * Check if viewport is desktop size
   */
  isDesktop(): boolean {
    return ['lg', 'xl', 'xxl'].includes(this.viewport.currentBreakpoint.name);
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    
    this.mediaQueryLists.forEach(mql => {
      mql.removeEventListener('change', () => {});
    });
    
    this.responsiveElements.clear();
    this.mediaQueryLists.clear();
  }
}

// Global responsive design manager instance
export const responsiveDesignManager = new ResponsiveDesignManager();

// Auto-initialize in browser environment
if (typeof window !== 'undefined') {
  // Initialize after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      // Responsive design manager is already initialized in constructor
    });
  }
}