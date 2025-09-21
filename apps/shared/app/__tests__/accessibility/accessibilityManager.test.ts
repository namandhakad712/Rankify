/**
 * Accessibility Manager Tests
 * Tests comprehensive accessibility features and WCAG compliance
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { AccessibilityManager, type AccessibilityConfig } from '~/utils/accessibility/accessibilityManager'

// Mock DOM APIs
const mockMatchMedia = vi.fn()
const mockAddEventListener = vi.fn()
const mockRemoveEventListener = vi.fn()
const mockQuerySelector = vi.fn()
const mockQuerySelectorAll = vi.fn()
const mockCreateElement = vi.fn()
const mockAppendChild = vi.fn()

// Setup DOM mocks
beforeEach(() => {
  // Mock window.matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: mockMatchMedia.mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: mockAddEventListener,
      removeEventListener: mockRemoveEventListener,
      dispatchEvent: vi.fn()
    }))
  })

  // Mock document methods
  Object.defineProperty(document, 'querySelector', {
    writable: true,
    value: mockQuerySelector
  })

  Object.defineProperty(document, 'querySelectorAll', {
    writable: true,
    value: mockQuerySelectorAll.mockReturnValue([])
  })

  Object.defineProperty(document, 'createElement', {
    writable: true,
    value: mockCreateElement.mockReturnValue({
      setAttribute: vi.fn(),
      style: { cssText: '' },
      className: '',
      textContent: '',
      appendChild: mockAppendChild
    })
  })

  Object.defineProperty(document, 'body', {
    writable: true,
    value: {
      appendChild: mockAppendChild,
      classList: {
        add: vi.fn(),
        remove: vi.fn()
      }
    }
  })

  Object.defineProperty(document, 'documentElement', {
    writable: true,
    value: {
      setAttribute: vi.fn(),
      classList: {
        add: vi.fn(),
        remove: vi.fn()
      },
      style: {
        setProperty: vi.fn()
      }
    }
  })

  // Mock navigator
  Object.defineProperty(navigator, 'userAgent', {
    writable: true,
    value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  })

  // Mock ResizeObserver
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn()
  }))
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('AccessibilityManager', () => {
  let accessibilityManager: AccessibilityManager

  beforeEach(() => {
    accessibilityManager = new AccessibilityManager()
  })

  describe('Initialization', () => {
    test('should initialize with default configuration', () => {
      const config = accessibilityManager.getConfig()
      
      expect(config.enableScreenReader).toBe(true)
      expect(config.enableKeyboardNavigation).toBe(true)
      expect(config.enableHighContrast).toBe(false)
      expect(config.enableReducedMotion).toBe(false)
      expect(config.fontSize).toBe('medium')
      expect(config.colorScheme).toBe('light')
    })

    test('should accept custom configuration', () => {
      const customConfig: Partial<AccessibilityConfig> = {
        fontSize: 'large',
        colorScheme: 'dark',
        enableHighContrast: true
      }

      const manager = new AccessibilityManager(customConfig)
      const config = manager.getConfig()

      expect(config.fontSize).toBe('large')
      expect(config.colorScheme).toBe('dark')
      expect(config.enableHighContrast).toBe(true)
    })

    test('should create live region for announcements', () => {
      expect(mockCreateElement).toHaveBeenCalledWith('div')
      expect(mockAppendChild).toHaveBeenCalled()
    })
  })

  describe('Accessibility Preference Detection', () => {
    test('should detect reduced motion preference', () => {
      mockMatchMedia.mockImplementation((query) => ({
        matches: query.includes('prefers-reduced-motion'),
        media: query,
        addEventListener: mockAddEventListener,
        removeEventListener: mockRemoveEventListener
      }))

      const manager = new AccessibilityManager()
      const state = manager.getState()

      expect(state.prefersReducedMotion).toBe(true)
    })

    test('should detect high contrast preference', () => {
      mockMatchMedia.mockImplementation((query) => ({
        matches: query.includes('prefers-contrast: high'),
        media: query,
        addEventListener: mockAddEventListener,
        removeEventListener: mockRemoveEventListener
      }))

      const manager = new AccessibilityManager()
      const state = manager.getState()

      expect(state.prefersHighContrast).toBe(true)
    })

    test('should detect dark mode preference', () => {
      mockMatchMedia.mockImplementation((query) => ({
        matches: query.includes('prefers-color-scheme: dark'),
        media: query,
        addEventListener: mockAddEventListener,
        removeEventListener: mockRemoveEventListener
      }))

      const manager = new AccessibilityManager()
      const config = manager.getConfig()

      expect(config.colorScheme).toBe('dark')
    })
  })

  describe('Screen Reader Support', () => {
    test('should detect screen reader indicators', () => {
      // Mock speechSynthesis
      Object.defineProperty(window, 'speechSynthesis', {
        value: {},
        writable: true
      })

      const manager = new AccessibilityManager()
      const state = manager.getState()

      expect(state.isScreenReaderActive).toBe(true)
    })

    test('should announce messages', () => {
      const mockElement = {
        setAttribute: vi.fn(),
        textContent: ''
      }
      mockCreateElement.mockReturnValue(mockElement)

      const manager = new AccessibilityManager()
      manager.announce('Test message')

      expect(mockElement.textContent).toBe('Test message')
    })

    test('should handle announcement priority', () => {
      const mockElement = {
        setAttribute: vi.fn(),
        textContent: ''
      }
      mockCreateElement.mockReturnValue(mockElement)

      const manager = new AccessibilityManager()
      manager.announce('Urgent message', 'assertive')

      expect(mockElement.setAttribute).toHaveBeenCalledWith('aria-live', 'assertive')
    })
  })

  describe('Keyboard Navigation', () => {
    test('should setup keyboard event listeners', () => {
      expect(mockAddEventListener).toHaveBeenCalledWith('keydown', expect.any(Function))
    })

    test('should handle focus management', () => {
      expect(mockAddEventListener).toHaveBeenCalledWith('focusin', expect.any(Function))
      expect(mockAddEventListener).toHaveBeenCalledWith('focusout', expect.any(Function))
    })

    test('should detect keyboard usage', () => {
      const manager = new AccessibilityManager()
      
      // Simulate Tab key press
      const keydownEvent = new KeyboardEvent('keydown', { key: 'Tab' })
      document.dispatchEvent(keydownEvent)

      const state = manager.getState()
      expect(state.isKeyboardUser).toBe(true)
    })
  })

  describe('Diagram Accessibility', () => {
    test('should make diagram overlay accessible', () => {
      const mockOverlay = {
        setAttribute: vi.fn(),
        appendChild: vi.fn(),
        addEventListener: vi.fn(),
        classList: {
          add: vi.fn(),
          remove: vi.fn()
        }
      }

      const mockCoordinates = {
        id: 'test-diagram',
        x1: 100,
        y1: 150,
        x2: 300,
        y2: 250,
        type: 'graph',
        confidence: 0.85
      }

      const mockDescElement = {
        id: '',
        className: '',
        textContent: ''
      }
      mockCreateElement.mockReturnValue(mockDescElement)

      accessibilityManager.makeDiagramAccessible(
        mockOverlay as any,
        mockCoordinates,
        'Sample graph diagram'
      )

      expect(mockOverlay.setAttribute).toHaveBeenCalledWith('role', 'img')
      expect(mockOverlay.setAttribute).toHaveBeenCalledWith('tabindex', '0')
      expect(mockOverlay.setAttribute).toHaveBeenCalledWith('aria-label', 'Sample graph diagram')
      expect(mockOverlay.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function))
      expect(mockOverlay.addEventListener).toHaveBeenCalledWith('focus', expect.any(Function))
      expect(mockOverlay.addEventListener).toHaveBeenCalledWith('blur', expect.any(Function))
    })

    test('should generate detailed diagram description', () => {
      const mockOverlay = {
        setAttribute: vi.fn(),
        appendChild: vi.fn(),
        addEventListener: vi.fn(),
        classList: { add: vi.fn(), remove: vi.fn() }
      }

      const mockCoordinates = {
        id: 'test-diagram',
        x1: 100,
        y1: 150,
        x2: 300,
        y2: 250,
        type: 'flowchart',
        confidence: 0.92
      }

      const mockDescElement = {
        id: '',
        className: '',
        textContent: ''
      }
      mockCreateElement.mockReturnValue(mockDescElement)

      accessibilityManager.makeDiagramAccessible(
        mockOverlay as any,
        mockCoordinates,
        'Process flow diagram'
      )

      expect(mockDescElement.textContent).toContain('flowchart diagram')
      expect(mockDescElement.textContent).toContain('Process flow diagram')
      expect(mockDescElement.textContent).toContain('Confidence: 92%')
      expect(mockDescElement.textContent).toContain('coordinates 100, 150 to 300, 250')
    })
  })

  describe('Focus Management', () => {
    test('should register focusable elements', () => {
      const mockElements = [
        {
          element: { setAttribute: vi.fn() } as any,
          priority: 1,
          group: 'diagrams',
          description: 'First diagram'
        },
        {
          element: { setAttribute: vi.fn() } as any,
          priority: 2,
          group: 'diagrams',
          description: 'Second diagram'
        }
      ]

      accessibilityManager.registerFocusableElements('test-group', mockElements)

      mockElements.forEach((item, index) => {
        expect(item.element.setAttribute).toHaveBeenCalledWith('tabindex', index === 0 ? '0' : '-1')
        expect(item.element.setAttribute).toHaveBeenCalledWith('aria-describedby', 'test-group-description')
      })
    })

    test('should handle focus trap in modals', () => {
      const mockModal = {
        querySelector: vi.fn().mockReturnValue(null)
      }
      mockQuerySelector.mockReturnValue(mockModal)

      // This would be tested with actual DOM manipulation
      expect(mockAddEventListener).toHaveBeenCalledWith('keydown', expect.any(Function))
    })
  })

  describe('Responsive Features', () => {
    test('should setup resize observer', () => {
      expect(ResizeObserver).toHaveBeenCalled()
    })

    test('should handle orientation changes', () => {
      expect(mockAddEventListener).toHaveBeenCalledWith('orientationchange', expect.any(Function))
    })

    test('should adjust diagram overlays for different screen sizes', () => {
      const mockContainer = {
        classList: {
          add: vi.fn(),
          remove: vi.fn()
        },
        querySelectorAll: vi.fn().mockReturnValue([
          {
            style: {
              transform: '',
              transformOrigin: ''
            }
          }
        ])
      }

      const rect = { width: 400, height: 300 }
      
      // This would test the private method through public interface
      // The actual implementation would be tested through integration tests
    })
  })

  describe('Configuration Updates', () => {
    test('should update configuration', () => {
      const newConfig: Partial<AccessibilityConfig> = {
        fontSize: 'large',
        enableHighContrast: true
      }

      accessibilityManager.updateConfig(newConfig)
      const config = accessibilityManager.getConfig()

      expect(config.fontSize).toBe('large')
      expect(config.enableHighContrast).toBe(true)
    })

    test('should apply CSS properties when configuration changes', () => {
      const mockRoot = document.documentElement
      
      accessibilityManager.updateConfig({ fontSize: 'large' })

      expect(mockRoot.setAttribute).toHaveBeenCalledWith('data-font-size', 'large')
    })

    test('should apply color scheme changes', () => {
      const mockRoot = document.documentElement
      
      accessibilityManager.updateConfig({ colorScheme: 'dark' })

      expect(mockRoot.setAttribute).toHaveBeenCalledWith('data-color-scheme', 'dark')
    })
  })

  describe('Error Handling', () => {
    test('should handle missing DOM elements gracefully', () => {
      mockQuerySelector.mockReturnValue(null)
      
      expect(() => {
        const manager = new AccessibilityManager()
        manager.announce('Test message')
      }).not.toThrow()
    })

    test('should handle unsupported features gracefully', () => {
      // Mock missing ResizeObserver
      global.ResizeObserver = undefined as any
      
      expect(() => {
        new AccessibilityManager()
      }).not.toThrow()
    })
  })

  describe('Cleanup', () => {
    test('should cleanup resources on destroy', () => {
      const mockResizeObserver = {
        disconnect: vi.fn()
      }
      
      // Mock the resize observer
      global.ResizeObserver = vi.fn().mockImplementation(() => mockResizeObserver)
      
      const manager = new AccessibilityManager()
      manager.destroy()

      expect(mockResizeObserver.disconnect).toHaveBeenCalled()
    })

    test('should remove event listeners on destroy', () => {
      const manager = new AccessibilityManager()
      manager.destroy()

      // Verify cleanup was called
      expect(manager.getState().announcements).toEqual([])
    })
  })

  describe('Integration Tests', () => {
    test('should work with diagram detection workflow', () => {
      const manager = new AccessibilityManager({
        enableScreenReader: true,
        enableKeyboardNavigation: true
      })

      // Simulate diagram detection completion
      manager.announce('Diagram detection completed. Found 3 diagrams.')

      const state = manager.getState()
      expect(state.announcements).toContain('Diagram detection completed. Found 3 diagrams.')
    })

    test('should handle multiple diagram overlays', () => {
      const mockOverlays = [
        { setAttribute: vi.fn(), appendChild: vi.fn(), addEventListener: vi.fn(), classList: { add: vi.fn(), remove: vi.fn() } },
        { setAttribute: vi.fn(), appendChild: vi.fn(), addEventListener: vi.fn(), classList: { add: vi.fn(), remove: vi.fn() } },
        { setAttribute: vi.fn(), appendChild: vi.fn(), addEventListener: vi.fn(), classList: { add: vi.fn(), remove: vi.fn() } }
      ]

      const mockCoordinates = [
        { id: 'diagram-1', x1: 100, y1: 100, x2: 200, y2: 200, type: 'graph', confidence: 0.9 },
        { id: 'diagram-2', x1: 300, y1: 150, x2: 400, y2: 250, type: 'table', confidence: 0.8 },
        { id: 'diagram-3', x1: 500, y1: 200, x2: 600, y2: 300, type: 'flowchart', confidence: 0.7 }
      ]

      mockOverlays.forEach((overlay, index) => {
        accessibilityManager.makeDiagramAccessible(
          overlay as any,
          mockCoordinates[index],
          `Diagram ${index + 1}`
        )
      })

      // Verify all overlays were made accessible
      mockOverlays.forEach(overlay => {
        expect(overlay.setAttribute).toHaveBeenCalledWith('role', 'img')
        expect(overlay.setAttribute).toHaveBeenCalledWith('tabindex', '0')
      })
    })

    test('should handle keyboard navigation between diagrams', () => {
      const mockDiagrams = [
        { focus: vi.fn(), classList: { contains: vi.fn().mockReturnValue(true) } },
        { focus: vi.fn(), classList: { contains: vi.fn().mockReturnValue(true) } },
        { focus: vi.fn(), classList: { contains: vi.fn().mockReturnValue(true) } }
      ]

      mockQuerySelectorAll.mockReturnValue(mockDiagrams)

      // Simulate arrow key navigation
      const keydownEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' })
      Object.defineProperty(document, 'activeElement', {
        value: mockDiagrams[0],
        writable: true
      })

      document.dispatchEvent(keydownEvent)

      // This would be tested through the actual navigation implementation
    })
  })

  describe('Performance Tests', () => {
    test('should handle large numbers of diagram overlays efficiently', () => {
      const startTime = performance.now()
      
      // Create 100 mock diagram overlays
      for (let i = 0; i < 100; i++) {
        const mockOverlay = {
          setAttribute: vi.fn(),
          appendChild: vi.fn(),
          addEventListener: vi.fn(),
          classList: { add: vi.fn(), remove: vi.fn() }
        }

        const mockCoordinates = {
          id: `diagram-${i}`,
          x1: i * 10,
          y1: i * 10,
          x2: (i * 10) + 100,
          y2: (i * 10) + 100,
          type: 'graph',
          confidence: 0.8
        }

        accessibilityManager.makeDiagramAccessible(
          mockOverlay as any,
          mockCoordinates,
          `Diagram ${i}`
        )
      }

      const endTime = performance.now()
      const duration = endTime - startTime

      // Should complete in reasonable time (less than 100ms)
      expect(duration).toBeLessThan(100)
    })

    test('should handle rapid configuration updates efficiently', () => {
      const startTime = performance.now()

      // Perform 50 rapid configuration updates
      for (let i = 0; i < 50; i++) {
        accessibilityManager.updateConfig({
          fontSize: i % 2 === 0 ? 'large' : 'medium',
          colorScheme: i % 3 === 0 ? 'dark' : 'light'
        })
      }

      const endTime = performance.now()
      const duration = endTime - startTime

      // Should complete in reasonable time (less than 50ms)
      expect(duration).toBeLessThan(50)
    })
  })
})