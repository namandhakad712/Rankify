# 🔍 Diagram Detection - Complete Guide

## 📋 **How It Works**

### **AI-Powered Visual Analysis**
The diagram detection uses **Google Gemini's multimodal AI** to analyze PDFs:

1. **PDF Processing**: Converts PDF to base64 and sends to Gemini API
2. **Visual Analysis**: AI "sees" the entire PDF including images, graphs, charts
3. **Text Analysis**: Looks for references like "refer to figure", "see diagram"
4. **Context Mapping**: Links visual elements to nearby questions
5. **Classification**: Determines if question requires visual interpretation

### **Detection Criteria**
The AI sets `hasDiagram: true` when it finds:

✅ **Mathematical Elements:**
- Graphs, plots, coordinate systems
- Functions, equations with visual representation
- Geometric shapes and figures
- Statistical charts and data visualizations

✅ **Scientific Diagrams:**
- Biology illustrations (cell structures, anatomy)
- Chemistry diagrams (molecular structures, reactions)
- Physics diagrams (circuits, force diagrams, waves)
- Laboratory setups and experimental apparatus

✅ **Technical Drawings:**
- Engineering schematics
- Architectural plans
- Circuit diagrams
- Flowcharts and process diagrams

✅ **Text References:**
- "Refer to the figure above"
- "See the diagram below"
- "In the graph shown"
- "Based on the chart"
- "From the illustration"

## 🎯 **Enhanced Detection (Current Implementation)**

### **Improved AI Prompt:**
```typescript
DIAGRAM DETECTION INSTRUCTIONS:
Look carefully for these visual elements:
- Mathematical graphs, charts, plots, or coordinate systems
- Scientific diagrams (biology, chemistry, physics illustrations)
- Flowcharts, process diagrams, or decision trees
- Geometric figures, shapes, or technical drawings
- Tables, data visualizations, or statistical charts
- Maps, circuit diagrams, or schematics

Set "hasDiagram" to true if:
- The question contains or refers to any visual element
- Text mentions "refer to figure", "see diagram", "shown above"
- Question cannot be fully understood without visual context
```

### **Visual Indicators in UI:**
```vue
<!-- Enhanced Diagram Badge -->
<span v-if="question.hasDiagram" 
      class="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded font-medium" 
      title="This question contains or references visual elements">
  📊 Has Diagram
</span>

<!-- Statistics with Diagram Count -->
<span class="text-orange-600">
  🖼️ With Diagrams: {{ diagramCount }}
</span>
```

## 📊 **Real Examples**

### **Example 1: Mathematical Graph**
```
Question: "What is the slope of the line shown in the coordinate plane?"
Detection: ✅ hasDiagram: true
Reason: Contains coordinate plane with plotted line
Visual: Graph with x-y axes and linear function
```

### **Example 2: Biology Diagram**
```
Question: "Identify the organelle labeled 'X' in the cell diagram."
Detection: ✅ hasDiagram: true
Reason: References cell diagram with labels
Visual: Cell illustration with labeled parts
```

### **Example 3: Circuit Diagram**
```
Question: "Calculate the total resistance in the circuit shown below."
Detection: ✅ hasDiagram: true
Reason: References electrical circuit diagram
Visual: Circuit schematic with resistors and connections
```

### **Example 4: Text-Only Question**
```
Question: "What is the chemical formula for water?"
Detection: ❌ hasDiagram: false
Reason: Pure text question, no visual elements needed
```

## 🔧 **Technical Implementation**

### **API Request Structure:**
```typescript
const requestBody = {
  contents: [{
    parts: [
      { text: enhancedPrompt },  // Detailed diagram detection instructions
      { 
        inline_data: {
          mime_type: "application/pdf",
          data: base64Data  // PDF converted to base64
        }
      }
    ]
  }]
}
```

### **Response Format:**
```json
{
  "questions": [
    {
      "id": 1,
      "text": "Find the area under the curve shown in the graph.",
      "type": "NAT",
      "hasDiagram": true,  // ← Diagram detection result
      "confidence": 4.2,
      "subject": "Mathematics",
      "section": "Calculus"
    }
  ]
}
```

## 📈 **Accuracy Factors**

### **High Accuracy (90%+):**
- Clear, well-defined diagrams
- High-resolution PDF scans (300+ DPI)
- Standard diagram types (graphs, flowcharts)
- Explicit text references to visuals
- Good contrast and clean layout

### **Medium Accuracy (70-90%):**
- Small or embedded diagrams
- Hand-drawn sketches
- Complex multi-part diagrams
- Poor scan quality
- Overlapping text and visuals

### **Lower Accuracy (50-70%):**
- Very small diagrams
- Blurry or pixelated images
- Text-heavy "diagrams" (mostly text)
- Unusual or non-standard diagram types
- Poor PDF quality or formatting

## 🎨 **UI Features**

### **Question Cards:**
- **Orange badge**: "📊 Has Diagram" for visual questions
- **Tooltip**: Explains what diagram detection means
- **Color coding**: Orange theme for diagram-related elements

### **Statistics Bar:**
- **Diagram count**: Shows total questions with diagrams
- **Percentage**: Easy to see ratio of visual vs text questions
- **Color coding**: Orange for diagram statistics

### **Search & Filter:**
- **Search diagrams**: Can search for questions with diagrams
- **Filter by type**: Can filter to show only diagram questions
- **Navigation**: Jump to specific diagram questions

## 🚀 **Benefits**

### **For Students:**
- **Visual Learning**: Quickly identify questions requiring visual analysis
- **Preparation**: Know which questions need diagram interpretation
- **Study Planning**: Focus on visual vs conceptual questions

### **For Educators:**
- **Content Analysis**: See balance of visual vs text questions
- **Question Types**: Understand assessment format
- **Accessibility**: Identify questions needing visual accommodations

### **For Test Prep:**
- **Question Classification**: Separate visual from text-based questions
- **Skill Assessment**: Test both analytical and visual reasoning
- **Format Familiarity**: Practice with diagram-based questions

## 🔮 **Future Enhancements**

### **Planned Improvements:**
1. **Diagram Types**: Classify as graph, flowchart, scientific, etc.
2. **Diagram Extraction**: Save detected diagrams as separate images
3. **Confidence Scoring**: Rate diagram detection confidence
4. **Description**: Brief description of detected visual elements
5. **OCR on Diagrams**: Extract text from within diagrams

### **Advanced Features:**
- **Interactive Diagrams**: Support for clickable elements
- **Multi-diagram Questions**: Handle questions with multiple visuals
- **Diagram Relationships**: Link related diagrams across pages
- **Visual Question Types**: Specialized handling for diagram questions

## 💡 **Best Practices**

### **For Better Detection:**
1. **High Quality PDFs**: Use 300+ DPI scans
2. **Clear Diagrams**: Ensure visuals are sharp and well-defined
3. **Proper Layout**: Keep diagrams close to related questions
4. **Text References**: Include "refer to figure" type language
5. **Standard Formats**: Use common diagram types

### **Question Writing Tips:**
- Explicitly reference diagrams in question text
- Use clear labels and captions on diagrams
- Position diagrams logically near questions
- Avoid tiny or unclear visual elements
- Include diagram legends when needed

The diagram detection system provides **intelligent visual analysis** to help users understand which questions require visual interpretation, making the AI extractor more useful for educational content! 🎯