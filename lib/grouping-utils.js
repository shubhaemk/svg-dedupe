function groupSimilarSVGs(similarityResults, progressCallback) {
  const groups = [];
  const processed = new Set();
  
  similarityResults.sort((a, b) => b.similarity - a.similarity);
  
  const totalResults = similarityResults.length;
  let processedCount = 0;
  
  for (const result of similarityResults) {
    processedCount++;
    
    if (processed.has(result.file1) && processed.has(result.file2)) {
      if (progressCallback && processedCount % Math.max(1, Math.floor(totalResults / 100)) === 0) {
        progressCallback((processedCount / totalResults) * 100);
      }
      continue;
    }
    
    let foundGroup = false;
    for (const group of groups) {
      const hasFile1 = group.includes(result.file1);
      const hasFile2 = group.includes(result.file2);
      
      if (hasFile1 && !hasFile2) {
        group.push(result.file2);
        processed.add(result.file2);
        foundGroup = true;
        break;
      } else if (!hasFile1 && hasFile2) {
        group.push(result.file1);
        processed.add(result.file1);
        foundGroup = true;
        break;
      } else if (hasFile1 && hasFile2) {
        foundGroup = true;
        break;
      }
    }
    
    if (!foundGroup) {
      const newGroup = [result.file1, result.file2];
      groups.push(newGroup);
      processed.add(result.file1);
      processed.add(result.file2);
    }
    
    if (progressCallback && processedCount % Math.max(1, Math.floor(totalResults / 100)) === 0) {
      progressCallback((processedCount / totalResults) * 100);
    }
  }
  
  if (progressCallback) {
    progressCallback(100);
  }
  
  return groups;
}

module.exports = { groupSimilarSVGs }; 