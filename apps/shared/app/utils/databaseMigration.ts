/**
 * Database Migration Utilities
 * 
 * This module provides utilities for migrating existing data to support
 * the new diagram detection features and coordinate-based storage.
 */

import type { 
  CoordinateMetadata, 
  DiagramCoordinates,
  CBTPreset,
  EnhancedQuestion
} from '~/shared/types/diagram-detection'
import type { CropperQuestionData, PdfCropperCoords } from '~/shared/types/pdf-cropper'
import { RankifyDB } from '~/db'
import { DiagramDatabaseManager } from './diagramDatabaseUtils'

export class DatabaseMigrationManager {
  private db: RankifyDB;
  private diagramDB: DiagramDatabaseManager;

  constructor() {
    this.db = new RankifyDB();
    this.diagramDB = new DiagramDatabaseManager();
  }

  /**
   * Check if migration is needed
   */
  async checkMigrationStatus(): Promise<{
    needsMigration: boolean;
    currentVersion: number;
    targetVersion: number;
    existingData: {
      hasCoordinates: boolean;
      hasPresets: boolean;
      hasPageImages: boolean;
    };
  }> {
    try {
      // Check current database version
      const currentVersion = this.db.verno;
      const targetVersion = 6;

      // Check if new tables exist and have data
      const coordinatesCount = await this.db.diagramCoordinates.count();
      const presetsCount = await this.db.cbtPresets.count();
      const pageImagesCount = await this.db.pageImages.count();

      return {
        needsMigration: currentVersion < targetVersion,
        currentVersion,
        targetVersion,
        existingData: {
          hasCoordinates: coordinatesCount > 0,
          hasPresets: presetsCount > 0,
          hasPageImages: pageImagesCount > 0
        }
      };
    } catch (error) {
      console.error('Error checking migration status:', error);
      return {
        needsMigration: true,
        currentVersion: 0,
        targetVersion: 6,
        existingData: {
          hasCoordinates: false,
          hasPresets: false,
          hasPageImages: false
        }
      };
    }
  }

  /**
   * Migrate existing cropper data to coordinate-based format
   */
  async migrateCropperDataToCoordinates(): Promise<{
    success: boolean;
    migratedQuestions: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let migratedQuestions = 0;

    try {
      // Get all existing test output data
      const testOutputs = await this.db.testOutputDatas.toArray();
      
      for (const testOutput of testOutputs) {
        const testData = testOutput.testOutputData;
        
        // Check if this is PDF cropper data
        if (testData.generatedBy === 'pdfCropperPage' && 'pdfCropperData' in testData) {
          const cropperData = testData.pdfCropperData;
          
          // Convert cropper data to coordinate metadata
          for (const [subject, sections] of Object.entries(cropperData)) {
            for (const [section, questions] of Object.entries(sections)) {
              for (const [questionKey, questionData] of Object.entries(questions)) {
                try {
                  await this.migrateSingleQuestion(
                    subject,
                    section,
                    questionKey,
                    questionData as CropperQuestionData,
                    testOutput.id.toString()
                  );
                  migratedQuestions++;
                } catch (error) {
                  errors.push(`Failed to migrate question ${subject}/${section}/${questionKey}: ${error.message}`);
                }
              }
            }
          }
        }
      }

      return {
        success: errors.length === 0,
        migratedQuestions,
        errors
      };
    } catch (error) {
      errors.push(`Migration failed: ${error.message}`);
      return {
        success: false,
        migratedQuestions,
        errors
      };
    }
  }

