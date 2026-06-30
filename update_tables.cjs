const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'pages');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // Replace wrapper in all files except Utility (which has rounded-3xl)
  if (content.includes('className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"')) {
    content = content.replace(
      'className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"',
      'className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-240px)]"'
    );
    changed = true;
  }
  
  // Replace wrapper in Utility
  if (content.includes('className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden"')) {
    content = content.replace(
      'className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden"',
      'className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-130px)]"'
    );
    changed = true;
  }

  // Replace overflow container right before the table
  if (content.includes('className="overflow-x-auto"')) {
    // Only replace the ones that immediately wrap the table
    // It's safer to just replace all for these pages as there is usually only one,
    // but Offers.jsx has an overflow-x-auto for tabs.
    // Let's replace the one right before the table.
    content = content.replace(
      /<div className="overflow-x-auto">\s*<table/g,
      '<div className="overflow-auto flex-1">\n            <table'
    );
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log('Updated ' + file);
  }
}
