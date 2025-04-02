const kleur = require('kleur');

function createProgressTracker() {
  const totalSteps = 100;
  let currentStep = 0;
  let currentPhase = '';
  let timer = null;
  
  const start = () => {
    timer = setInterval(() => {
      const barLength = 40;
      const filledLength = Math.round(barLength * (currentStep / totalSteps));
      
      const bar = kleur.green('█'.repeat(filledLength)) + 
                 kleur.gray('▒'.repeat(barLength - filledLength));
      
      const percentText = kleur.yellow(`${currentStep}%`);
      const phaseText = kleur.cyan(`${currentPhase}`);
      
      process.stdout.write(`\r${kleur.bold('[')}${bar}${kleur.bold(']')} ${percentText} | ${phaseText}`);
    }, 100);
  };
  
  const updateProgress = (percent, phase) => {
    currentStep = Math.min(Math.round(percent), 100);
    if (phase) {
      currentPhase = phase;
    }
  };
  
  const finish = () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
      const barLength = 40;
      const bar = kleur.green('█'.repeat(barLength));
      process.stdout.write(`\r${kleur.bold('[')}${bar}${kleur.bold(']')} ${kleur.green(kleur.bold('100%'))} | ${kleur.green(kleur.bold('Complete!'))}${' '.repeat(30)}\n`);
    }
  };
  
  return { start, updateProgress, finish, get timer() { return timer; } };
}

function smoothProgressUpdate(progress, phase, percent, phaseLabel, calculateProgress) {
  const smallIncrement = Math.random() * 5;
  if (percent > 0 && percent < 95) {
    progress.updateProgress(
      calculateProgress(phase, percent - smallIncrement), 
      phaseLabel
    );
    setTimeout(() => {
      progress.updateProgress(
        calculateProgress(phase, percent), 
        phaseLabel
      );
    }, 50);
  } else {
    progress.updateProgress(
      calculateProgress(phase, percent), 
      phaseLabel
    );
  }
}

module.exports = { createProgressTracker, smoothProgressUpdate }; 