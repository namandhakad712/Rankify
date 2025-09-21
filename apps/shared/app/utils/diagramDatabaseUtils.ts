/**
 * Diagram Database Utilities
 * 
 * This module provides high-level utilities for managing diagram coordinates,
 * page images, and CBT presets in the IndexedDB database.
 */

import type { 
  CoordinateMetadata, 
  PageImageData, 
  CBTPreset, 
  DiagramCache,
  DiagramCoordinates,
  ProcessingStats
} from '~/shared/types/diagram-detection'
import { RankifyDB } from '~/db'

export class DiagramDatabaseManager {
  private db: RankifyDB;

  constructor() {
    this.db = new RankifyDB();
  }

  /**
   * Store diagram coordinates for a question with validation
   */
  async storeQuestionDiagrams(
    questionId: string, 
    pageNumber: number, 
    diagrams: DiagramCoordinates[],
    imageDimensions: { width: number; height: number }
  ): Promise<void> {
    const coordinateMetadata: CoordinateMetadata = {
      questionId,
      pageNumber,
      originalImageDimensions: imageDimensions,
      diagrams: diagrams.map((diagram, index) => ({
        id: `${questionId}_diagram_${index}`,
        coordinates: diagram,
        type: diagram.type,
        description: diagram.description,
        confidence: diagram.confidence,
        lastModified: new Date(),
        modifiedBy: 'ai'
      }))
    };

    await this.db.addDiagramCoordinates(coordinateMetadata);
  }

  /**
   * Update diagram coordinates after manual editing
   */
  async updateDiagramCoordinates(
    questionId: string, 
    diagramId: string, 
    newCoordinates: DiagramCoordinates
  ): Promise<void> {
    const existing = await this.db.getDiagramCoordinates(questionId);
    if (!existing) {
      throw new Error(`No diagram coordinates found for question ${questionId}`);
    }

    const diagramIndex = existing.diagrams.findIndex(d => d.id === diagramId);
    if (diagramIndex === -1) {
      throw new Error(`Diagram ${diagramId} not found in question ${questionId}`);
    }

    existing.diagrams[diagramIndex] = {
      ...existing.diagrams[diagramIndex],
      coordinates: newCoordinates,
      lastModified: new Date(),
      modifiedBy: 'user'
    };

    await this.db.updateDiagramCoordinates(questionId, existing);
  }

  /**
   * Get all diagrams for a question
   */
  async getQuestionDiagrams(questionId: string): Promise<DiagramCoordinates[]> {
    const metadata = await this.db.getDiagramCoordinates(questionId);
    return metadata ? metadata.diagrams.map(d => d.coordinates) : [];
  }

  /**
   * Get diagrams for multiple questions
   */
  async getMultipleQuestionDiagrams(questionIds: string[]): Promise<Map<string, DiagramCoordinates[]>> {
    const result = new Map<string, DiagramCoordinates[]>();
    
    for (const questionId of questionIds) {
      const diagrams = await this.getQuestionDiagrams(questionId);
      result.set(questionId, diagrams);
    }
    
    return result;
  }

  /**
   * Store page image with metadata
   */
  async storePageImage(
    testId: string, 
    pageNumber: number, 
    imageBlob: Blob, 
    dimensions: { width: number; height: number },
    scale: number = 1.0
  ): Promise<string> {
    const pageImageData: PageImageData = {
      id: `${testId}_page_${pageNumber}`,
      pageNumber,
      testId,
      imageData: imageBlob,
      dimensions,
      scale,
      createdAt: new Date()
    };

    return await this.db.addPageImage(pageImageData);
  }

  /**
   * Get page image for rendering
   */
  async getPageImage(testId: string, pageNumber: number): Promise<PageImageData | null> {
    const imageId = `${testId}_page_${pageNumber}`;
    const pageImage = await this.db.getPageImage(imageId);
    return pageImage || null;
  }

  /**
   * Get all page images for a test
   */
  async getTestPageImages(testId: string): Promise<PageImageData[]> {
    return await this.db.getPageImagesByTestId(testId);
  }

  /**
   * Store CBT preset
   */
  async storeCBTPreset(preset: CBTPreset): Promise<string> {
    return await this.db.addCBTPreset(preset);
  }

  /**
   * Get CBT presets by exam type
   */
  async getCBTPresets(examType?: string): Promise<CBTPreset[]> {
    if (examType) {
      return await this.db.getCBTPresetsByExamType(examType);
    }
    return await this.db.getAllCBTPresets();
  }

  /**
   * Update CBT preset
   */
  async updateCBTPreset(presetId: string, updates: Partial<CBTPreset>): Promise<void> {
    const updatedData = {
      ...updates,
      updatedAt: new Date()
    };
    await this.db.updateCBTPreset(presetId, updatedData);
  }

  /**
   * Cache diagram rendering data
   */
  async cacheDiagramRendering(
    questionId: string, 
    coordinates: DiagramCoordinates[], 
    cacheKey?: string
  ): Promise<void> {
    const key = cacheKey || this.generateCacheKey(questionId, coordinates);
    
    const cacheData: DiagramCache = {
      questionId,
      coordinates,
      renderedAt: new Date(),
      cacheKey: key
    };

    await this.db.addDiagramCache(cacheData);
  }

  /**
   * Get cached diagram data
   */
  async getCachedDiagramData(cacheKey: string): Promise<DiagramCoordinates[] | null> {
    const cached = await this.db.getDiagramCache(cacheKey);
    return cached ? cached.coordinates : null;
  }

