// Phase 0: Storage Provider Abstraction
// Allows swapping storage providers for receipts, legal docs, etc.

/**
 * StorageProvider Interface
 * All storage providers must implement these methods
 */
export class StorageProvider {
  /**
   * Store a file
   * @param {string} key - File identifier/path
   * @param {Buffer|string} data - File content
   * @param {Object} options - Storage options (contentType, metadata, etc.)
   * @returns {Promise<{success: boolean, url?: string, error?: string}>}
   */
  async store(key, data, options = {}) {
    throw new Error('store() must be implemented by provider');
  }

  /**
   * Retrieve a file
   * @param {string} key - File identifier/path
   * @returns {Promise<{success: boolean, data?: Buffer, error?: string}>}
   */
  async retrieve(key) {
    throw new Error('retrieve() must be implemented by provider');
  }

  /**
   * Delete a file
   * @param {string} key - File identifier/path
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async delete(key) {
    throw new Error('delete() must be implemented by provider');
  }

  /**
   * Get file URL (if publicly accessible)
   * @param {string} key - File identifier/path
   * @returns {Promise<{success: boolean, url?: string, error?: string}>}
   */
  async getUrl(key) {
    throw new Error('getUrl() must be implemented by provider');
  }
}

/**
 * No-Op Storage Provider (default)
 * Does not store anything - for privacy-first mode
 */
export class NoOpStorageProvider extends StorageProvider {
  async store(key, data, options = {}) {
    console.log(`[NoOpStorage] Would store: ${key} (${data.length} bytes)`);
    return { success: true, url: null };
  }

  async retrieve(key) {
    return { success: false, error: 'Storage disabled (NoOp provider)' };
  }

  async delete(key) {
    return { success: true };
  }

  async getUrl(key) {
    return { success: false, error: 'Storage disabled (NoOp provider)' };
  }
}

/**
 * Local Filesystem Storage Provider
 * For development/testing only
 */
export class LocalStorageProvider extends StorageProvider {
  constructor(basePath = '/tmp/cambridge-storage') {
    super();
    this.basePath = basePath;
  }

  async store(key, data, options = {}) {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const fullPath = path.join(this.basePath, key);
      const dir = path.dirname(fullPath);
      
      // Create directory if it doesn't exist
      await fs.mkdir(dir, { recursive: true });
      
      // Write file
      await fs.writeFile(fullPath, data);
      
      return { success: true, url: fullPath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async retrieve(key) {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const fullPath = path.join(this.basePath, key);
      const data = await fs.readFile(fullPath);
      
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async delete(key) {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const fullPath = path.join(this.basePath, key);
      await fs.unlink(fullPath);
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getUrl(key) {
    const path = await import('path');
    const fullPath = path.join(this.basePath, key);
    return { success: true, url: `file://${fullPath}` };
  }
}

/**
 * S3-Compatible Storage Provider (placeholder for future implementation)
 */
export class S3StorageProvider extends StorageProvider {
  constructor(bucket, region, accessKey, secretKey) {
    super();
    this.bucket = bucket;
    this.region = region;
    this.accessKey = accessKey;
    this.secretKey = secretKey;
  }

  async store(key, data, options = {}) {
    // TODO: Implement S3 integration
    return { success: false, error: 'S3 provider not yet implemented' };
  }

  async retrieve(key) {
    return { success: false, error: 'S3 provider not yet implemented' };
  }

  async delete(key) {
    return { success: false, error: 'S3 provider not yet implemented' };
  }

  async getUrl(key) {
    return { success: false, error: 'S3 provider not yet implemented' };
  }
}

/**
 * Factory function to get the configured storage provider
 */
export function getStorageProvider() {
  const provider = process.env.STORAGE_PROVIDER || 'noop';

  switch (provider.toLowerCase()) {
    case 'noop':
      return new NoOpStorageProvider();
    case 'local':
      return new LocalStorageProvider(process.env.STORAGE_PATH || '/tmp/cambridge-storage');
    case 's3':
      return new S3StorageProvider(
        process.env.S3_BUCKET,
        process.env.S3_REGION,
        process.env.S3_ACCESS_KEY,
        process.env.S3_SECRET_KEY
      );
    // Add more providers here as needed:
    // case 'cloudflare':
    //   return new CloudflareR2Provider(...);
    default:
      console.warn(`Unknown STORAGE_PROVIDER: ${provider}, defaulting to NoOp`);
      return new NoOpStorageProvider();
  }
}
