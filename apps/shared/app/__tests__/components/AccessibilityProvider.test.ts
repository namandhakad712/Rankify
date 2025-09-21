/**
 * AccessibilityProvider Component Tests
 * Tests Vue component integration with accessibility features
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import AccessibilityProvider from '~/components/accessibility/AccessibilityProvider.vue'
import { accessibilityManager } from '~/utils/accessibility/accessibilityManager'

// Mock the accessibility manager
vi.mock('~/utils/accessibility/accessibilityManager', () => ({
  accessibilityManager: {
    updateConfig: vi.fn(),
    getConfig: vi.fn().mockReturnValue({
      enableScreenReader: true,
      enableKeyboardNavigation: true,
      enableHighContrast: false,
      enableReducedMotion: false,
      enableFocusManagement: true,
      announceChanges: true,
      fontSize: 'medium',
      colorScheme: 'light'
    }),
    getState: vi.fn().mockReturnValue({
      isScreenReaderActive: false,
      isKeyboardUser: false,
      prefersReducedMotion: false,
      prefersHighContrast: false,
      currentFocusElement: null,
      announcements: []
    }),
    announce: vi.fn()
  }
}))

// Mock DOM APIs
const mockAddEventListener = vi.fn()
const mockRemoveEventListener = vi.fn()
const mockQuerySelector = vi.fn()

beforeEach(() => {
  Object.defineProperty(document, 'addEventListener', {
    value: mockAddEventListener,
    writable: true
  })

  Object.defineProperty(document, 'removeEventListener', {
    value: mockRemoveEventListener,
    writable: true
  })

  Object.defineProperty(document, 'querySelector', {
    value: mockQuerySelector,
    writable: true
  })

  vi.clearAllMocks()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('AccessibilityProvider', () => {
  let wrapper: VueWrapper<any>

  beforeEach(() => {
    wrapper = mount(AccessibilityProvider, {
      slots: {
        default: '<div id="test-content">Test Content</div>'
      }
    })
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('Component Rendering', () => {
    test('should render with default configuration', () => {
      expect(wrapper.exists()).toBe(true)
      expect(wrapper.find('.accessibility-provider').exists()).toBe(true)
    })

    test('should render skip links', () => {
      const skipLinks = wrapper.find('.skip-links')
      expect(skipLinks.exists()).toBe(true)
      
      const links = skipLinks.findAll('a')
      expect(links).toHaveLength(3)
      expect(links[0].attributes('href')).toBe('#main-content')
      expect(links[1].attributes('href')).toBe('#navigation')
      expect(links[2].attributes('href')).toBe('#search')
    })

    test('should render live region for announcements', () => {
      const liveRegion = wrapper.find('[aria-live="polite"]')
      expect(liveRegion.exists()).toBe(true)
      expect(liveRegion.attributes('aria-atomic')).toBe('true')
      expect(liveRegion.classes()).toContain('sr-only')
    })

    test('should render slot content', () => {
      const content = wrapper.find('#test-content')
      expect(content.exists()).toBe(true)
      expect(content.text()).toBe('Test Content')
    })
  })

  describe('Configuration Management', () => {
    test('should initialize with default configuration', () => {
      const provider = wrapper.vm
      const config = provider.getConfig()
      
      expect(config.enableScreenReader).toBe(true)
      expect(config.enableKeyboardNavigation).toBe(true)
      expect(config.fontSize).toBe('medium')
      expect(config.colorScheme).toBe('light')
    })

    test('should accept initial configuration', () => {
      const customConfig = {
        fontSize: 'large',
        colorScheme: 'dark',
        enableHighContrast: true
      }

      const customWrapper = mount(AccessibilityProvider, {
        props: {
          initialConfig: customConfig
        }
      })

      const provider = customWrapper.vm
      const config = provider.getConfig()
      
      expect(config.fontSize).toBe('large')
      expect(config.colorScheme).toBe('dark')
      expect(config.enableHighContrast).toBe(true)

      customWrapper.unmount()
    })

    test('should update configuration when settings change', async () => {
      await wrapper.vm.showAccessibilitySettings()
      await nextTick()

      const fontSizeSelect = wrapper.find('#font-size-select')
      await fontSizeSelect.setValue('large')

      expect(accessibilityManager.updateConfig).toHaveBeenCalled()
    })

    test('should reset configuration to defaults', async () => {
      await wrapper.vm.showAccessibilitySettings()
      await nextTick()

      const resetButton = wrapper.find('.reset-button')
      await resetButton.trigger('click')

      expect(accessibilityManager.updateConfig).toHaveBeenCalledWith({
        enableScreenReader: true,
        enableKeyboardNavigation: true,
        enableHighContrast: false,
        enableReducedMotion: false,
        enableFocusManagement: true,
        announceChanges: true,
        fontSize: 'medium',
        colorScheme: 'light'
      })
    })
  })

  describe('Keyboard Shortcuts', () => {
    test('should show keyboard shortcuts help', async () => {
      await wrapper.vm.showKeyboardShortcutsHelp()
      await nextTick()

      const shortcutsDialog = wrapper.find('.keyboard-shortcuts')
      expect(shortcutsDialog.exists()).toBe(true)
      expect(shortcutsDialog.attributes('role')).toBe('dialog')
      expect(shortcutsDialog.attributes('aria-modal')).toBe('true')
    })

    test('should hide keyboard shortcuts help', async () => {
      await wrapper.vm.showKeyboardShortcutsHelp()
      await nextTick()

      const closeButton = wrapper.find('.keyboard-shortcuts .close-button')
      await closeButton.trigger('click')
      await nextTick()

      const shortcutsDialog = wrapper.find('.keyboard-shortcuts')
      expect(shortcutsDialog.exists()).toBe(false)
    })

    test('should handle global keyboard shortcuts', async () => {
      const keydownEvent = new KeyboardEvent('keydown', {
        key: '1',
        altKey: true
      })

      mockQuerySelector.mockReturnValue({
        focus: vi.fn()
      })

      document.dispatchEvent(keydownEvent)

      expect(mockQuerySelector).toHaveBeenCalledWith('main, [role="main"], #main-content')
    })

    test('should handle escape key', async () => {
      await wrapper.vm.showKeyboardShortcutsHelp()
      await nextTick()

      const escapeEvent = new KeyboardEvent('keydown', {
        key: 'Escape'
      })

      document.dispatchEvent(escapeEvent)
      await nextTick()

      const shortcutsDialog = wrapper.find('.keyboard-shortcuts')
      expect(shortcutsDialog.exists()).toBe(false)
    })
  })

  describe('Accessibility Settings', () => {
    test('should show accessibility settings dialog', async () => {
      await wrapper.vm.showAccessibilitySettings()
      await nextTick()

      const settingsDialog = wrapper.find('.accessibility-settings')
      expect(settingsDialog.exists()).toBe(true)
      expect(settingsDialog.attributes('role')).toBe('dialog')
      expect(settingsDialog.attributes('aria-modal')).toBe('true')
    })

    test('should hide accessibility settings dialog', async () => {
      await wrapper.vm.showAccessibilitySettings()
      await nextTick()

      const closeButton = wrapper.find('.accessibility-settings .close-button')
      await closeButton.trigger('click')
      await nextTick()

      const settingsDialog = wrapper.find('.accessibility-settings')
      expect(settingsDialog.exists()).toBe(false)
    })

    test('should update font size setting', async () => {
      await wrapper.vm.showAccessibilitySettings()
      await nextTick()

      const fontSizeSelect = wrapper.find('#font-size-select')
      await fontSizeSelect.setValue('large')

      expect(accessibilityManager.updateConfig).toHaveBeenCalled()
      expect(accessibilityManager.announce).toHaveBeenCalledWith('Settings updated')
    })

    test('should update color scheme setting', async () => {
      await wrapper.vm.showAccessibilitySettings()
      await nextTick()

      const colorSchemeSelect = wrapper.find('#color-scheme-select')
      await colorSchemeSelect.setValue('dark')

      expect(accessibilityManager.updateConfig).toHaveBeenCalled()
    })

    test('should toggle boolean settings', async () => {
      await wrapper.vm.showAccessibilitySettings()
      await nextTick()

      const reducedMotionCheckbox = wrapper.find('input[type="checkbox"]')
      await reducedMotionCheckbox.setChecked(true)

      expect(accessibilityManager.updateConfig).toHaveBeenCalled()
    })
  })

  describe('Announcements', () => {
    test('should announce messages', async () => {
      await wrapper.vm.announce('Test announcement')

      expect(accessibilityManager.announce).toHaveBeenCalledWith('Test announcement', 'polite')
      expect(wrapper.vm.currentAnnouncement).toBe('Test announcement')
    })

    test('should handle announcement priority', async () => {
      await wrapper.vm.announce('Urgent message', 'assertive')

      expect(accessibilityManager.announce).toHaveBeenCalledWith('Urgent message', 'assertive')
    })

    test('should clear announcements after delay', async () => {
      vi.useFakeTimers()
      
      await wrapper.vm.announce('Test message')
      expect(wrapper.vm.currentAnnouncement).toBe('Test message')

      vi.advanceTimersByTime(1000)
      await nextTick()

      expect(wrapper.vm.currentAnnouncement).toBe('')
      
      vi.useRealTimers()
    })

    test('should not announce when disabled', async () => {
      await wrapper.vm.updateConfig({ announceChanges: false })
      await wrapper.vm.announce('Test message')

      expect(wrapper.vm.currentAnnouncement).toBe('')
    })
  })

  describe('CSS Classes', () => {
    test('should apply accessibility classes based on configuration', async () => {
      await wrapper.vm.updateConfig({
        enableHighContrast: true,
        enableReducedMotion: true
      })
      await nextTick()

      const provider = wrapper.find('.accessibility-provider')
      expect(provider.classes()).toContain('high-contrast')
      expect(provider.classes()).toContain('reduce-motion')
    })

    test('should apply data attributes for configuration', async () => {
      await wrapper.vm.updateConfig({
        fontSize: 'large',
        colorScheme: 'dark'
      })
      await nextTick()

      const provider = wrapper.find('.accessibility-provider')
      expect(provider.attributes('data-font-size')).toBe('large')
      expect(provider.attributes('data-color-scheme')).toBe('dark')
    })

    test('should apply state-based classes', () => {
      // Mock state changes
      vi.mocked(accessibilityManager.getState).mockReturnValue({
        isScreenReaderActive: true,
        isKeyboardUser: true,
        prefersReducedMotion: false,
        prefersHighContrast: false,
        currentFocusElement: null,
        announcements: []
      })

      const newWrapper = mount(AccessibilityProvider)
      const provider = newWrapper.find('.accessibility-provider')
      
      expect(provider.classes()).toContain('keyboard-user')
      expect(provider.classes()).toContain('screen-reader-active')

      newWrapper.unmount()
    })
  })

  describe('Event Handling', () => {
    test('should setup keyboard event listeners on mount', () => {
      expect(mockAddEventListener).toHaveBeenCalledWith('keydown', expect.any(Function))
    })

    test('should cleanup event listeners on unmount', () => {
      wrapper.unmount()
      expect(mockRemoveEventListener).toHaveBeenCalledWith('keydown', expect.any(Function))
    })

    test('should handle focus navigation shortcuts', () => {
      const mockMainElement = { focus: vi.fn() }
      mockQuerySelector.mockReturnValue(mockMainElement)

      const altOneEvent = new KeyboardEvent('keydown', {
        key: '1',
        altKey: true
      })

      document.dispatchEvent(altOneEvent)

      expect(mockQuerySelector).toHaveBeenCalledWith('main, [role="main"], #main-content')
      expect(mockMainElement.focus).toHaveBeenCalled()
    })
  })

  describe('Integration Tests', () => {
    test('should work with accessibility manager', () => {
      expect(accessibilityManager.updateConfig).toHaveBeenCalled()
    })

    test('should handle configuration watchers', async () => {
      const provider = wrapper.vm
      
      // Update configuration directly
      provider.config.fontSize = 'large'
      await nextTick()

      expect(accessibilityManager.updateConfig).toHaveBeenCalled()
    })

    test('should expose methods for parent components', () => {
      const provider = wrapper.vm
      
      expect(typeof provider.announce).toBe('function')
      expect(typeof provider.showKeyboardShortcutsHelp).toBe('function')
      expect(typeof provider.showAccessibilitySettings).toBe('function')
      expect(typeof provider.updateConfig).toBe('function')
      expect(typeof provider.resetSettings).toBe('function')
      expect(typeof provider.getConfig).toBe('function')
      expect(typeof provider.getState).toBe('function')
    })
  })

  describe('Responsive Behavior', () => {
    test('should handle mobile layout in settings dialog', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        value: 480,
        writable: true
      })

      await wrapper.vm.showAccessibilitySettings()
      await nextTick()

      const settingsDialog = wrapper.find('.accessibility-settings')
      expect(settingsDialog.exists()).toBe(true)
      
      // Mobile styles would be applied via CSS media queries
    })

    test('should handle keyboard shortcuts dialog on mobile', async () => {
      Object.defineProperty(window, 'innerWidth', {
        value: 480,
        writable: true
      })

      await wrapper.vm.showKeyboardShortcutsHelp()
      await nextTick()

      const shortcutsDialog = wrapper.find('.keyboard-shortcuts')
      expect(shortcutsDialog.exists()).toBe(true)
    })
  })

  describe('Error Handling', () => {
    test('should handle missing DOM elements gracefully', () => {
      mockQuerySelector.mockReturnValue(null)

      const altOneEvent = new KeyboardEvent('keydown', {
        key: '1',
        altKey: true
      })

      expect(() => {
        document.dispatchEvent(altOneEvent)
      }).not.toThrow()
    })

    test('should handle accessibility manager errors gracefully', () => {
      vi.mocked(accessibilityManager.updateConfig).mockImplementation(() => {
        throw new Error('Test error')
      })

      expect(() => {
        wrapper.vm.updateConfig({ fontSize: 'large' })
      }).not.toThrow()
    })
  })

  describe('Performance Tests', () => {
    test('should handle rapid configuration updates efficiently', async () => {
      const startTime = performance.now()

      // Perform 50 rapid updates
      for (let i = 0; i < 50; i++) {
        await wrapper.vm.updateConfig({
          fontSize: i % 2 === 0 ? 'large' : 'medium'
        })
      }

      const endTime = performance.now()
      const duration = endTime - startTime

      // Should complete in reasonable time
      expect(duration).toBeLessThan(100)
    })

    test('should handle multiple announcements efficiently', async () => {
      const startTime = performance.now()

      // Make 20 rapid announcements
      for (let i = 0; i < 20; i++) {
        await wrapper.vm.announce(`Message ${i}`)
      }

      const endTime = performance.now()
      const duration = endTime - startTime

      // Should complete in reasonable time
      expect(duration).toBeLessThan(50)
    })
  })
})