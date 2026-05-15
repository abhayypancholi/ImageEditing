# Image Editor 🎨

A full-stack web application for professional image editing with AI-powered features.

**Tech Stack:** React + TypeScript + FastAPI + Python + MongoDB

> 📚 **Detailed guides available in `.docs/` folder** - Installation help, troubleshooting, and more!

## ✨ Features

### Core Editing Tools
- **Crop & Resize** - Precise cropping with aspect ratio presets
- **Zoom & Pan** - Smooth canvas navigation with mouse/touch controls
- **Enhance** - 7 enhancement algorithms (brightness, contrast, sharpness, noise removal, saturation, hue shift, edge detection)
- **Filters** - 12 professional filters (grayscale, sepia, vintage, cool, warm, dramatic, soft, vibrant, noir, fade, boost, matte)

### AI-Powered Features
- **OCR (Optical Character Recognition)** - Extract text from images with dictionary correction (English + Hindi)
- **Face Analysis** - Emotion detection with 12 emotions using DeepFace
- **Background Removal** - AI-powered background removal with 3 replacement modes
- **Object Removal** - Intelligent object removal with OpenCV inpainting
- **Image Extension** - Pattern-based image extension in 4 directions
- **Auto-Straighten** - Hough line detection for automatic image straightening

### Annotation & Analysis
- **Annotation Engine** - 5 shape types (rectangle, circle, polygon, line, arrow)
- **Export Formats** - JSON, COCO, YOLO
- **Object Counting** - BFS flood fill algorithm for object detection
- **Color Picker** - 140+ color names database

### Compression & Export
- **Compression** - JPEG quality, PCA, K-means palette reduction
- **Export Options** - PNG, JPEG, WebP, BMP, TIFF with advanced options
- **Watermarking** - Customizable text watermarks with position and opacity
- **Batch Export** - Export current image + all history as ZIP

### Session Management
- **History Tracking** - Full undo/redo with snapshot system
- **Session Manager** - View and manage recent editing sessions
- **Auto-Cleanup** - Automatic deletion of sessions older than 7 days
- **Project Files** - Save/load .pixelcraft project files

## 🚀 How to Run

### Step 1: Install Prerequisites

