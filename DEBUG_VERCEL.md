# Debugging Vercel Deployment

## Check Vercel Function Logs

1. Go to your Vercel dashboard
2. Select your project
3. Go to **Deployments** → Click on the latest deployment
4. Go to **Functions** tab
5. Click on `/api` function
6. Check **Logs** tab for errors

## Common Issues

### 1. MongoDB Connection Issues
- Check that `MONGODB_URI` environment variable is set correctly
- In MongoDB Atlas, ensure IP whitelist includes `0.0.0.0/0` (all IPs)
- Check logs for connection errors

### 2. Environment Variables
- Go to **Settings** → **Environment Variables**
- Verify all required variables are set:
  - `MONGODB_URI`
  - `JWT_SECRET`
  - `TMDB_API_KEY`
  - `ADMIN_PASSWORD`
  - `FRONTEND_URL` (should be your domain, e.g., `https://yourdomain.com`)
  - `GROQ_API_KEY` (optional)

### 3. Test API Endpoints

Test these endpoints directly:
- `https://your-domain.vercel.app/api/health` - Should return `{"status":"ok"}`
- `https://your-domain.vercel.app/api/` - Should return API info

### 4. CORS Issues
- Check browser console for CORS errors
- Verify `FRONTEND_URL` matches your actual domain exactly (no trailing slash)

### 5. Route Not Found (404)
- Check that routes are mounted correctly in `api/index.ts`
- Verify Vercel rewrite rules in `vercel.json`

## Quick Debug Steps

1. **Check function logs** in Vercel dashboard
2. **Test `/api/health` endpoint** - if this fails, the function isn't deploying
3. **Check environment variables** are all set
4. **Verify MongoDB connection** - check logs for connection errors
5. **Test a simple endpoint** like `/api/health` first

## Local Testing

To test the API handler locally:
```bash
cd api
npx ts-node index.ts
```

Or use Vercel CLI:
```bash
npm i -g vercel
vercel dev
```
