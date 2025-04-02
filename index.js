#!/usr/bin/env node
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const kleur = require('kleur');
const { Command } = require('commander');

// Import modules
const { createProgressTracker } = require('./lib/progress-tracker');
const { findSVGFiles } = require('./lib/file-utils');
const { runWorker } = require('./lib/worker-manager');
const { groupSimilarSVGs } = require('./lib/grouping-utils');
const { handleError } = require('./lib/error-handler');
const { delay } = require('./lib/ui-utils');
const { standardizeSVG } = require('./lib/svg-processor');


// Main processing function
async function compareAndGroupSVGs(dir) {
  // Create a single progress tracker for the entire process
  const progress = createProgressTracker();
  progress.start();
  
  try {
    console.time('Total processing time');
    
    // Define our process phases and their percentage allocations
    const phases = {
      findFiles: { weight: 5, name: "Finding SVG files" },
      loadFiles: { weight: 20, name: "Loading SVG files" },
      findDuplicates: { weight: 10, name: "Finding duplicates" },
      createPairs: { weight: 15, name: "Creating comparison pairs" },
      processBatches: { weight: 40, name: "Processing comparisons" },
      createGroups: { weight: 10, name: "Creating groups" }
    };
    
    // Helper to calculate cumulative progress across phases
    function calculateProgress(phase, percentWithinPhase) {
      let phaseStartPercent = 0;
      
      for (const [phaseName, phaseInfo] of Object.entries(phases)) {
        if (phaseName === phase) {
          return phaseStartPercent + (phaseInfo.weight * percentWithinPhase / 100);
        }
        phaseStartPercent += phaseInfo.weight;
      }
      return 0;
    }
    
    // Phase 1: Find all SVG files
    progress.updateProgress(calculateProgress('findFiles', 0), phases.findFiles.name);
    await delay(100);
    progress.updateProgress(calculateProgress('findFiles', 30), phases.findFiles.name);
    const svgFiles = await findSVGFiles(dir);
    progress.updateProgress(calculateProgress('findFiles', 70), phases.findFiles.name);
    await delay(100);
    progress.updateProgress(calculateProgress('findFiles', 100), phases.findFiles.name);
    
    // Phase 2: Load files
    progress.updateProgress(calculateProgress('loadFiles', 0), phases.loadFiles.name);
    
    const fileContents = {};
    const fileHashes = {};
    const fileSizes = {};
    const fileStandardizedContents = {};
    const exactDuplicates = new Map();
    const problematicSVGs = new Map(); // Map to store files and their error messages
    
    // Make problematicSVGs globally accessible for worker updates
    global.problematicSVGs = problematicSVGs;
    
    // Update progress as files are loaded
    let loadedCount = 0;
    await Promise.all(svgFiles.map(async (file) => {
      try {
        const content = await fs.readFile(file, 'utf8');
        
        // Skip empty files
        if (!content || content.trim().length === 0) {
          problematicSVGs.set(file, "Empty file");
          loadedCount++;
          progress.updateProgress(
            calculateProgress('loadFiles', (loadedCount / svgFiles.length) * 100),
            phases.loadFiles.name
          );
          return;
        }
        
        // Basic validation - check if it looks like an SVG file
        if (!content.includes('<svg') || !content.includes('</svg>')) {
          problematicSVGs.set(file, "Not a valid SVG file");
          loadedCount++;
          progress.updateProgress(
            calculateProgress('loadFiles', (loadedCount / svgFiles.length) * 100),
            phases.loadFiles.name
          );
          return;
        }
        
        // Store original content
        fileContents[file] = content;
        
        // Standardize SVG for better comparison
        try {
          const standardizedContent = await standardizeSVG(content);
          
          // Hash the standardized content for better duplicate detection
          const hash = crypto.createHash('md5').update(standardizedContent).digest('hex');
          fileHashes[file] = hash;
          fileSizes[file] = standardizedContent.length;
          
          // Store standardized content for comparisons
          fileStandardizedContents[file] = standardizedContent;
          
          if (exactDuplicates.has(hash)) {
            exactDuplicates.get(hash).push(file);
          } else {
            exactDuplicates.set(hash, [file]);
          }
        } catch (optimizeError) {
          // If standardization fails, use original content
          const hash = crypto.createHash('md5').update(content).digest('hex');
          fileHashes[file] = hash;
          fileSizes[file] = content.length;
          
          if (exactDuplicates.has(hash)) {
            exactDuplicates.get(hash).push(file);
          } else {
            exactDuplicates.set(hash, [file]);
          }
        }
        
        // Update progress
        loadedCount++;
        progress.updateProgress(
          calculateProgress('loadFiles', (loadedCount / svgFiles.length) * 100),
          phases.loadFiles.name
        );
      } catch (error) {
        // Track file with its error
        problematicSVGs.set(file, error.message);
        loadedCount++;
        process.stderr.write(`\n${kleur.yellow(kleur.bold('Warning:'))} Could not read ${kleur.cyan(file)}: ${kleur.red(error.message)}\n`);
        progress.updateProgress(
          calculateProgress('loadFiles', (loadedCount / svgFiles.length) * 100),
          phases.loadFiles.name
        );
      }
    }));
    
    // Phase 3: Process exact duplicates
    progress.updateProgress(calculateProgress('findDuplicates', 0), phases.findDuplicates.name);
    
    const exactGroups = [];
    const processed = new Set();
    let dupeCount = 0;
    
    for (const [hash, files] of exactDuplicates.entries()) {
      if (files.length > 1) {
        exactGroups.push([...files]);
        files.forEach(file => processed.add(file));
      }
      dupeCount++;
      progress.updateProgress(
        calculateProgress('findDuplicates', (dupeCount / exactDuplicates.size) * 100),
        phases.findDuplicates.name
      );
    }
    
    // Phase 4: Create comparison pairs
    progress.updateProgress(calculateProgress('createPairs', 0), phases.createPairs.name);
    
    const remainingFiles = svgFiles.filter(file => !processed.has(file) && fileContents[file]);
    const allPairs = [];
    let totalPairs = 0;
    
    if (remainingFiles.length > 1) {
      totalPairs = (remainingFiles.length * (remainingFiles.length - 1)) / 2;
      
      let pairCount = 0;
      for (let i = 0; i < remainingFiles.length - 1; i++) {
        for (let j = i + 1; j < remainingFiles.length; j++) {
          allPairs.push({
            file1: remainingFiles[i],
            file2: remainingFiles[j]
          });
          
          pairCount++;
          if (pairCount % Math.max(1, Math.floor(totalPairs / 100)) === 0) {
            progress.updateProgress(
              calculateProgress('createPairs', (pairCount / totalPairs) * 100),
              phases.createPairs.name
            );
          }
        }
      }
    }
    
    progress.updateProgress(calculateProgress('createPairs', 100), phases.createPairs.name);
    
    // Phase 5: Process batches of comparisons
    progress.updateProgress(calculateProgress('processBatches', 0), phases.processBatches.name);
    
    const BATCH_SIZE = 200;
    const NUM_WORKERS = Math.max(1, require('os').cpus().length - 1);
    const similarityResults = [];
    
    // Divide pairs into smaller batches for better progress reporting
    const batches = [];
    for (let i = 0; i < allPairs.length; i += BATCH_SIZE) {
      batches.push(allPairs.slice(i, i + BATCH_SIZE));
    }
    
    // Process batches in parallel using workers
    let completedBatches = 0;
    
    if (batches.length > 0) {
      // Create a pool of workers
      const workerPromises = [];
      const maxConcurrent = Math.min(NUM_WORKERS, batches.length);
      
      for (let i = 0; i < maxConcurrent; i++) {
        if (i < batches.length) {
          workerPromises.push(runWorker(i, batches[i], fileContents));
        }
      }
      
      let nextBatchIndex = maxConcurrent;
      
      // As workers complete, give them new batches
      while (workerPromises.length > 0) {
        const result = await Promise.race(workerPromises.map((p, i) => p.then(result => ({ result, index: i }))));
        const workerIndex = result.index;
        
        // Remove the completed promise
        workerPromises.splice(workerIndex, 1);
        
        // Add results to our combined results
        similarityResults.push(...result.result);
        
        // Update progress
        completedBatches++;
        progress.updateProgress(
          calculateProgress('processBatches', (completedBatches / batches.length) * 100),
          `${phases.processBatches.name} (${completedBatches}/${batches.length})`
        );
        
        // Assign a new batch if available
        if (nextBatchIndex < batches.length) {
          workerPromises.push(runWorker(nextBatchIndex, batches[nextBatchIndex], fileContents));
          nextBatchIndex++;
        }
      }
    } else {
      progress.updateProgress(calculateProgress('processBatches', 100), phases.processBatches.name);
    }
    
    // Phase 6: Create groups of similar SVGs
    progress.updateProgress(calculateProgress('createGroups', 0), phases.createGroups.name);
    
    const similarityGroups = groupSimilarSVGs(similarityResults, percent => {
      progress.updateProgress(
        calculateProgress('createGroups', percent),
        phases.createGroups.name
      );
    });
    
    const allGroups = [...exactGroups, ...similarityGroups];
    
    // After processing is complete, show the group count info clearly
    progress.finish();
    
    // Add a pause before displaying results
    await delay(1000);
    
    // Show a summary of what will be displayed with colored output
    console.log(`\n${kleur.green(kleur.bold('✓'))} ${kleur.white(kleur.bold('Finished processing.'))} ${kleur.yellow(kleur.bold(`Found ${allGroups.length} groups of similar SVGs.`))}`);
    console.log(`${kleur.blue('Displaying')} ${kleur.white(kleur.bold(allGroups.length))} ${kleur.blue('groups with')} ${kleur.white(kleur.bold(allGroups.reduce((sum, group) => sum + group.length, 0)))} ${kleur.blue('total files...')}\n`);
    
    await delay(500);
    
    // Display each group with delay and colors
    for (let i = 0; i < allGroups.length; i++) {
      const group = allGroups[i];
      
      // Update with progress info
      console.log(`\n${kleur.magenta(kleur.bold(`Group ${i + 1} of ${allGroups.length}:`))}`);
      
      // Display each file in the group with a smaller delay
      for (const file of group) {
        await delay(50);
        console.log(`${kleur.cyan('→')} ${kleur.white(file)}`);
      }
    }
    
    await delay(300);
    console.log('\n'); // Add extra line before time
    console.timeEnd('Total processing time');
    
    // Print memory usage with colors
    const memoryUsage = process.memoryUsage();
    console.log('\n' + kleur.yellow(kleur.bold('Memory usage:')));
    console.log(`  ${kleur.green('RSS:')} ${kleur.white(kleur.bold(Math.round(memoryUsage.rss / 1024 / 1024)))} MB`);
    console.log(`  ${kleur.green('Heap total:')} ${kleur.white(kleur.bold(Math.round(memoryUsage.heapTotal / 1024 / 1024)))} MB`);
    console.log(`  ${kleur.green('Heap used:')} ${kleur.white(kleur.bold(Math.round(memoryUsage.heapUsed / 1024 / 1024)))} MB`);
    
    // Make sure we explicitly clear all timers
    if (progress && progress.timer) {
      clearInterval(progress.timer);
      progress.timer = null;
    }
    
    // Add display of problematic files after showing groups
    if (problematicSVGs.size > 0) {
      console.log('\n');
      console.log(kleur.yellow(kleur.bold('⚠️ Problematic SVG Files:')));
      console.log(kleur.yellow('The following files could not be processed correctly:'));
      console.log('');
      
      // Display each problematic file with its error
      let index = 1;
      for (const [file, error] of problematicSVGs.entries()) {
        await delay(30);
        console.log(`${kleur.red('✗')} ${kleur.white(file)}`);
        console.log(`  ${kleur.gray(`Issue: ${error}`)}`);
        index++;
      }
      
      console.log('');
      console.log(kleur.yellow(`Total problematic files: ${problematicSVGs.size}`));
    }
    
    return allGroups;
  } catch (error) {
    handleError(error, progress);
    setTimeout(() => process.exit(1), 100);
    return [];
  }
}

// Parse command line arguments
const program = new Command();
program
  .name('svg-dedupe')
  .description('Find and group similar SVG files')
  .argument('<directory>', 'Directory containing SVG files to compare')
  .version('1.0.0')
  .parse(process.argv);

const options = program.opts();

const dirPath = program.args[0];

if (!dirPath) {
  const error = new Error('No directory specified');
  handleError(error);
  process.exit(1);
}

// Run the main function with better error handling
compareAndGroupSVGs(dirPath).catch(err => {
  handleError(err);
  setTimeout(() => process.exit(1), 100);
});

module.exports = { compareAndGroupSVGs }; 