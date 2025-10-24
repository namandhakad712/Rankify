# 📐 Diagram Implementation Guide - Coordinate-Based Approach

## 🎯 Core Concept: Smart Diagram Handling

**Problem:** Traditional approach stores cropped images → wastes storage space  
**Solution:** Store only coordinates → render diagrams on-demand from original PDF

### Key Benefits:
- ✅ **Minimal Storage:** Only coordinates stored (few bytes vs MB of images)
- ✅ **No Image Processing:** No cropping, no file management
- ✅ **Always Fresh:** Render from original PDF, no quality loss
- ✅ **Flexible:** User can adjust diagram bounds anytime
- ✅ **Efficient:** One PDF file, unlimited diagram views

---

## 📊 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    PDF Upload & AI Extraction                │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  Gemini Vision API                                           │
│  - Analyzes PDF layout                                       │
│  - Detects diagram positions                                 │
│  - Returns coordinates: {x, y, width, height, page}          │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  Question Data Structure                                     │
│  {                                                           │
│    id: 1,                                                    │
│    text: "Refer to Figure 2.3...",                          │
│    hasDiagram: true,                                         │
│    diagrams: [{                                              │
│      pageNumber: 2,                                          │
│      boundingBox: {x: 0.1, y: 0.3, width: 0.4, height: 0.3} │
│    }]                                                        │
│  }                                                           │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  Review Interface                                            │
│  - Render diagram from PDF using coordinates                 │
│  - Show interactive editor to adjust bounds                  │
│  - Save updated coordinates                                  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  CBT Test Interface                                          │
│  - Render diagram alongside question                         │
│  - On-demand rendering from PDF                              │
│  - No pre-processing needed                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 Implementation Plan

### Phase 1: Data Structure & Storage


**File:** `apps/shared/app/types/diagram.ts`

```typescript
/**
 * Diagram coordinate system uses normalized values (0-1)
 * This makes coordinates resolution-independent
 */
export interface DiagramBoundingBox {
  x: number      // Horizontal position (0 = left edge, 1 = right edge)
  y: number      // Vertical position (0 = top edge, 1 = bottom edge)
  width: number  // Width as fraction of page width (0-1)
  height: number // Height as fraction of page height (0-1)
}

export interface DiagramCoordinates {
  questionId: number
  pageNumber: number        // Which PDF page (1-indexed)
  boundingBox: DiagramBoundingBox
  confidence: number        // AI confidence (1-5)
  label?: string           // "Figure 2.3", "Circuit Diagram", etc.
  detectionMethod: 'ai' | 'manual' | 'adjusted'
  createdAt: number        // Timestamp
  updatedAt?: number       // Last modification timestamp
}

export interface DiagramMetadata {
  type?: 'circuit' | 'graph' | 'flowchart' | 'table' | 'image' | 'other'
  description?: string     // AI-generated description
  hasText: boolean        // Whether diagram contains text
  complexity: 'simple' | 'medium' | 'complex'
}

// Enhanced question interface with diagram support
export interface AIExtractedQuestion {
  id: number
  text: string
  type: 'MCQ' | 'MSQ' | 'NAT' | 'MSM'
  options: string[]
  correctAnswer: string | string[] | null
  subject: string
  section: string
  pageNumber: number
  questionNumber: number
  confidence: number
  hasDiagram: boolean
  diagrams?: DiagramCoordinates[]  // Array of diagram coordinates
  diagramMetadata?: DiagramMetadata[]
  extractionMetadata: {
    processingTime: number
    geminiModel: string
    apiVersion: string
  }
}
```

---

### Phase 2: AI Coordinate Detection

**File:** `apps/shared/app/utils/diagramCoordinateUtils.ts`

```typescript
import * as pdfjsLib from 'pdfjs-dist'

/**
 * Enhanced Gemini prompt for diagram coordinate detection
 */
const DIAGRAM_COORDINATE_PROMPT = `
You are analyzing a PDF to detect diagrams and their positions.

For EACH diagram/figure/image you find, return:
{
  "pageNumber": <page number where diagram is located>,
  "boundingBox": {
    "x": <horizontal position, 0-1 where 0=left edge, 1=right edge>,
    "y": <vertical position, 0-1 where 0=top edge, 1=bottom edge>,
    "width": <diagram width as fraction of page width, 0-1>,
    "height": <diagram height as fraction of page height, 0-1>
  },
  "confidence": <your confidence in detection accuracy, 1-5>,
  "label": "<diagram label if visible, e.g., 'Figure 2.3', 'Circuit A'>",
  "type": "<circuit|graph|flowchart|table|image|other>",
  "description": "<brief description of diagram content>",
  "nearbyQuestionNumber": <question number if detectable from nearby text>
}

