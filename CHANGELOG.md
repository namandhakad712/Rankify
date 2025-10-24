# Rankify Changelog

All notable changes to this project will be documented in this file.

---

## [1.27.0] - 2025-10-24

### 🔥 Critical Bug Fixes

#### **FIXED: API Key Truncation Bug**
- **CRITICAL FIX**: API key was being truncated to first 10 characters in actual API requests
- **Location**: `apps/shared/app/utils/geminiAPIClient.ts` line 369
- **Issue**: Code was using truncated key (`AIzaSyD75K...`) for both logging AND the actual fetch request
- **Impact**: ALL Gemini API requests were failing with "400 Bad Request: API key not valid"
- **Solution**: Separated logging URL (truncated for security) from actual request URL (full key)
- **Result**: API requests now work properly with valid Gemini API keys

### 🚀 Major Performance Improvements

#### **Removed Unnecessary PDF.js Processing**
- **OPTIMIZATION**: Eliminated redundant PDF text extraction before sending to Gemini
- **Removed**: ~60 lines of PDF.js processing code that was blocking scanned PDFs
- **Removed**: Text validation that threw "needs OCR" errors for image-based PDFs
- **Removed**: PDF processor initialization and cleanup logic
- **Removed**: WASM retry logic that caused memory issues

#### **Direct Gemini Vision API Integration**
- **NEW**: PDF files now sent directly to Gemini Vision API without preprocessing
- **BENEFIT**: Gemini Vision handles ALL PDF types natively:
  - ✅ Text-based PDFs (normal selectable text)
  - ✅ Scanned PDFs (built-in OCR)
  - ✅ Image-based PDFs (vision processing)
  - ✅ PDFs with diagrams/graphs (visual analysis)
  - ✅ Mixed content PDFs (text + images)
  - ✅ Handwritten questions (if legible)

### 📝 Enhanced AI Prompts

#### **Updated Gemini Extraction Prompt**
- **IMPROVED**: Prompt now explicitly instructs Gemini to use vision capabilities
- **ADDED**: Clear instructions for handling scanned/image-based PDFs
- **ADDED**: Explicit OCR instructions for non-text PDFs
- **RESULT**: Better extraction accuracy across all PDF types

### ⚡ Performance Benefits

#### **Speed Improvements**
- **BEFORE**: 2 operations (PDF.js extraction + Gemini API call)
- **AFTER**: 1 operation (Gemini API call only)
- **RESULT**: Faster processing, especially for large PDFs

#### **Reliability Improvements**
- **ELIMINATED**: PDF.js WASM loading issues
- **ELIMINATED**: Browser memory problems with large PDFs
- **ELIMINATED**: Text extraction failures on scanned PDFs
- **ELIMINATED**: "PDF appears to be empty" false errors

#### **Compatibility Improvements**
- **BEFORE**: Only worked with text-based PDFs
- **AFTER**: Works with ANY PDF format Gemini can read
- **BENEFIT**: Users can upload scanned exam papers, photos of questions, etc.

### 🔧 Technical Changes

#### **Modified Files**
1. `apps/shared/app/utils/aiExtractionUtils.ts`
   - Removed PDF processor dependency
   - Removed text extraction validation
   - Simplified extraction flow to direct Gemini call
   - Updated progress reporting

2. `apps/shared/app/utils/geminiAPIClient.ts`
   - Fixed API key truncation bug
   - Enhanced prompt for vision capabilities
   - Added proper URL logging for security
   - Improved error messages

### 📚 Documentation

#### **New Documentation Files**
1. `GEMINI_VISION_FIX.md` - Complete explanation of PDF processing optimization
2. `API_KEY_BUG_FIX.md` - Detailed bug analysis and fix documentation

### 🎯 Impact Summary

#### **Before This Release**
- ❌ API requests failing with "invalid API key"
- ❌ Scanned PDFs rejected with "needs OCR" error
- ❌ Image-based PDFs showing "no text found"
- ❌ WASM loading issues in some browsers
- ❌ Unnecessary processing overhead

#### **After This Release**
- ✅ API requests work with valid keys
- ✅ Scanned PDFs processed successfully
- ✅ Image-based PDFs handled natively
- ✅ No browser compatibility issues
- ✅ Faster, simpler processing pipeline

### 🔐 Security Improvements

- **MAINTAINED**: API key still truncated in console logs for security
- **FIXED**: Full API key now properly sent to Google API
- **RESULT**: Security maintained while fixing functionality

---

## [1.26.0] - 2025-10-12

### 🎉 Major Features

#### **Complete Homepage Redesign with Online/Offline Mode Toggle**
- **NEW**: Beautiful toggle switch in header to switch between Online (AI-Powered) and Offline (Privacy-First) modes
- **NEW**: Separate, dedicated content for each mode with distinct styling and messaging
- **NEW**: Smooth fade-slide transitions when switching between modes
- **NEW**: User preference saved to localStorage and persists across sessions

#### **Dark/Light Mode Support**
- **NEW**: Full dark mode support across the entire homepage
- **NEW**: Theme toggle button (sun/moon icon) in header
- **NEW**: Automatic system preference detection on first visit
- **NEW**: Theme preference saved to localStorage
- **NEW**: All components (cards, tables, badges, buttons) optimized for both themes

