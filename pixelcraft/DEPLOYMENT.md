# Deployment Guide 🚀

This application is **100% deployable** to cloud platforms. You don't need to run it locally!

---

## 🎯 Quick Deploy Options

### Option 1: Railway (Easiest - Free Tier)
**Best for:** Quick deployment, no credit card needed
**Time:** 10 minutes
**Cost:** Free (500 hours/month)

### Option 2: Render (Good Free Tier)
**Best for:** Reliable hosting
**Time:** 15 minutes
**Cost:** Free tier available

### Option 3: Docker (Any VPS)
**Best for:** Full control
**Time:** 20 minutes
**Cost:** Depends on VPS provider

---

## 🚂 Option 1: Deploy to Railway (EASIEST)

Railway provides free hosting with MongoDB included!

### Step 1: Create Railway Account
1. Go to https://railway.app/
2. Sign up with GitHub (free)
3. No credit card required!

### Step 2: Deploy Backend

1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Connect your GitHub account
4. Select your repository
5. Railway will auto-detect it's a Python app
6. Add these environment variables:
   ```
   MONGODB_URI=mongodb://mongo:27017
   DATABASE_NAME=pixelcraft
   ENVIRONMENT=production
   FRONTEND_URL=https://your-frontend-url.railway.app
   ```

### Step 3: Add MongoDB

1. In your project, click "New"
2. Select "Database" → "MongoDB"
3. Railway will create a MongoDB instance
4. Copy the connection string
5. Update backend's `MONGODB_URI` with the connection string

### Step 4: Deploy Frontend

1. Click "New" → "GitHub Repo"
2. Select your repository again
3. Set root directory to `frontend`
4. Add environment variable:
   ```
   VITE_API_BASE_URL=https://your-backend-url.railway.app
   ```

### Step 5: Done! 🎉

Railway will give you URLs like:
- Backend: `https://your-app-backend.railway.app`
- Frontend: `https://your-app-frontend.railway.app`

Visit the frontend URL and start using your app!

---

## 🎨 Option 2: Deploy to Render

Render offers free tier with automatic deployments.

### Step 1: Create Render Account
1. Go to https://render.com/
2. Sign up with GitHub (free)

### Step 2: Deploy MongoDB
1. Click "New +" → "MongoDB"
2. Choose free tier
3. Copy the connection string

### Step 3: Deploy Backend

1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Settings:
   - **Name:** image-editor-backend
   - **Root Directory:** `backend`
   - **Environment:** Python 3
   - **Build Command:** `pip install -r requirements-no-ai.txt`
   - **Start Command:** `python run.py`
   - **Plan:** Free

4. Add environment variables:
   ```
   MONGODB_URI=<your-mongodb-connection-string>
   DATABASE_NAME=pixelcraft
   ENVIRONMENT=production
   FRONTEND_URL=https://your-frontend.onrender.com
   ```

### Step 4: Deploy Frontend

1. Click "New +" → "Static Site"
2. Connect your GitHub repository
3. Settings:
   - **Name:** image-editor-frontend
   - **Root Directory:** `frontend`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`

4. Add environment variable:
   ```
   VITE_API_BASE_URL=https://your-backend.onrender.com
   ```

### Step 5: Done! 🎉

Your app will be live at:
- Frontend: `https://your-frontend.onrender.com`

**Note:** Free tier sleeps after 15 minutes of inactivity. First request takes ~30 seconds to wake up.

---

## 🐳 Option 3: Deploy with Docker (Any VPS)

If you have a VPS (DigitalOcean, AWS, etc.), use Docker.

### Prerequisites
- A VPS with Docker installed
- Domain name (optional)

### Step 1: Clone Repository on VPS

```bash
ssh user@your-vps-ip
git clone https://github.com/yourusername/your-repo.git
cd your-repo/pixelcraft
```

### Step 2: Configure Environment

```bash
# Backend
cd backend
cp .env.example .env
nano .env  # Edit with your settings

# Frontend
cd ../frontend
cp .env.example .env
nano .env  # Edit with your settings
```

### Step 3: Deploy with Docker Compose

```bash
cd ..  # Back to pixelcraft root
docker-compose up -d
```

This will start:
- MongoDB on port 27017
- Backend on port 8000
- Frontend on port 3000

### Step 4: Access Your App

Visit: `http://your-vps-ip:3000`

### Step 5: (Optional) Setup Domain & SSL

Use Nginx reverse proxy with Let's Encrypt for HTTPS.

---

## 🌐 Option 4: Vercel (Frontend) + Railway (Backend)

Best of both worlds!

### Frontend on Vercel (Free)

1. Go to https://vercel.com/
2. Import your GitHub repository
3. Settings:
   - **Root Directory:** `frontend`
   - **Framework:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Add environment variable:
   ```
   VITE_API_BASE_URL=https://your-backend.railway.app
   ```

### Backend on Railway (Free)

Follow Railway steps above for backend + MongoDB.

---

## 📊 Comparison

| Platform | Cost | Ease | Speed | Limits |
|----------|------|------|-------|--------|
| **Railway** | Free | ⭐⭐⭐⭐⭐ | Fast | 500 hrs/month |
| **Render** | Free | ⭐⭐⭐⭐ | Slow start | Sleeps after 15min |
| **Docker VPS** | $5-10/mo | ⭐⭐⭐ | Fast | None |
| **Vercel + Railway** | Free | ⭐⭐⭐⭐ | Fast | Combined limits |

---

## 🎯 Recommended for You

**If you want the easiest deployment:**
→ Use **Railway** (Option 1)

**If you want the fastest performance:**
→ Use **Vercel + Railway** (Option 4)

**If you want full control:**
→ Use **Docker on VPS** (Option 3)

---

## ⚠️ Important Notes

### AI Features
The free deployments use `requirements-no-ai.txt` which excludes:
- OCR (text recognition)
- Face Analysis
- Background Removal

**Why?** AI packages are 4GB+ and exceed free tier limits.

**All other features work perfectly:**
- ✅ Crop, Zoom, Rotate
- ✅ All 12 filters
- ✅ Enhance (brightness, contrast, etc.)
- ✅ Annotations
- ✅ Color picker
- ✅ Compression
- ✅ Export

### To Enable AI Features
You need a paid plan with more resources:
- Railway Pro: $5/month
- Render Standard: $7/month
- VPS with 4GB+ RAM: $10-20/month

Then change Dockerfile to use `requirements.txt` instead of `requirements-no-ai.txt`.

---

## 🔧 Troubleshooting

### Backend won't start
- Check MongoDB connection string
- Check environment variables
- Check logs in platform dashboard

### Frontend can't connect to backend
- Check `VITE_API_BASE_URL` is correct
- Check backend is running
- Check CORS settings in backend

### "Out of memory" error
- You're trying to use AI features on free tier
- Use `requirements-no-ai.txt` instead
- Or upgrade to paid plan

---

## 📝 Post-Deployment Checklist

- [ ] Backend is running and accessible
- [ ] Frontend is running and accessible
- [ ] MongoDB is connected
- [ ] Can upload an image
- [ ] Can apply filters
- [ ] Can export image
- [ ] Environment variables are set correctly

---

## 🎉 Success!

Once deployed, share your app URL with anyone! They can use it without installing anything.

**Example URLs:**
- `https://image-editor.railway.app`
- `https://image-editor.onrender.com`
- `https://image-editor.vercel.app`

No Node.js, Python, or MongoDB needed on their end - it's all in the cloud! 🚀
