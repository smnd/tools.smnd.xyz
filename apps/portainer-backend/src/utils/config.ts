import fs from 'fs';
import path from 'path';

export interface WebhookConfig {
  name: string;
  type: 'container' | 'stack';
  stack?: string;
  image?: string;
  container_name?: string;
  webhook_url: string;
}

export interface Config {
  pin: string;
  backend_url?: string;
  webhooks: WebhookConfig[];
}

const CONFIG_PATH = process.env.CONFIG_PATH || path.join(process.cwd(), 'config.json');

let cachedConfig: Config | null = null;
let configLastModified: number = 0;

export function loadConfig(): Config {
  try {
    const stats = fs.statSync(CONFIG_PATH);
    const currentModified = stats.mtimeMs;

    // Reload if file was modified
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

export function findWebhookForImage(image: string, containerName?: string, stack?: string): WebhookConfig | null {
  const config = loadConfig();

  // Try exact match with image and container name
  if (containerName) {
    const exactMatch = config.webhooks.find(
      w => w.image === image && w.container_name === containerName
    );
    if (exactMatch) return exactMatch;
  }

  // Try matching by image only
  const imageMatch = config.webhooks.find(w => w.image === image);
  if (imageMatch) return imageMatch;

  // Try matching by container name only
  if (containerName) {
    const nameMatch = config.webhooks.find(w => w.container_name === containerName);
    if (nameMatch) return nameMatch;
  }

  // Fallback: Try to find stack-level webhook if stack is provided
  if (stack) {
    const stackMatch = config.webhooks.find(
      w => w.type === 'stack' && w.stack === stack
    );
    if (stackMatch) {
      console.log(`Using stack-level webhook for ${stack}: ${stackMatch.name}`);
      return stackMatch;
    }
  }

  // Additional fallback: If no direct match found, try to infer stack from any webhook with matching image/container
  // Then look for a stack-level webhook for that stack
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

  return null;
}

export function findStackWebhook(stackName: string): WebhookConfig | null {
  const config = loadConfig();
  const stackWebhook = config.webhooks.find(
    w => w.type === 'stack' && w.stack === stackName
  );
  return stackWebhook || null;
}

export function getWebhookByName(name: string): WebhookConfig | null {
  const config = loadConfig();
  return config.webhooks.find(w => w.name === name) || null;
}

export function getAllWebhooks(): WebhookConfig[] {
  const config = loadConfig();
  return config.webhooks;
}

export function getPinHash(): string {
  const config = loadConfig();
  return config.pin;
}
