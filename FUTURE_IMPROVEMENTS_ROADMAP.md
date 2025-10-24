# 🚀 Rankify - Future Improvements Roadmap

## 📊 Diagram Handling Improvements

### 🎯 Goal: Complete Diagram Support
Currently, Rankify only **detects** diagrams but doesn't extract or display them. We need full diagram support.

### Phase 1: Diagram Coordinate Extraction (High Priority) ⭐ SMART APPROACH
**Status:** Not Implemented  
**Complexity:** Medium  
**Impact:** High  
**Storage:** Minimal (only coordinates, not images!)

#### 🎯 Core Concept:
**NO IMAGE CROPPING/STORAGE!** Instead:
1. AI extracts **diagram coordinates** (x, y, width, height, page number)
2. Store only coordinates with question
3. Render diagram on-demand from original PDF
4. User can adjust coordinates in review interface

#### Features:
- [ ] **AI Diagram Coordinate Detection**
  - Gemini Vision identifies diagram location in PDF
  - Returns bounding box coordinates: `{x, y, width, height, page}`
  - Multiple diagrams per question supported
  - Confidence score for each diagram location

- [ ] **Coordinate-Based Rendering**
  - Render specific PDF area using coordinates
  - No image files created/stored
  - Real-time rendering from original PDF
  - Zoom/pan within coordinate bounds

- [ ] **Coordinate Editor in Review Interface**
  - Visual editor to adjust diagram boundaries
  - Drag corners to resize
  - Move entire diagram area
  - Preview changes in real-time
  - Save updated coordinates

- [ ] **Minimal Storage**
  - Store only: `{pageNumber, x, y, width, height}`
  - Original PDF stored once
  - No duplicate image files
  - Efficient memory usage

#### Implementation:
```javascript
// apps/shared/app/utils/diagramCoordinateUtils.ts
export interface DiagramCoordinates {
  questionId: number
  pageNumber: number
  boundingBox: {
    x: number      // X coordinate (0-1, normalized)
    y: number      // Y coordinate (0-1, normalized)
    width: number  // Width (0-1, normalized)
    height: number // Height (0-1, normalized)
  }
  confidence: number // AI confidence in detection
  label?: string     // Optional: "Figure 2.3", "Circuit Diagram"
}

export interface AIExtractedQuestion {
  id: number
  text: string
  type: 'MCQ' | 'MSQ' | 'NAT'
  options: string[]
  correctAnswer: string | string[] | null
  hasDiagram: boolean
  diagrams?: DiagramCoordinates[]  // ← NEW: Array of diagram coordinates
  // ... other fields
}

// Enhanced Gemini prompt to extract coordinates
const DIAGRAM_EXTRACTION_PROMPT = `
For each question with a diagram, provide:
- pageNumber: which page the diagram is on
- boundingBox: {
    x: horizontal position (0-1, where 0=left, 1=right)
    y: vertical position (0-1, where 0=top, 1=bottom)
    width: diagram width (0-1)
    height: diagram height (0-1)
  }
- confidence: how confident you are (1-5)
- label: diagram label if mentioned (e.g., "Figure 2.3")

Example:
{
  "id": 5,
  "text": "Refer to Figure 2.3. Calculate the total resistance.",
  "hasDiagram": true,
  "diagrams": [{
    "pageNumber": 2,
    "boundingBox": { "x": 0.1, "y": 0.3, "width": 0.4, "height": 0.3 },
    "confidence": 4.5,
    "label": "Figure 2.3"
  }]
}
`

// Render diagram from PDF using coordinates
export async function renderDiagramFromPDF(
  pdfBuffer: ArrayBuffer,
  coordinates: DiagramCoordinates,
  scale: number = 2
): Promise<string> {
  const pdf = await pdfjsLib.getDocument({ data: pdfBuffer }).promise
  const page = await pdf.getPage(coordinates.pageNumber)
  
  const viewport = page.getViewport({ scale })
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')!
  
  // Calculate actual pixel coordinates
  const x = coordinates.boundingBox.x * viewport.width
  const y = coordinates.boundingBox.y * viewport.height
  const width = coordinates.boundingBox.width * viewport.width
  const height = coordinates.boundingBox.height * viewport.height
  
  canvas.width = width
  canvas.height = height
  
  // Render only the diagram area
  await page.render({
    canvasContext: context,
    viewport,
    transform: [1, 0, 0, 1, -x, -y] // Translate to show only diagram
  }).promise
  
  return canvas.toDataURL() // Return as base64 for display
}
```

