const kleur = require('kleur');

function handleError(error, progress) {
  if (progress && progress.timer) {
    clearInterval(progress.timer);
    progress.timer = null;
  }
  
  process.stdout.write('\r');
  console.clear();
  
  console.log('\n');
  console.log(kleur.red('╔═══════════════════════════════════════════════════╗'));
  console.log(kleur.red('║                     ERROR                         ║'));
  console.log(kleur.red('╚═══════════════════════════════════════════════════╝'));
  console.log('');
  console.log(kleur.red(kleur.bold('Error message:')), kleur.white(error.message || error));
  
  if (error.stack) {
    console.log('');
    console.log(kleur.yellow(kleur.bold('Stack trace:')));
    console.log(kleur.gray(error.stack.split('\n').slice(1).join('\n')));
  }
  console.log('');
}

module.exports = { handleError }; 