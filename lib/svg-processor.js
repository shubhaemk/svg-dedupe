const { optimize } = require('svgo');

// Configure SVGO optimization settings
const config = {
  multipass: true,
  plugins: [
    {
      name: 'preset-default',
      params: {
        overrides: {
          // disable plugins that would change the appearance
          removeViewBox: false,
          removeRasterImages: false,
          removeDimensions: false
        },
      },
    },
    // Enable these additional plugins
    'cleanupAttrs',
    'removeDoctype',
    'removeXMLProcInst',
    'removeComments',
    'removeMetadata',
    'removeTitle',
    'removeDesc',
    'sortAttrs',
    'removeEmptyAttrs',
    'convertColors',
    'convertPathData',
    'convertTransform',
    'mergeStyles',
    'inlineStyles',
    'minifyStyles',
    'reusePaths'
  ],
};

/**
 * Standardizes SVG content for better comparison
 * 
 * @param {string} svgContent The original SVG content
 * @returns {string} The optimized SVG content
 */
async function standardizeSVG(svgContent) {
  try {
    const result = optimize(svgContent, config);
    return result.data;
  } catch (error) {
    // If optimization fails, return original content
    console.error(`SVGO optimization failed: ${error.message}`);
    return svgContent;
  }
}

module.exports = { standardizeSVG }; 