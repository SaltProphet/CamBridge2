# Repository Organization Guide

This guide explains the CamBridge repository structure and where to find different types of files.

## 📂 Root Directory
**Essential configuration and entry points only.**

- `index.html` - Main landing page entry point
- `landing.html` - Marketing landing page
- `room.html` - Room access and video interface
- `room.js` - Core room logic and WebRTC integration
- `styles.css` - Global styles
- `config.json` - Application configuration
- `vercel.json` - Deployment configuration
- `package.json` - Project dependencies and scripts
- `.env.example` - Environment variable template
- `README.md` - Quick start and BETA MODE overview

## 📚 `/docs` Directory
**All documentation, guides, and reference materials.**

### Quick Navigation
Start here for specific topics:
- **Getting Started**: [DEPLOYMENT.md](DEPLOYMENT.md), [AUTH_SETUP.md](AUTH_SETUP.md)
- **Architecture**: [ARCHITECTURE.md](ARCHITECTURE.md), [STRUCTURE.md](STRUCTURE.md)
- **Implementation**: [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md), [BETA_MODE_TEST_PLAN.md](BETA_MODE_TEST_PLAN.md)
- **Roadmap**: [UPDATED_ROADMAP.md](UPDATED_ROADMAP.md), [MVP_ROADMAP.md](MVP_ROADMAP.md)
- **Full Index**: [INDEX.md](INDEX.md) - Organized index of all documentation

### Organization by Topic
- **Phase Documentation** (`PHASE*.md`) - Historical phase completions and milestones
- **Testing** (`TESTING.md`, `BETA_MODE_TEST_PLAN.md`, `PHASE*_TESTING.md`)
- **Feature Guides** (`ROOM_TYPES_GUIDE.md`, `AUTH_SETUP.md`)
- **Development References** (`CONTRIBUTING.md`, `REPO_ANALYSIS.md`)
- **Legacy Code** (`legacy/`) - Archived implementation files

### Special Files
- `INDEX.md` - Master index for all documentation
- `UPDATED_ROADMAP.md` - Current project roadmap (primary reference)
- `IMPLEMENTATION_SUMMARY.md` - Overview of all implemented features

## 🔧 `/api` Directory
**Backend API implementation.**

```
api/
├── auth/                    # Authentication endpoints
│   ├── password-register.js # Creator password signup
│   ├── password-login.js    # Creator password login
│   ├── login.js             # Magic link login
│   ├── logout.js
│   └── callback.js          # OAuth callback handler
├── creator/                 # Creator account endpoints
│   ├── info.js              # Get/update creator profile
│   ├── public-info.js       # Public creator data (no auth)
│   ├── subscribe.js         # Subscription management
│   ├── onboard.js           # Creator onboarding
│   └── ...
├── rooms/                   # Room management
├── user/                    # User profile endpoints
├── webhooks/                # Payment webhooks
├── providers/               # External service integrations
│   ├── email.js
│   ├── payments.js
│   ├── video.js
│   └── storage.js
├── policies/                # Authorization and gating logic
│   └── gates.js             # BETA_MODE bypass logic
├── middleware.js            # Request middleware
├── db.js                    # Database access layer
├── env.js                   # Environment configuration
└── tests/                   # Automated test runner
    └── run-tests.js         # Comprehensive test suite
```

## 🎨 `/public` Directory
**Static assets and compiled output.**

```
public/
├── pages/                   # HTML pages (content pages)
│   ├── creator-signup.html  # Creator self-signup form
│   ├── creator-login.html   # Creator password login
│   ├── creator-dashboard.html # Creator account management
│   ├── app.html             # Legacy app entry
│   ├── dashboard.html       # Legacy dashboard
│   ├── subscribe.html       # Subscription page
│   └── ... (other pages)
├── styles.css               # Global stylesheet (published)
├── sounds/                  # Audio assets
└── themes/                  # Theme configurations
```

## 🎯 `/styles` Directory
**CSS source and styling configuration.**

```
styles/
├── input.css                # Tailwind CSS input
├── tailwind.config.js       # Tailwind configuration
├── postcss.config.js        # PostCSS configuration
└── build-css.sh            # CSS build script
```

## 📝 `/scripts` Directory
**Database migrations and setup utilities.**

```
scripts/
├── beta-mode-migration.sql  # BETA MODE database schema
├── phase1-migration.sql     # Phase 1 schema migration
└── setup-db.sh             # Database setup script
```

## 👁️ `/assets` Directory
**Miscellaneous static resources.**

```
assets/
├── sounds/
│   └── README.md
└── themes/
    └── README.md
```

## 🗂️ `/._archived` Directory
**Historical documentation and legacy code.**

Previously organized reference materials. Most content has been reorganized into `/docs`.

---

## File Naming Conventions

### Documentation
- `*.md` - Markdown documentation files
- `*_SUMMARY.md` - Summary or completion documentation
- `PHASE*.md` - Phase tracking documentation

### Source Code
- `/api/**/*.js` - Backend endpoints and utilities (ES modules)
- `*.html` - Frontend pages and components
- `*.css` - Stylesheets
- `*.json` - Configuration files

### Tests
- `*.test.js` - Test files (in same directory as source)
- `run-tests.js` - Test runner script

---

## Quick Links for Common Tasks

### I want to...
- **Deploy the app** → Read [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
- **Understand the architecture** → Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- **Add a new feature** → Check [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md)
- **See the roadmap** → Read [docs/UPDATED_ROADMAP.md](docs/UPDATED_ROADMAP.md)
- **Run tests** → Execute `node api/tests/run-tests.js`
- **Set up BETA MODE** → Read [README.md](../README.md) BETA MODE section

---

## Migration Notes

**Reorganization completed on February 11, 2026:**
- Moved 22 documentation files from root to `/docs`
- Archived 4 legacy JavaScript implementation files in `/docs/legacy`
- Moved 11 HTML pages to `/public/pages`
- Created `/docs/INDEX.md` as navigation guide
- Updated root directory to contain only essential config and entry points

This organization improves:
- **Discoverability**: Documentation grouped in one place with index
- **Navigation**: Clear folder structure by responsibility
- **Maintenance**: Legacy code isolated but preserved
- **Deployment**: Clean root directory with only necessary files