---

### Phase 2: Interactive Diagram Viewer & Editor (Medium Priority) ⭐ SMART APPROACH
**Status:** Not Implemented  
**Complexity:** Medium  
**Impact:** High

#### Features:
- [ ] **Real-Time PDF Diagram Rendering**
  - Render diagram area from original PDF on-demand
  - No image files stored
  - Instant preview using coordinates
  - Smooth zoom/pan within diagram bounds

- [ ] **Interactive Coordinate Editor**
  - Visual bounding box overlay on PDF
  - Drag corners to resize diagram area
  - Move entire box to reposition
  - Snap to edges for precision
  - Real-time preview of changes

- [ ] **Diagram Viewer in Review Interface**
  - Show diagram thumbnail in question card
  - Click to view full-size in modal
  - Zoom in/out with mouse wheel
  - Pan by dragging
  - Render directly from PDF coordinates

- [ ] **Diagram Adjustment Tools**
  - Fine-tune coordinates with input fields
  - Preset sizes (small, medium, large)
  - Reset to AI-detected coordinates
  - Multiple diagrams per question support

- [ ] **Test Interface Rendering**
  - Render diagram during CBT test
  - Show diagram alongside question
  - Responsive sizing for different screens
  - Lazy loading for performance

#### Implementation:
```vue
<!-- apps/shared/app/components/DiagramViewer.vue -->
<template>
  <div class="diagram-viewer">
    <!-- Thumbnail in question card -->
    <div class="diagram-thumbnail" @click="openFullView">
      <canvas ref="thumbnailCanvas"></canvas>
      <div class="diagram-label">{{ diagram.label }}</div>
    </div>
    
    <!-- Full view modal -->
    <UiDialog v-model:open="showFullView">
      <UiDialogContent class="max-w-4xl">
        <div class="diagram-full-view">
          <canvas ref="fullCanvas"></canvas>
          <div class="zoom-controls">
            <UiButton @click="zoomIn">+</UiButton>
            <UiButton @click="zoomOut">-</UiButton>
            <UiButton @click="resetZoom">Reset</UiButton>
          </div>
        </div>
      </UiDialogContent>
    </UiDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { renderDiagramFromPDF } from '#layers/shared/app/utils/diagramCoordinateUtils'

const props = defineProps<{
  pdfBuffer: ArrayBuffer
  diagram: DiagramCoordinates
}>()

const thumbnailCanvas = ref<HTMLCanvasElement>()
const fullCanvas = ref<HTMLCanvasElement>()
const showFullView = ref(false)

onMounted(async () => {
  // Render thumbnail (low resolution)
  const thumbnailUrl = await renderDiagramFromPDF(props.pdfBuffer, props.diagram, 1)
  // Draw to canvas
})

const openFullView = async () => {
  showFullView.value = true
  // Render full resolution
  const fullUrl = await renderDiagramFromPDF(props.pdfBuffer, props.diagram, 3)
  // Draw to canvas
}
</script>
```

