/**
 * Backup Service
 * Provides utilities for automating data backups
 */
import fs from 'fs';
import path from 'path';
import util from 'util';
import { createGzip } from 'zlib';
import { pipeline } from 'stream';
import { getDataDir, listDataFiles } from './data-service.js';

// Convert fs functions to Promise-based
const mkdir = util.promisify(fs.mkdir);
const access = util.promisify(fs.access);
const copyFile = util.promisify(fs.copyFile);
const pipelineAsync = util.promisify(pipeline);

// Get the backup directory
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(getDataDir(), 'backups');

// Default backup schedule (daily)
const DEFAULT_BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Timer for scheduled backups
let backupTimer: NodeJS.Timeout | null = null;

/**
 * Ensure the backup directory exists
 */
async function ensureBackupDir(): Promise<void> {
  try {
    await access(BACKUP_DIR);
  } catch (error) {
    // Directory doesn't exist, create it
    await mkdir(BACKUP_DIR, { recursive: true });
    console.log(`Created backup directory: ${BACKUP_DIR}`);
  }
}

/**
 * Create a backup of all data files
 * @returns Promise resolving to the backup directory path
 */
export async function createBackup(): Promise<string> {
  await ensureBackupDir();
  
  // Create a timestamped backup directory
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(BACKUP_DIR, `backup-${timestamp}`);
  await mkdir(backupPath, { recursive: true });
  
  // Get all data files
  const dataDir = getDataDir();
  const files = await listDataFiles();
  
  // Copy each file to the backup directory
  const backupPromises = files.map(async (file) => {
    const sourcePath = path.join(dataDir, file);
    const destinationPath = path.join(backupPath, file);
    
    // Regular files are copied directly
    if (!file.endsWith('.json')) {
      return copyFile(sourcePath, destinationPath);
    }
    
    // JSON files are compressed with gzip
    const gzipDestinationPath = `${destinationPath}.gz`;
    const readStream = fs.createReadStream(sourcePath);
    const writeStream = fs.createWriteStream(gzipDestinationPath);
    const gzipStream = createGzip();
    
    return pipelineAsync(readStream, gzipStream, writeStream);
  });
  
  // Wait for all files to be backed up
  await Promise.all(backupPromises);
  
  console.log(`Backup created at: ${backupPath}`);
  return backupPath;
}

/**
 * Start scheduled backups
 * @param intervalMs - Interval in milliseconds between backups (default: 24 hours)
 */
export function startScheduledBackups(intervalMs = DEFAULT_BACKUP_INTERVAL_MS): void {
  // Clear any existing timer
  if (backupTimer) {
    clearInterval(backupTimer);
  }
  
  // Schedule regular backups
  backupTimer = setInterval(async () => {
    try {
      await createBackup();
      console.log('Scheduled backup completed successfully');
    } catch (error) {
      console.error('Scheduled backup failed:', error);
    }
  }, intervalMs);
  
  console.log(`Scheduled backups started (interval: ${intervalMs}ms)`);
}

/**
 * Stop scheduled backups
 */
export function stopScheduledBackups(): void {
  if (backupTimer) {
    clearInterval(backupTimer);
    backupTimer = null;
    console.log('Scheduled backups stopped');
  }
}

/**
 * List all available backups
 * @returns Promise resolving to an array of backup directory names
 */
export async function listBackups(): Promise<string[]> {
  await ensureBackupDir();
  
  // Read backup directory
  const files = await util.promisify(fs.readdir)(BACKUP_DIR);
  
  // Filter only backup directories
  return files.filter(file => file.startsWith('backup-'));
}

// Initialize backup system on startup
ensureBackupDir().catch(error => {
  console.error('Failed to initialize backup directory:', error);
}); 