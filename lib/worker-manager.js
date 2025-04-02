const { Worker } = require('worker_threads');
const path = require('path');
const kleur = require('kleur');

function runWorker(index, pairs, contentMap) {
  return new Promise((resolve) => {
    // Point to the worker file with proper path resolution
    const worker = new Worker(path.join(__dirname, 'worker.js'), {
      workerData: { pairs, contentMap }
    });
    
    worker.on('message', (data) => {
      if (data.errors && data.errors.length > 0) {
        data.errors.forEach(err => {
          err.files.forEach(file => {
            global.problematicSVGs?.set?.(file, `Error in comparison: ${err.error}`);
          });
        });
      }
      resolve(data.results || []);
    });
    
    worker.on('error', (err) => {
      process.stderr.write(`\n${kleur.yellow(kleur.bold('Worker Error:'))} ${kleur.red(err.message)}\n`);
      resolve([]);
    });
    
    worker.on('exit', (code) => {
      if (code !== 0) {
        process.stderr.write(`\n${kleur.yellow(kleur.bold('Warning:'))} Worker ${index} exited with code ${code}\n`);
        resolve([]);
      }
    });
  });
}

module.exports = { runWorker }; 