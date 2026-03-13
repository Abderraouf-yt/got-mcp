const fs = require('fs');
const path = require('path');

const file = 'C:\\Users\\toumi\\.gemini\\antigravity\\brain\\2fd48ae9-3696-47c6-85a3-60c1940b52f3\\thought_graph_logo_1773242925676.png';
const base64 = fs.readFileSync(file).toString('base64');
const outPath = path.join(__dirname, 'src', 'server', 'logo.ts');

const content = `export const THOUGHT_GRAPH_LOGO_B64 = '${base64}';\n`;
fs.writeFileSync(outPath, content);
console.log('Successfully wrote logo.ts');