IMPORTANT:
- Use normalized coordinates (0-1) for resolution independence
- Be precise with bounding boxes - include entire diagram but minimize whitespace
- If multiple diagrams on same page, return all of them
- If no diagrams found, return empty array []

Return ONLY a JSON array of diagram objects, no other text.
`

/**
 * Detect diagram coordinates using Gemini Vision API
 */
export async function detectDiagramCoordinates(
  pdfBuffer: ArrayBuffer,
  geminiApiKey: string,
  options: {
    pageRange?: { start: number; end: number }
    model?: string
  } = {}
): Promise<DiagramCoordinates[]> {
  const model = options.model || 'gemini-2.5-flash'
  const allDiagrams: DiagramCoordinates[] = []
  
  // Load PDF
  const pdf = await pdfjsLib.getDocument({ data: pdfBuffer }).promise
  const totalPages = pdf.numPages
  
  const startPage = options.pageRange?.start || 1
  const endPage = options.pageRange?.end || totalPages
  
  console.log(`🔍 Detecting diagrams in pages ${startPage}-${endPage}...`)
  
  // Process each page
  for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
    console.log(`📄 Processing page ${pageNum}/${endPage}...`)
    
    // Render page to image for Gemini Vision
    const pageImage = await renderPDFPageToBase64(pdf, pageNum, 2) // scale=2 for quality
    
    // Send to Gemini Vision API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: DIAGRAM_COORDINATE_PROMPT },
              { inline_data: { mime_type: 'image/png', data: pageImage } }
            ]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 2048
          }
        })
      }
    )
    
    if (!response.ok) {
      console.error(`❌ Failed to detect diagrams on page ${pageNum}`)
      continue
    }
    
    const data = await response.json()
    const responseText = data.candidates[0]?.content?.parts[0]?.text
    
    if (!responseText) {
      console.warn(`⚠️ No response from Gemini for page ${pageNum}`)
      continue
    }
    
    // Parse JSON response
    try {
      const jsonMatch = responseText.match(/\[[\s\S]*\]/)
      if (!jsonMatch) {
        console.warn(`⚠️ No diagrams found on page ${pageNum}`)
        continue
      }
      
      const pageDiagrams = JSON.parse(jsonMatch[0])
      
      if (Array.isArray(pageDiagrams) && pageDiagrams.length > 0) {
        console.log(`✅ Found ${pageDiagrams.length} diagram(s) on page ${pageNum}`)
        allDiagrams.push(...pageDiagrams)
      }
    } catch (parseError) {
      console.error(`❌ Failed to parse diagrams on page ${pageNum}:`, parseError)
    }
  }
  
  console.log(`🎉 Total diagrams detected: ${allDiagrams.length}`)
  return allDiagrams
}

/**
 * Render PDF page to base64 image for Gemini Vision
 */
async function renderPDFPageToBase64(
  pdf: any,
  pageNumber: number,
  scale: number = 2
): Promise<string> {
  const page = await pdf.getPage(pageNumber)
  const viewport = page.getViewport({ scale })
  
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')!
  
  canvas.width = viewport.width
  canvas.height = viewport.height
  
  await page.render({
    canvasContext: context,
    viewport: viewport
  }).promise
  
  // Convert to base64 (remove data:image/png;base64, prefix)
  return canvas.toDataURL('image/png').split(',')[1]
}

/**
 * Render specific diagram area from PDF using coordinates
 */
export async function renderDiagramFromPDF(
  pdfBuffer: ArrayBuffer,
  coordinates: DiagramCoordinates,
  scale: number = 2
): Promise<string> {
  const pdf = await pdfjsLib.getDocument({ data: pdfBuffer }).promise
  const page = await pdf.getPage(coordinates.pageNumber)
  
  const viewport = page.getViewport({ scale })
  
  // Calculate actual pixel coordinates from normalized values
  const x = coordinates.boundingBox.x * viewport.width
  const y = coordinates.boundingBox.y * viewport.height
  const width = coordinates.boundingBox.width * viewport.width
  const height = coordinates.boundingBox.height * viewport.height
  
  // Create canvas for diagram only
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')!
  
  canvas.width = width
  canvas.height = height
  
  // Render page with translation to show only diagram area
  await page.render({
    canvasContext: context,
    viewport: viewport,
    transform: [1, 0, 0, 1, -x, -y] // Translate to crop diagram
  }).promise
  
  return canvas.toDataURL('image/png')
}

/**
 * Match detected diagrams to questions
 */
export function matchDiagramsToQuestions(
  questions: AIExtractedQuestion[],
  detectedDiagrams: DiagramCoordinates[]
): AIExtractedQuestion[] {
  return questions.map(question => {
    if (!question.hasDiagram) {
      return question
    }
    
    // Find diagrams that match this question
    const matchingDiagrams = detectedDiagrams.filter(diagram => {
      // Match by page proximity
      const onSamePage = diagram.pageNumber === question.pageNumber
      const onNearbyPage = Math.abs(diagram.pageNumber - question.pageNumber) <= 1
      
      // Match by label reference in question text
      const labelMatch = diagram.label && 
        question.text.toLowerCase().includes(diagram.label.toLowerCase())
      
      // Match by nearby question number
      const questionMatch = diagram.nearbyQuestionNumber === question.questionNumber
      
      return onSamePage || onNearbyPage || labelMatch || questionMatch
    })
    
    return {
      ...question,
      diagrams: matchingDiagrams.length > 0 ? matchingDiagrams : undefined
    }
  })
}
```

