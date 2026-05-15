# PixelCraft Architecture

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                           BROWSER                                    │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                    React Application                            │ │
│  │                                                                 │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │ │
│  │  │   TopBar     │  │  LeftSidebar │  │  RightPanel  │        │ │
│  │  │ (Controls)   │  │   (Tools)    │  │  (Settings)  │        │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘        │ │
│  │                                                                 │ │
│  │  ┌──────────────────────────────────────────────────────────┐ │ │
│  │  │              Canvas Workspace                             │ │ │
│  │  │  ┌────────────────────────────────────────────────────┐  │ │ │
│  │  │  │         HTML5 Canvas (Image Rendering)            │  │ │ │
│  │  │  │  • Pan & Zoom                                      │  │ │ │
│  │  │  │  • Checkerboard Background                        │  │ │ │
│  │  │  │  • Live Cursor Tracking                           │  │ │ │
│  │  │  └────────────────────────────────────────────────────┘  │ │ │
│  │  │  ┌────────────────────────────────────────────────────┐  │ │ │
│  │  │  │      Konva.js Layer (Annotations - Future)        │  │ │ │
│  │  │  └────────────────────────────────────────────────────┘  │ │ │
│  │  └──────────────────────────────────────────────────────────┘ │ │
│  │                                                                 │ │
│  │  ┌──────────────────────────────────────────────────────────┐ │ │
│  │  │   BottomBar (Stats: Dimensions, Zoom, Coordinates)       │ │ │
│  │  └──────────────────────────────────────────────────────────┘ │ │
│  │                                                                 │ │
│  │  ┌──────────────────────────────────────────────────────────┐ │ │
│  │  │              State Management (Zustand)                   │ │ │
│  │  │  • imageStore    • historyStore   • toolStore            │ │ │
│  │  │  • uiStore       • annotationStore                       │ │ │
│  │  └──────────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
                                  ↕
                          HTTP/REST API (Axios)
                                  ↕
┌──────────────────────────────────────────────────────────────────────┐
│                      FastAPI Backend (Python)                         │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │                        API Routers                               │ │
│  │  • POST /api/upload          - Upload image                     │ │
│  │  • GET  /api/session/{id}/image - Get working image            │ │
│  │  • GET  /api/session/{id}    - Get session info                │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                  ↕                                    │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │                         Services                                 │ │
│  │  • file_service.py      - File I/O operations                   │ │
│  │  • history_service.py   - Snapshot management                   │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                  ↕                                    │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │                    Image Processing                              │ │
│  │  • Pillow (PIL)    - Image manipulation                         │ │
│  │  • OpenCV (cv2)    - Computer vision                            │ │
│  │  • NumPy           - Numerical operations                       │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                  ↕                                    │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │                      File Storage                                │ │
│  │  storage/                                                        │ │
│  │  ├── originals/{sessionId}/  - Uploaded files                   │ │
│  │  ├── working/{sessionId}/    - Current working image            │ │
│  │  ├── history/{sessionId}/    - Undo/redo snapshots             │ │
│  │  └── exports/{sessionId}/    - Exported images                  │ │
│  └─────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────┘
                                  ↕
                          MongoDB Connection (Motor)
                                  ↕
┌───────────────────────────────────────────────────────────────────────┐
│                         MongoDB Database                              │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │                    sessions Collection                           │ │
│  │  {                                                               │ │
│  │    sessionId: "uuid",                                            │ │
│  │    originalPath: "storage/originals/...",                        │ │
│  │    workingPath: "storage/working/...",                           │ │
│  │    metadata: {                                                   │ │
│  │      width, height, format, colorMode, fileName, hasAlpha       │ │
│  │    },                                                            │ │
│  │    createdAt: "ISO timestamp",                                   │ │
│  │    lastModified: "ISO timestamp",                                │ │
│  │    history: [                                                    │ │
│  │      { id, timestamp, operationName, imagePath, thumbnail }     │ │
│  │    ]                                                             │ │
│  │  }                                                               │ │
│  └─────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────┘
```

## Component Hierarchy

```
App
└── AppLayout
    ├── TopBar
    │   ├── Logo
    │   ├── UndoRedoButtons
    │   ├── HistoryButton
    │   ├── FilenameDisplay
    │   ├── ZoomControls
    │   ├── SaveButton
    │   └── ExportDropdown
    │
    ├── LeftSidebar
    │   └── ToolButton[] (17 tools)
    │       └── Tooltip
    │
    ├── CanvasWorkspace
    │   ├── UploadZone (when no image)
    │   ├── ImageCanvas (when image loaded)
    │   ├── AnnotationLayer (Konva)
    │   └── ProcessingOverlay (when processing)
    │       └── Spinner
    │
    ├── RightPanel
    │   ├── PanelHeader
    │   └── DefaultPanel | ToolPanel
    │       └── ImageMetadata
    │
    └── BottomBar
        ├── ImageInfo (W, H, Format, Size)
        └── CursorInfo (X, Y, Zoom)
