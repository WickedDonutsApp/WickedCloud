# Push Backend to GitHub

## Step 1: Initialize Git (if not already done)
```bash
cd /Users/mightybear/Desktop/WeareWicked/backend
git init
```

## Step 2: Add All Backend Files
```bash
git add .
```

## Step 3: Commit
```bash
git commit -m "Initial backend deployment"
```

## Step 4: Add Remote Repository
```bash
git remote add origin https://github.com/WickedDonutsApp/WickedCloud.git
```

## Step 5: Push to GitHub
```bash
git branch -M main
git push -u origin main
```

## After Pushing:
1. Go back to Railway
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose "WickedCloud" repository
5. Railway will deploy your backend