---

### Phase 3: Gemini API Integration

**File:** `apps/shared/app/utils/geminiAPIClient.ts` (Update)

```typescript
// Add to existing extractQuestionsDirectlyFromPDF function

const ENHANCED_EXTRACTION_PROMPT = `
You are an expert at extracting questions from educational PDFs using your vision capabilities.

For each question, provide:
- id: sequential number
- text: the complete question text
- type: MCQ (single answer), MSQ (multiple answers), NAT (numerical), or MSM (match)
- options: array of answer choices (empty for NAT)
- correctAnswer: the correct answer(s) if provided in PDF
- subject: subject name
- section: section name if mentioned
- questionNumber: original question number from PDF
- marks: marks allocated (default 1)
- negativeMarks: negative marking (default 0)
- confidence: your confidence in extraction accuracy (1-5 scale)
- hasDiagram: true if question has or references figures, diagrams, graphs, images

**NEW: If hasDiagram is true, also provide:**
- diagrams: [{
    pageNumber: <which page the diagram is on>,
    boundingBox: {
      x: <0-1, horizontal position>,
      y: <0-1, vertical position>,
      width: <0-1, diagram width>,
      height: <0-1, diagram height>
    },
    confidence: <1-5>,
    label: "<Figure X.X or diagram title if visible>",
    type: "<circuit|graph|flowchart|table|image|other>"
  }]

IMPORTANT: 
- Use normalized coordinates (0-1) for bounding boxes
- Be precise with diagram locations
- Include diagram label if mentioned in text
- Return ONLY the JSON array, no other text
`
```

---

### Phase 4: Review Interface Components


**File:** `apps/shared/app/components/DiagramViewer.vue`

