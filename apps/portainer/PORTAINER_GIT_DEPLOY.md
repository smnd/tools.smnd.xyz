# Deploy from Git Repository (Recommended)

The easiest way to deploy Portainer Updater is to let Portainer pull directly from your Git repository. This means:

✅ No manual copy/paste of YAML
✅ One-click updates (just pull latest from git)
✅ Always in sync with repository
✅ Can track which commit is deployed

## Prerequisites

- Git repository with the code (you already have this!)
- Repository must be accessible (public or Portainer has credentials)
- `portainer-stack.yml` in the repository

## Deployment Steps

### Step 1: Prepare NAS Configuration

Still need to create the config directory on your NAS:

```bash
# SSH into your NAS
mkdir -p /volume2/docker/portainer-updater/data

# Create config.json (can't come from git because it has secrets)
nano /volume2/docker/portainer-updater/config.json
```

**config.json:**
```json
{
  "pin": "your-sha256-hash",
  "backend_url": "http://portainer-updater-backend:3000",
  "webhooks": [
    {
      "name": "Your Container",
      "type": "container",
      "image": "nginx:latest",
      "container_name": "nginx",
      "webhook_url": "https://portainer/api/webhooks/xxx"
    }
  ]
}
```

### Step 2: Build Docker Images

You still need to build images since they're not in a registry:

**Option A: Clone repo and build on NAS**
```bash
cd /volume2/docker/
git clone <your-repo-url> tools.smnd.xyz
cd tools.smnd.xyz
./apps/portainer/build-images.sh
```

**Option B: Build locally and push to registry** (see PORTAINER_DEPLOYMENT.md)

### Step 3: Deploy Stack from Git in Portainer

1. **Open Portainer** web UI
2. Navigate to **Stacks** in left sidebar
3. Click **+ Add stack**
4. **Name**: `portainer-updater`
5. **Build method**: Select **"Repository"** ⭐ (not "Web editor")

### Step 4: Configure Git Repository

Fill in the repository settings:

#### **Repository**

- **Repository URL**:
  ```
  https://github.com/your-username/tools.smnd.xyz
  ```
  Or for private repos:
  ```
  https://your-username:your-token@github.com/your-username/tools.smnd.xyz
  ```

- **Repository reference**:
  ```
  refs/heads/main
  ```
  (or `refs/heads/master` if using master branch)

- **Compose path**:
  ```
  apps/portainer/portainer-stack.yml
  ```

#### **Authentication** (if private repository)

For **public repositories**: Leave blank

For **private repositories**, choose one:

**Option 1: GitHub Personal Access Token**
- **Username**: Your GitHub username
- **Personal Access Token**: Generate at https://github.com/settings/tokens
  - Scopes needed: `repo` (full control of private repositories)

**Option 2: Deploy Key** (more secure)
- In Portainer, click **"Use a deploy key"**
- Copy the public key shown
- Add to GitHub: Repo → Settings → Deploy keys → Add deploy key
- Paste public key, check "Allow write access" if needed

**Option 3: SSH Key**
- Use SSH URL: `git@github.com:username/repo.git`
- Add your SSH private key in Portainer

#### **Environment Variables** (Optional)

Can add environment variables that override docker-compose values:
```
TZ=Asia/Singapore
```

#### **Automatic Updates** (Optional but Recommended!)

Enable **"Enable GitOps updates"**:
- **Polling interval**: `5m` (checks for git updates every 5 minutes)
- When enabled, Portainer will:
  - Poll your git repository
  - Detect changes to `portainer-stack.yml`
  - Automatically redeploy the stack
  - Super useful for updates!

### Step 5: Update Volume Paths

**Important**: Before deploying, you need to update paths in `portainer-stack.yml`

Since Portainer will use the file from git as-is, you have two options:

#### **Option A: Edit file in git** (Recommended)

1. Edit `apps/portainer/portainer-stack.yml` in your repo
2. Update volume paths:
   ```yaml
   volumes:
     - /volume2/docker/portainer-updater/data:/app/data
     - /volume2/docker/portainer-updater/config.json:/app/config.json:ro
   ```
3. Commit and push:
   ```bash
   git add apps/portainer/portainer-stack.yml
   git commit -m "chore: update volume paths for NAS"
   git push
   ```

#### **Option B: Use environment variables**

In Portainer's "Environment variables" section when deploying:
```
CONFIG_PATH=/volume2/docker/portainer-updater/config.json
DATA_PATH=/volume2/docker/portainer-updater/data
```

Then modify `portainer-stack.yml` to use these:
```yaml
volumes:
  - ${DATA_PATH}:/app/data
  - ${CONFIG_PATH}:/app/config.json:ro
```

### Step 6: Deploy!

1. Review all settings
2. Click **"Deploy the stack"**
3. Portainer will:
   - Clone the repository
   - Read `apps/portainer/portainer-stack.yml`
   - Deploy the stack

Watch the deployment in real-time!

### Step 7: Verify Deployment

Same as before:
- Check containers are running: **Containers** view
- Test web UI: `http://nas-ip:7890`
- Check backend health: Container console → `curl http://localhost:3000/health`

## Updating the Stack

This is where git deployment shines! ✨

### Manual Update (Pull Latest Changes)

When you make changes to the code:

1. Push changes to git
2. In Portainer: **Stacks** → `portainer-updater`
3. Click **"Pull and redeploy"** button
4. Portainer will:
   - Pull latest from git
   - Rebuild/restart containers
   - Done!

### Automatic Updates (GitOps)

