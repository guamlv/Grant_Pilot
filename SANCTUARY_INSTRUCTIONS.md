
# Sanctuary Deployment Manifest

## Path A: Fresh Start Protocol
You have chosen the fresh start path. This archive contains your project files, sanitized of detected secrets.

### 1. Initialization
1. Unzip this folder to a NEW location on your machine.
2. Do not mix these files with your old folder.

### 2. Git Setup
Open your terminal in this new folder and run:
```bash
git init
git add .
git commit -m "Initial commit via Sanctuary"
```

### 3. Connect to GitHub
1. Create a NEW repository on GitHub (e.g., 'sanitized-grantpilot-ai-v1.2-v2').
2. Run the commands GitHub provides to push an existing repo:
```bash
git branch -M main
git remote add origin https://github.com/[YOUR_USERNAME]/[NEW_REPO_NAME].git
git push -u origin main
```

### 4. Deploy
Return to the Sanctuary interface and follow the specific deployment steps for vercel.