```vue
<!-- apps/shared/app/components/DiagramCoordinateEditor.vue -->
<template>
  <div class="coordinate-editor">
    <!-- PDF page with overlay -->
    <div class="pdf-canvas-container" ref="container">
      <canvas ref="pdfCanvas"></canvas>
      
      <!-- Draggable bounding box overlay -->
      <div 
        class="bounding-box"
        :style="boundingBoxStyle"
        @mousedown="startDrag"
      >
        <!-- Resize handles -->
        <div class="handle top-left" @mousedown.stop="startResize('tl')"></div>
        <div class="handle top-right" @mousedown.stop="startResize('tr')"></div>
        <div class="handle bottom-left" @mousedown.stop="startResize('bl')"></div>
        <div class="handle bottom-right" @mousedown.stop="startResize('br')"></div>
      </div>
    </div>
    
    <!-- Coordinate inputs -->
    <div class="coordinate-inputs">
      <UiLabel>X: <UiInput v-model.number="coordinates.x" type="number" step="0.01" /></UiLabel>
      <UiLabel>Y: <UiInput v-model.number="coordinates.y" type="number" step="0.01" /></UiLabel>
      <UiLabel>Width: <UiInput v-model.number="coordinates.width" type="number" step="0.01" /></UiLabel>
      <UiLabel>Height: <UiInput v-model.number="coordinates.height" type="number" step="0.01" /></UiLabel>
    </div>
    
    <!-- Actions -->
    <div class="actions">
      <UiButton @click="resetToAI">Reset to AI Detection</UiButton>
      <UiButton @click="saveCoordinates" variant="primary">Save Coordinates</UiButton>
    </div>
  </div>
</template>

<script setup lang="ts">
// Interactive coordinate editing logic
const startDrag = (e: MouseEvent) => {
  // Implement drag to move entire box
}

const startResize = (handle: string) => {
  // Implement resize from corners
}

const saveCoordinates = () => {
  // Emit updated coordinates
  emit('update:coordinates', coordinates.value)
}
</script>
```

---

### Phase 3: AI Diagram Understanding (Future) ⭐ ENHANCED WITH COORDINATES
**Status:** Not Implemented  
**Complexity:** High  
**Impact:** Medium

#### Features:
- [ ] **Automatic Coordinate Detection**
  - Gemini Vision analyzes PDF layout
  - Detects diagram positions automatically
  - Returns precise bounding box coordinates
  - Handles multiple diagrams per page

- [ ] **Diagram Content Analysis**
  - Use Gemini Vision to understand diagram content
  - Identify diagram type (circuit, graph, flowchart, etc.)
  - Extract key information from diagram
  - Generate diagram description
  - OCR text within diagram bounds

- [ ] **Smart Diagram-Question Matching**
  - Match diagrams to questions by proximity
  - Analyze question text for diagram references
  - Suggest which diagram belongs to which question
  - Handle "Figure 2.3" style references

- [ ] **Coordinate Refinement**
  - AI suggests better coordinates if user's are off
  - Auto-crop whitespace around diagrams
  - Detect diagram boundaries precisely
  - Handle rotated/skewed diagrams

#### Implementation:
```javascript
// apps/shared/app/utils/diagramAIUtils.ts

// Enhanced Gemini prompt for coordinate detection
const COORDINATE_DETECTION_PROMPT = `
Analyze this PDF page and detect all diagrams/figures.

For each diagram found, return:
{
  "pageNumber": <page_number>,
  "boundingBox": {
    "x": <0-1, normalized horizontal position>,
    "y": <0-1, normalized vertical position>,
    "width": <0-1, normalized width>,
    "height": <0-1, normalized height>
  },
  "type": "circuit|graph|flowchart|table|image",
  "label": "Figure X.X or diagram title",
  "description": "Brief description of diagram content",
  "confidence": <1-5>,
  "nearbyQuestionNumber": <question number if detectable>
}

