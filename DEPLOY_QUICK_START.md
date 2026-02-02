# Quick Deploy Checklist

## Before You Deploy

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Ready for Vercel deployment"
   git push
   ```

## In Vercel Dashboard

1. **Import Project:**
   - Go to vercel.com → Add New → Project
   - Import your GitHub repo
   - Vercel auto-detects settings from `vercel.json`

2. **Add Environment Variables** (Settings → Environment Variables):
   ```
   MONGODB_URI=your-mongodb-connection-string
   JWT_SECRET=your-random-secret-key
   TMDB_API_KEY=your-tmdb-key
   ADMIN_PASSWORD=your-admin-password
   FRONTEND_URL=https://your-domain.com (or use preview URL first)
   GROQ_API_KEY=your-groq-key (optional)
   ```

3. **Deploy** - Click Deploy button

## Add Custom Domain

1. **In Vercel:** Settings → Domains → Add Domain → Enter your domain
2. **In GoDaddy:** DNS Management → Add records:
   - Type: `A`, Name: `@`, Value: `76.76.21.21` (check Vercel for current IP)
   - Type: `CNAME`, Name: `www`, Value: `cname.vercel-dns.com`
3. **Wait 5-60 minutes** for DNS propagation
4. **Update FRONTEND_URL** env var to your custom domain
5. **Redeploy** (or auto-redeploys)

## Verify

- Visit your domain
- Check `/api/health` endpoint
- Test login and features

See `VERCEL_DEPLOYMENT.md` for detailed instructions.
