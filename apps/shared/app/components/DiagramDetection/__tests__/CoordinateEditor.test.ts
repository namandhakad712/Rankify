/**
 * Unit Tests for Coordinate Editor Components
 * 
 * This file contains comprehensive tests for the coordinate editing
 * components and their interactive features.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import type { DiagramCoordinates } from '~/shared/types/diagram-detection'
import CoordinateEditor from '../CoordinateEditor.vue'
import CoordinateInputPanel from '../CoordinateInputPanel.vue'
import TransformToolsPanel from '../TransformToolsPanel.vue'

// Mock UI components
vi.mock('~/components/ui/input', () => ({
  default: { template: '<input v-bind="$attrs" v-on="$listeners" />' }
}))

vi.mock('~/components/ui/button', () => ({
  default: { template: '<button v-bind="$attrs" v-on="$listeners"><slot /></button>' }
}))

vi.mock('~/components/ui/select', () => ({
  default: { template: '<select v-bind="$attrs" v-on="$listeners"><slot /></select>' }
}))

describe('CoordinateEditor', () => {
  let mockDiagram: DiagramCoordinates
  let mockImageDimensions: { width: number; height: number }

  beforeEach(() => {
    mockDiagram = {
      x1: 100,
      y1: 150,
      x2: 300,
      y2: 250,
      confidence: 0.9,
      type: 'graph',
      description: 'Test diagram'
    }

    mockImageDimensions = {
      width: 800,
      height: 600
    }

    // Mock canvas context
    global.HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
      clearRect: vi.fn(),
      fillStyle: '',
      fillRect: vi.fn(),
      strokeStyle: '',
      lineWidth: 0,
      strokeRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn()
    }))
  })

  describe('Component Initialization', () => {
    it('should render with provided diagram and image dimensions', () => {
      const wrapper = mount(CoordinateEditor, {
        props: {
          diagram: mockDiagram,
          imageDimensions: mockImageDimensions
        }
      })

      expect(wrapper.exists()).toBe(true)
      expect(wrapper.find('h4').text()).toContain('Coordinate Editor')
    })

    it('should initialize with correct coordinate values', () => {
      const wrapper = mount(CoordinateEditor, {
        props: {
          diagram: mockDiagram,
          imageDimensions: mockImageDimensions
        }
      })

      const vm = wrapper.vm as any
      expect(vm.editableCoords.x1).toBe(100)
      expect(vm.editableCoords.y1).toBe(150)
      expect(vm.editableCoords.x2).toBe(300)
      expect(vm.editableCoords.y2).toBe(250)
    })

    it('should calculate dimensions correctly', () => {
      const wrapper = mount(CoordinateEditor, {
        props: {
          diagram: mockDiagram,
          imageDimensions: mockImageDimensions
        }
      })

      const vm = wrapper.vm as any
      expect(vm.width).toBe(200) // 300 - 100
      expect(vm.height).toBe(100) // 250 - 150
      expect(vm.aspectRatio).toBe('2.00:1')
    })
  })

  describe('Coordinate Validation', () => {
    it('should validate coordinate bounds', () => {
      const wrapper = mount(CoordinateEditor, {
        props: {
          diagram: mockDiagram,
          imageDimensions: mockImageDimensions
        }
      })

      const vm = wrapper.vm as any
      
      // Set invalid coordinates
      vm.editableCoords.x1 = -10
      vm.editableCoords.x2 = 900 // Beyond image width
      
      vm.validateAndUpdate()
      
      expect(vm.validationErrors).toContain('Coordinates must be within image width')
    })

    it('should validate coordinate order', () => {
      const wrapper = mount(CoordinateEditor, {
        props: {
          diagram: mockDiagram,
          imageDimensions: mockImageDimensions
        }
      })

      const vm = wrapper.vm as any
      
      // Set wrong order
      vm.editableCoords.x2 = 50 // Less than x1
      vm.editableCoords.y2 = 100 // Less than y1
      
      vm.validateAndUpdate()
      
      expect(vm.validationErrors).toContain('Right edge must be greater than left edge')
      expect(vm.validationErrors).toContain('Bottom edge must be greater than top edge')
    })

    it('should validate minimum size', () => {
      const wrapper = mount(CoordinateEditor, {
        props: {
          diagram: mockDiagram,
          imageDimensions: mockImageDimensions
        }
      })

      const vm = wrapper.vm as any
      
      // Set too small size
      vm.editableCoords.x2 = 105 // Only 5px wide
      vm.editableCoords.y2 = 155 // Only 5px tall
      
      vm.validateAndUpdate()
      
      expect(vm.validationErrors).toContain('Diagram must be at least 10x10 pixels')
    })
  })

  describe('Quick Adjustments', () => {
    it('should expand diagram by specified amount', () => {
      const wrapper = mount(CoordinateEditor, {
        props: {
          diagram: mockDiagram,
          imageDimensions: mockImageDimensions
        }
      })

      const vm = wrapper.vm as any
      const originalCoords = { ...vm.editableCoords }
      
      vm.expandBy(10)
      
      expect(vm.editableCoords.x1).toBe(originalCoords.x1 - 10)
      expect(vm.editableCoords.y1).toBe(originalCoords.y1 - 10)
      expect(vm.editableCoords.x2).toBe(originalCoords.x2 + 10)
      expect(vm.editableCoords.y2).toBe(originalCoords.y2 + 10)
    })

    it('should shrink diagram by specified amount', () => {
      const wrapper = mount(CoordinateEditor, {
        props: {
          diagram: mockDiagram,
          imageDimensions: mockImageDimensions
        }
      })

      const vm = wrapper.vm as any
      const originalWidth = vm.width
      const originalHeight = vm.height
      
      vm.shrinkBy(10)
      
      expect(vm.width).toBe(originalWidth - 20) // 10px from each side
      expect(vm.height).toBe(originalHeight - 20)
    })

    it('should center diagram in image', () => {
      const wrapper = mount(CoordinateEditor, {
        props: {
          diagram: mockDiagram,
          imageDimensions: mockImageDimensions
        }
      })

      const vm = wrapper.vm as any
      const originalWidth = vm.width
      const originalHeight = vm.height
      
      vm.centerDiagram()
      
      const expectedCenterX = mockImageDimensions.width / 2
      const expectedCenterY = mockImageDimensions.height / 2
      
      expect(vm.editableCoords.x1).toBe(expectedCenterX - originalWidth / 2)
      expect(vm.editableCoords.y1).toBe(expectedCenterY - originalHeight / 2)
      expect(vm.editableCoords.x2).toBe(expectedCenterX + originalWidth / 2)
      expect(vm.editableCoords.y2).toBe(expectedCenterY + originalHeight / 2)
    })

    it('should make diagram square', () => {
      const wrapper = mount(CoordinateEditor, {
        props: {
          diagram: mockDiagram,
          imageDimensions: mockImageDimensions
        }
      })

      const vm = wrapper.vm as any
      const originalSize = Math.min(vm.width, vm.height)
      
      vm.makeSquare()
      
      expect(vm.width).toBe(originalSize)
      expect(vm.height).toBe(originalSize)
    })
  })

  describe('Grid Snapping', () => {
    it('should snap coordinates to grid', () => {
      const wrapper = mount(CoordinateEditor, {
        props: {
          diagram: {
            ...mockDiagram,
            x1: 103,
            y1: 157,
            x2: 298,
            y2: 243
          },
          imageDimensions: mockImageDimensions
        }
      })

      const vm = wrapper.vm as any
      vm.gridSize = '10'
      
      vm.snapToGrid()
      
      expect(vm.editableCoords.x1).toBe(100) // Snapped to nearest 10
      expect(vm.editableCoords.y1).toBe(160)
      expect(vm.editableCoords.x2).toBe(300)
      expect(vm.editableCoords.y2).toBe(240)
    })
  })

  describe('Event Emissions', () => {
    it('should emit update when coordinates change', async () => {
      const wrapper = mount(CoordinateEditor, {
        props: {
          diagram: mockDiagram,
          imageDimensions: mockImageDimensions
        }
      })

      const vm = wrapper.vm as any
      vm.editableCoords.x1 = 120
      
      await vm.validateAndUpdate()
      
      expect(wrapper.emitted('update')).toBeTruthy()
      expect(wrapper.emitted('update')?.[0]?.[0]).toMatchObject({
        x1: 120
      })
    })

    it('should not emit update when validation fails', async () => {
      const wrapper = mount(CoordinateEditor, {
        props: {
          diagram: mockDiagram,
          imageDimensions: mockImageDimensions
        }
      })

      const vm = wrapper.vm as any
      vm.editableCoords.x2 = 50 // Invalid: less than x1
      
      await vm.validateAndUpdate()
      
      expect(wrapper.emitted('update')).toBeFalsy()
    })
  })

  describe('Reset Functionality', () => {
    it('should reset to original coordinates', () => {
      const wrapper = mount(CoordinateEditor, {
        props: {
          diagram: mockDiagram,
          imageDimensions: mockImageDimensions
        }
      })

      const vm = wrapper.vm as any
      
      // Modify coordinates
      vm.editableCoords.x1 = 200
      vm.editableCoords.y1 = 300
      
      // Reset
      vm.resetToOriginal()
      
      expect(vm.editableCoords.x1).toBe(mockDiagram.x1)
      expect(vm.editableCoords.y1).toBe(mockDiagram.y1)
      expect(vm.editableCoords.x2).toBe(mockDiagram.x2)
      expect(vm.editableCoords.y2).toBe(mockDiagram.y2)
    })
  })
})

describe('CoordinateInputPanel', () => {
  let mockCoordinates: DiagramCoordinates
  let mockImageDimensions: { width: number; height: number }

  beforeEach(() => {
    mockCoordinates = {
      x1: 100,
      y1: 150,
      x2: 300,
      y2: 250,
      confidence: 0.9,
      type: 'graph',
      description: 'Test diagram'
    }

    mockImageDimensions = {
      width: 800,
      height: 600
    }
  })

  describe('Input Modes', () => {
    it('should switch between input modes', async () => {
      const wrapper = mount(CoordinateInputPanel, {
        props: {
          coordinates: mockCoordinates,
          imageDimensions: mockImageDimensions
        }
      })

      const vm = wrapper.vm as any
      
      expect(vm.inputMode).toBe('corners')
      
      vm.inputMode = 'center'
      await wrapper.vm.$nextTick()
      
      expect(vm.inputMode).toBe('center')
    })

    it('should calculate center coordinates correctly', () => {
      const wrapper = mount(CoordinateInputPanel, {
        props: {
          coordinates: mockCoordinates,
          imageDimensions: mockImageDimensions
        }
      })

      const vm = wrapper.vm as any
      
      expect(vm.centerCoords.centerX).toBe(200) // (100 + 300) / 2
      expect(vm.centerCoords.centerY).toBe(200) // (150 + 250) / 2
      expect(vm.centerCoords.width).toBe(200) // 300 - 100
      expect(vm.centerCoords.height).toBe(100) // 250 - 150
    })

    it('should calculate dimension coordinates correctly', () => {
      const wrapper = mount(CoordinateInputPanel, {
        props: {
          coordinates: mockCoordinates,
          imageDimensions: mockImageDimensions
        }
      })

      const vm = wrapper.vm as any
      
      expect(vm.dimensionCoords.x).toBe(100)
      expect(vm.dimensionCoords.y).toBe(150)
      expect(vm.dimensionCoords.width).toBe(200)
      expect(vm.dimensionCoords.height).toBe(100)
    })
  })

  describe('Preset Applications', () => {
    it('should apply center preset', async () => {
      const wrapper = mount(CoordinateInputPanel, {
        props: {
          coordinates: mockCoordinates,
          imageDimensions: mockImageDimensions
        }
      })

      const vm = wrapper.vm as any
      await vm.applyPreset('center')
      
      expect(wrapper.emitted('update')).toBeTruthy()
      const emittedCoords = wrapper.emitted('update')?.[0]?.[0] as any
      
      // Should be centered in image
      const centerX = mockImageDimensions.width / 2
      const centerY = mockImageDimensions.height / 2
      expect(emittedCoords.x1).toBeLessThan(centerX)
      expect(emittedCoords.x2).toBeGreaterThan(centerX)
      expect(emittedCoords.y1).toBeLessThan(centerY)
      expect(emittedCoords.y2).toBeGreaterThan(centerY)
    })

    it('should apply square preset', async () => {
      const wrapper = mount(CoordinateInputPanel, {
        props: {
          coordinates: mockCoordinates,
          imageDimensions: mockImageDimensions
        }
      })

      const vm = wrapper.vm as any
      await vm.applyPreset('square')
      
      expect(wrapper.emitted('update')).toBeTruthy()
      const emittedCoords = wrapper.emitted('update')?.[0]?.[0] as any
      
      // Should be square
      const width = emittedCoords.x2 - emittedCoords.x1
      const height = emittedCoords.y2 - emittedCoords.y1
      expect(Math.abs(width - height)).toBeLessThan(1)
    })

    it('should apply golden ratio preset', async () => {
      const wrapper = mount(CoordinateInputPanel, {
        props: {
          coordinates: mockCoordinates,
          imageDimensions: mockImageDimensions
        }
      })

      const vm = wrapper.vm as any
      await vm.applyPreset('golden')
      
      expect(wrapper.emitted('update')).toBeTruthy()
      const emittedCoords = wrapper.emitted('update')?.[0]?.[0] as any
      
      // Should have golden ratio
      const width = emittedCoords.x2 - emittedCoords.x1
      const height = emittedCoords.y2 - emittedCoords.y1
      const ratio = width / height
      expect(Math.abs(ratio - 1.618)).toBeLessThan(0.1)
    })
  })

  describe('Validation', () => {
    it('should validate corner coordinates', () => {
      const wrapper = mount(CoordinateInputPanel, {
        props: {
          coordinates: mockCoordinates,
          imageDimensions: mockImageDimensions
        }
      })

      const vm = wrapper.vm as any
      
      // Set invalid coordinates
      vm.cornerCoords.x2 = 50 // Less than x1
      const errors = vm.validateCornerCoords()
      
      expect(errors).toContain('Right edge must be greater than left edge')
    })

    it('should validate center coordinates', () => {
      const wrapper = mount(CoordinateInputPanel, {
        props: {
          coordinates: mockCoordinates,
          imageDimensions: mockImageDimensions
        }
      })

      const vm = wrapper.vm as any
      
      // Set coordinates that extend beyond bounds
      vm.centerCoords.centerX = 50
      vm.centerCoords.width = 200 // Would extend from -50 to 150
      const errors = vm.validateCenterCoords()
      
      expect(errors).toContain('Diagram extends beyond left edge')
    })
  })
})

describe('TransformToolsPanel', () => {
  let mockCoordinates: DiagramCoordinates
  let mockImageDimensions: { width: number; height: number }

  beforeEach(() => {
    mockCoordinates = {
      x1: 100,
      y1: 150,
      x2: 300,
      y2: 250,
      confidence: 0.9,
      type: 'graph',
      description: 'Test diagram'
    }

    mockImageDimensions = {
      width: 800,
      height: 600
    }
  })

  describe('Movement Operations', () => {
    it('should move diagram up', async () => {
      const wrapper = mount(TransformToolsPanel, {
        props: {
          coordinates: mockCoordinates,
          imageDimensions: mockImageDimensions
        }
      })

      const vm = wrapper.vm as any
      vm.moveStep = '10'
      
      await vm.move('up')
      
      expect(wrapper.emitted('transform')).toBeTruthy()
      const [newCoords, description] = wrapper.emitted('transform')?.[0] as any
      
      expect(newCoords.y1).toBe(140) // 150 - 10
      expect(newCoords.y2).toBe(240) // 250 - 10
      expect(description).toContain('Move up 10px')
    })

    it('should center diagram', async () => {
      const wrapper = mount(TransformToolsPanel, {
        props: {
          coordinates: mockCoordinates,
          imageDimensions: mockImageDimensions
        }
      })

      const vm = wrapper.vm as any
      await vm.center()
      
      expect(wrapper.emitted('transform')).toBeTruthy()
      const [newCoords] = wrapper.emitted('transform')?.[0] as any
      
      const centerX = mockImageDimensions.width / 2
      const centerY = mockImageDimensions.height / 2
      const width = mockCoordinates.x2 - mockCoordinates.x1
      const height = mockCoordinates.y2 - mockCoordinates.y1
      
      expect(newCoords.x1).toBe(centerX - width / 2)
      expect(newCoords.y1).toBe(centerY - height / 2)
    })
  })

  describe('Resize Operations', () => {
    it('should expand diagram', async () => {
      const wrapper = mount(TransformToolsPanel, {
        props: {
          coordinates: mockCoordinates,
          imageDimensions: mockImageDimensions
        }
      })

      const vm = wrapper.vm as any
      vm.resizeAmount = '20'
      
      await vm.resize('expand')
      
      expect(wrapper.emitted('transform')).toBeTruthy()
      const [newCoords] = wrapper.emitted('transform')?.[0] as any
      
      expect(newCoords.x1).toBe(80) // 100 - 20
      expect(newCoords.y1).toBe(130) // 150 - 20
      expect(newCoords.x2).toBe(320) // 300 + 20
      expect(newCoords.y2).toBe(270) // 250 + 20
    })

    it('should make diagram wider', async () => {
      const wrapper = mount(TransformToolsPanel, {
        props: {
          coordinates: mockCoordinates,
          imageDimensions: mockImageDimensions
        }
      })

      const vm = wrapper.vm as any
      vm.resizeAmount = '15'
      
      await vm.resize('wider')
      
      expect(wrapper.emitted('transform')).toBeTruthy()
      const [newCoords] = wrapper.emitted('transform')?.[0] as any
      
      expect(newCoords.x1).toBe(85) // 100 - 15
      expect(newCoords.x2).toBe(315) // 300 + 15
      expect(newCoords.y1).toBe(150) // Unchanged
      expect(newCoords.y2).toBe(250) // Unchanged
    })
  })

  describe('Alignment Operations', () => {
    it('should align to top-left', async () => {
      const wrapper = mount(TransformToolsPanel, {
        props: {
          coordinates: mockCoordinates,
          imageDimensions: mockImageDimensions
        }
      })

      const vm = wrapper.vm as any
      await vm.align('top-left')
      
      expect(wrapper.emitted('transform')).toBeTruthy()
      const [newCoords] = wrapper.emitted('transform')?.[0] as any
      
      expect(newCoords.x1).toBe(0)
      expect(newCoords.y1).toBe(0)
    })

    it('should align to center', async () => {
      const wrapper = mount(TransformToolsPanel, {
        props: {
          coordinates: mockCoordinates,
          imageDimensions: mockImageDimensions
        }
      })

      const vm = wrapper.vm as any
      await vm.align('center')
      
      expect(wrapper.emitted('transform')).toBeTruthy()
      const [newCoords] = wrapper.emitted('transform')?.[0] as any
      
      const width = mockCoordinates.x2 - mockCoordinates.x1
      const height = mockCoordinates.y2 - mockCoordinates.y1
      
      expect(newCoords.x1).toBe((mockImageDimensions.width - width) / 2)
      expect(newCoords.y1).toBe((mockImageDimensions.height - height) / 2)
    })
  })

  describe('Aspect Ratio Operations', () => {
    it('should set square aspect ratio', async () => {
      const wrapper = mount(TransformToolsPanel, {
        props: {
          coordinates: mockCoordinates,
          imageDimensions: mockImageDimensions
        }
      })

      const vm = wrapper.vm as any
      await vm.setAspectRatio(1)
      
      expect(wrapper.emitted('transform')).toBeTruthy()
      const [newCoords] = wrapper.emitted('transform')?.[0] as any
      
      const width = newCoords.x2 - newCoords.x1
      const height = newCoords.y2 - newCoords.y1
      expect(Math.abs(width - height)).toBeLessThan(1)
    })
  })

  describe('Snap Operations', () => {
    it('should snap to grid', async () => {
      const wrapper = mount(TransformToolsPanel, {
        props: {
          coordinates: {
            ...mockCoordinates,
            x1: 103,
            y1: 157,
            x2: 298,
            y2: 243
          },
          imageDimensions: mockImageDimensions
        }
      })

      const vm = wrapper.vm as any
      vm.gridSize = '10'
      
      await vm.snapToGrid()
      
      expect(wrapper.emitted('transform')).toBeTruthy()
      const [newCoords] = wrapper.emitted('transform')?.[0] as any
      
      expect(newCoords.x1).toBe(100) // Snapped to nearest 10
      expect(newCoords.y1).toBe(160)
      expect(newCoords.x2).toBe(300)
      expect(newCoords.y2).toBe(240)
    })
  })

  describe('Transform History', () => {
    it('should track transform history', async () => {
      const wrapper = mount(TransformToolsPanel, {
        props: {
          coordinates: mockCoordinates,
          imageDimensions: mockImageDimensions
        }
      })

      const vm = wrapper.vm as any
      
      await vm.move('up')
      await vm.move('right')
      
      expect(vm.transformHistory).toHaveLength(2)
      expect(vm.transformHistory[0].description).toContain('Move up')
      expect(vm.transformHistory[1].description).toContain('Move right')
    })

    it('should limit history to 10 items', async () => {
      const wrapper = mount(TransformToolsPanel, {
        props: {
          coordinates: mockCoordinates,
          imageDimensions: mockImageDimensions
        }
      })

      const vm = wrapper.vm as any
      
      // Add 12 transforms
      for (let i = 0; i < 12; i++) {
        await vm.move('up')
      }
      
      expect(vm.transformHistory).toHaveLength(10)
    })
  })
})