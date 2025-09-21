/**
 * Accessibility Manager for Advanced Diagram Detection System
 * Provides comprehensive accessibility features and WCAG compliance
 */

export interface AccessibilityConfig {
  enableScreenReader: boolean;
  enableKeyboardNavigation: boolean;
  enableHighContrast: boolean;
  enableReducedMotion: boolean;
  enableFocusManagement: boolean;
  announceChanges: boolean;
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  colorScheme: 'light' | 'dark' | 'high-contrast';
}

export interface AccessibilityState {
  isScreenReaderActive: boolean;
  isKeyboardUser: boolean;
  prefersReducedMotion: boolean;
  prefersHighContrast: boolean;
  currentFocusElement: HTMLElement | null;
  announcements: string[];
}

export interface FocusableElement {
  element: HTMLElement;
  priority: number;
  group: string;
  description: string;
}

export class AccessibilityManager {
  private config: AccessibilityConfig;
  private state: AccessibilityState;
  private focusableElements: Map<string, FocusableElement[]> = new Map();
  private announcer: HTMLElement | null = null;
  private keyboardListeners: Map<string, (event: KeyboardEvent) => void> = new Map();
  private resizeObserver: ResizeObserver | null = null;

  constructor(config: Partial<AccessibilityConfig> = {}) {
    this.config = {
      enableScreenReader: true,
      enableKeyboardNavigation: true,
      enableHighContrast: false,
      enableReducedMotion: false,
      enableFocusManagement: true,
      announceChanges: true,
      fontSize: 'medium',
      colorScheme: 'light',
      ...config
    };

    this.state = {
      isScreenReaderActive: false,
      isKeyboardUser: false,
      prefersReducedMotion: false,
      prefersHighContrast: false,
      currentFocusElement: null,
      announcements: []
    };

    this.initialize();
  }

  /**
   * Initialize accessibility features
   */
  private initialize(): void {
    this.detectAccessibilityPreferences();
    this.setupScreenReaderSupport();
    this.setupKeyboardNavigation();
    this.setupFocusManagement();
    this.setupResponsiveFeatures();
    this.applyAccessibilitySettings();
  }

  /**
   * Detect user accessibility preferences
   */
  private detectAccessibilityPreferences(): void {
    if (typeof window === 'undefined') return;

    // Detect reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.state.prefersReducedMotion = prefersReducedMotion;
    this.config.enableReducedMotion = prefersReducedMotion;

    // Detect high contrast preference
    const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches;
    this.state.prefersHighContrast = prefersHighContrast;
    this.config.enableHighContrast = prefersHighContrast;

    // Detect color scheme preference
    const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDarkMode) {
      this.config.colorScheme = 'dark';
    }

    // Detect screen reader usage
    this.detectScreenReader();

