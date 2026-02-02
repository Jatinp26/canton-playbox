# 🚀 DEPLOYMENT GUIDE - Canton IDE

Complete step-by-step guide to deploy Canton IDE to production.

## Prerequisites

- GitHub account
- Railway account (sign up at railway.app)
- Vercel account (sign up at vercel.com)
- Your canton-ide repository pushed to GitHub

---

## PART 1: Deploy Backend to Railway (5 minutes)

### Step 1: Create Railway Account

1. Go to [railway.app](https://railway.app)
2. Click "Login" → Sign in with GitHub
3. Authorize Railway to access your GitHub repos

### Step 2: Create New Project

1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose your `canton-ide` repository
4. Railway will detect your repo

### Step 3: Configure Backend Deployment

1. Railway auto-detects Dockerfile in `/backend`
2. Set root directory: `/backend`
3. Railway will automatically:
   - Build Docker image
   - Install DPM inside container
   - Deploy to a URL

### Step 4: Wait for Deployment

- Takes 2-5 minutes first time (building Docker image)
- You'll see build logs in real-time
- Once complete, Railway gives you a URL like:
  ```
  https://canton-ide-backend-production-xxxx.up.railway.app
  ```

### Step 5: Copy Backend URL

1. Click on your deployment
2. Go to "Settings" tab
3. Copy the "Public URL"
4. Save this - you'll need it for frontend!

### Step 6: Verify Backend Works

Test your backend:
```bash
# Replace with your Railway URL
curl https://your-backend.railway.app/health

# Should return:
# {"status":"ok","message":"Canton IDE Backend is running"}
```

**✅ Backend deployed! Cost: $0 (using free $5 credit)**

---

## PART 2: Deploy Frontend to Vercel (3 minutes)

### Step 1: Create Vercel Account

1. Go to [vercel.com](https://vercel.com)
2. Click "Sign Up" → Sign in with GitHub
3. Authorize Vercel

### Step 2: Import Project

1. Click "New Project"
2. Import your `canton-ide` GitHub repository
3. Vercel will detect React app

### Step 3: Configure Build Settings

Vercel auto-detects everything, but verify:

**Framework Preset:** Create React App  
**Root Directory:** `frontend`  
**Build Command:** `npm run build`  
**Output Directory:** `build`  

### Step 4: Add Environment Variable

THIS IS CRITICAL:

1. Go to "Environment Variables" section
2. Add variable:
   - **Name:** `REACT_APP_API_URL`
   - **Value:** Your Railway backend URL (from Part 1, Step 5)
   - **Example:** `https://canton-ide-backend-production-xxxx.up.railway.app`
3. Click "Add"

### Step 5: Deploy!

1. Click "Deploy"
2. Wait 1-2 minutes
3. Vercel gives you a URL like:
   ```
   https://canton-ide.vercel.app
   ```

### Step 6: Test Your IDE!

1. Visit your Vercel URL
2. You should see the Canton IDE interface
3. Try loading a template
4. Click "Build" to test backend connection
5. Should see build output! ✅

**✅ Frontend deployed! Cost: $0 (Vercel free tier)**

---

## PART 3: Post-Deployment Setup

### Update CORS (If Needed)

If you get CORS errors, update `backend/server.js`:

```javascript
app.use(cors({
  origin: 'https://your-frontend.vercel.app',
  credentials: true
}));
```

Then redeploy backend on Railway.

### Add Custom Domain (Optional)

**For Frontend (Vercel):**
1. Go to Vercel dashboard → Your project
2. Settings → Domains
3. Add `playground.canton.foundation`
4. Follow Vercel's DNS instructions

**For Backend (Railway):**
1. Railway dashboard → Your project
2. Settings → Public Networking
3. Add custom domain
4. Update DNS records

---

## PART 4: Monitoring & Costs

### Railway Monitoring

**Dashboard:** https://railway.app/dashboard

**What to monitor:**
- Usage hours (free: $5 credit/month)
- Build count
- Memory usage
- API response times

**Free Tier Limits:**
- $5 credit = ~500 builds
- After that: ~$0.01 per build
- Estimate: 1000 builds = $10/month

### Vercel Monitoring

**Dashboard:** https://vercel.com/dashboard

**What to monitor:**
- Bandwidth usage
- Build minutes
- Serverless function invocations

**Free Tier Limits:**
- 100GB bandwidth/month
- 100 builds/month
- More than enough for beta!

---

## PART 5: Updating Your App

### Update Frontend

```bash
# Make changes locally
cd frontend
# Edit files...

# Push to GitHub
git add .
git commit -m "Update frontend"
git push

# Vercel auto-deploys! (takes 1-2 min)
```

### Update Backend

```bash
# Make changes locally
cd backend
# Edit files...

# Push to GitHub
git add .
git commit -m "Update backend"
git push

# Railway auto-deploys! (takes 2-5 min)
```

**Both platforms have CI/CD built-in!**

---

## PART 6: Testing Checklist

After deployment, test these:

- [ ] Homepage loads
- [ ] Template dropdown works
- [ ] Can select different templates
- [ ] Monaco Editor displays code
- [ ] Can edit code
- [ ] Build button works (check output)
- [ ] Test button works (check output)
- [ ] Download button works
- [ ] File switching works
- [ ] No console errors

---

## PART 7: Troubleshooting

### "Failed to build"

**Frontend:**
- Check build logs in Vercel dashboard
- Verify `REACT_APP_API_URL` is set correctly
- Ensure all dependencies in `package.json`

**Backend:**
- Check Railway build logs
- Verify Dockerfile syntax
- Ensure DPM install succeeds

### "Cannot connect to backend"

1. Check backend URL is correct in Vercel env vars
2. Test backend directly: `curl https://your-backend.railway.app/health`
3. Check CORS settings
4. Verify backend is running (Railway dashboard)

### "Build failed" (when clicking Build)

1. Check backend logs in Railway
2. Verify DPM is installed: `docker exec <container> dpm version --active`
3. Test DAML syntax locally first
4. Check rate limiting (10 builds per 10 min)

---

## PART 8: Going Live

### Before Announcing:

1. ✅ Both frontend and backend deployed
2. ✅ All features tested
3. ✅ Custom domain set up (optional)
4. ✅ Monitoring dashboards checked
5. ✅ README updated with live URL

### Launch Checklist:

- [ ] Tweet from Canton Foundation account
- [ ] Post in Discord #announcements
- [ ] Add to canton.foundation website
- [ ] Update docs.canton.network
- [ ] Email developer mailing list
- [ ] Submit to ProductHunt (optional)

---

## Cost Summary

| Service | Free Tier | After Free Tier |
|---------|-----------|-----------------|
| **Vercel (Frontend)** | Free forever | Free forever |
| **Railway (Backend)** | $5 credit/month | $10-20/month |
| **Total** | **$0/month** | **$10-20/month** |

**For 500-1000 builds/month at ETHDenver: Totally free! 🎉**

---

## Need Help?

- Railway Docs: https://docs.railway.app
- Vercel Docs: https://vercel.com/docs
- Canton Discord: https://discord.gg/canton
- Canton Foundation: developers@canton.foundation

---

## Next Steps

You're deployed! Now:

1. Test everything thoroughly
2. Share with 2-3 trusted devs for feedback
3. Fix any issues
4. Announce to the world! 🚀

**Ready to ship? Let's go!** 🎉
