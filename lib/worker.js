const { parentPort, workerData } = require('worker_threads');
const stringSimilarity = require('string-similarity');
// const { compareVisually } = require('./visual-comparison');
const path = require('path');

// Configuration - must match main process
const SIMILARITY_THRESHOLD = 0.9; 

const { pairs, contentMap } = workerData;
const results = [];
const errors = [];

// Process each pair
(async () => {
  for (const pair of pairs) {
    try {
      const content1 = contentMap[pair.file1];
      const content2 = contentMap[pair.file2];
      
      if (!content1 || !content2) {
        continue;
      }
      
      // Quick pre-check for obvious non-matches
      if (Math.abs(content1.length - content2.length) / Math.max(content1.length, content2.length) > 0.5) {
        continue;
      }
      
      // Text-based similarity
      const textSimilarity = stringSimilarity.compareTwoStrings(content1, content2);
      
      // Use text similarity directly without deep mode condition
      let similarity = textSimilarity;
      
      if (similarity >= SIMILARITY_THRESHOLD) {
        results.push({
          file1: pair.file1,
          file2: pair.file2,
          similarity
        });
      }
    } catch (error) {
      errors.push({
        files: [pair.file1, pair.file2],
        error: error.message
      });
    }
  }
  
  parentPort.postMessage({ results, errors });
})(); 