    // Listen for preference changes
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
      this.state.prefersReducedMotion = e.matches;
      this.config.enableReducedMotion = e.matches;
      this.applyAccessibilitySettings();
    });

    window.matchMedia('(prefers-contrast: high)').addEventListener('change', (e) => {
      this.state.prefersHighContrast = e.matches;
      this.config.enableHighContrast = e.matches;
      this.applyAccessibilitySettings();
    });
  }

  /**
   * Detect screen reader usage
   */
  private detectScreenReader(): void {
    // Check for common screen reader indicators
    const indicators = [
      'speechSynthesis' in window,
      navigator.userAgent.includes('NVDA'),
      navigator.userAgent.includes('JAWS'),
      navigator.userAgent.includes('VoiceOver'),
      'webkitSpeechSynthesis' in window
    ];

    this.state.isScreenReaderActive = indicators.some(indicator => indicator);

    // Detect keyboard-only navigation
    let keyboardUsed = false;
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        keyboardUsed = true;
        this.state.isKeyboardUser = true;
        document.body.classList.add('keyboard-user');
      }
    });

    document.addEventListener('mousedown', () => {
      if (keyboardUsed) {
        document.body.classList.remove('keyboard-user');
        this.state.isKeyboardUser = false;
      }
    });
  }

  /**
   * Setup screen reader support
   */
  private setupScreenReaderSupport(): void {
    if (!this.config.enableScreenReader) return;

    // Create live region for announcements
    this.announcer = document.createElement('div');
    this.announcer.setAttribute('aria-live', 'polite');
    this.announcer.setAttribute('aria-atomic', 'true');
    this.announcer.className = 'sr-only';
    this.announcer.style.cssText = `
      position: absolute !important;
      width: 1px !important;
      height: 1px !important;
      padding: 0 !important;
      margin: -1px !important;
      overflow: hidden !important;
      clip: rect(0, 0, 0, 0) !important;
      white-space: nowrap !important;
      border: 0 !important;
    `;
    document.body.appendChild(this.announcer);
  }

  /**
   * Setup keyboard navigation
   */
  private setupKeyboardNavigation(): void {
    if (!this.config.enableKeyboardNavigation) return;

    // Global keyboard shortcuts
    const shortcuts = {
      'Alt+1': () => this.focusMainContent(),
      'Alt+2': () => this.focusNavigation(),
      'Alt+3': () => this.focusSearch(),
      'Escape': () => this.handleEscape(),
      'F6': () => this.cycleFocusGroups(),
      'Ctrl+/': () => this.showKeyboardShortcuts()
    };

    document.addEventListener('keydown', (event) => {
      const key = this.getKeyboardShortcut(event);
      const handler = shortcuts[key as keyof typeof shortcuts];
      
      if (handler) {
        event.preventDefault();
        handler();
      }
    });

    // Arrow key navigation for diagram overlays
    this.setupArrowKeyNavigation();
  }

  /**
   * Setup arrow key navigation for diagrams
   */
  private setupArrowKeyNavigation(): void {
    document.addEventListener('keydown', (event) => {
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      
      const activeElement = document.activeElement as HTMLElement;
      if (!activeElement?.classList.contains('diagram-overlay')) return;

      event.preventDefault();
      this.navigateDiagrams(activeElement, event.key);
    });
  }

  /**
   * Navigate between diagram overlays using arrow keys
   */
  private navigateDiagrams(currentElement: HTMLElement, direction: string): void {
    const diagrams = Array.from(document.querySelectorAll('.diagram-overlay')) as HTMLElement[];
    const currentIndex = diagrams.indexOf(currentElement);
    
    if (currentIndex === -1) return;

    let nextIndex: number;
    
    switch (direction) {
      case 'ArrowUp':
        nextIndex = Math.max(0, currentIndex - 1);
        break;
      case 'ArrowDown':
        nextIndex = Math.min(diagrams.length - 1, currentIndex + 1);
        break;
      case 'ArrowLeft':
        nextIndex = Math.max(0, currentIndex - 1);
        break;
      case 'ArrowRight':
        nextIndex = Math.min(diagrams.length - 1, currentIndex + 1);
        break;
      default:
        return;
    }

    if (nextIndex !== currentIndex) {
      diagrams[nextIndex].focus();
      this.announce(`Focused on ${this.getDiagramDescription(diagrams[nextIndex])}`);
    }
  }

  /**
   * Setup focus management
   */
  private setupFocusManagement(): void {
    if (!this.config.enableFocusManagement) return;

    // Track focus changes
    document.addEventListener('focusin', (event) => {
      this.state.currentFocusElement = event.target as HTMLElement;
      this.updateFocusIndicators();
    });

    document.addEventListener('focusout', () => {
      setTimeout(() => {
        if (!document.activeElement || document.activeElement === document.body) {
          this.state.currentFocusElement = null;
        }
      }, 0);
    });

    // Trap focus in modals
    this.setupFocusTrap();
  }

  /**
   * Setup focus trap for modals and dialogs
   */
  private setupFocusTrap(): void {
    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Tab') return;

      const modal = document.querySelector('[role="dialog"]:not([aria-hidden="true"])') as HTMLElement;
      if (!modal) return;

      const focusableElements = this.getFocusableElements(modal);
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    });
  }

  /**
   * Setup responsive features
   */
  private setupResponsiveFeatures(): void {
    if (typeof window === 'undefined') return;

    // Setup resize observer for responsive adjustments
    this.resizeObserver = new ResizeObserver((entries) => {
      entries.forEach((entry) => {
        this.handleResize(entry.target as HTMLElement, entry.contentRect);
      });
    });

    // Observe main containers
    const containers = document.querySelectorAll('.diagram-container, .question-panel, .review-interface');
    containers.forEach(container => {
      this.resizeObserver?.observe(container);
    });

    // Handle orientation changes
    window.addEventListener('orientationchange', () => {
      setTimeout(() => this.handleOrientationChange(), 100);
    });
  }

  /**
   * Apply accessibility settings
   */
  private applyAccessibilitySettings(): void {
    const root = document.documentElement;

    // Apply font size
    root.setAttribute('data-font-size', this.config.fontSize);
    
    // Apply color scheme
    root.setAttribute('data-color-scheme', this.config.colorScheme);
    
    // Apply reduced motion
    if (this.config.enableReducedMotion) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }

    // Apply high contrast
    if (this.config.enableHighContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    // Update CSS custom properties
    this.updateCSSProperties();
  }

  /**
   * Update CSS custom properties for accessibility
   */
  private updateCSSProperties(): void {
    const root = document.documentElement;
    
    // Font size scale
    const fontSizes = {
      'small': '0.875',
      'medium': '1',
      'large': '1.125',
      'extra-large': '1.25'
    };
    
    root.style.setProperty('--font-size-scale', fontSizes[this.config.fontSize]);

    // Color scheme variables
    if (this.config.colorScheme === 'dark') {
      root.style.setProperty('--bg-primary', '#1a1a1a');
      root.style.setProperty('--text-primary', '#ffffff');
      root.style.setProperty('--border-color', '#404040');
    } else if (this.config.colorScheme === 'high-contrast') {
      root.style.setProperty('--bg-primary', '#000000');
      root.style.setProperty('--text-primary', '#ffffff');
      root.style.setProperty('--border-color', '#ffffff');
    } else {
      root.style.setProperty('--bg-primary', '#ffffff');
      root.style.setProperty('--text-primary', '#000000');
      root.style.setProperty('--border-color', '#e0e0e0');
    }
  }

  /**
   * Announce message to screen readers
   */
  announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    if (!this.config.announceChanges || !this.announcer) return;

    this.state.announcements.push(message);
    this.announcer.setAttribute('aria-live', priority);
    this.announcer.textContent = message;

    // Clear after announcement
    setTimeout(() => {
      if (this.announcer) {
        this.announcer.textContent = '';
      }
    }, 1000);
  }

  /**
   * Register focusable elements for a group
   */
  registerFocusableElements(groupId: string, elements: FocusableElement[]): void {
    this.focusableElements.set(groupId, elements);
    
    // Add ARIA attributes
    elements.forEach((item, index) => {
      const element = item.element;
      element.setAttribute('tabindex', index === 0 ? '0' : '-1');
      element.setAttribute('role', element.getAttribute('role') || 'button');
      element.setAttribute('aria-describedby', `${groupId}-description`);
      
      if (item.description) {
        element.setAttribute('aria-label', item.description);
      }
    });
  }

  /**
   * Make diagram overlay accessible
   */
  makeDiagramAccessible(
    overlay: HTMLElement, 
    coordinates: any, 
    description: string
  ): void {
    // Add ARIA attributes
    overlay.setAttribute('role', 'img');
    overlay.setAttribute('tabindex', '0');
    overlay.setAttribute('aria-label', description);
    overlay.setAttribute('aria-describedby', `diagram-${coordinates.id}-desc`);

    // Add detailed description
    const descElement = document.createElement('div');
    descElement.id = `diagram-${coordinates.id}-desc`;
    descElement.className = 'sr-only';
    descElement.textContent = this.generateDiagramDescription(coordinates, description);
    overlay.appendChild(descElement);

    // Add keyboard interaction
    overlay.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        this.activateDiagram(overlay, coordinates);
      }
    });

    // Add focus indicators
    overlay.addEventListener('focus', () => {
      overlay.classList.add('focused');
      this.announce(`Focused on diagram: ${description}`);
    });

    overlay.addEventListener('blur', () => {
      overlay.classList.remove('focused');
    });
  }

  /**
   * Generate detailed diagram description for screen readers
   */
  private generateDiagramDescription(coordinates: any, description: string): string {
    const type = coordinates.type || 'diagram';
    const confidence = Math.round((coordinates.confidence || 0) * 100);
    const position = `located at coordinates ${coordinates.x1}, ${coordinates.y1} to ${coordinates.x2}, ${coordinates.y2}`;
    
    return `${type} diagram: ${description}. Confidence: ${confidence}%. Position: ${position}. Press Enter to interact with this diagram.`;
  }

  /**
   * Handle diagram activation
   */
  private activateDiagram(overlay: HTMLElement, coordinates: any): void {
    // Emit custom event for diagram interaction
    const event = new CustomEvent('diagram-activated', {
      detail: { overlay, coordinates }
    });
    overlay.dispatchEvent(event);
    
    this.announce(`Activated diagram: ${overlay.getAttribute('aria-label')}`);
  }

  /**
   * Get focusable elements within a container
   */
  private getFocusableElements(container: HTMLElement): HTMLElement[] {
    const selector = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[role="button"]:not([disabled])',
      '[role="link"]:not([disabled])'
    ].join(', ');

    return Array.from(container.querySelectorAll(selector)) as HTMLElement[];
  }

  /**
   * Handle resize events for responsive adjustments
   */
  private handleResize(element: HTMLElement, rect: DOMRectReadOnly): void {
    // Adjust diagram overlays for different screen sizes
    if (element.classList.contains('diagram-container')) {
      this.adjustDiagramOverlays(element, rect);
    }

    // Adjust font sizes for readability
    if (rect.width < 768) {
      element.classList.add('mobile-layout');
    } else {
      element.classList.remove('mobile-layout');
    }
  }

  /**
   * Adjust diagram overlays for responsive design
   */
  private adjustDiagramOverlays(container: HTMLElement, rect: DOMRectReadOnly): void {
    const overlays = container.querySelectorAll('.diagram-overlay') as NodeListOf<HTMLElement>;
    
    overlays.forEach(overlay => {
      const scale = Math.min(rect.width / 800, rect.height / 600);
      overlay.style.transform = `scale(${scale})`;
      overlay.style.transformOrigin = 'top left';
    });
  }

  /**
   * Handle orientation change
   */
  private handleOrientationChange(): void {
    // Recalculate layouts and announce orientation
    const orientation = window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
    this.announce(`Screen orientation changed to ${orientation}`);
    
    // Trigger resize adjustments
    window.dispatchEvent(new Event('resize'));
  }

  /**
   * Utility methods for keyboard shortcuts
   */
  private getKeyboardShortcut(event: KeyboardEvent): string {
    const parts = [];
    if (event.ctrlKey) parts.push('Ctrl');
    if (event.altKey) parts.push('Alt');
    if (event.shiftKey) parts.push('Shift');
    if (event.metaKey) parts.push('Meta');
    parts.push(event.key);
    return parts.join('+');
  }

  private focusMainContent(): void {
    const main = document.querySelector('main, [role="main"]') as HTMLElement;
    if (main) {
      main.focus();
      this.announce('Focused on main content');
    }
  }

  private focusNavigation(): void {
    const nav = document.querySelector('nav, [role="navigation"]') as HTMLElement;
    if (nav) {
      nav.focus();
      this.announce('Focused on navigation');
    }
  }

  private focusSearch(): void {
    const search = document.querySelector('input[type="search"], [role="search"] input') as HTMLElement;
    if (search) {
      search.focus();
      this.announce('Focused on search');
    }
  }

  private handleEscape(): void {
    // Close modals, dropdowns, etc.
    const modal = document.querySelector('[role="dialog"]:not([aria-hidden="true"])') as HTMLElement;
    if (modal) {
      const closeButton = modal.querySelector('[aria-label*="close"], .close-button') as HTMLElement;
      if (closeButton) {
        closeButton.click();
      }
    }
  }

  private cycleFocusGroups(): void {
    // Cycle through registered focus groups
    const groups = Array.from(this.focusableElements.keys());
    if (groups.length === 0) return;

    // Implementation for cycling focus groups
    this.announce('Cycling through focus groups');
  }

  private showKeyboardShortcuts(): void {
    // Show keyboard shortcuts help
    this.announce('Keyboard shortcuts: Alt+1 for main content, Alt+2 for navigation, Escape to close dialogs');
  }

  private updateFocusIndicators(): void {
    // Update visual focus indicators
    document.querySelectorAll('.focus-indicator').forEach(el => {
      el.classList.remove('active');
    });

    if (this.state.currentFocusElement) {
      this.state.currentFocusElement.classList.add('focus-indicator', 'active');
    }
  }

  private getDiagramDescription(element: HTMLElement): string {
    return element.getAttribute('aria-label') || 'diagram';
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<AccessibilityConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.applyAccessibilitySettings();
  }

  /**
   * Get current accessibility state
   */
  getState(): AccessibilityState {
    return { ...this.state };
  }

  /**
   * Get current configuration
   */
  getConfig(): AccessibilityConfig {
    return { ...this.config };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.announcer) {
      this.announcer.remove();
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    this.keyboardListeners.clear();
    this.focusableElements.clear();
  }
}

// Global accessibility manager instance
export const accessibilityManager = new AccessibilityManager();

// Auto-initialize in browser environment
if (typeof window !== 'undefined') {
  // Initialize after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      // Accessibility manager is already initialized in constructor
    });
  }
}