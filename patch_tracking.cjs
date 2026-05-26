const fs = require('fs');

let fileContent = fs.readFileSync('src/utils/trackingService.js', 'utf8');

// 1. Remove watchId declaration
fileContent = fileContent.replace('let watchId = null;\n', '');

// 2. Export upsertLocation so LiveTracking can use it if needed, or just export updateMyLocationOnce
fileContent = fileContent.replace(
  /const upsertLocation = async \(userId, coords\) => \{/g,
  'export const upsertLocation = async (userId, coords) => {'
);

// 3. Replace startTracking and stopTracking with updateMyLocationOnce
const startStopRegex = /\/\/ ── Start watching position ──[\s\S]*?(?=\/\/ ── Haversine distance \(km\) ──)/;

const newCode = `// ── Update Location Once (On-Demand) ──
export const updateMyLocationOnce = async (userId) => {
  const pos = await getCurrentLocation();
  if (pos) {
    await upsertLocation(userId, pos.coords);
    return pos.coords;
  }
  return null;
};

`;

fileContent = fileContent.replace(startStopRegex, newCode);

fs.writeFileSync('src/utils/trackingService.js', fileContent);
