const fs = require('fs');
const path = require('path');

// List of files to fix
const filesToFix = [
  'app/(main)/account/(tab)/history.tsx',
  'app/(main)/account/(tab)/index.tsx',
  'app/(main)/account/(tab)/positions.tsx',
  'app/(main)/trade/[market]/(tab)/history.tsx',
  'app/(main)/trade/[market]/(tab)/orders.tsx',
  'app/(main)/trade/[market]/(tab)/positions.tsx',
  'app/close-position.tsx',
];

// Base content for empty files
const baseContent = componentName => `import { Text, YStack } from 'tamagui';

export default function ${componentName}() {
  return (
    <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$gray3">
      <Text fontFamily="$interSemiBold" fontSize="$5">
        ${componentName}
      </Text>
      <Text marginTop="$4" color="$gray10">
        Content will be implemented here
      </Text>
    </YStack>
  );
}
`;

// Function to generate component name from file path
function generateComponentName(filePath) {
  const fileName = path.basename(filePath, '.tsx');
  const parts = filePath.split('/');

  // Handle special cases
  if (fileName === 'index') {
    const parentDir = parts[parts.length - 2];
    if (parentDir === '(tab)') {
      const marketDir = parts[parts.length - 3];
      if (marketDir === '[market]') {
        return 'MarketIndexScreen';
      }
      return 'AccountIndexScreen';
    }
    return 'IndexScreen';
  }

  // For other files, create a name based on the path
  if (filePath.includes('account')) {
    return `Account${fileName.charAt(0).toUpperCase() + fileName.slice(1)}Screen`;
  }

  if (filePath.includes('trade')) {
    return `Market${fileName.charAt(0).toUpperCase() + fileName.slice(1)}Screen`;
  }

  if (fileName === 'close-position') {
    return 'ClosePositionScreen';
  }

  return `${fileName.charAt(0).toUpperCase() + fileName.slice(1)}Screen`;
}

// Fix each file
filesToFix.forEach(relativeFilePath => {
  const filePath = path.join(process.cwd(), relativeFilePath);

  try {
    const stats = fs.statSync(filePath);
    const fileContent = fs.readFileSync(filePath, 'utf8');

    // Only fix empty files or files without default export
    if (stats.size === 0 || !fileContent.includes('export default')) {
      const componentName = generateComponentName(relativeFilePath);
      fs.writeFileSync(filePath, baseContent(componentName));
      console.log(`Fixed: ${relativeFilePath} with component ${componentName}`);
    } else {
      console.log(`Skipped: ${relativeFilePath} (already has content)`);
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log(`File not found: ${relativeFilePath}`);
    } else {
      console.error(`Error processing ${relativeFilePath}:`, error);
    }
  }
});

console.log('Done fixing empty route files.');