```vue
<template>
  <div class="diagram-viewer">
    <!-- Thumbnail view -->
    <div 
      v-if="!fullView"
      class="diagram-thumbnail cursor-pointer hover:opacity-80 transition-opacity"
      @click="openFullView"
    >
      <canvas ref="thumbnailCanvas" class="w-full h-auto rounded-lg border-2 border-slate-300 dark:border-slate-700"></canvas>
      <div class="mt-2 text-xs text-center text-slate-600 dark:text-slate-400">
        <Icon name="lucide:image" class="inline h-3 w-3 mr-1" />
        {{ diagram.label || 'Diagram' }}
        <span class="ml-2 text-orange-600">Click to view</span>
      </div>
    </div>
    
    <!-- Full view modal -->
    <UiDialog v-model:open="fullView">
      <UiDialogContent class="max-w-5xl max-h-[90vh]">
        <UiDialogHeader>
          <UiDialogTitle>{{ diagram.label || 'Diagram' }}</UiDialogTitle>
          <UiDialogDescription>
            Page {{ diagram.pageNumber }} • Confidence: {{ diagram.confidence }}/5
          </UiDialogDescription>
        </UiDialogHeader>
        
        <div class="diagram-full-view relative">
          <canvas 
            ref="fullCanvas" 
            class="w-full h-auto max-h-[60vh] object-contain"
            :style="{ transform: `scale(${zoomLevel})` }"
          ></canvas>
          
          <!-- Zoom controls -->
          <div class="absolute bottom-4 right-4 flex gap-2 bg-white dark:bg-slate-800 rounded-lg shadow-lg p-2">
            <UiButton size="sm" variant="outline" @click="zoomOut" :disabled="zoomLevel <= 0.5">
              <Icon name="lucide:zoom-out" class="h-4 w-4" />
            </UiButton>
            <span class="px-2 py-1 text-sm font-medium">{{ Math.round(zoomLevel * 100) }}%</span>
            <UiButton size="sm" variant="outline" @click="zoomIn" :disabled="zoomLevel >= 3">
              <Icon name="lucide:zoom-in" class="h-4 w-4" />
            </UiButton>
            <UiButton size="sm" variant="outline" @click="resetZoom">
              <Icon name="lucide:maximize" class="h-4 w-4" />
            </UiButton>
          </div>
        </div>
        
        <UiDialogFooter>
          <UiButton variant="outline" @click="downloadDiagram">
            <Icon name="lucide:download" class="h-4 w-4 mr-2" />
            Download
          </UiButton>
          <UiButton @click="fullView = false">Close</UiButton>
        </UiDialogFooter>
      </UiDialogContent>
    </UiDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { renderDiagramFromPDF } from '#layers/shared/app/utils/diagramCoordinateUtils'
import type { DiagramCoordinates } from '#layers/shared/app/types/diagram'

const props = defineProps<{
  pdfBuffer: ArrayBuffer
  diagram: DiagramCoordinates
}>()

const thumbnailCanvas = ref<HTMLCanvasElement>()
const fullCanvas = ref<HTMLCanvasElement>()
const fullView = ref(false)
const zoomLevel = ref(1)

onMounted(async () => {
  await renderThumbnail()
})

const renderThumbnail = async () => {
  if (!thumbnailCanvas.value) return
  
  // Render low-res thumbnail
  const dataUrl = await renderDiagramFromPDF(props.pdfBuffer, props.diagram, 1)
  const img = new Image()
  img.onload = () => {
    const ctx = thumbnailCanvas.value!.getContext('2d')!
    thumbnailCanvas.value!.width = img.width
    thumbnailCanvas.value!.height = img.height
    ctx.drawImage(img, 0, 0)
  }
  img.src = dataUrl
}

const openFullView = async () => {
  fullView.value = true
  
  // Render high-res version
  if (!fullCanvas.value) return
  
  const dataUrl = await renderDiagramFromPDF(props.pdfBuffer, props.diagram, 3)
  const img = new Image()
  img.onload = () => {
    const ctx = fullCanvas.value!.getContext('2d')!
    fullCanvas.value!.width = img.width
    fullCanvas.value!.height = img.height
    ctx.drawImage(img, 0, 0)
  }
  img.src = dataUrl
}

const zoomIn = () => {
  zoomLevel.value = Math.min(zoomLevel.value + 0.25, 3)
}

const zoomOut = () => {
  zoomLevel.value = Math.max(zoomLevel.value - 0.25, 0.5)
}

const resetZoom = () => {
  zoomLevel.value = 1
}

const downloadDiagram = async () => {
  const dataUrl = await renderDiagramFromPDF(props.pdfBuffer, props.diagram, 3)
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = `${props.diagram.label || 'diagram'}.png`
  link.click()
}
</script>
```

---

**File:** `apps/shared/app/components/DiagramCoordinateEditor.vue`

