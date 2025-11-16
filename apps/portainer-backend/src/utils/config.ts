/**
 * @file Configuration management for webhook mappings and PIN authentication
 *
 * This module loads webhook configuration from a JSON file (config.json) and provides
 * functions to look up webhooks based on image name, container name, or stack name.
 *
 * Key features:
 * - File-based configuration (JSON)
 * - In-memory caching with auto-reload on file change
 * - Multi-level webhook lookup with fallback priorities
 * - PIN hash for Bearer token authentication
 * - Support for container-level and stack-level webhooks
 *
 * Configuration structure:
 * ```json
 * {
 *   "pin": "hashed-pin-value",
 *   "backend_url": "https://optional-url",
 *   "webhooks": [
 *     {
 *       "name": "webhook-name",
 *       "type": "container",
 *       "image": "myregistry/myapp",
 *       "container_name": "my-container",
 *       "webhook_url": "https://portainer/webhook-url"
 *     },
 *     {
 *       "name": "stack-webhook",
 *       "type": "stack",
 *       "stack": "my-stack",
 *       "webhook_url": "https://portainer/webhook-url"
 *     }
 *   ]
 * }
 * ```
 */

import fs from 'fs';
import path from 'path';

/**
 * Configuration for a single Portainer webhook
 *
 * Webhooks can be matched at two levels:
 * 1. Container-level: Triggers when a specific container's image is updated
 * 2. Stack-level: Triggers to update an entire Portainer stack
 */
export interface WebhookConfig {
  /** Human-readable name for this webhook */
  name: string;

  /** Webhook type: 'container' for single container, 'stack' for entire stack */
  type: 'container' | 'stack';

  /** Stack name (optional, used for stack-level webhooks) */
  stack?: string;

  /** Docker image name to match against (e.g., 'myregistry/myapp') */
  image?: string;

  /** Container name to match against */
  container_name?: string;

  /** Portainer webhook URL to trigger for updates */
  webhook_url: string;
}

/**
 * Root configuration object loaded from config.json
 *
 * Contains PIN authentication settings and array of webhook configurations
 */
export interface Config {
  /** Hashed PIN for Bearer token authentication */
  pin: string;

  /** Optional backend URL (not currently used but available for future features) */
  backend_url?: string;

  /** Array of webhook configurations */
  webhooks: WebhookConfig[];
}

/** Path to config.json file (from env or current working directory) */
const CONFIG_PATH = process.env.CONFIG_PATH || path.join(process.cwd(), 'config.json');

/** In-memory cache of loaded configuration */
let cachedConfig: Config | null = null;

/** File modification time of cached config (for change detection) */
let configLastModified: number = 0;

/**
 * Load configuration from config.json with intelligent caching
 *
 * Features:
 * - Loads configuration once from disk and caches in memory
 * - Automatically reloads if config.json is modified (based on file mtime)
 * - Throws error if config file is missing or invalid JSON
 *
 * @returns {Config} The loaded configuration object
 * @throws {Error} If config.json is not found or contains invalid JSON
 */
export function loadConfig(): Config {
  try {
    // Get file stats to check modification time
    const stats = fs.statSync(CONFIG_PATH);
    const currentModified = stats.mtimeMs;

    // Reload config if it's not cached or file has been modified since last load
    if (!cachedConfig || currentModified > configLastModified) {
      const content = fs.readFileSync(CONFIG_PATH, 'utf-8');
      cachedConfig = JSON.parse(content);
      configLastModified = currentModified;
      console.log('Configuration loaded successfully');
    }

    return cachedConfig as Config;
  } catch (error) {
    console.error('Failed to load config.json:', error);
    throw new Error('Configuration file not found or invalid');
  }
}