If you enabled GitOps:
- Just push to git
- Wait up to polling interval (5 min)
- Portainer automatically redeploys
- No manual intervention needed!

## Advantages of Git Deployment

### ✅ Easier Updates
```bash
# Make changes locally
vim apps/portainer/portainer-stack.yml

# Commit and push
git add .
git commit -m "Update configuration"
git push

# In Portainer: Click "Pull and redeploy"
# Done!
```

vs. Manual method:
```
# Copy entire YAML file
# Open Portainer
# Navigate to stack
# Click Editor
# Paste new YAML
# Click Update
```

### ✅ Version Control
- See exactly which commit is deployed
- Roll back to previous version easily
- Track all changes in git history

### ✅ Multi-Environment
Deploy same stack to multiple Portainer instances:
- Dev NAS
- Production NAS
- Friend's NAS

All using the same git repo!

### ✅ Consistency
- No copy/paste errors
- No YAML formatting issues
- Single source of truth

## Managing Secrets

**Don't commit secrets to git!**

Your `config.json` has sensitive data:
- Webhook URLs (contain auth tokens)
- PIN hash

**Best practice:**

1. **Keep config.json on NAS only** (not in git)
   ```bash
   # In .gitignore:
   apps/portainer/config.json
   ```

2. **Use example file in git**
   ```bash
   # Committed:
   apps/portainer/config.example.json

   # Not committed:
   apps/portainer/config.json
   ```

3. **Mount actual config from NAS**
   ```yaml
   volumes:
     - /volume2/docker/portainer-updater/config.json:/app/config.json:ro
   ```

## Example Workflow

### Initial Setup
```bash
# 1. Clone repo on NAS
cd /volume2/docker/
git clone https://github.com/you/tools.smnd.xyz

# 2. Build images
cd tools.smnd.xyz
./apps/portainer/build-images.sh

# 3. Create config (not in git)
mkdir -p /volume2/docker/portainer-updater/data
cp apps/portainer/config.example.json /volume2/docker/portainer-updater/config.json
nano /volume2/docker/portainer-updater/config.json

# 4. Deploy stack in Portainer from git
# (Use Portainer UI, Repository method)
```

### Making Updates
```bash
# On your local machine
cd ~/projects/tools.smnd.xyz

# Make changes
vim apps/portainer/portainer-stack.yml

# Commit and push
git add apps/portainer/portainer-stack.yml
git commit -m "Update port to 8080"
git push

# In Portainer: Click "Pull and redeploy"
# Done!
```

## Troubleshooting

### "Repository authentication failed"

**For public repos:**
- Don't fill in username/password
- Leave authentication blank

**For private repos:**
- Check token has `repo` scope
- Try SSH URL instead: `git@github.com:user/repo.git`

### "Compose file not found"

**Check path is correct:**
```
apps/portainer/portainer-stack.yml
```
Not:
```
/apps/portainer/portainer-stack.yml  ❌ (no leading slash)
portainer-stack.yml  ❌ (wrong path)
```

**Check file exists in branch:**
```bash
git ls-tree -r main --name-only | grep portainer-stack.yml
```

### "Pull and redeploy" doesn't update

**Possible causes:**
1. Changes not pushed to git
   ```bash
   git push  # Make sure you pushed!
   ```

2. Portainer cached the repo
   - Wait a minute and try again
   - Or stop/remove stack and redeploy

3. Using wrong branch
   - Check "Repository reference" is correct
   - Should be `refs/heads/main`

### GitOps not auto-updating

**Check settings:**
- "Enable GitOps updates" is toggled ON
- Polling interval is set (e.g., `5m`)
- Check Portainer logs for git polling errors

**Verify repository is accessible:**
- Test authentication
- Check repository URL is correct

## Advanced: Using Git Tags/Releases

Deploy specific versions using tags:

1. **Tag a release:**
   ```bash
   git tag -a v1.0.0 -m "Release v1.0.0"
   git push origin v1.0.0
   ```

2. **In Portainer, set Repository reference:**
   ```
   refs/tags/v1.0.0
   ```

3. **To update to new version:**
   - Change reference to `refs/tags/v1.1.0`
   - Click "Update the stack"

This gives you:
- Versioned deployments
- Easy rollbacks
- Production stability

## Recommended Setup

For most users:

```
Repository URL: https://github.com/you/tools.smnd.xyz
Repository reference: refs/heads/main
Compose path: apps/portainer/portainer-stack.yml
Authentication: Personal Access Token (if private)
GitOps: Enabled with 5m polling
```

This gives you:
- ✅ Easy deployment
- ✅ Automatic updates
- ✅ Version control
- ✅ No manual YAML editing

## Comparison: Git vs Manual

| Feature | Git Method | Web Editor |
|---------|-----------|------------|
| Initial setup | Same | Same |
| Deployment | Pull from git | Copy/paste YAML |
| Updates | One click | Edit YAML manually |
| Auto-updates | Yes (GitOps) | No |
| Version control | Yes | No |
| Rollback | Easy (change ref) | Manual |
| Multi-instance | Easy | Repeat per instance |
| Errors | Less likely | Copy/paste errors |

**Winner:** Git method! 🏆

## Next Steps

1. ✅ Push your repo to GitHub (already done!)
2. ✅ Build images on NAS
3. ✅ Create config.json on NAS
4. ✅ Deploy stack from git in Portainer
5. 🔄 Enable GitOps for automatic updates
6. 🎉 Enjoy easy updates!

---

**Pro tip:** Enable GitOps and you'll never manually update the stack again. Just push to git and Portainer handles the rest! 🚀
