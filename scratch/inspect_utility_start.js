import fs from 'fs';

const filePath = 'c:/Users/USER/OneDrive/Desktop/Service FMS/Service fms/src/pages/Utility.jsx';
const content = fs.readFileSync(filePath, 'utf-8');
const lines = content.split('\n');

lines.forEach((line, i) => {
  if (line.includes('const Utility =')) {
    console.log(`Line ${i + 1}: ${line}`);
  }
});
