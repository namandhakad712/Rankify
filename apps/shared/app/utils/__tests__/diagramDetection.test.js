/**
 * Unit tests for DiagramDetector
 * Tests diagram detection algorithms and strategies
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { DiagramDetector, detectDiagramInQuestion, detectDiagramsInBatch } from '../diagramDetection.js'

describe('DiagramDetector', () => {
  let detector

  beforeEach(() => {
    detector = new DiagramDetector()
  })

  describe('Constructor', () => {
    it('should initialize with default values', () => {
      expect(detector.diagramKeywords).toBeDefined()
      expect(detector.visualIndicators).toBeDefined()
      expect(detector.contextPatterns).toBeDefined()
      expect(detector.detectionStrategies).toHaveLength(5)
    })
  })

  describe('Main Detection Method', () => {
    it('should detect diagrams with high confidence', () => {
      const question = {
        queText: 'Refer to Figure 1 shown above. Calculate the area of the triangle.',
        subject: 'Mathematics'
      }
      
      const result = detector.detectDiagram(question)
      
      expect(result.hasDiagram).toBe(true)
      expect(result.confidence).toBeGreaterThan(0.3)
      expect(result.indicators.length).toBeGreaterThan(0)
    })

    it('should not detect diagrams in regular questions', () => {
      const question = {
        queText: 'What is the capital of France?'
      }
      
      const result = detector.detectDiagram(question)
      
      expect(result.hasDiagram).toBe(false)
      expect(result.confidence).toBeLessThan(0.3)
    })

    it('should handle string input', () => {
      const result = detector.detectDiagram('Look at the diagram and answer.')
      expect(result.hasDiagram).toBe(true)
    })

    it('should handle empty input', () => {
      expect(() => detector.detectDiagram('')).not.toThrow()
      expect(() => detector.detectDiagram(null)).not.toThrow()
    })
  })

  describe('Batch Detection', () => {
    it('should process multiple questions', () => {
      const questions = [
        { queText: 'Refer to Figure 1. What is the area?', queId: 'q1' },
        { queText: 'What is 2+2?', queId: 'q2' }
      ]
      
      const result = detector.detectBatch(questions)
      
      expect(result.results).toHaveLength(2)
      expect(result.statistics.totalQuestions).toBe(2)
    })
  })

  describe('Convenience Functions', () => {
    it('should work with detectDiagramInQuestion function', () => {
      const question = { queText: 'Refer to the figure above.' }
      const result = detectDiagramInQuestion(question)
      
      expect(result).toBeDefined()
      expect(result.hasDiagram).toBe(true)
    })

    it('should work with detectDiagramsInBatch function', () => {
      const questions = [
        { queText: 'Look at the chart.' },
        { queText: 'Simple question.' }
      ]
      
      const result = detectDiagramsInBatch(questions)
      
      expect(result.results).toHaveLength(2)
      expect(result.statistics).toBeDefined()
    })
  })
})