  /**
   * Migrate a single question from cropper format to coordinate format
   */
  private async migrateSingleQuestion(
    subject: string,
    section: string,
    questionKey: string,
    questionData: CropperQuestionData,
    testId: string
  ): Promise<void> {
    const questionId = `${testId}_${subject}_${section}_${questionKey}`;
    
    // Convert PDF coordinates to diagram coordinates
    const diagrams: DiagramCoordinates[] = questionData.pdfData.map((pdfCoord, index) => ({
      x1: pdfCoord.x1,
      y1: pdfCoord.y1,
      x2: pdfCoord.x2,
      y2: pdfCoord.y2,
      confidence: 1.0, // High confidence for manually created coordinates
      type: 'other', // Default type since we don't know the diagram type
      description: `Migrated from PDF cropper data (crop ${index + 1})`
    }));

    // Estimate image dimensions (we don't have this from cropper data)
    const estimatedDimensions = this.estimateImageDimensions(questionData.pdfData);

    // Create coordinate metadata
    const coordinateMetadata: CoordinateMetadata = {
      questionId,
      pageNumber: questionData.pdfData[0]?.page || 1,
      originalImageDimensions: estimatedDimensions,
      diagrams: diagrams.map((diagram, index) => ({
        id: `${questionId}_migrated_${index}`,
        coordinates: diagram,
        type: diagram.type,
        description: diagram.description,
        confidence: diagram.confidence,
        lastModified: new Date(),
        modifiedBy: 'user' // Since these were manually created
      }))
    };

    // Store the migrated data
    await this.diagramDB.storeQuestionDiagrams(
      questionId,
      coordinateMetadata.pageNumber,
      diagrams,
      estimatedDimensions
    );
  }

  /**
   * Estimate image dimensions from PDF coordinates
   */
  private estimateImageDimensions(pdfCoords: PdfCropperCoords[]): { width: number; height: number } {
    if (pdfCoords.length === 0) {
      return { width: 800, height: 600 }; // Default dimensions
    }

    // Find the maximum coordinates to estimate image size
    let maxX = 0;
    let maxY = 0;

    for (const coord of pdfCoords) {
      maxX = Math.max(maxX, coord.x2);
      maxY = Math.max(maxY, coord.y2);
    }

    // Add some padding to account for content beyond the cropped areas
    return {
      width: Math.max(800, maxX + 100),
      height: Math.max(600, maxY + 100)
    };
  }

  /**
   * Create default CBT presets if they don't exist
   */
  async ensureDefaultPresets(): Promise<void> {
    const existingPresets = await this.diagramDB.getCBTPresets();
    
    // Check if JEE and NEET presets exist
    const hasJEE = existingPresets.some(p => p.examType === 'JEE');
    const hasNEET = existingPresets.some(p => p.examType === 'NEET');

    if (!hasJEE) {
      await this.createJEEPreset();
    }

    if (!hasNEET) {
      await this.createNEETPreset();
    }
  }