Return array of all diagrams found on this page.
`

export async function detectDiagramCoordinates(
  pdfBuffer: ArrayBuffer,
  pageNumber: number,
  geminiApiKey: string
): Promise<DiagramCoordinates[]> {
  // Render PDF page to image
  const pageImage = await renderPDFPageToImage(pdfBuffer, pageNumber)
  
  // Send to Gemini Vision with coordinate detection prompt
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: COORDINATE_DETECTION_PROMPT },
            { inline_data: { mime_type: 'image/png', data: pageImage } }
          ]
        }]
      })
    }
  )
  
  const data = await response.json()
  const diagrams = JSON.parse(data.candidates[0].content.parts[0].text)
  
  return diagrams
}

export async function refineDiagramCoordinates(
  pdfBuffer: ArrayBuffer,
  currentCoordinates: DiagramCoordinates,
  geminiApiKey: string
): Promise<DiagramCoordinates> {
  // Extract current diagram area
  const diagramImage = await renderDiagramFromPDF(pdfBuffer, currentCoordinates)
  
  // Ask Gemini to suggest better coordinates
  const prompt = `
  This is a cropped diagram from a PDF. 
  Current coordinates: ${JSON.stringify(currentCoordinates.boundingBox)}
  
  Analyze if the crop is optimal. Suggest better coordinates if:
  - Too much whitespace around diagram
  - Diagram is cut off
  - Multiple diagrams in one crop
  
  Return improved coordinates or same if already optimal.
  `
  
  // Get AI suggestion
  // Return refined coordinates
}

export async function matchDiagramsToQuestions(
  questions: AIExtractedQuestion[],
  detectedDiagrams: DiagramCoordinates[]
): Promise<AIExtractedQuestion[]> {
  // Match diagrams to questions based on:
  // 1. Page proximity
  // 2. Question text references ("Figure 2.3")
  // 3. Question number proximity
  
  return questions.map(question => {
    if (question.hasDiagram) {
      // Find matching diagrams
      const matchingDiagrams = detectedDiagrams.filter(diagram => {
        // Check if diagram is on same page or nearby
        // Check if question text mentions diagram label
        return true // matching logic
      })
      
      return {
        ...question,
        diagrams: matchingDiagrams
      }
    }
    return question
  })
}
```

---

## 🔐 API Key & Settings Improvements

### Phase 1: Secure API Key Storage (High Priority)
**Status:** Partially Implemented (localStorage only)  
**Complexity:** Medium  
**Impact:** High

#### Features:
- [ ] **Encrypted Local Storage**
  - Encrypt API key before storing
  - Use browser's Web Crypto API
  - Decrypt only when needed

- [ ] **Backend API Key Storage**
  - Store API keys on server (optional)
  - User authentication required
  - Encrypted database storage

- [ ] **API Key Validation**
  - Check API key on every request
  - Show quota remaining
  - Alert when quota is low

#### Implementation:
```javascript
// apps/shared/app/utils/secureStorage.ts
export async function encryptAndStore(key: string, value: string) {
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: generateIV() },
    await getEncryptionKey(),
    new TextEncoder().encode(value)
  )
  localStorage.setItem(key, btoa(String.fromCharCode(...new Uint8Array(encrypted))))
}
```

---

### Phase 2: Multi-API Support (Medium Priority)
**Status:** Not Implemented  
**Complexity:** Medium  
**Impact:** Medium

#### Features:
- [ ] **Support Multiple AI Providers**
  - Google Gemini (current)
  - OpenAI GPT-4 Vision
  - Anthropic Claude
  - Local LLMs (Ollama)

- [ ] **API Provider Selection**
  - Choose provider in settings
  - Compare pricing/features
  - Fallback to alternative if one fails

- [ ] **Cost Tracking**
  - Track API usage per provider
  - Show estimated costs
  - Set spending limits

---

## 📝 Answer Extraction Improvements

### Phase 1: Enhanced Answer Detection (High Priority)
**Status:** Basic Implementation  
**Complexity:** Medium  
**Impact:** High

#### Features:
- [ ] **Answer Key Page Detection**
  - Automatically find answer key pages
  - Separate answer key from questions
  - Match answers to questions by number

- [ ] **Multiple Answer Formats**
  - Support different answer key formats
  - Handle answers at end of PDF
  - Handle answers on separate pages
  - Handle inline answers

