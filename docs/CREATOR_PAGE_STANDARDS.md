# Creator Page Standards

This document defines the standard HTML structure and styling for creator pages to ensure consistency and reduce duplication.

## Standard HTML Head

All creator pages should use this standard head section:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>[Page Title] - CamBridge</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <link rel="stylesheet" href="/public/styles/creator-common.css">
    <style>
        /* Page-specific styles only */
    </style>
</head>
```

## Shared CSS Variables

All creator pages use these CSS variables (defined in `/public/styles/creator-common.css`):

```css
:root {
    --bg-dark: #000000;
    --text: #555555;
    --text-light: #ffffff;
    --accent: #00ff88;
    --error: #ff4444;
    --border: #222222;
}
```

## Routing Standards

### Creator Page Routes

Use these routes for all navigation:

- Registration: `/creator/register` → maps to `/public/pages/creator-signup.html`
- Login: `/creator/login` → maps to `/public/pages/creator-login.html`
- Dashboard: `/creator/dashboard` → maps to `/public/pages/creator-dashboard.html`

### Client Join Routes

- Client join: `/r/:creatorSlug` → maps to `/room.html`
- Client join with room: `/r/:creatorSlug/:roomSlug` → maps to `/room.html`

### Legacy Routes (maintained for backward compatibility)

- `/room/:modelname/:roomslug` → also maps to `/room.html`

## URL Parsing Utilities

Use the centralized URL parsing utilities in `/api/utils/url-parser.js`:

```javascript
import { parseCreatorSlugFromPath, getCreatorSlug, isValidCreatorSlug } from '../api/utils/url-parser.js';

// Client-side parsing
const { creatorSlug, roomSlug } = parseCreatorSlugFromPath(window.location.pathname);

// Server-side parsing
const slug = getCreatorSlug(req);
```

## Common UI Patterns

### Authentication Check

```javascript
function getAuthToken() {
    return localStorage.getItem('auth_token');
}

async function checkAuth() {
    const token = getAuthToken();
    if (!token) {
        window.location.href = '/creator/login';
        return null;
    }
    return token;
}
```

### Error Display

```javascript
function showError(message) {
    const errorDiv = document.getElementById('error-message');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }
}
```

### Success Display

```javascript
function showSuccess(message) {
    const successDiv = document.getElementById('success-message');
    if (successDiv) {
        successDiv.textContent = message;
        successDiv.classList.add('show');
    }
}
```

## Button Classes

- `.btn-primary` - Accent background, dark text (primary actions)
- `.btn-error` - Red border, transparent background (destructive actions)
- `button:disabled` - Automatically styled with reduced opacity

## Form Structure

```html
<form id="form-id">
    <div class="form-group">
        <label for="field-id">FIELD LABEL</label>
        <input type="text" id="field-id" name="field-name" required>
        <div class="error-message" id="field-error"></div>
    </div>
    <button type="submit" class="btn-primary">SUBMIT</button>
</form>
```

## Loading States

```html
<div class="loading-msg" id="loading-msg">Processing...</div>
<div class="success-message" id="success-msg">Success!</div>
```

```javascript
// Show loading
document.getElementById('loading-msg').classList.add('show');

// Hide loading
document.getElementById('loading-msg').classList.remove('show');
```

## Link Conventions

Always use absolute paths for navigation:

```html
<!-- Correct -->
<a href="/creator/login">Login</a>
<a href="/creator/register">Sign Up</a>
<a href="/creator/dashboard">Dashboard</a>

<!-- Incorrect -->
<a href="./creator-login.html">Login</a>
<a href="../login.html">Login</a>
```

## Room URL Generation

```javascript
const baseUrl = window.location.origin;
const creatorUrl = `${baseUrl}/r/${creatorSlug}`;
const roomUrl = `${baseUrl}/r/${creatorSlug}/${roomSlug}`;
```

## Logout Pattern

```javascript
function logout() {
    localStorage.removeItem('auth_token');
    document.cookie = 'auth_token=; path=/; max-age=0';
    window.location.href = '/creator/login';
}
```