```

## Data Flow Diagrams

### Upload Flow
```
User Action: Drop Image
        ↓
UploadZone.handleFile()
        ↓
Validate file (type, size)
        ↓
imageStore.setProcessing(true, "Uploading...")
        ↓
POST /api/upload (FormData)
        ↓
Backend: Save to originals/
        ↓
Backend: Convert to PNG → working/
        ↓
Backend: Extract metadata (Pillow)
        ↓
Backend: Create MongoDB session
        ↓
Backend: Return {sessionId, metadata}
        ↓
Frontend: GET /api/session/{id}/image
        ↓
Backend: Read working image
        ↓
Backend: Convert to base64
        ↓
Backend: Return {imageBase64}
        ↓
imageStore.initSession(session, base64)
        ↓
imageStore.setProcessing(false)
        ↓
Canvas renders image
        ↓
Toast: "Image loaded: filename (WxH)"
```

### Canvas Rendering Flow
```
workingImageBase64 changes
        ↓
useEffect in ImageCanvas
        ↓
Create new Image()
        ↓
img.src = "data:image/png;base64,..."
        ↓
img.onload → imageRef.current = img
        ↓
Trigger fitToScreen()
        ↓
Calculate zoom and pan
        ↓
Update uiStore
        ↓
requestAnimationFrame loop
        ↓
drawImage(ctx, img, zoom, panX, panY)
        ↓
Draw checkerboard background
        ↓
Draw image with transforms
        ↓
Repeat at 60fps
```

### Pan/Zoom Flow
```
User: Space + Drag
        ↓
useCanvas hook detects Space key
        ↓
Set isSpacePressed = true
        ↓
Change cursor to "grab"
        ↓
User: Mouse down
        ↓
Set isPanning = true
        ↓
Store lastPos = {x, y}
        ↓
User: Mouse move
        ↓
Calculate delta = current - lastPos
        ↓
uiStore.setPan(panX + deltaX, panY + deltaY)
        ↓
Canvas re-renders with new pan
        ↓
User: Mouse up
        ↓
Set isPanning = false
        ↓
Cursor back to "grab"

User: Ctrl + Scroll
        ↓
useCanvas hook detects wheel event
        ↓
Calculate zoom delta (0.9 or 1.1)
        ↓
Calculate new zoom = zoom * delta
        ↓
Calculate mouse position in canvas
        ↓
Adjust pan to zoom towards mouse
        ↓
uiStore.setZoom(newZoom)
        ↓
uiStore.setPan(newPanX, newPanY)
        ↓