- [ ] **Answer Validation**
  - Verify answers match question type
  - Check if answer is in options (MCQ)
  - Validate numerical answers (NAT)
  - Flag suspicious answers

#### Implementation:
```javascript
// apps/shared/app/utils/answerExtractionUtils.ts
export async function extractAnswerKey(pdfText: string) {
  // Find answer key section
  // Parse answer format
  // Match to questions
  return {
    answers: [
      { questionNumber: 1, answer: 'A' },
      { questionNumber: 2, answer: ['B', 'C'] },
      { questionNumber: 3, answer: '42' }
    ]
  }
}
```

---

### Phase 2: Answer Confidence Scoring (Medium Priority)
**Status:** Not Implemented  
**Complexity:** Low  
**Impact:** Medium

#### Features:
- [ ] **Answer Extraction Confidence**
  - Score how confident AI is about each answer
  - Flag low-confidence answers for review
  - Show confidence in review interface

- [ ] **Answer Verification**
  - Cross-check answers with question text
  - Verify answer is valid option
  - Detect impossible answers

---

## 🔄 Review Interface Improvements

### Phase 1: Enhanced Question Editor (High Priority)
**Status:** Basic Implementation  
**Complexity:** Medium  
**Impact:** High

#### Features:
- [ ] **Rich Text Editor**
  - Format question text (bold, italic, subscript, superscript)
  - Add mathematical equations (LaTeX support)
  - Insert special characters
  - Preview formatted text

- [ ] **Bulk Operations**
  - Select multiple questions
  - Bulk edit subject/section
  - Bulk delete questions
  - Bulk confidence adjustment

- [ ] **Question Reordering**
  - Drag-and-drop to reorder
  - Sort by confidence, type, subject
  - Group by section

- [ ] **Undo/Redo**
  - Track all changes
  - Undo last action
  - Redo undone action
  - Change history

#### Implementation:
```vue
<!-- apps/shared/app/components/QuestionEditor.vue -->
<template>
  <div class="question-editor">
    <RichTextEditor v-model="question.text" />
    <OptionsEditor v-model="question.options" />
    <AnswerSelector v-model="question.correctAnswer" />
    <DiagramUploader v-model="question.diagrams" />
  </div>
</template>
```

---

### Phase 2: Collaboration Features (Future)
**Status:** Not Implemented  
**Complexity:** Very High  
**Impact:** Medium

#### Features:
- [ ] **Multi-User Editing**
  - Multiple users can review same PDF
  - Real-time collaboration
  - See who's editing what
  - Conflict resolution

- [ ] **Comments & Notes**
  - Add comments to questions
  - Tag team members
  - Resolve comments
  - Comment history

- [ ] **Review Workflow**
  - Assign questions to reviewers
  - Track review status
  - Approval workflow
  - Version control

---

## 🎨 UI/UX Improvements

### Phase 1: Better Visual Design (Medium Priority)
**Status:** Partially Implemented  
**Complexity:** Low  
**Impact:** Medium

#### Features:
- [ ] **Dark Mode Everywhere**
  - Consistent dark mode across all pages
  - Smooth theme transitions
  - Remember user preference

- [ ] **Responsive Design**
  - Mobile-friendly interface
  - Tablet optimization
  - Touch-friendly controls

- [ ] **Accessibility**
  - Keyboard navigation
  - Screen reader support
  - High contrast mode
  - Font size adjustment

---

### Phase 2: Advanced Features (Future)
**Status:** Not Implemented  
**Complexity:** High  
**Impact:** Low

#### Features:
- [ ] **Question Templates**
  - Save common question formats
  - Quick insert templates
  - Share templates with team

- [ ] **Export Formats**
  - Export to Word/PDF
  - Export to Google Forms
  - Export to Moodle XML
  - Export to QTI format

- [ ] **Analytics Dashboard**
  - Extraction success rate
  - Average confidence scores
  - Most common question types
  - Processing time trends

---

## 🔧 Technical Improvements

### Phase 1: Performance Optimization (High Priority)
**Status:** Needs Improvement  
**Complexity:** Medium  
**Impact:** High

