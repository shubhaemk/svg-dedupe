const path = require('path');

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getFileName(filePath) {
  return path.basename(filePath);
}

module.exports = { delay, getFileName }; 