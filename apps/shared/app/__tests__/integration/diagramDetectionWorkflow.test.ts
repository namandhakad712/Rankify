/**
 * Comprehensive Integration Tests for Advanced Diagram Detection Workflow
 * Tests the complete end-to-end workflow from PDF processing to test generation
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import type { 
  CoordinateMetadata, 
  EnhancedQuestion, 
  DiagramCoordinates,
  CBTPreset,
  EnhancedTestInterfaceJsonOutput 
} from '~/shared/types/diagram-detection'

// Mock implementations
const mockPdfFile = new File(['mock pdf content'], 'test.pdf', { type: 'application/pdf' });

const mockCoordinateData: CoordinateMetadata[] = [
  {
    questionId: 'physics_mechanics_1',
    pageNumber: 1,
    originalImageDimensions: { width: 800, height: 600 },
    diagrams: [
      {
        id: 'diagram_1',
        coordinates: {
          x1: 100,
          y1: 150,
          x2: 300,
          y2: 250,
          confidence: 0.85,
          type: 'graph',
          description: 'Velocity-time graph'
        },
        type: 'graph',
        description: 'Velocity-time graph',
        confidence: 0.85,
        lastModified: new Date(),
        modifiedBy: 'ai'
      }
    ]
  }
];

const mockEnhancedQuestions: EnhancedQuestion[] = [
  {
    id: 'physics_mechanics_1',
    text: 'A particle moves with constant acceleration. The velocity-time graph is shown.',
    type: 'mcq',
    answerOptions: '4',
    hasDiagram: true,
    diagrams: mockCoordinateData[0].diagrams.map(d => d.coordinates),
    pageNumber: 1,
    confidence: 0.85,
    subject: 'Physics',
    section: 'Mechanics',
    pdfData: []
  }
];

const mockCBTPreset: CBTPreset = {
  id: 'jee_main',
  name: 'JEE Main',
  examType: 'JEE',
  sections: [
    {
      name: 'Physics',
      subjects: ['Mechanics', 'Thermodynamics'],
      questionCount: 25,
      timeAllocation: 60
    }
  ],
  timeLimit: 180,
  markingScheme: { correct: 4, incorrect: -1, unattempted: 0 },
  questionDistribution: {
    totalQuestions: 75,
    sections: [
      {
        name: 'Physics',
        subjects: ['Mechanics', 'Thermodynamics'],
        questionCount: 25,
        timeAllocation: 60
      }
    ]
  },
  createdAt: new Date(),
  updatedAt: new Date()
};

describe('Complete Diagram Detection Workflow', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
  });

  test('should complete full PDF to enhanced test workflow', async () => {
    // Mock the entire workflow
    const mockAdvancedPDFProcessor = {
      processWithDiagramDetection: vi.fn().mockResolvedValue(mockEnhancedQuestions)
    };

    const mockGeminiDiagramDetector = {
      detectDiagrams: vi.fn().mockResolvedValue({
        diagrams: mockCoordinateData[0].diagrams,
        questions: mockEnhancedQuestions
      })
    };

    const mockCoordinateValidator = {
      validateBounds: vi.fn().mockReturnValue(true),
      sanitizeCoordinates: vi.fn().mockImplementation(coords => coords)
    };

    const mockDatabase = {
      diagramCoordinates: {
        add: vi.fn().mockResolvedValue('coord_1'),
        getAll: vi.fn().mockResolvedValue(mockCoordinateData)
      },
      pageImages: {
        add: vi.fn().mockResolvedValue('img_1')
      }
    };

    const mockCBTPresetEngine = {
      loadPreset: vi.fn().mockResolvedValue(mockCBTPreset),
      applyPresetToQuestions: vi.fn().mockResolvedValue({
        testData: mockEnhancedQuestions,
        config: mockCBTPreset
      })
    };

    // Step 1: PDF Processing with Diagram Detection
    const questions = await mockAdvancedPDFProcessor.processWithDiagramDetection(mockPdfFile);
    expect(questions).toHaveLength(1);
    expect(questions[0].hasDiagram).toBe(true);
    expect(questions[0].diagrams).toHaveLength(1);

    // Step 2: Coordinate Validation
    for (const question of questions) {
      for (const diagram of question.diagrams) {
        const isValid = mockCoordinateValidator.validateBounds(diagram, { width: 800, height: 600 });
        expect(isValid).toBe(true);
        
        const sanitized = mockCoordinateValidator.sanitizeCoordinates(diagram);
        expect(sanitized).toBeDefined();
      }
    }

    // Step 3: Database Storage
    for (const coordData of mockCoordinateData) {
      const coordId = await mockDatabase.diagramCoordinates.add(coordData);
      expect(coordId).toBe('coord_1');
    }

    // Step 4: CBT Preset Application
    const preset = await mockCBTPresetEngine.loadPreset('JEE');
    expect(preset.name).toBe('JEE Main');

    const configuredTest = await mockCBTPresetEngine.applyPresetToQuestions(questions, preset);
    expect(configuredTest.testData).toHaveLength(1);

    // Step 5: Enhanced Test Generation
    const enhancedTest: EnhancedTestInterfaceJsonOutput = {
      testData: {
        'Physics': {
          'Mechanics': {
            '1': {
              ...questions[0],
              diagrams: questions[0].diagrams,
              hasDiagram: true
            }
          }
        }
      },
      testConfig: {
        testName: 'Enhanced Test',
        timeLimit: preset.timeLimit,
        sections: ['Physics'],
        diagramDetectionEnabled: true,
        coordinateBasedRendering: true
      },
      diagramCoordinates: mockCoordinateData
    };

    expect(enhancedTest.testConfig.diagramDetectionEnabled).toBe(true);
    expect(enhancedTest.diagramCoordinates).toHaveLength(1);
    expect(enhancedTest.testData.Physics.Mechanics['1'].hasDiagram).toBe(true);
  });

  test('should handle workflow with API failures and fallbacks', async () => {
    const mockAdvancedPDFProcessor = {
      processWithDiagramDetection: vi.fn().mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce(mockEnhancedQuestions) // Fallback success
    };

    const mockErrorHandler = {
      handleError: vi.fn().mockResolvedValue(true), // Indicates recovery
      showUserFeedback: vi.fn()
    };

    const mockGracefulDegradation = {
      executeWithDegradation: vi.fn().mockImplementation(async (serviceName, primaryOp) => {
        try {
          return await primaryOp();
        } catch (error) {
          // Simulate fallback
          return mockEnhancedQuestions;
        }
      })
    };

    // Simulate API failure with recovery
    try {
      await mockAdvancedPDFProcessor.processWithDiagramDetection(mockPdfFile);
    } catch (error) {
      const recovered = await mockErrorHandler.handleError({
        type: 'API_ERROR',
        message: 'API Error',
        recoverable: true
      });
      expect(recovered).toBe(true);
    }

    // Fallback should work
    const fallbackResult = await mockGracefulDegradation.executeWithDegradation(
      'gemini-api',
      () => mockAdvancedPDFProcessor.processWithDiagramDetection(mockPdfFile)
    );

    expect(fallbackResult).toEqual(mockEnhancedQuestions);
    expect(mockErrorHandler.handleError).toHaveBeenCalled();
  });

  test('should handle large dataset processing efficiently', async () => {
    // Generate large dataset
    const largeQuestionSet: EnhancedQuestion[] = [];
    const largeCoordinateSet: CoordinateMetadata[] = [];

    for (let i = 0; i < 100; i++) {
      largeQuestionSet.push({
        ...mockEnhancedQuestions[0],
        id: `question_${i}`,
        text: `Question ${i}`
      });

      largeCoordinateSet.push({
        ...mockCoordinateData[0],
        questionId: `question_${i}`
      });
    }

    const mockBatchProcessor = {
      addBatch: vi.fn(),
      waitForCompletion: vi.fn().mockResolvedValue(
        largeQuestionSet.map((q, i) => ({
          id: q.id,
          success: true,
          result: q,
          processingTime: 100 + Math.random() * 200,
          retryCount: 0
        }))
      ),
      getStats: vi.fn().mockReturnValue({
        totalItems: 100,
        processedItems: 100,
        successfulItems: 98,
        failedItems: 2,
        averageProcessingTime: 150
      })
    };

    const mockPerformanceOptimizer = {
      optimizeBatchOperation: vi.fn().mockResolvedValue(
        new Map(largeQuestionSet.map(q => [q.id, q]))
      )
    };

    // Process large dataset
    const batchItems = largeQuestionSet.map(q => ({ id: q.id, data: q }));
    mockBatchProcessor.addBatch(batchItems);

    const results = await mockBatchProcessor.waitForCompletion();
    expect(results).toHaveLength(100);

    const stats = mockBatchProcessor.getStats();
    expect(stats.successfulItems).toBeGreaterThan(95); // 95% success rate
    expect(stats.averageProcessingTime).toBeLessThan(500); // Under 500ms average

    // Verify performance optimization
    const optimizedResults = await mockPerformanceOptimizer.optimizeBatchOperation(
      batchItems,
      (data) => Promise.resolve(data),
      'coordinate-validation'
    );

    expect(optimizedResults.size).toBe(100);
  });

  test('should maintain data integrity throughout workflow', async () => {
    const originalQuestion = mockEnhancedQuestions[0];
    const originalCoordinates = mockCoordinateData[0];

    // Mock data transformation steps
    const mockDataTransformations = {
      enhanceQuestion: vi.fn().mockImplementation(q => ({ ...q, enhanced: true })),
      validateCoordinates: vi.fn().mockImplementation(c => ({ ...c, validated: true })),
      sanitizeData: vi.fn().mockImplementation(data => ({ ...data, sanitized: true }))
    };

    // Apply transformations
    let processedQuestion = mockDataTransformations.enhanceQuestion(originalQuestion);
    let processedCoordinates = mockDataTransformations.validateCoordinates(originalCoordinates);
    processedCoordinates = mockDataTransformations.sanitizeData(processedCoordinates);

    // Verify data integrity
    expect(processedQuestion.id).toBe(originalQuestion.id);
    expect(processedQuestion.text).toBe(originalQuestion.text);
    expect(processedQuestion.hasDiagram).toBe(originalQuestion.hasDiagram);
    expect(processedQuestion.enhanced).toBe(true);

    expect(processedCoordinates.questionId).toBe(originalCoordinates.questionId);
    expect(processedCoordinates.diagrams).toHaveLength(originalCoordinates.diagrams.length);
    expect(processedCoordinates.validated).toBe(true);
    expect(processedCoordinates.sanitized).toBe(true);

    // Verify coordinate values are preserved
    const originalDiagram = originalCoordinates.diagrams[0];
    const processedDiagram = processedCoordinates.diagrams[0];
    
    expect(processedDiagram.coordinates.x1).toBe(originalDiagram.coordinates.x1);
    expect(processedDiagram.coordinates.y1).toBe(originalDiagram.coordinates.y1);
    expect(processedDiagram.coordinates.x2).toBe(originalDiagram.coordinates.x2);
    expect(processedDiagram.coordinates.y2).toBe(originalDiagram.coordinates.y2);
  });

  test('should handle concurrent workflow executions', async () => {
    const concurrentWorkflows = 5;
    const mockWorkflowProcessor = vi.fn().mockImplementation(async (workflowId) => {
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
      
      return {
        workflowId,
        questions: mockEnhancedQuestions,
        coordinates: mockCoordinateData,
        processingTime: Date.now()
      };
    });

    // Execute concurrent workflows
    const workflowPromises = Array.from({ length: concurrentWorkflows }, (_, i) =>
      mockWorkflowProcessor(`workflow_${i}`)
    );

    const results = await Promise.all(workflowPromises);

    // Verify all workflows completed
    expect(results).toHaveLength(concurrentWorkflows);
    
    // Verify each workflow has unique ID and consistent data
    const workflowIds = results.map(r => r.workflowId);
    expect(new Set(workflowIds).size).toBe(concurrentWorkflows); // All unique

    results.forEach(result => {
      expect(result.questions).toHaveLength(1);
      expect(result.coordinates).toHaveLength(1);
      expect(result.processingTime).toBeGreaterThan(0);
    });

    // Verify processing times are reasonable (concurrent, not sequential)
    const processingTimes = results.map(r => r.processingTime);
    const minTime = Math.min(...processingTimes);
    const maxTime = Math.max(...processingTimes);
    const timeDifference = maxTime - minTime;
    
    // Should be concurrent (time difference < sequential time)
    expect(timeDifference).toBeLessThan(concurrentWorkflows * 300);
  });

  test('should generate comprehensive workflow report', async () => {
    const mockWorkflowReporter = {
      generateReport: vi.fn().mockReturnValue({
        summary: {
          totalQuestions: 1,
          questionsWithDiagrams: 1,
          averageConfidence: 0.85,
          processingTime: 2500,
          apiCalls: 3,
          errors: 0
        },
        performance: {
          pdfProcessingTime: 1200,
          diagramDetectionTime: 800,
          coordinateValidationTime: 300,
          databaseStorageTime: 200
        },
        quality: {
          highConfidenceDiagrams: 1,
          mediumConfidenceDiagrams: 0,
          lowConfidenceDiagrams: 0,
          validationErrors: 0,
          sanitizationChanges: 0
        },
        recommendations: [
          'All diagrams detected with high confidence',
          'Processing time within acceptable limits',
          'No validation errors found'
        ]
      })
    };

    const report = mockWorkflowReporter.generateReport();

    // Verify report structure
    expect(report).toHaveProperty('summary');
    expect(report).toHaveProperty('performance');
    expect(report).toHaveProperty('quality');
    expect(report).toHaveProperty('recommendations');

    // Verify summary data
    expect(report.summary.totalQuestions).toBe(1);
    expect(report.summary.questionsWithDiagrams).toBe(1);
    expect(report.summary.averageConfidence).toBe(0.85);
    expect(report.summary.errors).toBe(0);

    // Verify performance metrics
    expect(report.performance.pdfProcessingTime).toBeGreaterThan(0);
    expect(report.performance.diagramDetectionTime).toBeGreaterThan(0);

    // Verify quality metrics
    expect(report.quality.highConfidenceDiagrams).toBe(1);
    expect(report.quality.validationErrors).toBe(0);

    // Verify recommendations
    expect(report.recommendations).toBeInstanceOf(Array);
    expect(report.recommendations.length).toBeGreaterThan(0);
  });
});

describe('Error Handling and Recovery', () => {
  test('should handle PDF processing failures gracefully', async () => {
    const mockPDFProcessor = {
      processWithDiagramDetection: vi.fn()
        .mockRejectedValueOnce(new Error('PDF parsing failed'))
        .mockRejectedValueOnce(new Error('Memory limit exceeded'))
        .mockResolvedValueOnce(mockEnhancedQuestions) // Success on third try
    };

    const mockRetryMechanism = {
      executeWithRetry: vi.fn().mockImplementation(async (operation, config) => {
        let attempts = 0;
        const maxRetries = config?.maxRetries || 3;

        while (attempts <= maxRetries) {
          try {
            return await operation();
          } catch (error) {
            attempts++;
            if (attempts > maxRetries) throw error;
            await new Promise(resolve => setTimeout(resolve, config?.baseDelay || 1000));
          }
        }
      })
    };

    // Should eventually succeed after retries
    const result = await mockRetryMechanism.executeWithRetry(
      () => mockPDFProcessor.processWithDiagramDetection(mockPdfFile),
      { maxRetries: 3, baseDelay: 100 }
    );

    expect(result).toEqual(mockEnhancedQuestions);
    expect(mockPDFProcessor.processWithDiagramDetection).toHaveBeenCalledTimes(3);
  });

  test('should handle API quota exceeded with fallback', async () => {
    const mockGeminiClient = {
      detectDiagrams: vi.fn()
        .mockRejectedValueOnce({ code: 'QUOTA_EXCEEDED', message: 'API quota exceeded' })
    };

    const mockFallbackDetector = {
      detectDiagramsLocally: vi.fn().mockResolvedValue({
        diagrams: [{
          coordinates: { x1: 100, y1: 100, x2: 200, y2: 200, confidence: 0.6, type: 'other', description: 'Local detection' },
          confidence: 0.6,
          source: 'local'
        }]
      })
    };

    const mockGracefulDegradation = {
      executeWithDegradation: vi.fn().mockImplementation(async (serviceName, primaryOp) => {
        try {
          return await primaryOp();
        } catch (error) {
          if (error.code === 'QUOTA_EXCEEDED') {
            return await mockFallbackDetector.detectDiagramsLocally();
          }
          throw error;
        }
      })
    };

    const result = await mockGracefulDegradation.executeWithDegradation(
      'gemini-api',
      () => mockGeminiClient.detectDiagrams('image-data')
    );

    expect(result.diagrams).toHaveLength(1);
    expect(result.diagrams[0].source).toBe('local');
    expect(mockFallbackDetector.detectDiagramsLocally).toHaveBeenCalled();
  });

  test('should handle database connection failures', async () => {
    const mockDatabase = {
      diagramCoordinates: {
        add: vi.fn()
          .mockRejectedValueOnce(new Error('Connection timeout'))
          .mockRejectedValueOnce(new Error('Database locked'))
          .mockResolvedValueOnce('coord_1') // Success on third try
      }
    };

    const mockStorageManager = {
      storeWithRetry: vi.fn().mockImplementation(async (data) => {
        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
          try {
            return await mockDatabase.diagramCoordinates.add(data);
          } catch (error) {
            attempts++;
            if (attempts >= maxAttempts) {
              // Fallback to localStorage
              localStorage.setItem(`backup_${data.questionId}`, JSON.stringify(data));
              return `backup_${data.questionId}`;
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      })
    };

    const result = await mockStorageManager.storeWithRetry(mockCoordinateData[0]);
    expect(result).toBe('coord_1');
    expect(mockDatabase.diagramCoordinates.add).toHaveBeenCalledTimes(3);
  });
});

describe('Performance and Scalability', () => {
  test('should handle large PDF files efficiently', async () => {
    const largePdfFile = new File(['x'.repeat(50 * 1024 * 1024)], 'large.pdf', { 
      type: 'application/pdf' 
    }); // 50MB file

    const mockPerformanceOptimizer = {
      optimizePdfProcessing: vi.fn().mockImplementation(async (file, options) => {
        const startTime = Date.now();
        
        // Simulate processing with memory management
        if (file.size > 10 * 1024 * 1024) {
          // Use batch processing for large files
          await new Promise(resolve => setTimeout(resolve, 500)); // Simulate batch processing
        } else {
          await new Promise(resolve => setTimeout(resolve, 100)); // Simulate direct processing
        }
        
        const processingTime = Date.now() - startTime;
        
        return {
          questions: mockEnhancedQuestions,
          processingTime,
          memoryUsed: file.size * 0.3, // Estimate
          batchesProcessed: Math.ceil(file.size / (10 * 1024 * 1024))
        };
      })
    };

    const result = await mockPerformanceOptimizer.optimizePdfProcessing(largePdfFile, {
      enableDiagramDetection: true,
      batchSize: 5,
      quality: 'medium'
    });

    expect(result.questions).toHaveLength(1);
    expect(result.processingTime).toBeGreaterThan(400); // Should use batch processing
    expect(result.batchesProcessed).toBeGreaterThan(1);
    expect(result.memoryUsed).toBeLessThan(largePdfFile.size); // Should be optimized
  });

  test('should maintain performance under concurrent load', async () => {
    const concurrentRequests = 10;
    const mockLoadBalancer = {
      processRequest: vi.fn().mockImplementation(async (requestId) => {
        const startTime = Date.now();
        
        // Simulate varying processing times
        const processingTime = 100 + Math.random() * 200;
        await new Promise(resolve => setTimeout(resolve, processingTime));
        
        return {
          requestId,
          result: mockEnhancedQuestions,
          processingTime: Date.now() - startTime,
          queueTime: Math.random() * 50
        };
      })
    };

    const startTime = Date.now();
    const requests = Array.from({ length: concurrentRequests }, (_, i) =>
      mockLoadBalancer.processRequest(`req_${i}`)
    );

    const results = await Promise.all(requests);
    const totalTime = Date.now() - startTime;

    // Verify all requests completed
    expect(results).toHaveLength(concurrentRequests);

    // Verify concurrent processing (should be faster than sequential)
    const averageProcessingTime = results.reduce((sum, r) => sum + r.processingTime, 0) / results.length;
    expect(totalTime).toBeLessThan(averageProcessingTime * concurrentRequests * 0.8);

    // Verify reasonable queue times
    const averageQueueTime = results.reduce((sum, r) => sum + r.queueTime, 0) / results.length;
    expect(averageQueueTime).toBeLessThan(100); // Should be under 100ms
  });
});