```vue
<template>
  <div class="diagram-coordinate-editor">
    <div class="mb-4">
      <h3 class="text-lg font-semibold mb-2">Adjust Diagram Boundaries</h3>
      <p class="text-sm text-muted-foreground">
        Drag the corners to resize or move the entire box to reposition the diagram area.
      </p>
    </div>
    
    <!-- PDF page with interactive overlay -->
    <div class="pdf-canvas-container relative border-2 border-slate-300 dark:border-slate-700 rounded-lg overflow-hidden">
      <canvas ref="pdfCanvas" class="w-full h-auto"></canvas>
      
      <!-- Draggable bounding box overlay -->
      <div 
        class="bounding-box absolute border-4 border-blue-500 bg-blue-500/10 cursor-move"
        :style="boundingBoxStyle"
        @mousedown="startDrag"
      >
        <!-- Resize handles -->
        <div class="handle top-left" @mousedown.stop="startResize('tl')"></div>
        <div class="handle top-right" @mousedown.stop="startResize('tr')"></div>
        <div class="handle bottom-left" @mousedown.stop="startResize('bl')"></div>
        <div class="handle bottom-right" @mousedown.stop="startResize('br')"></div>
        
        <!-- Label -->
        <div class="absolute -top-8 left-0 bg-blue-500 text-white px-2 py-1 rounded text-xs font-semibold">
          {{ localCoordinates.label || 'Diagram' }}
        </div>
      </div>
    </div>
    
    <!-- Coordinate inputs -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
      <div>
        <UiLabel>X Position</UiLabel>
        <UiInput 
          v-model.number="localCoordinates.boundingBox.x" 
          type="number" 
          step="0.01" 
          min="0" 
          max="1"
          @input="updateBoundingBox"
        />
      </div>
      <div>
        <UiLabel>Y Position</UiLabel>
        <UiInput 
          v-model.number="localCoordinates.boundingBox.y" 
          type="number" 
          step="0.01" 
          min="0" 
          max="1"
          @input="updateBoundingBox"
        />
      </div>
      <div>
        <UiLabel>Width</UiLabel>
        <UiInput 
          v-model.number="localCoordinates.boundingBox.width" 
          type="number" 
          step="0.01" 
          min="0.1" 
          max="1"
          @input="updateBoundingBox"
        />
      </div>
      <div>
        <UiLabel>Height</UiLabel>
        <UiInput 
          v-model.number="localCoordinates.boundingBox.height" 
          type="number" 
          step="0.01" 
          min="0.1" 
          max="1"
          @input="updateBoundingBox"
        />
      </div>
    </div>
    
    <!-- Preview -->
    <div class="mt-4 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
      <h4 class="text-sm font-semibold mb-2">Preview</h4>
      <canvas ref="previewCanvas" class="w-full h-auto max-h-64 object-contain"></canvas>
    </div>
    
    <!-- Actions -->
    <div class="flex gap-2 mt-4">
      <UiButton variant="outline" @click="resetToOriginal">
        <Icon name="lucide:rotate-ccw" class="h-4 w-4 mr-2" />
        Reset to AI Detection
      </UiButton>
      <UiButton @click="saveCoordinates" variant="default">
        <Icon name="lucide:save" class="h-4 w-4 mr-2" />
        Save Coordinates
      </UiButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { renderDiagramFromPDF } from '#layers/shared/app/utils/diagramCoordinateUtils'
import type { DiagramCoordinates } from '#layers/shared/app/types/diagram'

const props = defineProps<{
  pdfBuffer: ArrayBuffer
  coordinates: DiagramCoordinates
}>()

const emit = defineEmits<{
  'update:coordinates': [coordinates: DiagramCoordinates]
}>()

const pdfCanvas = ref<HTMLCanvasElement>()
const previewCanvas = ref<HTMLCanvasElement>()
const localCoordinates = ref<DiagramCoordinates>({ ...props.coordinates })
const originalCoordinates = ref<DiagramCoordinates>({ ...props.coordinates })

const isDragging = ref(false)
const isResizing = ref(false)
const resizeHandle = ref<string>('')
const dragStart = ref({ x: 0, y: 0 })

const boundingBoxStyle = computed(() => {
  if (!pdfCanvas.value) return {}
  
  const canvasWidth = pdfCanvas.value.width
  const canvasHeight = pdfCanvas.value.height
  
  return {
    left: `${localCoordinates.value.boundingBox.x * canvasWidth}px`,
    top: `${localCoordinates.value.boundingBox.y * canvasHeight}px`,
    width: `${localCoordinates.value.boundingBox.width * canvasWidth}px`,
    height: `${localCoordinates.value.boundingBox.height * canvasHeight}px`
  }
})

onMounted(async () => {
  await renderPDFPage()
  await updatePreview()
})

watch(() => localCoordinates.value, async () => {
  await updatePreview()
}, { deep: true })

const renderPDFPage = async () => {
  // Render full PDF page to canvas
  // Implementation using PDF.js
}

const updatePreview = async () => {
  if (!previewCanvas.value) return
  
  const dataUrl = await renderDiagramFromPDF(props.pdfBuffer, localCoordinates.value, 2)
  const img = new Image()
  img.onload = () => {
    const ctx = previewCanvas.value!.getContext('2d')!
    previewCanvas.value!.width = img.width
    previewCanvas.value!.height = img.height
    ctx.drawImage(img, 0, 0)
  }
  img.src = dataUrl
}

const startDrag = (e: MouseEvent) => {
  isDragging.value = true
  dragStart.value = { x: e.clientX, y: e.clientY }
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
}

const onDrag = (e: MouseEvent) => {
  if (!isDragging.value || !pdfCanvas.value) return
  
  const deltaX = (e.clientX - dragStart.value.x) / pdfCanvas.value.width
  const deltaY = (e.clientY - dragStart.value.y) / pdfCanvas.value.height
  
  localCoordinates.value.boundingBox.x += deltaX
  localCoordinates.value.boundingBox.y += deltaY
  
  dragStart.value = { x: e.clientX, y: e.clientY }
}

const stopDrag = () => {
  isDragging.value = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
}

const startResize = (handle: string) => {
  isResizing.value = true
  resizeHandle.value = handle
  // Implement resize logic
}

const updateBoundingBox = () => {
  // Clamp values to valid range
  localCoordinates.value.boundingBox.x = Math.max(0, Math.min(1, localCoordinates.value.boundingBox.x))
  localCoordinates.value.boundingBox.y = Math.max(0, Math.min(1, localCoordinates.value.boundingBox.y))
  localCoordinates.value.boundingBox.width = Math.max(0.1, Math.min(1, localCoordinates.value.boundingBox.width))
  localCoordinates.value.boundingBox.height = Math.max(0.1, Math.min(1, localCoordinates.value.boundingBox.height))
}

const resetToOriginal = () => {
  localCoordinates.value = { ...originalCoordinates.value }
}

const saveCoordinates = () => {
  localCoordinates.value.detectionMethod = 'adjusted'
  localCoordinates.value.updatedAt = Date.now()
  emit('update:coordinates', localCoordinates.value)
}
</script>

<style scoped>
.handle {
  position: absolute;
  width: 12px;
  height: 12px;
  background: white;
  border: 2px solid #3b82f6;
  border-radius: 50%;
  cursor: pointer;
}

.handle.top-left { top: -6px; left: -6px; cursor: nw-resize; }
.handle.top-right { top: -6px; right: -6px; cursor: ne-resize; }
.handle.bottom-left { bottom: -6px; left: -6px; cursor: sw-resize; }
.handle.bottom-right { bottom: -6px; right: -6px; cursor: se-resize; }
</style>
```

