# Canton Playbox
Build Canton Network applications directly in your browser with instant build and test feedback using DPM (Digital Asset Package Manager).

## Architecture

### Frontend (Vercel - Free)
- React + Monaco Editor
- Hosted on Vercel

### Backend (Railway)
- Node.js + Express
- Docker container with DPM pre-installed
- Executes `dpm build` and `dpm test`

## Usage

1. Open Canton IDE in your browser
2. Select a template (Token, NFT, etc.)
3. Edit the DAML code in Monaco Editor
4. Click **Build** to compile with DPM
5. Click **Test** to run test scripts
6. Click **Download** to export your project

## Contributing

1. Fork the repo
2. Create a feature branch
3. Make your changes
4. Test locally
5. Submit a PR!

**Ready to build on Canton? Try it now!**
Website: [canton.foundation](https://canton.foundation)  
Docs: [docs.canton.network](https://docs.canton.network)  