/**
 * Find the best matching webhook for a Docker image update
 *
 * Uses a priority-based lookup system:
 * 1. Exact match: image + container_name
 * 2. Image-only match
 * 3. Container name-only match
 * 4. Stack-level webhook (if stack provided)
 * 5. Inferred stack webhook (from related webhook's stack)
 *
 * This allows flexible configuration where you can match updates at different levels:
 * - Specific image + specific container (most precise)
 * - Any container with a specific image
 * - Specific container regardless of image
 * - Entire stack update
 *
 * @param {string} image - Docker image name (e.g., 'myregistry/myapp')
 * @param {string|undefined} containerName - Container name (optional)
 * @param {string|undefined} stack - Portainer stack name (optional)
 *
 * @returns {WebhookConfig|null} Best matching webhook or null if no match found
 *
 * @example
 * // Exact match: specific image in specific container
 * findWebhookForImage('myapp:latest', 'myapp-prod', 'prod-stack')
 *
 * @example
 * // Fallback: any update to this image
 * findWebhookForImage('myapp:latest')
 */
export function findWebhookForImage(image: string, containerName?: string, stack?: string): WebhookConfig | null {
  const config = loadConfig();

  // Priority 1: Try exact match with both image and container name
  if (containerName) {
    const exactMatch = config.webhooks.find(
      w => w.image === image && w.container_name === containerName
    );
    if (exactMatch) return exactMatch;
  }

  // Priority 2: Try matching by image only
  const imageMatch = config.webhooks.find(w => w.image === image);
  if (imageMatch) return imageMatch;

  // Priority 3: Try matching by container name only
  if (containerName) {
    const nameMatch = config.webhooks.find(w => w.container_name === containerName);
    if (nameMatch) return nameMatch;
  }

  // Priority 4: Try to find stack-level webhook if stack name is provided
  if (stack) {
    const stackMatch = config.webhooks.find(
      w => w.type === 'stack' && w.stack === stack
    );
    if (stackMatch) {
      console.log(`Using stack-level webhook for ${stack}: ${stackMatch.name}`);
      return stackMatch;
    }
  }

  // Priority 5: Try to infer stack from any related webhook, then find stack webhook
  // This handles the case where we have a container webhook that belongs to a stack
  const relatedWebhook = config.webhooks.find(
    w => (w.image === image || w.container_name === containerName) && w.stack
  );

  if (relatedWebhook && relatedWebhook.stack) {
    const inferredStackWebhook = config.webhooks.find(
      w => w.type === 'stack' && w.stack === relatedWebhook.stack
    );
    if (inferredStackWebhook) {
      console.log(`Inferred stack ${relatedWebhook.stack} from related webhook, using stack-level webhook: ${inferredStackWebhook.name}`);
      return inferredStackWebhook;
    }
  }

  // No matching webhook found
  return null;
}

/**
 * Find a stack-level webhook by stack name
 *
 * Stack-level webhooks trigger Portainer to redeploy an entire stack,
 * which is useful when you want to update multiple services at once.
 *
 * @param {string} stackName - Portainer stack name
 * @returns {WebhookConfig|null} The stack webhook or null if not found
 *
 * @example
 * findStackWebhook('prod-stack') // Returns webhook with type='stack' and stack='prod-stack'
 */
export function findStackWebhook(stackName: string): WebhookConfig | null {
  const config = loadConfig();
  const stackWebhook = config.webhooks.find(
    w => w.type === 'stack' && w.stack === stackName
  );
  return stackWebhook || null;
}

/**
 * Get a webhook configuration by its name
 *
 * Useful for direct webhook lookups when you know the webhook name.
 *
 * @param {string} name - Webhook name from config
 * @returns {WebhookConfig|null} The webhook or null if not found
 *
 * @example
 * getWebhookByName('my-webhook') // Returns { name: 'my-webhook', ... }
 */
export function getWebhookByName(name: string): WebhookConfig | null {
  const config = loadConfig();
  return config.webhooks.find(w => w.name === name) || null;
}

/**
 * Get all configured webhooks
 *
 * Useful for listing all available webhooks or bulk operations.
 *
 * @returns {WebhookConfig[]} Array of all webhook configurations
 */
export function getAllWebhooks(): WebhookConfig[] {
  const config = loadConfig();
  return config.webhooks;
}

/**
 * Get the PIN hash used for Bearer token authentication
 *
 * The PIN is stored as a hash in the configuration file.
 * This value is compared against the Bearer token provided in API requests.
 *
 * @returns {string} The hashed PIN value
 *
 * @example
 * const pinHash = getPinHash()
 * // Use in authenticatePin middleware to verify Bearer tokens
 */
export function getPinHash(): string {
  const config = loadConfig();
  return config.pin;
}