---

### Phase 5: CBT Test Interface Integration


**File:** `apps/shared/app/components/CBT/QuestionWithDiagram.vue`

```vue
<template>
  <div class="question-with-diagram">
    <!-- Question text -->
    <div class="question-text mb-6">
      <h3 class="text-lg font-semibold mb-2">Question {{ question.questionNumber }}</h3>
      <p class="text-base leading-relaxed">{{ question.text }}</p>
    </div>
    
    <!-- Diagram(s) if present -->
    <div v-if="question.diagrams && question.diagrams.length > 0" class="diagrams-container mb-6">
      <div 
        v-for="(diagram, idx) in question.diagrams" 
        :key="idx"
        class="diagram-wrapper mb-4"
      >
        <div class="diagram-label text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
          {{ diagram.label || `Diagram ${idx + 1}` }}
        </div>
        <canvas 
          :ref="el => diagramCanvases[idx] = el"
          class="diagram-canvas w-full max-w-2xl mx-auto border-2 border-slate-300 dark:border-slate-700 rounded-lg shadow-md"
        ></canvas>
      </div>
    </div>
    
    <!-- Options -->
    <div class="options-container">
      <div 
        v-for="(option, idx) in question.options" 
        :key="idx"
        class="option-item p-4 mb-2 border-2 rounded-lg cursor-pointer transition-all"
        :class="getOptionClass(idx)"
        @click="selectOption(idx)"
      >
        <span class="option-label font-semibold mr-3">{{ String.fromCharCode(65 + idx) }}.</span>
        <span class="option-text">{{ option }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { renderDiagramFromPDF } from '#layers/shared/app/utils/diagramCoordinateUtils'
import type { AIExtractedQuestion } from '#layers/shared/app/types/diagram'

const props = defineProps<{
  question: AIExtractedQuestion
  pdfBuffer: ArrayBuffer
  selectedAnswer?: number
}>()

const emit = defineEmits<{
  'select-answer': [answerIndex: number]
}>()

const diagramCanvases = ref<HTMLCanvasElement[]>([])

onMounted(async () => {
  // Render all diagrams for this question
  if (props.question.diagrams) {
    for (let i = 0; i < props.question.diagrams.length; i++) {
      await renderDiagram(i)
    }
  }
})

const renderDiagram = async (index: number) => {
  const canvas = diagramCanvases.value[index]
  if (!canvas || !props.question.diagrams) return
  
  const diagram = props.question.diagrams[index]
  const dataUrl = await renderDiagramFromPDF(props.pdfBuffer, diagram, 2)
  
  const img = new Image()
  img.onload = () => {
    const ctx = canvas.getContext('2d')!
    canvas.width = img.width
    canvas.height = img.height
    ctx.drawImage(img, 0, 0)
  }
  img.src = dataUrl
}

const selectOption = (index: number) => {
  emit('select-answer', index)
}

const getOptionClass = (index: number) => {
  if (props.selectedAnswer === index) {
    return 'border-blue-500 bg-blue-50 dark:bg-blue-950'
  }
  return 'border-slate-300 dark:border-slate-700 hover:border-blue-300 hover:bg-slate-50 dark:hover:bg-slate-800'
}
</script>
```