Canvas re-renders with new zoom/pan
```

## State Management Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Zustand Stores                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  imageStore                                                  │
│  ├── sessionId: string | null                               │
│  ├── metadata: ImageMetadata | null                         │
│  ├── workingImageBase64: string | null                      │
│  ├── originalImageBase64: string | null                     │
│  ├── isProcessing: boolean                                  │
│  ├── processingLabel: string                                │
│  └── Actions: initSession, setWorkingImage, setProcessing   │
│                                                              │
│  historyStore                                                │
│  ├── undoStack: HistoryEntry[]                              │
│  ├── redoStack: HistoryEntry[]                              │
│  └── Actions: pushToHistory, undo, redo, clearHistory       │
│                                                              │
│  toolStore                                                   │
│  ├── activeTool: ToolType | null                            │
│  ├── toolOptions: Record<string, unknown>                   │
│  └── Actions: setTool, updateToolOptions                    │
│                                                              │
│  uiStore                                                     │
│  ├── zoom: number                                            │
│  ├── panX: number                                            │
│  ├── panY: number                                            │
│  ├── cursorX: number                                         │
│  ├── cursorY: number                                         │
│  ├── isHistoryOpen: boolean                                 │
│  ├── isExportModalOpen: boolean                             │
│  └── Actions: setZoom, setPan, setCursor, fitToScreen       │
│                                                              │
│  annotationStore                                             │
│  ├── annotations: unknown[]                                 │
│  ├── selectedAnnotationId: string | null                    │
│  └── Actions: add, remove, update, select, clear            │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## API Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FastAPI Application                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  main.py                                                     │
│  ├── FastAPI app instance                                   │
│  ├── CORS middleware                                         │
│  ├── Lifespan events (startup/shutdown)                     │
│  └── Router inclusion                                        │
│                                                              │
│  routers/upload.py                                           │
│  ├── POST /api/upload                                        │
│  │   ├── Validate file (extension, size)                    │
│  │   ├── Generate session ID                                │
│  │   ├── Save to originals/                                 │
│  │   ├── Convert to PNG → working/                          │
│  │   ├── Extract metadata                                   │
│  │   ├── Create MongoDB document                            │
│  │   └── Return {sessionId, metadata}                       │
│  │                                                           │
│  ├── GET /api/session/{id}/image                            │
│  │   ├── Read working image                                 │
│  │   ├── Convert to base64                                  │
│  │   └── Return {imageBase64}                               │
│  │                                                           │
│  └── GET /api/session/{id}                                  │
│      ├── Query MongoDB                                       │
│      └── Return session document                            │
│                                                              │
│  services/file_service.py                                    │
│  ├── save_uploaded_file()                                   │
│  ├── copy_to_working()                                      │
│  ├── create_history_directory()                             │
│  ├── read_image_as_bytes()                                  │
│  ├── get_working_image_path()                               │
│  └── get_export_path()                                      │
│                                                              │
│  services/history_service.py                                 │
│  └── save_history_snapshot()                                │
│      ├── Generate entry ID                                  │
│      ├── Copy image to history/                             │
│      ├── Generate 80x80 thumbnail                           │
│      ├── Convert thumbnail to base64                        │
│      ├── Create history entry                               │
│      └── Update MongoDB session                             │
│                                                              │
│  utils/image_utils.py                                        │
│  ├── pil_to_base64()                                        │
│  ├── base64_to_pil()                                        │
│  ├── pil_to_cv2()                                           │
│  ├── cv2_to_pil()                                           │
│  └── get_image_metadata()                                   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## Technology Stack Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                        │
│  React Components, Tailwind CSS, Lucide Icons               │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                    State Management Layer                    │
│  Zustand Stores, Custom Hooks                               │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                    API Client Layer                          │
│  Axios, Interceptors, Endpoints                             │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                    API Server Layer                          │
│  FastAPI, Routers, Middleware                               │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                    Business Logic Layer                      │
│  Services, Image Processing                                 │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                    Data Access Layer                         │
│  MongoDB (Motor), File System                               │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                    Storage Layer                             │
│  MongoDB Database, File Storage                             │
└─────────────────────────────────────────────────────────────┘
```

## Security Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Security Layers                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Input Validation                                         │
│     ├── File extension whitelist                            │
│     ├── File size limit (50MB)                              │
│     ├── MIME type checking                                  │
│     └── Pydantic model validation                           │
│                                                              │
│  2. CORS Protection                                          │
│     ├── Allowed origins whitelist                           │
│     ├── Credentials support                                 │
│     └── Method restrictions                                 │
│                                                              │
│  3. Path Security                                            │
│     ├── Session ID validation (UUID)                        │
│     ├── Path traversal prevention                           │
│     └── Secure file naming                                  │
│                                                              │
│  4. Error Handling                                           │
│     ├── No sensitive data in errors                         │
│     ├── Generic error messages                              │
│     └── Proper HTTP status codes                            │
│                                                              │
│  5. Data Sanitization                                        │
│     ├── Input cleaning                                      │
│     ├── Output encoding                                     │
│     └── Type checking                                       │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

This architecture provides a solid foundation for a scalable, maintainable, and secure image editing application.
