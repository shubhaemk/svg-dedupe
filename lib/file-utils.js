const fs = require('fs').promises;
const path = require('path');
const kleur = require('kleur');

async function findSVGFiles(dir) {
  const allFiles = [];
  
  try {
    await fs.access(dir);
  } catch (error) {
    throw new Error(`Directory not accessible: ${dir}\n\nPlease check that the path exists and you have permission to read it.`);
  }
  
  async function scanDir(directory) {
    try {
      const entries = await fs.readdir(directory, { withFileTypes: true });
      
      const filePromises = entries.map(async (entry) => {
        const fullPath = path.join(directory, entry.name);
        
        if (entry.isDirectory()) {
          return scanDir(fullPath);
        } else if (entry.isFile() && path.extname(entry.name).toLowerCase() === '.svg') {
          allFiles.push(fullPath);
        }
      });
      
      await Promise.all(filePromises);
    } catch (error) {
      process.stderr.write(`\n${kleur.yellow(kleur.bold('Warning:'))} Could not read directory ${kleur.cyan(path.basename(directory))}: ${kleur.red(error.message)}\n`);
    }
  }
  
  await scanDir(dir);
  
  if (allFiles.length === 0) {
    throw new Error(`No SVG files found in directory: ${dir}\n\nPlease check that the directory contains SVG files.`);
  }
  
  return allFiles;
}

function validateSVGContent(content) {
  if (!content || content.trim().length === 0) {
    return { valid: false, reason: "Empty file" };
  }
  
  if (!content.includes('<svg') || !content.includes('</svg>')) {
    return { valid: false, reason: "Not a valid SVG file" };
  }
  
  return { valid: true };
}

module.exports = { findSVGFiles, validateSVGContent }; 