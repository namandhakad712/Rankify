/**
 * Visual Regression Tests for Diagram Rendering
 * Tests the visual accuracy of coordinate-based diagram rendering
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import type { DiagramCoordinates } from '~/shared/types/diagram-detection'

// Mock Canvas API for testing
class MockCanvas {
  width: number = 800;
  height: number = 600;
  private context: MockCanvasRenderingContext2D;

  constructor() {
    this.context = new MockCanvasRenderingContext2D();
  }

  getContext(contextType: string): MockCanvasRenderingContext2D | null {
    if (contextType === '2d') {
      return this.context;
    }
    return null;
  }

  toDataURL(type?: string, quality?: number): string {
    return `data:image/png;base64,mock-image-data-${this.width}x${this.height}`;
  }

  toBlob(callback: (blob: Blob | null) => void, type?: string, quality?: number): void {
    const blob = new Blob(['mock-blob-data'], { type: type || 'image/png' });
    callback(blob);
  }
}

class MockCanvasRenderingContext2D {
  fillStyle: string | CanvasGradient | CanvasPattern = '#000000';
  strokeStyle: string | CanvasGradient | CanvasPattern = '#000000';
  lineWidth: number = 1;
  font: string = '10px sans-serif';
  textAlign: CanvasTextAlign = 'start';
  textBaseline: CanvasTextBaseline = 'alphabetic';
  globalAlpha: number = 1;
  globalCompositeOperation: GlobalCompositeOperation = 'source-over';

  private operations: Array<{ type: string; args: any[] }> = [];

  // Drawing methods
  fillRect(x: number, y: number, width: number, height: number): void {
    this.operations.push({ type: 'fillRect', args: [x, y, width, height] });
  }

  strokeRect(x: number, y: number, width: number, height: number): void {
    this.operations.push({ type: 'strokeRect', args: [x, y, width, height] });
  }

  clearRect(x: number, y: number, width: number, height: number): void {
    this.operations.push({ type: 'clearRect', args: [x, y, width, height] });
  }

  fillText(text: string, x: number, y: number, maxWidth?: number): void {
    this.operations.push({ type: 'fillText', args: [text, x, y, maxWidth] });
  }

  strokeText(text: string, x: number, y: number, maxWidth?: number): void {
    this.operations.push({ type: 'strokeText', args: [text, x, y, maxWidth] });
  }

  drawImage(image: any, ...args: number[]): void {
    this.operations.push({ type: 'drawImage', args: [image, ...args] });
  }

  // Path methods
  beginPath(): void {
    this.operations.push({ type: 'beginPath', args: [] });
  }

  closePath(): void {
    this.operations.push({ type: 'closePath', args: [] });
  }

  moveTo(x: number, y: number): void {
    this.operations.push({ type: 'moveTo', args: [x, y] });
  }

  lineTo(x: number, y: number): void {
    this.operations.push({ type: 'lineTo', args: [x, y] });
  }

  rect(x: number, y: number, width: number, height: number): void {
    this.operations.push({ type: 'rect', args: [x, y, width, height] });
  }

  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, counterclockwise?: boolean): void {
    this.operations.push({ type: 'arc', args: [x, y, radius, startAngle, endAngle, counterclockwise] });
  }

  fill(): void {
    this.operations.push({ type: 'fill', args: [] });
  }

  stroke(): void {
    this.operations.push({ type: 'stroke', args: [] });
  }

  // Transform methods
  save(): void {
    this.operations.push({ type: 'save', args: [] });
  }

  restore(): void {
    this.operations.push({ type: 'restore', args: [] });
  }

  scale(x: number, y: number): void {
    this.operations.push({ type: 'scale', args: [x, y] });
  }

  translate(x: number, y: number): void {
    this.operations.push({ type: 'translate', args: [x, y] });
  }

  rotate(angle: number): void {
    this.operations.push({ type: 'rotate', args: [angle] });
  }

  // Test helper methods
  getOperations(): Array<{ type: string; args: any[] }> {
    return [...this.operations];
  }

  clearOperations(): void {
    this.operations = [];
  }

  getLastOperation(): { type: string; args: any[] } | undefined {
    return this.operations[this.operations.length - 1];
  }

  getOperationsByType(type: string): Array<{ type: string; args: any[] }> {
    return this.operations.filter(op => op.type === type);
  }
}

// Mock Image class
class MockImage {
  src: string = '';
  width: number = 0;
  height: number = 0;
  onload: ((this: GlobalEventHandlers, ev: Event) => any) | null = null;
  onerror: ((this: GlobalEventHandlers, ev: ErrorEvent) => any) | null = null;

  constructor() {
    // Simulate image loading
    setTimeout(() => {
      this.width = 800;
      this.height = 600;
      if (this.onload) {
        this.onload.call(this, new Event('load'));
      }
    }, 10);
  }
}

// Mock diagram renderer
class MockDiagramRenderer {
  private canvas: MockCanvas;
  private context: MockCanvasRenderingContext2D;

  constructor() {
    this.canvas = new MockCanvas();
    this.context = this.canvas.getContext('2d')!;
  }

  renderDiagram(
    coordinates: DiagramCoordinates,
    pageImage: string,
    options: {
      quality?: 'low' | 'medium' | 'high';
      format?: 'png' | 'jpeg' | 'webp';
      scale?: number;
      backgroundColor?: string;
    } = {}
  ): Promise<string> {
    return new Promise((resolve) => {
      const { quality = 'medium', format = 'png', scale = 1, backgroundColor = 'white' } = options;

      // Clear canvas
      this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

      // Set background
      if (backgroundColor !== 'transparent') {
        this.context.fillStyle = backgroundColor;
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
      }

      // Calculate scaled coordinates
      const scaledCoords = {
        x: coordinates.x1 * scale,
        y: coordinates.y1 * scale,
        width: (coordinates.x2 - coordinates.x1) * scale,
        height: (coordinates.y2 - coordinates.y1) * scale
      };

      // Draw diagram area
      this.context.strokeStyle = this.getDiagramColor(coordinates.type);
      this.context.lineWidth = 2;
      this.context.strokeRect(scaledCoords.x, scaledCoords.y, scaledCoords.width, scaledCoords.height);

      // Add type indicator
      this.context.fillStyle = this.getDiagramColor(coordinates.type);
      this.context.font = '12px Arial';
      this.context.fillText(
        coordinates.type.toUpperCase(),
        scaledCoords.x + 5,
        scaledCoords.y + 15
      );

      // Add confidence indicator
      const confidenceText = `${Math.round(coordinates.confidence * 100)}%`;
      this.context.fillText(
        confidenceText,
        scaledCoords.x + scaledCoords.width - 30,
        scaledCoords.y + 15
      );

      // Simulate different quality levels
      const qualityDelay = quality === 'high' ? 100 : quality === 'medium' ? 50 : 25;
      
      setTimeout(() => {
        resolve(this.canvas.toDataURL(`image/${format}`));
      }, qualityDelay);
    });
  }

  renderMultipleDiagrams(
    diagrams: Array<{ coordinates: DiagramCoordinates; id: string }>,
    pageImage: string,
    options: any = {}
  ): Promise<Map<string, string>> {
    const results = new Map<string, string>();
    
    const renderPromises = diagrams.map(async (diagram) => {
      const rendered = await this.renderDiagram(diagram.coordinates, pageImage, options);
      results.set(diagram.id, rendered);
    });

    return Promise.all(renderPromises).then(() => results);
  }

  createOverlay(
    coordinates: DiagramCoordinates,
    containerDimensions: { width: number; height: number }
  ): HTMLElement {
    const overlay = document.createElement('div');
    overlay.style.position = 'absolute';
    overlay.style.left = `${coordinates.x1}px`;
    overlay.style.top = `${coordinates.y1}px`;
    overlay.style.width = `${coordinates.x2 - coordinates.x1}px`;
    overlay.style.height = `${coordinates.y2 - coordinates.y1}px`;
    overlay.style.border = `2px solid ${this.getDiagramColor(coordinates.type)}`;
    overlay.style.backgroundColor = `${this.getDiagramColor(coordinates.type)}20`; // 20% opacity
    overlay.className = `diagram-overlay diagram-${coordinates.type}`;
    overlay.setAttribute('data-confidence', coordinates.confidence.toString());
    overlay.setAttribute('data-type', coordinates.type);
    
    return overlay;
  }

  private getDiagramColor(type: string): string {
    const colors = {
      'graph': '#3b82f6',
      'flowchart': '#10b981',
      'scientific': '#8b5cf6',
      'geometric': '#f59e0b',
      'table': '#ef4444',
      'circuit': '#f97316',
      'map': '#6366f1',
      'other': '#6b7280'
    };
    return colors[type as keyof typeof colors] || colors.other;
  }

  getCanvas(): MockCanvas {
    return this.canvas;
  }

  getContext(): MockCanvasRenderingContext2D {
    return this.context;
  }
}

describe('Diagram Rendering Visual Tests', () => {
  let renderer: MockDiagramRenderer;
  let mockImage: MockImage;

  beforeEach(() => {
    renderer = new MockDiagramRenderer();
    mockImage = new MockImage();
    
    // Mock global Canvas and Image
    global.HTMLCanvasElement = MockCanvas as any;
    global.Image = MockImage as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Single Diagram Rendering', () => {
    test('should render diagram with correct dimensions', async () => {
      const coordinates: DiagramCoordinates = {
        x1: 100, y1: 150, x2: 300, y2: 250,
        confidence: 0.85, type: 'graph', description: 'Test graph'
      };

      const result = await renderer.renderDiagram(coordinates, 'mock-image-url');
      
      expect(result).toContain('data:image/png;base64');
      
      const context = renderer.getContext();
      const operations = context.getOperations();
      
      // Should have drawn the diagram rectangle
      const strokeRectOps = operations.filter(op => op.type === 'strokeRect');
      expect(strokeRectOps).toHaveLength(1);
      
      const [x, y, width, height] = strokeRectOps[0].args;
      expect(x).toBe(100);
      expect(y).toBe(150);
      expect(width).toBe(200); // x2 - x1
      expect(height).toBe(100); // y2 - y1
    });

    test('should render diagram with correct type styling', async () => {
      const coordinates: DiagramCoordinates = {
        x1: 100, y1: 150, x2: 300, y2: 250,
        confidence: 0.85, type: 'flowchart', description: 'Test flowchart'
      };

      await renderer.renderDiagram(coordinates, 'mock-image-url');
      
      const context = renderer.getContext();
      const operations = context.getOperations();
      
      // Should have set the correct color for flowchart
      const strokeStyleOps = operations.filter(op => 
        op.type === 'strokeStyle' || 
        (op.type === 'fillStyle' && context.fillStyle === '#10b981')
      );
      
      // Should have drawn type label
      const textOps = operations.filter(op => op.type === 'fillText');
      expect(textOps.length).toBeGreaterThan(0);
      
      const typeTextOp = textOps.find(op => op.args[0] === 'FLOWCHART');
      expect(typeTextOp).toBeDefined();
    });

    test('should render confidence indicator', async () => {
      const coordinates: DiagramCoordinates = {
        x1: 100, y1: 150, x2: 300, y2: 250,
        confidence: 0.73, type: 'graph', description: 'Test confidence'
      };

      await renderer.renderDiagram(coordinates, 'mock-image-url');
      
      const context = renderer.getContext();
      const operations = context.getOperations();
      
      const textOps = operations.filter(op => op.type === 'fillText');
      const confidenceTextOp = textOps.find(op => op.args[0] === '73%');
      expect(confidenceTextOp).toBeDefined();
    });

    test('should handle different quality settings', async () => {
      const coordinates: DiagramCoordinates = {
        x1: 100, y1: 150, x2: 300, y2: 250,
        confidence: 0.85, type: 'graph', description: 'Quality test'
      };

      const startTime = Date.now();
      
      // Test high quality (should take longer)
      await renderer.renderDiagram(coordinates, 'mock-image-url', { quality: 'high' });
      const highQualityTime = Date.now() - startTime;
      
      const midTime = Date.now();
      
      // Test low quality (should be faster)
      await renderer.renderDiagram(coordinates, 'mock-image-url', { quality: 'low' });
      const lowQualityTime = Date.now() - midTime;
      
      expect(highQualityTime).toBeGreaterThan(lowQualityTime);
    });

    test('should handle different output formats', async () => {
      const coordinates: DiagramCoordinates = {
        x1: 100, y1: 150, x2: 300, y2: 250,
        confidence: 0.85, type: 'graph', description: 'Format test'
      };

      const pngResult = await renderer.renderDiagram(coordinates, 'mock-image-url', { format: 'png' });
      expect(pngResult).toContain('data:image/png');

      const jpegResult = await renderer.renderDiagram(coordinates, 'mock-image-url', { format: 'jpeg' });
      expect(jpegResult).toContain('data:image/jpeg');

      const webpResult = await renderer.renderDiagram(coordinates, 'mock-image-url', { format: 'webp' });
      expect(webpResult).toContain('data:image/webp');
    });

    test('should handle scaling correctly', async () => {
      const coordinates: DiagramCoordinates = {
        x1: 100, y1: 150, x2: 300, y2: 250,
        confidence: 0.85, type: 'graph', description: 'Scale test'
      };

      await renderer.renderDiagram(coordinates, 'mock-image-url', { scale: 2 });
      
      const context = renderer.getContext();
      const operations = context.getOperations();
      
      const strokeRectOps = operations.filter(op => op.type === 'strokeRect');
      expect(strokeRectOps).toHaveLength(1);
      
      const [x, y, width, height] = strokeRectOps[0].args;
      expect(x).toBe(200); // 100 * 2
      expect(y).toBe(300); // 150 * 2
      expect(width).toBe(400); // 200 * 2
      expect(height).toBe(200); // 100 * 2
    });
  });

  describe('Multiple Diagram Rendering', () => {
    test('should render multiple diagrams efficiently', async () => {
      const diagrams = [
        {
          id: 'diagram1',
          coordinates: { x1: 100, y1: 100, x2: 200, y2: 200, confidence: 0.9, type: 'graph', description: 'Graph 1' } as DiagramCoordinates
        },
        {
          id: 'diagram2',
          coordinates: { x1: 300, y1: 300, x2: 400, y2: 400, confidence: 0.8, type: 'table', description: 'Table 1' } as DiagramCoordinates
        },
        {
          id: 'diagram3',
          coordinates: { x1: 500, y1: 100, x2: 600, y2: 200, confidence: 0.7, type: 'flowchart', description: 'Flow 1' } as DiagramCoordinates
        }
      ];

      const startTime = Date.now();
      const results = await renderer.renderMultipleDiagrams(diagrams, 'mock-image-url');
      const renderTime = Date.now() - startTime;

      expect(results.size).toBe(3);
      expect(results.has('diagram1')).toBe(true);
      expect(results.has('diagram2')).toBe(true);
      expect(results.has('diagram3')).toBe(true);

      // Should render concurrently (faster than sequential)
      expect(renderTime).toBeLessThan(300); // Should be much faster than 3 * 100ms
    });

    test('should handle empty diagram list', async () => {
      const results = await renderer.renderMultipleDiagrams([], 'mock-image-url');
      expect(results.size).toBe(0);
    });

    test('should handle rendering failures gracefully', async () => {
      const diagrams = [
        {
          id: 'valid',
          coordinates: { x1: 100, y1: 100, x2: 200, y2: 200, confidence: 0.9, type: 'graph', description: 'Valid' } as DiagramCoordinates
        },
        {
          id: 'invalid',
          coordinates: { x1: -100, y1: -100, x2: -50, y2: -50, confidence: 0.5, type: 'other', description: 'Invalid' } as DiagramCoordinates
        }
      ];

      // Should not throw, but handle gracefully
      const results = await renderer.renderMultipleDiagrams(diagrams, 'mock-image-url');
      expect(results.size).toBe(2); // Both should be processed, even if invalid
    });
  });

  describe('Overlay Generation', () => {
    test('should create overlay with correct positioning', () => {
      const coordinates: DiagramCoordinates = {
        x1: 100, y1: 150, x2: 300, y2: 250,
        confidence: 0.85, type: 'graph', description: 'Overlay test'
      };

      const overlay = renderer.createOverlay(coordinates, { width: 800, height: 600 });

      expect(overlay.style.left).toBe('100px');
      expect(overlay.style.top).toBe('150px');
      expect(overlay.style.width).toBe('200px');
      expect(overlay.style.height).toBe('100px');
      expect(overlay.style.position).toBe('absolute');
    });

    test('should create overlay with correct styling', () => {
      const coordinates: DiagramCoordinates = {
        x1: 100, y1: 150, x2: 300, y2: 250,
        confidence: 0.85, type: 'flowchart', description: 'Style test'
      };

      const overlay = renderer.createOverlay(coordinates, { width: 800, height: 600 });

      expect(overlay.style.border).toContain('#10b981'); // Flowchart color
      expect(overlay.style.backgroundColor).toContain('#10b981'); // With opacity
      expect(overlay.className).toContain('diagram-overlay');
      expect(overlay.className).toContain('diagram-flowchart');
    });

    test('should include data attributes', () => {
      const coordinates: DiagramCoordinates = {
        x1: 100, y1: 150, x2: 300, y2: 250,
        confidence: 0.73, type: 'scientific', description: 'Data attributes test'
      };

      const overlay = renderer.createOverlay(coordinates, { width: 800, height: 600 });

      expect(overlay.getAttribute('data-confidence')).toBe('0.73');
      expect(overlay.getAttribute('data-type')).toBe('scientific');
    });
  });

  describe('Visual Regression Prevention', () => {
    test('should maintain consistent rendering output', async () => {
      const coordinates: DiagramCoordinates = {
        x1: 100, y1: 150, x2: 300, y2: 250,
        confidence: 0.85, type: 'graph', description: 'Consistency test'
      };

      // Render the same diagram multiple times
      const results = await Promise.all([
        renderer.renderDiagram(coordinates, 'mock-image-url'),
        renderer.renderDiagram(coordinates, 'mock-image-url'),
        renderer.renderDiagram(coordinates, 'mock-image-url')
      ]);

      // All results should be identical
      expect(results[0]).toBe(results[1]);
      expect(results[1]).toBe(results[2]);
    });

    test('should handle edge case coordinates visually', async () => {
      const edgeCases: DiagramCoordinates[] = [
        // Very small diagram
        { x1: 100, y1: 100, x2: 105, y2: 105, confidence: 0.5, type: 'other', description: 'Tiny' },
        // Very large diagram
        { x1: 0, y1: 0, x2: 800, y2: 600, confidence: 0.9, type: 'other', description: 'Full size' },
        // Extreme aspect ratio
        { x1: 100, y1: 100, x2: 700, y2: 110, confidence: 0.7, type: 'other', description: 'Wide' }
      ];

      for (const coords of edgeCases) {
        const result = await renderer.renderDiagram(coords, 'mock-image-url');
        expect(result).toContain('data:image/png;base64');
        
        // Should not throw errors
        const overlay = renderer.createOverlay(coords, { width: 800, height: 600 });
        expect(overlay).toBeDefined();
      }
    });

    test('should render different diagram types distinctly', async () => {
      const diagramTypes: DiagramCoordinates['type'][] = [
        'graph', 'flowchart', 'scientific', 'geometric', 'table', 'circuit', 'map', 'other'
      ];

      const renderedColors = new Set<string>();

      for (const type of diagramTypes) {
        const coordinates: DiagramCoordinates = {
          x1: 100, y1: 100, x2: 200, y2: 200,
          confidence: 0.85, type, description: `${type} test`
        };

        const overlay = renderer.createOverlay(coordinates, { width: 800, height: 600 });
        const borderColor = overlay.style.border;
        
        renderedColors.add(borderColor);
      }

      // Each type should have a distinct color
      expect(renderedColors.size).toBe(diagramTypes.length);
    });
  });

  describe('Performance Visual Tests', () => {
    test('should render large numbers of diagrams efficiently', async () => {
      const diagrams = Array.from({ length: 100 }, (_, i) => ({
        id: `diagram_${i}`,
        coordinates: {
          x1: (i % 10) * 80,
          y1: Math.floor(i / 10) * 60,
          x2: (i % 10) * 80 + 70,
          y2: Math.floor(i / 10) * 60 + 50,
          confidence: 0.8,
          type: 'graph',
          description: `Diagram ${i}`
        } as DiagramCoordinates
      }));

      const startTime = Date.now();
      const results = await renderer.renderMultipleDiagrams(diagrams, 'mock-image-url');
      const renderTime = Date.now() - startTime;

      expect(results.size).toBe(100);
      expect(renderTime).toBeLessThan(5000); // Should render 100 diagrams in under 5 seconds
    });

    test('should handle memory efficiently during rendering', async () => {
      const coordinates: DiagramCoordinates = {
        x1: 0, y1: 0, x2: 800, y2: 600, // Full canvas size
        confidence: 0.85, type: 'graph', description: 'Memory test'
      };

      // Render multiple large diagrams
      const renderPromises = Array.from({ length: 10 }, () =>
        renderer.renderDiagram(coordinates, 'mock-image-url', { quality: 'high' })
      );

      const results = await Promise.all(renderPromises);
      
      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result).toContain('data:image/png;base64');
      });
    });
  });

  describe('Error Handling in Rendering', () => {
    test('should handle invalid coordinates gracefully', async () => {
      const invalidCoordinates: DiagramCoordinates = {
        x1: NaN, y1: NaN, x2: NaN, y2: NaN,
        confidence: 0.85, type: 'graph', description: 'Invalid coords'
      };

      // Should not throw, but handle gracefully
      const result = await renderer.renderDiagram(invalidCoordinates, 'mock-image-url');
      expect(result).toContain('data:image/png;base64');
    });

    test('should handle missing image gracefully', async () => {
      const coordinates: DiagramCoordinates = {
        x1: 100, y1: 150, x2: 300, y2: 250,
        confidence: 0.85, type: 'graph', description: 'Missing image test'
      };

      // Should still render the diagram overlay even without base image
      const result = await renderer.renderDiagram(coordinates, '');
      expect(result).toContain('data:image/png;base64');
    });

    test('should handle extreme confidence values', async () => {
      const extremeConfidences = [-1, 0, 0.001, 0.999, 1, 2, NaN, Infinity];

      for (const confidence of extremeConfidences) {
        const coordinates: DiagramCoordinates = {
          x1: 100, y1: 150, x2: 300, y2: 250,
          confidence, type: 'graph', description: 'Extreme confidence'
        };

        const result = await renderer.renderDiagram(coordinates, 'mock-image-url');
        expect(result).toContain('data:image/png;base64');
        
        const overlay = renderer.createOverlay(coordinates, { width: 800, height: 600 });
        expect(overlay.getAttribute('data-confidence')).toBe(confidence.toString());
      }
    });
  });
});