  /**
   * Create JEE preset
   */
  private async createJEEPreset(): Promise<void> {
    const jeePreset: CBTPreset = {
      id: 'jee-main-default',
      name: 'JEE Main (Default)',
      examType: 'JEE',
      sections: [
        {
          name: 'Physics',
          subjects: ['Physics'],
          questionCount: 30,
          timeAllocation: 3600
        },
        {
          name: 'Chemistry',
          subjects: ['Chemistry'],
          questionCount: 30,
          timeAllocation: 3600
        },
        {
          name: 'Mathematics',
          subjects: ['Mathematics'],
          questionCount: 30,
          timeAllocation: 3600
        }
      ],
      timeLimit: 10800,
      markingScheme: {
        correct: 4,
        incorrect: -1,
        unattempted: 0
      },
      questionDistribution: {
        totalQuestions: 90,
        sections: [
          { name: 'Physics', subjects: ['Physics'], questionCount: 30, timeAllocation: 3600 },
          { name: 'Chemistry', subjects: ['Chemistry'], questionCount: 30, timeAllocation: 3600 },
          { name: 'Mathematics', subjects: ['Mathematics'], questionCount: 30, timeAllocation: 3600 }
        ]
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.diagramDB.storeCBTPreset(jeePreset);
  }

  /**
   * Create NEET preset
   */
  private async createNEETPreset(): Promise<void> {
    const neetPreset: CBTPreset = {
      id: 'neet-default',
      name: 'NEET (Default)',
      examType: 'NEET',
      sections: [
        {
          name: 'Physics',
          subjects: ['Physics'],
          questionCount: 50,
          timeAllocation: 3600
        },
        {
          name: 'Chemistry',
          subjects: ['Chemistry'],
          questionCount: 50,
          timeAllocation: 3600
        },
        {
          name: 'Biology',
          subjects: ['Botany', 'Zoology'],
          questionCount: 100,
          timeAllocation: 3600
        }
      ],
      timeLimit: 10800,
      markingScheme: {
        correct: 4,
        incorrect: -1,
        unattempted: 0
      },
      questionDistribution: {
        totalQuestions: 200,
        sections: [
          { name: 'Physics', subjects: ['Physics'], questionCount: 50, timeAllocation: 3600 },
          { name: 'Chemistry', subjects: ['Chemistry'], questionCount: 50, timeAllocation: 3600 },
          { name: 'Biology', subjects: ['Botany', 'Zoology'], questionCount: 100, timeAllocation: 3600 }
        ]
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.diagramDB.storeCBTPreset(neetPreset);
  }

  /**
   * Validate migrated data integrity
   */
  async validateMigration(): Promise<{
    isValid: boolean;
    issues: string[];
    statistics: {
      totalCoordinates: number;
      totalPresets: number;
      totalPageImages: number;
    };
  }> {
    const issues: string[] = [];

    try {
      // Get statistics
      const coordinatesCount = await this.db.diagramCoordinates.count();
      const presetsCount = await this.db.cbtPresets.count();
      const pageImagesCount = await this.db.pageImages.count();

      // Validate database integrity
      const integrity = await this.diagramDB.validateDatabaseIntegrity();
      issues.push(...integrity.errors);
      issues.push(...integrity.warnings);

      // Check if presets are valid
      const presets = await this.diagramDB.getCBTPresets();
      for (const preset of presets) {
        if (!preset.id || !preset.name || !preset.examType) {
          issues.push(`Invalid preset: ${preset.id || 'unknown'}`);
        }
      }

      return {
        isValid: issues.length === 0,
        issues,
        statistics: {
          totalCoordinates: coordinatesCount,
          totalPresets: presetsCount,
          totalPageImages: pageImagesCount
        }
      };
    } catch (error) {
      issues.push(`Validation failed: ${error.message}`);
      return {
        isValid: false,
        issues,
        statistics: {
          totalCoordinates: 0,
          totalPresets: 0,
          totalPageImages: 0
        }
      };
    }
  }

  /**
   * Rollback migration (if needed)
   */
  async rollbackMigration(): Promise<{
    success: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    try {
      // Clear new tables
      await this.db.diagramCoordinates.clear();
      await this.db.pageImages.clear();
      await this.db.diagramCache.clear();
      
      // Keep presets as they might be useful
      // await this.db.cbtPresets.clear();

      return {
        success: true,
        errors
      };
    } catch (error) {
      errors.push(`Rollback failed: ${error.message}`);
      return {
        success: false,
        errors
      };
    }
  }

  /**
   * Perform complete migration process
   */
  async performFullMigration(): Promise<{
    success: boolean;
    steps: Array<{
      step: string;
      success: boolean;
      details: string;
    }>;
  }> {
    const steps: Array<{ step: string; success: boolean; details: string }> = [];

    // Step 1: Check migration status
    const status = await this.checkMigrationStatus();
    steps.push({
      step: 'Check Migration Status',
      success: true,
      details: `Current version: ${status.currentVersion}, Target: ${status.targetVersion}`
    });

    if (!status.needsMigration) {
      steps.push({
        step: 'Migration Check',
        success: true,
        details: 'No migration needed'
      });
      return { success: true, steps };
    }

    // Step 2: Ensure default presets
    try {
      await this.ensureDefaultPresets();
      steps.push({
        step: 'Create Default Presets',
        success: true,
        details: 'Default JEE and NEET presets created'
      });
    } catch (error) {
      steps.push({
        step: 'Create Default Presets',
        success: false,
        details: error.message
      });
    }

    // Step 3: Migrate cropper data
    const migrationResult = await this.migrateCropperDataToCoordinates();
    steps.push({
      step: 'Migrate Cropper Data',
      success: migrationResult.success,
      details: `Migrated ${migrationResult.migratedQuestions} questions. Errors: ${migrationResult.errors.length}`
    });

    // Step 4: Validate migration
    const validation = await this.validateMigration();
    steps.push({
      step: 'Validate Migration',
      success: validation.isValid,
      details: `Issues found: ${validation.issues.length}. Stats: ${JSON.stringify(validation.statistics)}`
    });

    const overallSuccess = steps.every(step => step.success);
    return { success: overallSuccess, steps };
  }
}

// Export singleton instance
export const migrationManager = new DatabaseMigrationManager();

export default DatabaseMigrationManager;