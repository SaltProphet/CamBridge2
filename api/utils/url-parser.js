// URL parsing utilities for consistent route parameter extraction
// Handles both Vercel serverless and static routing patterns

/**
 * Parse creator slug from various URL patterns
 * Supports: /r/:creatorSlug and /r/:creatorSlug/:roomSlug
 * 
 * @param {string} pathname - The URL pathname (e.g., from window.location.pathname or req.url)
 * @returns {Object} { creatorSlug: string|null, roomSlug: string|null }
 */
export function parseCreatorSlugFromPath(pathname) {
  if (!pathname || typeof pathname !== 'string') {
    return { creatorSlug: null, roomSlug: null };
  }

  // Match /r/:creatorSlug or /r/:creatorSlug/:roomSlug
  const match = pathname.match(/\/r\/([a-z0-9_-]+)(?:\/([a-z0-9_-]+))?/i);
  
  if (!match) {
    return { creatorSlug: null, roomSlug: null };
  }

  return {
    creatorSlug: match[1] || null,
    roomSlug: match[2] || null
  };
}

/**
 * Parse room URL pattern from pathname
 * Legacy support for /room/:modelname/:roomslug pattern
 * 
 * @param {string} pathname - The URL pathname
 * @returns {Object} { modelName: string|null, roomSlug: string|null }
 */
export function parseRoomFromPath(pathname) {
  if (!pathname || typeof pathname !== 'string') {
    return { modelName: null, roomSlug: null };
  }

  // Match /room/:modelname or /room/:modelname/:roomslug
  const match = pathname.match(/\/room\/([a-z0-9_-]+)(?:\/([a-z0-9_-]+))?/i);
  
  if (!match) {
    return { modelName: null, roomSlug: null };
  }

  return {
    modelName: match[1] || null,
    roomSlug: match[2] || 'main' // Default to 'main' if not specified
  };
}

/**
 * Get creator slug from Vercel serverless request
 * Handles both query params and path parsing
 * 
 * @param {Object} req - Vercel request object with query and url properties
 * @returns {string|null} The creator slug or null
 */
export function getCreatorSlug(req) {
  // First try query parameter (if using API route with ?slug=...)
  if (req.query && req.query.slug) {
    return req.query.slug;
  }

  // Then try body parameter (for POST requests)
  if (req.body && req.body.creatorSlug) {
    return req.body.creatorSlug;
  }

  // Finally try path parsing
  if (req.url) {
    const { creatorSlug } = parseCreatorSlugFromPath(req.url);
    return creatorSlug;
  }

  return null;
}

/**
 * Validate creator slug format
 * 
 * @param {string} slug - The slug to validate
 * @returns {boolean} True if valid, false otherwise
 */
export function isValidCreatorSlug(slug) {
  if (!slug || typeof slug !== 'string') {
    return false;
  }

  // Must be 3-100 characters, lowercase letters, numbers, hyphens, underscores
  const pattern = /^[a-z0-9_-]{3,100}$/;
  return pattern.test(slug);
}