---

## 📦 Storage Strategy

### Local Storage (IndexedDB)

```typescript
// apps/shared/app/utils/diagramStorage.ts

import Dexie, { Table } from 'dexie'

interface StoredPDF {
  id: string
  fileName: string
  buffer: ArrayBuffer
  uploadDate: number
  fileSize: number
}

interface StoredQuestion {
  id: number
  pdfId: string
  questionData: AIExtractedQuestion
  diagrams: DiagramCoordinates[]
}

class DiagramDatabase extends Dexie {
  pdfs!: Table<StoredPDF>
  questions!: Table<StoredQuestion>
  
  constructor() {
    super('RankifyDiagramDB')
    this.version(1).stores({
      pdfs: 'id, fileName, uploadDate',
      questions: 'id, pdfId'
    })
  }
}

const db = new DiagramDatabase()

export async function storePDFWithQuestions(
  fileName: string,
  pdfBuffer: ArrayBuffer,
  questions: AIExtractedQuestion[]
): Promise<string> {
  const pdfId = generateUniqueId()
  
  // Store PDF once
  await db.pdfs.add({
    id: pdfId,
    fileName,
    buffer: pdfBuffer,
    uploadDate: Date.now(),
    fileSize: pdfBuffer.byteLength
  })
  
  // Store questions with diagram coordinates (minimal data)
  for (const question of questions) {
    await db.questions.add({
      id: question.id,
      pdfId,
      questionData: question,
      diagrams: question.diagrams || []
    })
  }
  
  return pdfId
}

export async function getPDFBuffer(pdfId: string): Promise<ArrayBuffer | undefined> {
  const pdf = await db.pdfs.get(pdfId)
  return pdf?.buffer
}

export async function getQuestionsForPDF(pdfId: string): Promise<AIExtractedQuestion[]> {
  const questions = await db.questions.where('pdfId').equals(pdfId).toArray()
  return questions.map(q => q.questionData)
}

function generateUniqueId(): string {
  return `pdf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}
```

### Storage Comparison

| Approach | Storage per 50 Questions | Pros | Cons |
|----------|--------------------------|------|------|
| **Cropped Images** | ~50MB (1MB per diagram × 50) | Simple to implement | Huge storage, quality loss |
| **Coordinates** ⭐ | ~5KB (100 bytes × 50) | Minimal storage, flexible | Requires PDF rendering |

**Savings:** 99.99% less storage! 🎉

---

## 🚀 Implementation Roadmap

### Week 1-2: Foundation
- [ ] Create TypeScript interfaces for diagram coordinates
- [ ] Implement `diagramCoordinateUtils.ts` with PDF rendering
- [ ] Test coordinate-based rendering with sample PDFs
- [ ] Validate normalized coordinate system

### Week 3-4: AI Integration
- [ ] Update Gemini prompt to extract diagram coordinates
- [ ] Implement `detectDiagramCoordinates()` function
- [ ] Test coordinate detection accuracy
- [ ] Implement diagram-question matching logic

### Week 5-6: Review Interface
- [ ] Build `DiagramViewer.vue` component
- [ ] Build `DiagramCoordinateEditor.vue` component
- [ ] Integrate with existing review interface
- [ ] Add coordinate adjustment UI

### Week 7-8: CBT Integration
- [ ] Build `QuestionWithDiagram.vue` component
- [ ] Integrate diagram rendering in test interface
- [ ] Optimize rendering performance
- [ ] Add lazy loading for diagrams

### Week 9-10: Polish & Testing
- [ ] Comprehensive testing with various PDF types
- [ ] Performance optimization
- [ ] Error handling and edge cases
- [ ] User documentation

---

## 🧪 Testing Strategy

### Unit Tests

```typescript
// apps/shared/app/utils/__tests__/diagramCoordinateUtils.test.ts