#### Features:
- [ ] **Faster PDF Processing**
  - Parallel processing for large PDFs
  - Progressive loading
  - Cancel long-running operations
  - Resume interrupted extractions

- [ ] **Better Caching**
  - Cache API responses
  - Cache processed PDFs
  - Smart cache invalidation
  - Offline mode improvements

- [ ] **Memory Management**
  - Handle large PDFs (100+ pages)
  - Prevent memory leaks
  - Optimize image storage
  - Lazy loading

---

### Phase 2: Error Handling (Medium Priority)
**Status:** Basic Implementation  
**Complexity:** Low  
**Impact:** High

#### Features:
- [ ] **Better Error Messages**
  - User-friendly error descriptions
  - Suggested fixes
  - Error reporting
  - Debug mode

- [ ] **Automatic Retry**
  - Retry failed API calls
  - Exponential backoff
  - Fallback strategies
  - Partial success handling

- [ ] **Error Recovery**
  - Save progress before crash
  - Resume from last checkpoint
  - Recover corrupted data
  - Export error logs

---

## 📱 Platform Support

### Phase 1: Desktop App (Future)
**Status:** Not Implemented  
**Complexity:** High  
**Impact:** Medium

#### Features:
- [ ] **Electron Desktop App**
  - Windows, Mac, Linux support
  - Offline-first architecture
  - Local file system access
  - System tray integration

- [ ] **Better File Handling**
  - Drag-and-drop PDFs
  - Batch processing
  - Watch folder for new PDFs
  - Auto-process on upload

---

### Phase 2: Mobile App (Future)
**Status:** Not Implemented  
**Complexity:** Very High  
**Impact:** Low

#### Features:
- [ ] **Mobile Apps**
  - iOS and Android apps
  - Camera PDF scanning
  - Mobile-optimized UI
  - Offline support

---

## 🎯 Priority Matrix

### Must Have (Next 3 Months)
1. ✅ Fix server crash issues
2. ✅ API key persistence
3. ✅ Answer extraction
4. 🔲 **AI Diagram Coordinate Detection** ⭐ (Smart approach - no image storage!)
5. 🔲 **Coordinate-based Diagram Rendering** ⭐ (Render from PDF on-demand)
6. 🔲 **Interactive Coordinate Editor** ⭐ (Adjust diagram bounds in review)
7. 🔲 Encrypted API key storage

### Should Have (3-6 Months)
1. 🔲 Rich text editor for questions
2. 🔲 Bulk operations
3. 🔲 Answer key detection
4. 🔲 Multi-API provider support
5. 🔲 Better error handling

### Nice to Have (6-12 Months)
1. 🔲 AI diagram understanding
2. 🔲 Collaboration features
3. 🔲 Desktop app
4. 🔲 Analytics dashboard
5. 🔲 Export to multiple formats

### Future (12+ Months)
1. 🔲 Mobile apps
2. 🔲 Real-time collaboration
3. 🔲 Advanced AI features
4. 🔲 Enterprise features

---

## 📊 Success Metrics

### User Experience
- [ ] 90%+ extraction accuracy
- [ ] < 30 seconds processing time for 50 questions
- [ ] < 5% error rate
- [ ] 95%+ user satisfaction

### Technical Performance
- [ ] Support PDFs up to 200 pages
- [ ] Handle 100+ concurrent users
- [ ] 99.9% uptime
- [ ] < 2 second page load time

### Business Goals
- [ ] 10,000+ active users
- [ ] 100,000+ PDFs processed
- [ ] 50+ educational institutions using
- [ ] Positive ROI on AI API costs

---

## 🤝 Contributing

Want to help implement these features? Check out:
- `CONTRIBUTING.md` for guidelines
- GitHub Issues for specific tasks
- Discord community for discussions

---

**Last Updated:** October 24, 2025  
**Version:** 1.27.0  
**Maintainer:** Naman Dhakad
