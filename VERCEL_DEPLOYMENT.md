# Vercel Deployment Guide

## Step-by-Step Deployment Instructions

### 1. Push Your Code to GitHub

```bash
# Make sure all changes are committed
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

### 2. Import Project in Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository (`movie-night`)
4. Vercel will auto-detect settings from `vercel.json`

### 3. Configure Environment Variables

In Vercel dashboard → Your Project → **Settings** → **Environment Variables**, add:

#### Required Variables:

```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/movie-night?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
TMDB_API_KEY=your-tmdb-api-key
ADMIN_PASSWORD=your-secure-admin-password
FRONTEND_URL=https://your-domain.com
```

#### Optional Variables:

```
GROQ_API_KEY=your-groq-api-key (for AI recommendations)
OPENAI_API_KEY=your-openai-api-key (if using OpenAI)
```

**Important:** 
- Set `FRONTEND_URL` to your custom domain (e.g., `https://yourdomain.com`)
- For now, you can use the Vercel preview URL temporarily, then update after adding custom domain
- Make sure to add these for **Production**, **Preview**, and **Development** environments

### 4. Configure Build Settings

Vercel should auto-detect from `vercel.json`, but verify:

- **Root Directory:** Leave as root (`.`)
- **Build Command:** `cd frontend && npm install && npm run build`
- **Output Directory:** `frontend/dist`
- **Install Command:** `npm run install:all`

### 5. Deploy

1. Click **"Deploy"**
2. Wait for build to complete (usually 2-5 minutes)
3. Your app will be live at `your-project.vercel.app`

### 6. Add Custom Domain (GoDaddy)

#### In Vercel Dashboard:

1. Go to **Settings** → **Domains**
2. Click **"Add Domain"**
3. Enter your domain (e.g., `yourdomain.com` or `www.yourdomain.com`)
4. Vercel will show you DNS records to add

#### In GoDaddy:

1. Log into GoDaddy
2. Go to **My Products** → **DNS** (or **Domain Manager**)
3. Add/Update these DNS records:

**For apex domain (yourdomain.com):**
- Type: `A`
- Name: `@`
- Value: `76.76.21.21` (Vercel's IP - check Vercel dashboard for current IP)

**For www subdomain (www.yourdomain.com):**
- Type: `CNAME`
- Name: `www`
- Value: `cname.vercel-dns.com` (or what Vercel shows)

**Alternative (easier):**
- Type: `CNAME`
- Name: `@`
- Value: `cname.vercel-dns.com` (if GoDaddy supports CNAME flattening)

4. Save changes
5. Wait 5-60 minutes for DNS propagation

### 7. Update Environment Variables

After your domain is connected:

1. Go to **Settings** → **Environment Variables**
2. Update `FRONTEND_URL` to `https://yourdomain.com`
3. Redeploy (or wait for auto-redeploy)

### 8. Verify Deployment

- Visit your custom domain
- Check API endpoints: `https://yourdomain.com/api/health`
- Test login and features

## Troubleshooting

### Build Fails

- Check that all dependencies are in `package.json`
- Verify `npm run install:all` works locally
- Check build logs in Vercel dashboard

### API Routes Not Working

- Verify `api/index.ts` exists
- Check that routes are prefixed with `/api`
- Verify environment variables are set correctly

### CORS Errors

- Make sure `FRONTEND_URL` matches your actual domain (no trailing slash)
- Check that CORS middleware is configured correctly in `api/index.ts`

### MongoDB Connection Issues

- Verify `MONGODB_URI` is correct
- In MongoDB Atlas, whitelist `0.0.0.0/0` (all IPs) for Vercel
- Check MongoDB connection logs in Vercel function logs

### Domain Not Connecting

- Wait up to 24 hours for DNS propagation (usually 5-60 minutes)
- Verify DNS records match exactly what Vercel shows
- Use `dig yourdomain.com` or `nslookup yourdomain.com` to check DNS

## Post-Deployment Checklist

- [ ] Custom domain is connected and working
- [ ] HTTPS is enabled (automatic with Vercel)
- [ ] All environment variables are set
- [ ] API endpoints are responding
- [ ] Frontend can communicate with backend
- [ ] MongoDB connection is working
- [ ] User authentication works
- [ ] Admin features work

## Cost

- **Free tier:** $0/month (includes custom domains)
- **Pro tier:** $20/month (if you exceed free tier limits)

Your app should work fine on the free tier unless you have high traffic.
