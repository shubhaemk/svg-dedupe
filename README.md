# svg-dedupe

A command-line tool to find similar SVG files in a directory and group them together.

## Features

- Standardizes SVGs for better comparison using SVGO
- Identifies exact duplicates via MD5 hashing
- Finds similar SVGs using content comparison
- Multi-threaded processing for better performance
- Handles large collections efficiently

## Installation

### Global Installation (recommended)

```bash
npm install -g svg-dedupe
```

After installing globally, you can use the `svg-dedupe` command from anywhere.

### Local Installation

```bash
npm install svg-dedupe
```

With local installation, you'll need to use it via npx:

```bash
npx svg-dedupe <directory>
```

## Usage

### Basic Usage

```bash
svg-dedupe /path/to/svg/directory
```

This will scan the directory for SVG files, identify duplicates and similar files, and group them together.

### Example Output

```
✓ Finished processing. Found 5 groups of similar SVGs.
Displaying 5 groups with 15 total files...

Group 1 of 5:
→ /path/to/circle1.svg
→ /path/to/circle2.svg
→ /path/to/circle-copy.svg

Group 2 of 5:
→ /path/to/logo1.svg
→ /path/to/logo-alt.svg

...

Total processing time: 1.234s

Memory usage:
  RSS: 45 MB
  Heap total: 12 MB
  Heap used: 8 MB
```

## How It Works

1. **Find SVG Files**: Recursively searches the specified directory for SVG files
2. **Standardize & Hash**: Uses SVGO to normalize SVGs, then hashes them for exact duplicate detection
3. **Group Exact Duplicates**: Files with identical hashes are grouped together
4. **Compare Similar Files**: Performs text-based similarity comparison on non-identical files
5. **Create Groups**: Forms groups of similar SVGs based on similarity threshold

## Performance Notes

- Multi-threaded processing enables efficient handling of large collections
- Processing time depends on the number of SVGs and their complexity
- For very large collections (thousands of files), it might take a few minutes

## Example Use Cases

- Cleaning up design asset libraries
- Finding duplicate SVG icons in a web project
- Organizing SVG collections

## License

MIT