You need these installed on your computer:
- **Python 3.11 or higher** - [Download here](https://www.python.org/downloads/)
- **Node.js 18 or higher** - [Download here](https://nodejs.org/)
- **MongoDB** - [Download here](https://www.mongodb.com/try/download/community) OR use [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (free cloud option)

### Step 2: Start MongoDB

**Option A - Local MongoDB:**
```bash
# Start MongoDB service
# Windows: MongoDB should start automatically after installation
# Mac: brew services start mongodb-community
# Linux: sudo systemctl start mongod
```

**Option B - MongoDB Atlas (Cloud):**
1. Create free account at https://www.mongodb.com/cloud/atlas
2. Create a cluster
3. Get your connection string (looks like: `mongodb+srv://username:password@cluster.mongodb.net/`)

### Step 3: Setup Backend

```bash
# Navigate to backend folder
cd pixelcraft/backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install Python packages (this will take a few minutes)
pip install -r requirements.txt

# Create .env file
copy .env.example .env     # Windows
# OR
cp .env.example .env       # Mac/Linux

# Edit .env file and set your MongoDB URI
# If using local MongoDB, keep: MONGODB_URI=mongodb://localhost:27017
# If using MongoDB Atlas, use your connection string
```

### Step 4: Start Backend Server

```bash
# Make sure you're in pixelcraft/backend folder
# Make sure virtual environment is activated (you should see (venv) in terminal)
python run.py
```

You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
```

**Keep this terminal open!**

### Step 5: Setup Frontend (Open New Terminal)

```bash
# Navigate to frontend folder
cd pixelcraft/frontend

# Install Node packages
npm install

# Create .env file
copy .env.example .env     # Windows
# OR
cp .env.example .env       # Mac/Linux

# No need to edit .env - default settings work fine
```

### Step 6: Start Frontend Server

```bash
# Make sure you're in pixelcraft/frontend folder
npm run dev
```

You should see:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
```

### Step 7: Open in Browser

Open your browser and go to: **http://localhost:5173**

You should see the image editor! 🎉

---

## 🛑 Troubleshooting

### Backend won't start?
- Make sure MongoDB is running
- Check if port 8000 is already in use
- Make sure virtual environment is activated
- Try: `pip install -r requirements.txt` again

### Frontend won't start?
- Check if port 5173 is already in use
- Try deleting `node_modules` folder and run `npm install` again
- Make sure Node.js version is 18 or higher: `node --version`

### "Cannot connect to MongoDB" error?
- Check if MongoDB service is running
- Check your MONGODB_URI in backend/.env file
- If using MongoDB Atlas, make sure your IP is whitelisted

### AI features not working?
- AI models download automatically on first use
- First time will be slow (downloading models)
- Make sure you have enough disk space (~2-3 GB for models)

---

## 📁 Project Structure

```
pixelcraft/
├── backend/
│   ├── app/
│   │   ├── routers/          # API endpoints
│   │   ├── services/         # Business logic
│   │   ├── models/           # Database models
│   │   ├── utils/            # Utility functions
│   │   ├── data/             # Static data files
│   │   ├── config.py         # Configuration
│   │   ├── database.py       # MongoDB connection
│   │   └── main.py           # FastAPI app
│   ├── storage/              # File storage
│   │   ├── originals/        # Original uploads
│   │   ├── working/          # Current working images
│   │   ├── history/          # History snapshots
│   │   └── exports/          # Exported files
│   ├── requirements.txt      # Python dependencies
│   ├── render.yaml           # Render deployment config
│   └── run.py                # Entry point
├── frontend/
│   ├── src/
│   │   ├── components/       # React components
│   │   │   ├── canvas/       # Canvas-related components
│   │   │   ├── layout/       # Layout components
│   │   │   ├── panels/       # Tool panels
│   │   │   ├── modals/       # Modal dialogs
│   │   │   └── ui/           # UI primitives
│   │   ├── store/            # Zustand state management
│   │   ├── hooks/            # Custom React hooks
│   │   ├── api/              # API client
│   │   ├── utils/            # Utility functions
│   │   ├── types/            # TypeScript types
│   │   └── styles/           # Global styles
│   ├── package.json          # Node dependencies
│   ├── vite.config.ts        # Vite configuration
│   ├── vercel.json           # Vercel deployment config
│   └── tsconfig.json         # TypeScript configuration
└── README.md                 # This file
```

## 🛠️ Technology Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Zustand** - State management
- **Konva.js** - Canvas rendering
- **Tailwind CSS** - Styling
- **Axios** - HTTP client
- **React Hot Toast** - Notifications

### Backend
- **FastAPI** - Web framework
- **Python 3.11** - Programming language
- **Motor** - Async MongoDB driver
- **Pillow** - Image processing
- **OpenCV** - Computer vision
- **EasyOCR** - Text recognition
- **DeepFace** - Face analysis
- **rembg** - Background removal
- **PyTorch** - Deep learning
- **TensorFlow** - Deep learning

### Database
- **MongoDB** - Document database

## 🎯 API Endpoints

### Upload
- `POST /api/upload` - Upload image

### Editing
- `POST /api/crop` - Crop image
- `POST /api/zoom/in` - Zoom in
- `POST /api/zoom/out` - Zoom out
- `POST /api/enhance/brightness` - Adjust brightness
- `POST /api/enhance/contrast` - Adjust contrast
- `POST /api/enhance/sharpness` - Adjust sharpness
- `POST /api/enhance/noise-removal` - Remove noise
- `POST /api/enhance/saturation` - Adjust saturation
- `POST /api/enhance/hue-shift` - Shift hue
- `POST /api/enhance/edge-detection` - Detect edges
- `POST /api/enhance/region` - Enhance region
- `POST /api/filters/apply` - Apply filter

### AI Features
- `POST /api/ocr/extract` - Extract text (OCR)
- `POST /api/face/analyze` - Analyze faces
- `POST /api/background/remove` - Remove background
- `POST /api/objects/remove` - Remove object
- `POST /api/extend/image` - Extend image
- `POST /api/straighten/auto` - Auto-straighten

### Annotations
- `POST /api/annotations/add` - Add annotation
- `PUT /api/annotations/update` - Update annotation
- `DELETE /api/annotations/delete` - Delete annotation
- `POST /api/annotations/export` - Export annotations

### Analysis
- `POST /api/objects/count` - Count objects
- `POST /api/objects/pick-color` - Pick color

### Compression
- `POST /api/compress/jpeg` - JPEG compression
- `POST /api/compress/pca` - PCA compression
- `POST /api/compress/kmeans` - K-means compression

### Storage
- `POST /api/storage/export` - Export with options
- `POST /api/storage/export/zip` - Batch export
- `GET /api/storage/sessions/recent` - Get recent sessions
- `DELETE /api/storage/session/{id}` - Delete session
- `POST /api/storage/session/{id}/save-project` - Save project

### History
- `GET /api/history/{session_id}` - Get history
- `POST /api/history/restore` - Restore snapshot

### Health
- `GET /health` - Health check

## 🔧 Configuration

### Backend Environment Variables

```env
ENVIRONMENT=development
MONGODB_URI=mongodb://localhost:27017
DATABASE_NAME=pixelcraft
FRONTEND_URL=http://localhost:5173
MAX_FILE_SIZE=52428800
SESSION_RETENTION_DAYS=7
CLEANUP_INTERVAL_HOURS=1
```

### Frontend Environment Variables

```env
VITE_API_BASE_URL=http://localhost:8000
```

## 🚢 Deployment

### Backend (Render)

1. Push code to GitHub
2. Create new Web Service on Render
3. Connect repository
4. Use `pixelcraft/backend/render.yaml` configuration
5. Set environment variables in Render dashboard
6. Deploy

### Frontend (Vercel)

1. Push code to GitHub
2. Import project in Vercel
3. Set root directory to `pixelcraft/frontend`
4. Set environment variable `VITE_API_BASE_URL`
5. Deploy

## ⌨️ Keyboard Shortcuts

- `Ctrl+Z` - Undo
- `Ctrl+Shift+Z` - Redo
- `Ctrl+S` - Save
- `Ctrl+E` - Export
- `Ctrl+0` - Fit to screen
- `Ctrl+1` - Reset zoom
- `Ctrl++` - Zoom in
- `Ctrl+-` - Zoom out
- `?` - Show keyboard shortcuts

## 🎨 Design System

### Colors
- **Primary**: Blue (#3B82F6)
- **Secondary**: Purple (#8B5CF6)
- **Accent**: Pink (#EC4899)
- **Success**: Green (#10B981)
- **Warning**: Yellow (#F59E0B)
- **Error**: Red (#EF4444)

### Typography
- **Font**: Inter (system fallback)
- **Sizes**: 11px - 32px
- **Weights**: 400, 500, 600, 700

### Spacing
- **Base unit**: 4px
- **Scale**: 4, 8, 12, 16, 24, 32, 48, 64

## 📝 Notes

- First time running AI features (OCR, Face Analysis, Background Removal) will be slow as models download
- Models are stored locally - no API keys needed
- Sessions auto-delete after 7 days
- Maximum upload size: 50MB

---

## 📚 Additional Documentation

For more detailed guides, check the `.docs/` folder:
- **Installation Help** - Troubleshooting installation issues
- **Windows Setup** - Step-by-step Windows guide
- **Quick Start** - Fast reference guide
- **What to Expect** - Visual guide of the interface
- **Development Summaries** - Technical implementation details

---

## 📄 License

This project is open source and available for personal use.
