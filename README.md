# CamBridge

A minimal, privacy-first video conferencing platform built for Vercel.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ (for local development)
- A Vercel account (for deployment)

### Local Development

1. Clone the repository:
```bash
git clone https://github.com/SaltProphet/CamBridge2.git
cd CamBridge2
```

2. Install dependencies (optional, only needed for dev server):
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open http://localhost:3000 in your browser

## 📦 Deployment

### Deploy to Vercel

1. **Install Vercel CLI** (if not already installed):
```bash
npm install -g vercel
```

2. **Deploy**:
```bash
npm run build && vercel deploy
```

3. **Production Deployment**:
```bash
vercel deploy --prod
```

### Deploy via Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Click "Deploy"

That's it! No environment variables or configuration needed for the basic setup.

## 📄 Pages

- `/` - Landing page
- `/register` - Create account (placeholder)
- `/login` - Login page (placeholder)
- `/dashboard` - User dashboard
- `/room/:slug` - Video room (placeholder)
- `/terms` - Terms of Service
- `/privacy` - Privacy Policy

## 🔌 API Endpoints

- `GET /api/health` - Health check endpoint

## 🛠️ Project Structure

```
CamBridge2/
├── api/
│   └── health.js          # Health check endpoint
├── index.html             # Landing page
├── login.html             # Login page
├── register.html          # Registration page
├── dashboard.html         # User dashboard
├── room.html              # Video room placeholder
├── terms.html             # Terms of Service
├── privacy.html           # Privacy Policy
├── styles.css             # Global styles
├── vercel.json            # Vercel configuration
├── package.json           # Project configuration
└── README.md              # This file
```

## 🎯 Extending the Application

This is a minimal starter that can be extended with:

1. **Real Authentication**: Add API endpoints for user registration/login
2. **Database**: Connect PostgreSQL or another database
3. **Video Integration**: Integrate WebRTC, Daily.co, or similar services
4. **User Management**: Add user profiles and room management

See [DEPLOYMENT.md](DEPLOYMENT.md) for more detailed deployment instructions.

## 📝 Development Notes

- **No build step required**: This is a static site with minimal JavaScript
- **No database required**: Base application runs without any backend
- **No dependencies**: Core functionality works with zero npm packages
- **Extensible**: Built to easily add real APIs and features later

## 🔒 Privacy

CamBridge is designed with privacy in mind:
- No tracking or analytics by default
- No data collection in base version
- Can be extended with privacy-preserving features

## 📜 License

MIT License - see LICENSE file for details

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Support

For issues and questions, please open an issue on GitHub.
