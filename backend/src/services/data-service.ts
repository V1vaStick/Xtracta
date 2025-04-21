/**
 * Data Persistence Service
 * Provides utilities for storing and retrieving data from persistent storage
 */
import fs from 'fs';
import path from 'path';
import util from 'util';

// Convert fs functions to Promise-based
const mkdir = util.promisify(fs.mkdir);
const writeFile = util.promisify(fs.writeFile);
const readFile = util.promisify(fs.readFile);
const access = util.promisify(fs.access);
const readdir = util.promisify(fs.readdir);

// Get the data directory from environment variable or use default
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');

// Ensure the data directory exists
async function ensureDataDir() {
  try {
    await access(DATA_DIR);
  } catch (error) {
    // Directory doesn't exist, create it
    await mkdir(DATA_DIR, { recursive: true });
    console.log(`Created data directory: ${DATA_DIR}`);
  }
}

/**
 * Save data to a file
 * @param filename - Name of the file to save
 * @param data - Data to save (will be JSON.stringified)
 * @returns Promise resolving to the full path of the saved file
 */
export async function saveData(filename: string, data: any): Promise<string> {
  await ensureDataDir();
  
  const filePath = path.join(DATA_DIR, filename);
  const jsonData = JSON.stringify(data, null, 2);
  
  await writeFile(filePath, jsonData, 'utf8');
  return filePath;
}

/**
 * Load data from a file
 * @param filename - Name of the file to load
 * @returns Promise resolving to the parsed data, or null if the file doesn't exist
 */
export async function loadData<T>(filename: string): Promise<T | null> {
  await ensureDataDir();
  
  const filePath = path.join(DATA_DIR, filename);
  
  try {
    await access(filePath);
    const data = await readFile(filePath, 'utf8');
    return JSON.parse(data) as T;
  } catch (error) {
    // File doesn't exist or couldn't be parsed
    return null;
  }
}

/**
 * List all data files in the data directory
 * @param extension - Optional file extension to filter by (e.g., '.json')
 * @returns Promise resolving to an array of filenames
 */
export async function listDataFiles(extension?: string): Promise<string[]> {
  await ensureDataDir();
  
  const files = await readdir(DATA_DIR);
  
  if (extension) {
    return files.filter(file => file.endsWith(extension));
  }
  
  return files;
}

/**
 * Get the data directory path
 * @returns The absolute path to the data directory
 */
export function getDataDir(): string {
  return DATA_DIR;
}

// Initialize the data directory when the service is imported
ensureDataDir().catch(error => {
  console.error('Failed to initialize data directory:', error);
}); 