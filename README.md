# Canton IDE - Browser-Based DAML Development

Build Canton Network applications directly in your browser with instant build and test feedback using DPM (Digital Asset Package Manager).

![Canton IDE](https://img.shields.io/badge/Canton-IDE-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## 🚀 Features

- ✅ **Monaco Editor** - VS Code's editor in the browser
- ✅ **Instant Build & Test** - Run `dpm build` and `dpm test` in-browser
- ✅ **Pre-built Templates** - Token, NFT, and more
- ✅ **Zero Setup** - No local installation required
- ✅ **Syntax Highlighting** - DAML code highlighting
- ✅ **Download Projects** - Export your code anytime

## 🏗️ Architecture

### Frontend (Vercel - Free)
- React + Monaco Editor
- Hosted on Vercel free tier
- **Cost: $0/month**

### Backend (Railway - Free Tier)
- Node.js + Express
- Docker container with DPM pre-installed
- Executes `dpm build` and `dpm test`
- **Cost: $5 free credit/month (~500 builds)**

## 📦 Project Structure

```
canton-ide/
├── frontend/              # React app with Monaco Editor
│   ├── src/
│   │   ├── App.js        # Main IDE component
│   │   └── App.css       # VS Code-style theming
│   ├── package.json
│   └── .env.example
│
├── backend/               # Node.js API server
│   ├── server.js         # Express server with DPM execution
│   ├── Dockerfile        # Docker image with DPM installed
│   ├── package.json
│   └── .env.example
│
├── vercel.json           # Frontend deployment config
└── README.md             # This file
```

## 🚀 Quick Start

### Local Development

#### 1. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Build Docker image
docker build -t canton-ide-backend .

# Run container
docker run -p 3001:3001 canton-ide-backend

# OR run without Docker (requires DPM installed locally)
npm start
```

#### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Start development server
npm start
```

Open http://localhost:3000

## 🌐 Deployment

### Deploy Backend to Railway

1. Go to [Railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Set root directory to `/backend`
5. Railway will auto-detect Dockerfile
6. Deploy! (takes ~2-3 minutes)
7. Copy your Railway URL (e.g., `https://your-app.railway.app`)

**Cost:** First $5/month free (~500 builds)

### Deploy Frontend to Vercel

1. Go to [Vercel.com](https://vercel.com)
2. Click "New Project" → Import your GitHub repo
3. Vercel will auto-detect React
4. Add environment variable:
   - Key: `REACT_APP_API_URL`
   - Value: Your Railway backend URL
5. Deploy! (takes ~1-2 minutes)

**Cost:** $0 (free tier)

## 🎯 Usage

1. Open Canton IDE in your browser
2. Select a template (Token, NFT, etc.)
3. Edit the DAML code in Monaco Editor
4. Click **Build** to compile with DPM
5. Click **Test** to run test scripts
6. Click **Download** to export your project

## 📝 Available Templates

### Basic Token
Simple fungible token with transfer functionality

### Simple NFT
Basic NFT implementation with metadata

### More Coming Soon!
- DEX / AMM
- Lending Protocol
- DAO Governance

## 🔧 Tech Stack

**Frontend:**
- React 18
- Monaco Editor (VS Code editor)
- Axios for API calls
- React Icons

**Backend:**
- Node.js + Express
- Docker with DPM pre-installed
- Rate limiting (10 builds per 10 min)
- Auto-cleanup of temp files

## 💰 Cost Analysis

### Railway Free Tier
- $5 credit/month
- ~$0.01 per build (10 seconds)
- **= ~500 builds/month FREE**

### After Free Tier
- $10/month = 1000 builds
- $20/month = 2000 builds
- **Totally sustainable for beta!**

## 🐛 Troubleshooting

### Backend not responding?
```bash
# Check Docker container logs
docker logs <container-id>

# Verify DPM is installed
docker exec -it <container-id> dpm version --active
```

### Build failing?
- Check DAML syntax errors
- Ensure `daml.yaml` is properly configured
- Verify SDK version compatibility

### Frontend can't connect to backend?
- Check REACT_APP_API_URL in `.env`
- Ensure backend is running
- Check CORS settings in `backend/server.js`

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch
3. Make your changes
4. Test locally
5. Submit a PR!

## 📄 License

MIT License - see LICENSE file

## 🙏 Acknowledgments

- Built for Canton Network by Canton Foundation
- Powered by Digital Asset's DPM
- Monaco Editor by Microsoft

---

**Ready to build on Canton? Try it now! 🚀**

Website: [canton.foundation](https://canton.foundation)  
Docs: [docs.canton.network](https://docs.canton.network)  
Discord: [Join our community](https://discord.gg/canton)
