# Cognito setup (fast path)

1) AWS Console -> Cognito -> Create User Pool
   - Sign-in: Email
   - MFA: optional for MVP (you can turn it on later)

2) App integration
   - Create an App client
   - IMPORTANT: generate a client secret (NextAuth uses it)

3) Hosted UI
   - Set a domain (Cognito domain prefix is fine for MVP)
   - Allowed OAuth flows: Authorization code grant
   - Allowed scopes: openid, email, profile
   - Callback URL:
     http://localhost:3000/api/auth/callback/cognito
   - Sign-out URL:
     http://localhost:3000

4) Configure local env
   - Copy apps/web/.env.example -> apps/web/.env.local
   - Fill:
     NEXTAUTH_SECRET (random)
     COGNITO_ISSUER (issuer from Cognito OIDC config)
     COGNITO_CLIENT_ID
     COGNITO_CLIENT_SECRET

5) Run
   - Double-click: run\\1_web_dev.bat
   - Click "Sign in / Sign up"

Deploy later (fast):
- Amplify Hosting for Next.js
- Use the Amplify domain first, then add a custom domain
- Update Cognito callback URLs to your production URL:
  https://YOURDOMAIN/api/auth/callback/cognito