/**
 * Unit Tests for Diagram Review Interface
 * 
 * This file contains comprehensive tests for the diagram review interface
 * components and their interactions.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import type { 
  EnhancedQuestion, 
  PageImageData 
} from '~/shared/types/diagram-detection'
import DiagramReviewInterface from '../DiagramReviewInterface.vue'

// Mock the UI components
vi.mock('~/components/ui/button', () => ({
  default: { template: '<button><slot /></button>' }
}))

vi.mock('~/components/ui/badge', () => ({
  default: { template: '<span><slot /></span>' }
}))

vi.mock('~/components/ui/progress', () => ({
  default: { template: '<div></div>' }
}))

describe('DiagramReviewInterface', () => {
  let mockQuestions: EnhancedQuestion[]
  let mockPageImages: PageImageData[]

  beforeEach(() => {
    mockQuestions = [
      {
        id: 'q1',
        text: 'What is shown in the graph?',
        type: 'MCQ',
        options: ['A) Linear', 'B) Quadratic'],
        hasDiagram: true,
        diagrams: [
          {
            x1: 100,
            y1: 150,
            x2: 300,
            y2: 250,
            confidence: 0.9,
            type: 'graph',
            description: 'Mathematical graph'
          }
        ],
        pageNumber: 1,
        confidence: 0.85,
        pdfData: []
      },
      {
        id: 'q2',
        text: 'Analyze the flowchart',
        type: 'MCQ',
        options: ['A) Process', 'B) Decision'],
        hasDiagram: true,
        diagrams: [],
        pageNumber: 1,
        confidence: 0.75,
        pdfData: []
      },
      {
        id: 'q3',
        text: 'Simple text question',
        type: 'NAT',
        options: [],
        hasDiagram: false,
        diagrams: [],
        pageNumber: 2,
        confidence: 0.95,
        pdfData: []
      }
    ]

    mockPageImages = [
      {
        id: 'page_1',
        pageNumber: 1,
        testId: 'test_1',
        imageData: new Blob(['mock image data'], { type: 'image/png' }),
        dimensions: { width: 800, height: 600 },
        scale: 1.0,
        createdAt: new Date()
      },
      {
        id: 'page_2',
        pageNumber: 2,
        testId: 'test_1',
        imageData: new Blob(['mock image data'], { type: 'image/png' }),
        dimensions: { width: 800, height: 600 },
        scale: 1.0,
        createdAt: new Date()
      }
    ]
  })

  describe('Component Initialization', () => {
    it('should render with provided questions and page images', () => {
      const wrapper = mount(DiagramReviewInterface, {
        props: {
          questions: mockQuestions,
          pageImages: mockPageImages,
          initialPage: 1
        }
      })

      expect(wrapper.exists()).toBe(true)
      expect(wrapper.find('h2').text()).toContain('Diagram Review')
    })

    it('should initialize with correct page and question counts', () => {
      const wrapper = mount(DiagramReviewInterface, {
        props: {
          questions: mockQuestions,
          pageImages: mockPageImages
        }
      })

      const vm = wrapper.vm as any
      expect(vm.totalPages).toBe(2)
      expect(vm.totalQuestions).toBe(3)
      expect(vm.currentPage).toBe(1)
    })

    it('should filter questions by current page', () => {
      const wrapper = mount(DiagramReviewInterface, {
        props: {
          questions: mockQuestions,
          pageImages: mockPageImages
        }
      })

      const vm = wrapper.vm as any
      expect(vm.currentPageQuestions).toHaveLength(2) // q1 and q2 are on page 1
      expect(vm.currentPageQuestions[0].id).toBe('q1')
      expect(vm.currentPageQuestions[1].id).toBe('q2')
    })
  })

  describe('Page Navigation', () => {
    it('should navigate to next page', async () => {
      const wrapper = mount(DiagramReviewInterface, {
        props: {
          questions: mockQuestions,
          pageImages: mockPageImages
        }
      })

      const vm = wrapper.vm as any
      expect(vm.currentPage).toBe(1)

      await vm.nextPage()
      expect(vm.currentPage).toBe(2)
    })

    it('should navigate to previous page', async () => {
      const wrapper = mount(DiagramReviewInterface, {
        props: {
          questions: mockQuestions,
          pageImages: mockPageImages,
          initialPage: 2
        }
      })

      const vm = wrapper.vm as any
      expect(vm.currentPage).toBe(2)

      await vm.previousPage()
      expect(vm.currentPage).toBe(1)
    })

    it('should not navigate beyond page boundaries', async () => {
      const wrapper = mount(DiagramReviewInterface, {
        props: {
          questions: mockQuestions,
          pageImages: mockPageImages
        }
      })

      const vm = wrapper.vm as any
      
      // Try to go before first page
      await vm.previousPage()
      expect(vm.currentPage).toBe(1)

      // Go to last page
      vm.currentPage = 2
      
      // Try to go beyond last page
      await vm.nextPage()
      expect(vm.currentPage).toBe(2)
    })
  })

  describe('Question Selection', () => {
    it('should select a question', async () => {
      const wrapper = mount(DiagramReviewInterface, {
        props: {
          questions: mockQuestions,
          pageImages: mockPageImages
        }
      })

      const vm = wrapper.vm as any
      await vm.selectQuestion('q1')
      
      expect(vm.selectedQuestionId).toBe('q1')
    })

    it('should clear diagram selection when selecting question', async () => {
      const wrapper = mount(DiagramReviewInterface, {
        props: {
          questions: mockQuestions,
          pageImages: mockPageImages
        }
      })

      const vm = wrapper.vm as any
      vm.selectedDiagramId = 'some-diagram'
      
      await vm.selectQuestion('q1')
      
      expect(vm.selectedQuestionId).toBe('q1')
      expect(vm.selectedDiagramId).toBeNull()
    })
  })

  describe('Diagram Management', () => {
    it('should update diagram coordinates', async () => {
      const wrapper = mount(DiagramReviewInterface, {
        props: {
          questions: mockQuestions,
          pageImages: mockPageImages
        }
      })

      const vm = wrapper.vm as any
      const originalX1 = mockQuestions[0].diagrams[0].x1
      
      await vm.updateDiagram('q1_diagram_0', { x1: 150 })
      
      expect(mockQuestions[0].diagrams[0].x1).toBe(150)
      expect(mockQuestions[0].diagrams[0].x1).not.toBe(originalX1)
    })

    it('should delete a diagram', async () => {
      const wrapper = mount(DiagramReviewInterface, {
        props: {
          questions: mockQuestions,
          pageImages: mockPageImages
        }
      })

      const vm = wrapper.vm as any
      expect(mockQuestions[0].diagrams).toHaveLength(1)
      
      await vm.deleteDiagram('q1_diagram_0')
      
      expect(mockQuestions[0].diagrams).toHaveLength(0)
      expect(mockQuestions[0].hasDiagram).toBe(false)
    })

    it('should start adding a new diagram', async () => {
      const wrapper = mount(DiagramReviewInterface, {
        props: {
          questions: mockQuestions,
          pageImages: mockPageImages
        }
      })

      const vm = wrapper.vm as any
      await vm.startAddingDiagram()
      
      expect(vm.isAddingDiagram).toBe(true)
    })
  })

  describe('Progress Calculation', () => {
    it('should calculate review progress correctly', () => {
      const wrapper = mount(DiagramReviewInterface, {
        props: {
          questions: mockQuestions,
          pageImages: mockPageImages
        }
      })

      const vm = wrapper.vm as any
      
      // q1 has diagrams (reviewed), q2 has no diagrams but hasDiagram=true (not reviewed), q3 has no diagrams and hasDiagram=false (reviewed)
      expect(vm.reviewedQuestions).toBe(2) // q1 and q3
      expect(vm.reviewProgress).toBe((2 / 3) * 100) // 66.67%
    })

    it('should handle empty questions array', () => {
      const wrapper = mount(DiagramReviewInterface, {
        props: {
          questions: [],
          pageImages: mockPageImages
        }
      })

      const vm = wrapper.vm as any
      expect(vm.reviewProgress).toBe(0)
    })
  })

  describe('Event Emissions', () => {
    it('should emit update:questions when questions are modified', async () => {
      const wrapper = mount(DiagramReviewInterface, {
        props: {
          questions: mockQuestions,
          pageImages: mockPageImages
        }
      })

      const vm = wrapper.vm as any
      await vm.updateDiagram('q1_diagram_0', { x1: 150 })
      
      expect(wrapper.emitted('update:questions')).toBeTruthy()
      expect(wrapper.emitted('update:questions')?.[0]?.[0]).toBe(mockQuestions)
    })

    it('should emit save-changes when saving', async () => {
      const wrapper = mount(DiagramReviewInterface, {
        props: {
          questions: mockQuestions,
          pageImages: mockPageImages
        }
      })

      const vm = wrapper.vm as any
      vm.hasChanges = true
      await vm.saveChanges()
      
      expect(wrapper.emitted('save-changes')).toBeTruthy()
      expect(wrapper.emitted('save-changes')?.[0]?.[0]).toBe(mockQuestions)
      expect(vm.hasChanges).toBe(false)
    })

    it('should emit proceed-to-test when proceeding', async () => {
      const wrapper = mount(DiagramReviewInterface, {
        props: {
          questions: mockQuestions,
          pageImages: mockPageImages
        }
      })

      const vm = wrapper.vm as any
      await vm.proceedToTestConfiguration()
      
      expect(wrapper.emitted('proceed-to-test')).toBeTruthy()
      expect(wrapper.emitted('proceed-to-test')?.[0]?.[0]).toBe(mockQuestions)
    })
  })

  describe('Image Handling', () => {
    it('should update image dimensions on image load', async () => {
      const wrapper = mount(DiagramReviewInterface, {
        props: {
          questions: mockQuestions,
          pageImages: mockPageImages
        }
      })

      const vm = wrapper.vm as any
      
      // Mock image element
      vm.$refs.pageImageRef = {
        naturalWidth: 1600,
        naturalHeight: 1200,
        width: 800
      }
      
      await vm.onImageLoad()
      
      expect(vm.imageDimensions.width).toBe(1600)
      expect(vm.imageDimensions.height).toBe(1200)
      expect(vm.imageScale).toBe(0.5) // 800 / 1600
    })

    it('should calculate overlay styles correctly', () => {
      const wrapper = mount(DiagramReviewInterface, {
        props: {
          questions: mockQuestions,
          pageImages: mockPageImages
        }
      })

      const vm = wrapper.vm as any
      vm.imageScale = 0.5
      
      const coords = {
        x1: 100,
        y1: 150,
        x2: 300,
        y2: 250
      }
      
      const style = vm.getOverlayStyle(coords)
      
      expect(style.left).toBe('50px') // 100 * 0.5
      expect(style.top).toBe('75px') // 150 * 0.5
      expect(style.width).toBe('100px') // (300 - 100) * 0.5
      expect(style.height).toBe('50px') // (250 - 150) * 0.5
    })
  })

  describe('Diagram Drawing', () => {
    it('should start drawing a new diagram', async () => {
      const wrapper = mount(DiagramReviewInterface, {
        props: {
          questions: mockQuestions,
          pageImages: mockPageImages
        }
      })

      const vm = wrapper.vm as any
      vm.isAddingDiagram = true
      vm.selectedQuestionId = 'q2'
      vm.imageScale = 1
      vm.$refs.pageImageRef = {
        getBoundingClientRect: () => ({ left: 0, top: 0 })
      }
      
      const mockEvent = {
        clientX: 200,
        clientY: 300
      }
      
      await vm.startDrawingDiagram(mockEvent)
      
      expect(vm.newDiagramCoords).toBeDefined()
      expect(vm.newDiagramCoords.x1).toBe(200)
      expect(vm.newDiagramCoords.y1).toBe(300)
    })

    it('should finish drawing and add diagram to question', async () => {
      const wrapper = mount(DiagramReviewInterface, {
        props: {
          questions: mockQuestions,
          pageImages: mockPageImages
        }
      })

      const vm = wrapper.vm as any
      vm.isAddingDiagram = true
      vm.selectedQuestionId = 'q2'
      vm.newDiagramCoords = {
        x1: 100,
        y1: 150,
        x2: 300,
        y2: 250,
        confidence: 1.0,
        type: 'other',
        description: 'Manual selection'
      }
      
      const originalDiagramCount = mockQuestions[1].diagrams.length
      
      await vm.finishDrawingDiagram()
      
      expect(mockQuestions[1].diagrams.length).toBe(originalDiagramCount + 1)
      expect(mockQuestions[1].hasDiagram).toBe(true)
      expect(vm.isAddingDiagram).toBe(false)
      expect(vm.newDiagramCoords).toBeNull()
    })

    it('should not add diagram if too small', async () => {
      const wrapper = mount(DiagramReviewInterface, {
        props: {
          questions: mockQuestions,
          pageImages: mockPageImages
        }
      })

      const vm = wrapper.vm as any
      vm.isAddingDiagram = true
      vm.selectedQuestionId = 'q2'
      vm.newDiagramCoords = {
        x1: 100,
        y1: 150,
        x2: 105, // Only 5px wide
        y2: 155, // Only 5px tall
        confidence: 1.0,
        type: 'other',
        description: 'Manual selection'
      }
      
      const originalDiagramCount = mockQuestions[1].diagrams.length
      
      await vm.finishDrawingDiagram()
      
      expect(mockQuestions[1].diagrams.length).toBe(originalDiagramCount) // No change
    })
  })

  describe('Auto-selection Behavior', () => {
    it('should auto-select first question when page changes', async () => {
      const wrapper = mount(DiagramReviewInterface, {
        props: {
          questions: mockQuestions,
          pageImages: mockPageImages
        }
      })

      const vm = wrapper.vm as any
      
      // Go to page 2
      await vm.nextPage()
      
      expect(vm.selectedQuestionId).toBe('q3') // First question on page 2
    })

    it('should auto-select first question on mount', () => {
      const wrapper = mount(DiagramReviewInterface, {
        props: {
          questions: mockQuestions,
          pageImages: mockPageImages
        }
      })

      const vm = wrapper.vm as any
      expect(vm.selectedQuestionId).toBe('q1') // First question on page 1
    })
  })
})