  /**
   * Clean up old cache entries (older than specified days)
   */
  async cleanupOldCache(daysOld: number = 7): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    await this.db.cleanupDiagramCache(cutoffDate);
  }

  /**
   * Bulk operations for performance
   */
  async bulkStoreQuestionDiagrams(
    questionsData: Array<{
      questionId: string;
      pageNumber: number;
      diagrams: DiagramCoordinates[];
      imageDimensions: { width: number; height: number };
    }>
  ): Promise<void> {
    const coordinateMetadataArray: CoordinateMetadata[] = questionsData.map(data => ({
      questionId: data.questionId,
      pageNumber: data.pageNumber,
      originalImageDimensions: data.imageDimensions,
      diagrams: data.diagrams.map((diagram, index) => ({
        id: `${data.questionId}_diagram_${index}`,
        coordinates: diagram,
        type: diagram.type,
        description: diagram.description,
        confidence: diagram.confidence,
        lastModified: new Date(),
        modifiedBy: 'ai'
      }))
    }));

    await this.db.bulkAddDiagramCoordinates(coordinateMetadataArray);
  }

  /**
   * Get statistics about stored diagram data
   */
  async getDiagramStatistics(): Promise<{
    totalQuestions: number;
    questionsWithDiagrams: number;
    totalDiagrams: number;
    averageConfidence: number;
    pagesCovered: number;
  }> {
    const allCoordinates = await this.db.diagramCoordinates.toArray();
    
    const totalQuestions = allCoordinates.length;
    const questionsWithDiagrams = allCoordinates.filter(c => c.diagrams.length > 0).length;
    const totalDiagrams = allCoordinates.reduce((sum, c) => sum + c.diagrams.length, 0);
    
    const allDiagrams = allCoordinates.flatMap(c => c.diagrams);
    const averageConfidence = allDiagrams.length > 0 ? 
      allDiagrams.reduce((sum, d) => sum + d.confidence, 0) / allDiagrams.length : 0;
    
    const uniquePages = new Set(allCoordinates.map(c => c.pageNumber));
    const pagesCovered = uniquePages.size;

    return {
      totalQuestions,
      questionsWithDiagrams,
      totalDiagrams,
      averageConfidence,
      pagesCovered
    };
  }

  /**
   * Export diagram data for backup or migration
   */
  async exportDiagramData(): Promise<{
    coordinates: CoordinateMetadata[];
    presets: CBTPreset[];
    exportDate: Date;
  }> {
    const coordinates = await this.db.diagramCoordinates.toArray();
    const presets = await this.db.getAllCBTPresets();
    
    return {
      coordinates,
      presets,
      exportDate: new Date()
    };
  }

  /**
   * Import diagram data from backup
   */
  async importDiagramData(data: {
    coordinates: CoordinateMetadata[];
    presets: CBTPreset[];
  }): Promise<void> {
    // Import coordinates
    if (data.coordinates.length > 0) {
      await this.db.bulkAddDiagramCoordinates(data.coordinates);
    }

    // Import presets
    for (const preset of data.presets) {
      await this.db.addCBTPreset(preset);
    }
  }

  /**
   * Delete all diagram data for a test
   */
  async deleteTestDiagramData(testId: string): Promise<void> {
    // Delete page images
    await this.db.deletePageImagesByTestId(testId);
    
    // Delete diagram cache for this test
    await this.db.diagramCache.where('questionId').startsWith(testId).delete();
    
    // Note: Coordinate metadata is tied to questionId, not testId
    // So we don't delete coordinates here unless we have a way to map questionId to testId
  }

  /**
   * Validate database integrity
   */
  async validateDatabaseIntegrity(): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check if all coordinate metadata has valid structure
      const allCoordinates = await this.db.diagramCoordinates.toArray();
      
      for (const coord of allCoordinates) {
        if (!coord.questionId) {
          errors.push(`Coordinate metadata missing questionId`);
        }
        
        if (!coord.originalImageDimensions || 
            !coord.originalImageDimensions.width || 
            !coord.originalImageDimensions.height) {
          errors.push(`Invalid image dimensions for question ${coord.questionId}`);
        }
        
        for (const diagram of coord.diagrams) {
          if (!diagram.coordinates || 
              typeof diagram.coordinates.x1 !== 'number' ||
              typeof diagram.coordinates.y1 !== 'number' ||
              typeof diagram.coordinates.x2 !== 'number' ||
              typeof diagram.coordinates.y2 !== 'number') {
            errors.push(`Invalid coordinates for diagram ${diagram.id} in question ${coord.questionId}`);
          }
        }
      }

      // Check for orphaned cache entries
      const cacheEntries = await this.db.diagramCache.toArray();
      const questionIds = new Set(allCoordinates.map(c => c.questionId));
      
      for (const cache of cacheEntries) {
        if (!questionIds.has(cache.questionId)) {
          warnings.push(`Orphaned cache entry for question ${cache.questionId}`);
        }
      }

    } catch (error) {
      errors.push(`Database validation failed: ${error.message}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Generate cache key for diagram coordinates
   */
  private generateCacheKey(questionId: string, coordinates: DiagramCoordinates[]): string {
    const coordString = coordinates
      .map(c => `${c.x1},${c.y1},${c.x2},${c.y2}`)
      .join('|');
    return `${questionId}_${btoa(coordString).slice(0, 10)}`;
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    await this.db.close();
  }
}

// Singleton instance for global use
export const diagramDB = new DiagramDatabaseManager();

export default DiagramDatabaseManager;