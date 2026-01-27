# Deployment Guide

## Option 1: Deploy to Render.com (Recommended - Free & Easy)

### Step 1: Prepare Your Repository

1. **Create a GitHub account** (if you don't have one): https://github.com
2. **Create a new repository**:
   - Go to https://github.com/new
   - Name it: `voice-chat-claude` (or any name you want)
   - Keep it **Public** (required for free tier)
   - Don't initialize with README (we already have files)
   - Click "Create repository"

3. **Push your code to GitHub**:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/voice-chat-claude.git
   git branch -M main
   git push -u origin main
   ```
   Replace `YOUR_USERNAME` with your GitHub username.

### Step 2: Deploy to Render

1. **Create a Render account**: https://render.com (sign up with GitHub)

2. **Create a new Web Service**:
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select the `voice-chat-claude` repository

3. **Configure the service**:
   - **Name**: `voice-chat-claude` (or any name)
   - **Region**: Choose closest to you
   - **Branch**: `main`
   - **Root Directory**: Leave blank
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Select "Free"

4. **Add Environment Variables**:
   - Click "Advanced" or go to "Environment" section
   - Add these variables:
     ```
     CLAUDE_API_KEY=your_actual_api_key_here
     NODE_ENV=production
     ```

5. **Click "Create Web Service"**

6. **Wait for deployment** (2-3 minutes)
   - Render will build and deploy your app
   - You'll get a URL like: `https://voice-chat-claude.onrender.com`

7. **Done!** 🎉 Your app is live on the web!

### Important Notes for Render:
- **Free tier sleeps after 15 minutes** of inactivity
- First request after sleep takes ~30 seconds to wake up
- Free tier gives you 750 hours/month (enough for personal use)
- Your app URL will be: `https://your-service-name.onrender.com`

---

## Option 2: Deploy to Railway.app (Alternative - Free Tier)

### Step 1: Push to GitHub (same as above)

### Step 2: Deploy to Railway

1. **Create account**: https://railway.app (sign up with GitHub)

2. **Create new project**:
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your `voice-chat-claude` repository

3. **Add Environment Variables**:
   - Click on your service
   - Go to "Variables" tab
   - Add:
     ```
     CLAUDE_API_KEY=your_actual_api_key_here
     NODE_ENV=production
     ```

4. **Generate Domain**:
   - Go to "Settings" tab
   - Click "Generate Domain"
   - You'll get a URL like: `https://voice-chat-claude.up.railway.app`

5. **Done!** 🎉

### Railway Notes:
- Free tier: $5 credit/month (resets monthly)
- No sleep time - always active
- Automatic SSL certificates

---

## Option 3: Deploy to Fly.io (Alternative - Free Tier)

### Prerequisites:
```bash
# Install flyctl
brew install flyctl  # macOS
# OR
curl -L https://fly.io/install.sh | sh  # Linux/WSL
```

### Deploy:
```bash
# Login
flyctl auth login

# Launch app (in your project directory)
flyctl launch

# Set environment variable
flyctl secrets set CLAUDE_API_KEY=your_actual_api_key_here

# Deploy
flyctl deploy
```

Your app will be at: `https://your-app-name.fly.dev`

---

## After Deployment - Testing

Once deployed, test your app:

1. ✅ Open the URL in **Chrome, Edge, or Safari**
2. ✅ Allow microphone permissions
3. ✅ Press SPACE or click button to start recording
4. ✅ Speak your message
5. ✅ Press again to stop and send
6. ✅ Listen to Claude's response

---

## Troubleshooting

### Issue: "Invalid API Key" error
- Check your environment variables in the hosting platform
- Make sure `CLAUDE_API_KEY` is set correctly
- Redeploy after changing environment variables

### Issue: Microphone not working
- Use HTTPS (hosting platforms provide this automatically)
- Use Chrome, Edge, or Safari (Firefox has limited support)
- Grant microphone permissions when prompted

### Issue: App is slow to respond
- Free tiers have limited resources
- First request after sleep (Render) takes longer
- Consider upgrading to paid tier for better performance

### Issue: Can't access the app
- Check deployment logs in your hosting dashboard
- Ensure all environment variables are set
- Make sure the app deployed successfully

---

## Cost Comparison

| Platform | Free Tier | Always On | Custom Domain | Best For |
|----------|-----------|-----------|---------------|----------|
| **Render** | ✅ 750hrs/month | ❌ Sleeps | ✅ Yes | Personal projects |
| **Railway** | ✅ $5/month | ✅ Yes | ✅ Yes | Active development |
| **Fly.io** | ✅ 3 VMs | ✅ Yes | ✅ Yes | Production apps |

---

## Updating Your Deployed App

After making changes locally:

```bash
# Commit changes
git add .
git commit -m "Your update message"

# Push to GitHub
git push origin main
```

Your hosting platform will **automatically redeploy** when you push to GitHub!

---

## Security Reminders

- ✅ Never commit your `.env` file (it's in `.gitignore`)
- ✅ Set `CLAUDE_API_KEY` only in hosting platform's environment variables
- ✅ Keep your API key secure and rotate it if exposed
- ✅ Monitor your Claude API usage at https://console.anthropic.com

---

## Need Help?

- **Render Docs**: https://render.com/docs
- **Railway Docs**: https://docs.railway.app
- **Fly.io Docs**: https://fly.io/docs