describe('Diagram Coordinate Utils', () => {
  test('should render diagram from coordinates', async () => {
    const mockPDF = await loadTestPDF()
    const coordinates: DiagramCoordinates = {
      questionId: 1,
      pageNumber: 1,
      boundingBox: { x: 0.1, y: 0.2, width: 0.4, height: 0.3 },
      confidence: 4.5,
      detectionMethod: 'ai',
      createdAt: Date.now()
    }
    
    const dataUrl = await renderDiagramFromPDF(mockPDF, coordinates)
    expect(dataUrl).toMatch(/^data:image\/png;base64,/)
  })
  
  test('should normalize coordinates correctly', () => {
    const coords = { x: 1.5, y: -0.1, width: 0.5, height: 0.5 }
    const normalized = normalizeCoordinates(coords)
    
    expect(normalized.x).toBeGreaterThanOrEqual(0)
    expect(normalized.x).toBeLessThanOrEqual(1)
    expect(normalized.y).toBeGreaterThanOrEqual(0)
    expect(normalized.y).toBeLessThanOrEqual(1)
  })
})
```

### Integration Tests

```typescript
describe('Diagram Detection Integration', () => {
  test('should detect diagrams and match to questions', async () => {
    const pdfBuffer = await loadTestPDF()
    const apiKey = process.env.GEMINI_API_KEY
    
    // Detect diagrams
    const diagrams = await detectDiagramCoordinates(pdfBuffer, apiKey)
    expect(diagrams.length).toBeGreaterThan(0)
    
    // Extract questions
    const questions = await extractQuestions(pdfBuffer, apiKey)
    
    // Match diagrams to questions
    const matched = matchDiagramsToQuestions(questions, diagrams)
    
    const questionsWithDiagrams = matched.filter(q => q.diagrams && q.diagrams.length > 0)
    expect(questionsWithDiagrams.length).toBeGreaterThan(0)
  })
})
```

---

## 📊 Performance Considerations

### Optimization Strategies

1. **Lazy Loading**
   - Render diagrams only when visible
   - Use Intersection Observer API
   - Cache rendered canvases

2. **Resolution Management**
   - Thumbnail: scale=1 (low res)
   - Preview: scale=2 (medium res)
   - Full view: scale=3 (high res)

3. **Caching**
   - Cache rendered diagram data URLs
   - Store in memory for session
   - Clear cache on PDF change

4. **Web Workers**
   - Offload PDF rendering to worker thread
   - Prevent UI blocking
   - Parallel diagram rendering

```typescript
// Example: Lazy loading with Intersection Observer
const observeDiagram = (canvas: HTMLCanvasElement, diagram: DiagramCoordinates) => {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(async (entry) => {
      if (entry.isIntersecting) {
        await renderDiagram(canvas, diagram)
        observer.unobserve(canvas)
      }
    })
  })
  
  observer.observe(canvas)
}
```

---

## 🎯 Success Metrics

### Technical Metrics
- ✅ Storage reduction: >99% vs image approach
- ✅ Rendering time: <500ms per diagram
- ✅ Coordinate accuracy: >95%
- ✅ Memory usage: <100MB for 50 questions

### User Experience Metrics
- ✅ Diagram visibility: Clear and readable
- ✅ Adjustment ease: Intuitive coordinate editor
- ✅ Load time: <2s for full test with diagrams
- ✅ User satisfaction: >90%

---

## 🐛 Known Limitations & Solutions

### Limitation 1: Rotated PDFs
**Problem:** Coordinates assume standard orientation  
**Solution:** Detect PDF rotation, adjust coordinates accordingly

### Limitation 2: Multi-column Layouts
**Problem:** Diagram detection may be confused by complex layouts  
**Solution:** Enhanced AI prompt with layout awareness

### Limitation 3: Overlapping Diagrams
**Problem:** Multiple diagrams in same area  
**Solution:** Allow multiple bounding boxes, user can select which to show

### Limitation 4: Very Large PDFs
**Problem:** Memory issues with 200+ page PDFs  
**Solution:** Page-by-page processing, progressive loading

---

## 📚 References & Resources

### PDF.js Documentation
- [PDF.js API](https://mozilla.github.io/pdf.js/api/)
- [Rendering PDFs](https://mozilla.github.io/pdf.js/examples/)

### Gemini Vision API
- [Vision Capabilities](https://ai.google.dev/gemini-api/docs/vision)
- [Document Processing](https://ai.google.dev/gemini-api/docs/document-processing)

### Canvas API
- [MDN Canvas Tutorial](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial)
- [Canvas Performance](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas)

---

## 🤝 Contributing

Want to help implement this feature?

1. Pick a task from the roadmap
2. Create a feature branch: `feature/diagram-coordinates`
3. Implement with tests
4. Submit PR with documentation

---

**Last Updated:** October 24, 2025  
**Status:** Planning Phase  
**Priority:** High  
**Estimated Effort:** 8-10 weeks  
**Maintainer:** Naman Dhakad
