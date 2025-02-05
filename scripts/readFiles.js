import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import ignore from 'ignore';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../');

// Additional paths to exclude from the file list
const ADDITIONAL_EXCLUDES = [
  'server/scripts/**',
  'scripts/readFiles.js',
  '.git',
  'package-lock.json',
  'project-files.json',
];

/**
 * Read .gitignore file and create an ignore filter
 * @returns {Object} ignore filter instance
 */
async function getGitignoreFilter() {
  try {
    const gitignoreContent = await fs.readFile(
      path.join(rootDir, '.gitignore'),
      'utf-8',
    );
    const ig = ignore().add(gitignoreContent).add(ADDITIONAL_EXCLUDES);
    return ig;
  } catch (error) {
    console.error('Error reading .gitignore:', error);
    return ignore().add(ADDITIONAL_EXCLUDES);
  }
}

/**
 * Recursively read all files in a directory
 * @param {string} dir - Directory to read
 * @param {Object} ig - Ignore filter instance
 * @returns {Promise<Array>} Array of file objects
 */
async function readFilesRecursively(dir, ig) {
  const files = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(rootDir, fullPath);

    // Skip if file/directory is ignored
    if (ig.ignores(relativePath)) {
      continue;
    }

    if (entry.isDirectory()) {
      const subFiles = await readFilesRecursively(fullPath, ig);
      files.push(...subFiles);
    } else {
      try {
        const content = await fs.readFile(fullPath, 'utf-8');
        files.push({
          name: relativePath,
          content: content,
        });
      } catch (error) {
        console.error(`Error reading file ${fullPath}:`, error);
      }
    }
  }

  return files;
}

/**
 * Main function to read all files and save as JSON
 */
async function main() {
  try {
    const ig = await getGitignoreFilter();
    const files = await readFilesRecursively(rootDir, ig);

    // Save to JSON file
    const outputPath = path.join(rootDir, 'project-files.json');
    await fs.writeFile(outputPath, JSON.stringify(files, null, 2));
    console.log(`Files saved to ${outputPath}`);
  } catch (error) {
    console.error('Error in main process:', error);
    process.exit(1);
  }
}

main();
