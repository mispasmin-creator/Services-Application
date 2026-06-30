const fs = require('fs');

let content = fs.readFileSync('src/pages/Utility.jsx', 'utf8');

// 1. Fix Layout
content = content.replace(
  '<div className="space-y-6 max-w-[1600px] mx-auto pb-12">',
  '<div className="flex flex-col h-screen max-w-[1600px] mx-auto pb-4 space-y-6">'
);

content = content.replace(
  'className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-130px)]"',
  'className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden flex flex-col flex-1 min-h-0"'
);

// 2. Remove Actions Column from Approval Tab
content = content.replace(
  "{activeTab !== 'create' && (\n                    <th className=\"px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right\">Actions</th>\n                  )}",
  "{activeTab !== 'create' && activeTab !== 'approval' && (\n                    <th className=\"px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right\">Actions</th>\n                  )}"
);

content = content.replace(
  "{activeTab !== 'create' && (\n                        <td className=\"px-6 py-4 text-right\">",
  "{activeTab !== 'create' && activeTab !== 'approval' && (\n                        <td className=\"px-6 py-4 text-right\">"
);

// 3. Add Submit Option to Checkbox in Approval Tab
content = content.replace(
  '<input type="checkbox" className="rounded-md border-gray-300 focus:ring-gray-900/20 w-4 h-4 cursor-pointer" onChange={(e) => handleApprovalCheckbox(utility.sheetRowIndex, e)} />',
  `
  <div className="flex flex-col gap-2 items-start">
    <label className="flex items-center gap-1.5 cursor-pointer">
      <input 
        type="checkbox" 
        className="rounded-md border-gray-300 focus:ring-gray-900/20 w-4 h-4 cursor-pointer" 
        onChange={(e) => {
          if (e.target.checked) {
            handleApprovalCheckbox(utility.sheetRowIndex, e);
            e.target.checked = false; 
          }
        }} 
      />
      <span className="text-xs font-medium text-gray-600">Select</span>
    </label>
    <button 
      onClick={(e) => handleApprovalCheckbox(utility.sheetRowIndex, e)}
      className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm text-[10px] font-bold transition-all w-full text-center"
    >
      Submit
    </button>
  </div>
  `
);

fs.writeFileSync('src/pages/Utility.jsx', content);
console.log('Successfully patched Utility.jsx');
