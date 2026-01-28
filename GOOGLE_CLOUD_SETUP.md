# Google Cloud Text-to-Speech Setup

Follow these steps to set up Google Cloud TTS for native Russian pronunciation:

## Step 1: Create a Google Cloud Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in or create a free account
3. Google provides **$300 free credit** for new users

## Step 2: Create a New Project

1. In the Google Cloud Console, click the project dropdown at the top
2. Click "New Project"
3. Name it (e.g., "voice-app")
4. Click "Create"

## Step 3: Enable Text-to-Speech API

1. In the search bar, type "Text-to-Speech API"
2. Click on "Cloud Text-to-Speech API"
3. Click "Enable"

## Step 4: Create Service Account Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click **"+ CREATE CREDENTIALS"** at the top
3. Select **"Service Account"**
4. Fill in:
   - Service account name: `voice-app-tts`
   - Service account ID: (auto-filled)
   - Click **"Create and Continue"**
5. Grant access:
   - Select role: **"Cloud Text-to-Speech User"**
   - Click **"Continue"**
   - Click **"Done"**

## Step 5: Download JSON Key

1. Click on the service account you just created
2. Go to the **"Keys"** tab
3. Click **"Add Key"** > **"Create new key"**
4. Choose **"JSON"**
5. Click **"Create"**
6. A JSON file will be downloaded to your computer

## Step 6: Add Credentials to Your App

You have two options:

### Option A: Put JSON content in .env file (Easier)

1. Open the downloaded JSON file in a text editor
2. Copy the entire JSON content (it's one long line)
3. Open your `.env` file
4. Add this line:
   ```
   GOOGLE_CLOUD_CREDENTIALS={"type":"service_account","project_id":"...paste the entire JSON here..."}
   ```
   Make sure it's all on one line with no line breaks!

### Option B: Use JSON file path (Alternative)

1. Move the downloaded JSON file to your project folder (e.g., `my-ai-app/google-credentials.json`)
2. Add to `.gitignore`: `google-credentials.json`
3. Open your `.env` file
4. Add this line:
   ```
   GOOGLE_APPLICATION_CREDENTIALS=./google-credentials.json
   ```

## Step 7: Test It

1. Restart your server
2. Speak in Russian
3. You should hear native Russian pronunciation!

## Pricing

- **Free tier:** 0-1 million characters per month: **FREE**
- After that: $4 per 1 million characters (~$0.004 per 1K characters)
- Much cheaper than OpenAI TTS!

## Troubleshooting

If you see errors:
- Make sure the Text-to-Speech API is enabled
- Check that your JSON credentials are valid
- Verify the service account has "Cloud Text-to-Speech User" role
- Make sure there are no line breaks in the GOOGLE_CLOUD_CREDENTIALS value