#### **Online Mode (AI-Powered) Page**
- **NEW**: AI-first messaging with prominent CTAs
- **NEW**: 4-step AI workflow visualization with animated cards
- **NEW**: 6 feature cards highlighting AI capabilities:
  - Lightning Fast extraction
  - High Accuracy with AI
  - Confidence Scoring (1-5 scale)
  - Automatic Diagram Detection
  - Multi-Type Question Support
  - Auto-Save functionality
- **NEW**: Comparison table showing AI advantages over manual methods
- **NEW**: Gradient hero section with animated text
- **NEW**: Multiple CTAs throughout the page

#### **Offline Mode (Privacy-First) Page**
- **NEW**: Privacy-focused messaging emphasizing local processing
- **NEW**: 4-step offline workflow with manual cropping process
- **NEW**: 6 feature cards highlighting privacy benefits:
  - Complete Privacy (no data sent)
  - Works Offline (no internet needed)
  - Precision Control (manual cropping)
  - Flexible Export (ZIP/JSON)
  - Local Storage (browser-based)
  - All Question Types supported
- **NEW**: Download section with terminal-style code block
- **NEW**: Use cases section for Organizations and Individuals
- **NEW**: Comparison table showing privacy advantages
- **NEW**: Multiple download CTAs with GitHub links

### 🎨 UI/UX Improvements

#### **Header & Navigation**
- **IMPROVED**: Custom sticky header with better visual hierarchy
- **IMPROVED**: Mode toggle styled as unified switch (not separate buttons)
- **IMPROVED**: Theme toggle with colored icons (yellow sun, dark moon)
- **IMPROVED**: GitHub button with proper borders and hover states
- **REMOVED**: Duplicate header issue (old MainNavBar on homepage)

#### **Visual Design**
- **IMPROVED**: All cards now have visible rounded corners in light mode
- **IMPROVED**: Tables clearly visible with proper borders and hover effects
- **IMPROVED**: Better color contrast in both light and dark modes
- **IMPROVED**: Thicker borders (border-2) on feature cards for better definition
- **IMPROVED**: Shadow effects on cards and buttons
- **IMPROVED**: Hover animations (lift effect, scale, icon rotation)
- **IMPROVED**: Gradient backgrounds work beautifully in both themes

#### **Color System**
- **Light Mode**: Clean whites, pastels, dark text, subtle shadows
- **Dark Mode**: Dark slates, vibrant accents, light text, glowing effects
- **Consistent**: All colors have proper dark mode variants (dark:)

### 🔧 Technical Improvements

#### **Theme Management**
- Implemented manual theme toggle with localStorage persistence
- System preference detection using `prefers-color-scheme`
- Proper `.dark` class application to `<html>` element
- Console logging for debugging theme changes

#### **Component Architecture**
- Created modular components: `OnlineModeContent.vue` and `OfflineModeContent.vue`
- Clean separation of concerns between online and offline content
- Reusable component structure

#### **Performance**
- Smooth transitions with CSS animations
- Optimized rendering with Vue's Transition component
- Efficient state management with refs and reactive

### 📝 Content Updates

#### **Repository Information**
- **UPDATED**: All GitHub links to `https://github.com/namandhakad712/rankify`
- **UPDATED**: Author name to "Naman Dhakad"
- **UPDATED**: Author email to "namandhakad712@gmail.com"
- **UPDATED**: All download links point to correct repository
- **UPDATED**: All package.json files with new author information

#### **Messaging**
- **ENHANCED**: AI-first messaging throughout online mode
- **ENHANCED**: Privacy-first messaging throughout offline mode
- **ENHANCED**: Clear value propositions for each mode
- **ENHANCED**: "10x faster" claims with AI extraction
- **ENHANCED**: Use case descriptions for different user types

### 🐛 Bug Fixes

- **FIXED**: AI Extractor card not visible on homepage (removed conditional rendering)
- **FIXED**: Duplicate header showing above new header
- **FIXED**: Theme toggle not working (implemented proper theme management)
- **FIXED**: Tables not clearly visible in light mode (added borders and hover effects)
- **FIXED**: Offline page showing nothing (created proper component)
- **FIXED**: Toggle looking like two separate buttons (unified styling)
- **FIXED**: Rounded corners not visible in light mode (enhanced borders)

### 📦 Files Created

1. `apps/shared/app/pages/index.vue` - Redesigned homepage with toggle
2. `apps/shared/app/components/OnlineModeContent.vue` - Online mode content
3. `apps/shared/app/components/OfflineModeContent.vue` - Offline mode content
4. `HOMEPAGE_AI_FIRST_CHANGES.md` - Documentation of initial changes
5. `NEW_HOMEPAGE_DESIGN.md` - Complete design documentation
6. `DARK_LIGHT_MODE_IMPLEMENTATION.md` - Theme implementation guide
7. `GITHUB_LINKS_UPDATE_SUMMARY.md` - Repository update summary

### 🎯 Key Achievements

- ✅ **Online-first approach** clearly communicated
- ✅ **Offline fallback** properly positioned as alternative
- ✅ **Dual-mode toggle** working perfectly
- ✅ **Dark/light themes** fully functional
- ✅ **Professional design** with modern aesthetics
- ✅ **Responsive layout** works on all devices
- ✅ **Clear CTAs** guide users to appropriate workflows
- ✅ **Repository ownership** properly updated

---

## Previous Versions

For historical changelog entries from v1.25.0 and earlier, please refer to the git history or the original CHANGELOG.md backup.

---

**Note**: This version represents a major redesign of the homepage and user experience, positioning Rankify as an AI-first platform with robust offline capabilities.
