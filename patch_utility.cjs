const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'Utility.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// We need to add the handleApprovalCheckbox function somewhere in the component
if (!content.includes('const handleApprovalCheckbox = async (rowIndex) => {')) {
  const insertIndex = content.indexOf('// Delete functionality');
  if (insertIndex > -1) {
    const fn = `
  const handleApprovalCheckbox = async (rowIndex, e) => {
    e.stopPropagation();
    try {
      setIsSaving(true);
      const timestamp = new Date().toISOString();
      await updateUtility(rowIndex, { actual1: timestamp });
      alert('Updated Actual 1 timestamp!');
    } catch (err) {
      alert('Error updating approval timestamp: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

`;
    content = content.slice(0, insertIndex) + fn + content.slice(insertIndex);
  }
}

// Replace the table headers
const oldTheadStart = '              <thead>';
const oldTheadEnd = '              </thead>';
const startIndex = content.indexOf(oldTheadStart);
const endIndex = content.indexOf(oldTheadEnd) + oldTheadEnd.length;

if (startIndex > -1 && endIndex > -1) {
  const newThead = `              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {/* Selection Checkbox (Bulk) */}
                  {(activeTab === 'payment') && (
                    <th className="w-12 px-6 py-4">
                      <input 
                        type="checkbox" 
                        className="rounded-md border-gray-300 focus:ring-gray-900/20 w-4 h-4 cursor-pointer"
                        onChange={handleSelectAll}
                        checked={
                          paginatedUtilities.length > 0 && 
                          paginatedUtilities.every(u => selectedRows.includes(u.sheetRowIndex))
                        }
                      />
                    </th>
                  )}
                  {/* Single Approval Checkbox */}
                  {activeTab === 'approval' && (
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Approve</th>
                  )}

                  {activeTab === 'create' && (
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Timestamp</th>
                  )}
                  <th onClick={() => handleSort('id')} className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-1"><span>Utility No.</span>{sortColumn === 'id' && (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}</div>
                  </th>
                  <th onClick={() => handleSort('firmName')} className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-1"><span>Firm Name</span>{sortColumn === 'firmName' && (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}</div>
                  </th>
                  <th onClick={() => handleSort('personName')} className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-1"><span>Person Name</span>{sortColumn === 'personName' && (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}</div>
                  </th>
                  {activeTab === 'create' && (
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer">Name Of User</th>
                  )}
                  <th onClick={() => handleSort('department')} className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-1"><span>Department</span>{sortColumn === 'department' && (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}</div>
                  </th>
                  <th onClick={() => handleSort('groupHead')} className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-1"><span>Group Head</span>{sortColumn === 'groupHead' && (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}</div>
                  </th>
                  <th onClick={() => handleSort('payTo')} className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-1"><span>Pay To</span>{sortColumn === 'payTo' && (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}</div>
                  </th>
                  <th onClick={() => handleSort('amount')} className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors text-right">
                    <div className="flex items-center gap-1 justify-end"><span>Bill Amount</span>{sortColumn === 'amount' && (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}</div>
                  </th>
                  {activeTab === 'create' && (
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Bill Image</th>
                  )}
                  {activeTab !== 'create' && (
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Bill Copy</th>
                  )}
                  <th onClick={() => handleSort('billDate')} className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-1"><span>Bill Date</span>{sortColumn === 'billDate' && (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}</div>
                  </th>
                  <th onClick={() => handleSort('dueDate')} className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-1"><span>Due Date</span>{sortColumn === 'dueDate' && (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}</div>
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Remarks</th>
                  <th onClick={() => handleSort('tdsAmount')} className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors text-right">
                    <div className="flex items-center gap-1 justify-end"><span>TDS Amount</span>{sortColumn === 'tdsAmount' && (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}</div>
                  </th>
                  <th onClick={() => handleSort('amountPaid')} className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors text-right">
                    <div className="flex items-center gap-1 justify-end"><span>Amount To Be Paid</span>{sortColumn === 'amountPaid' && (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}</div>
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Outstanding Amount</th>
                  <th onClick={() => handleSort('status')} className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-1"><span>Status</span>{sortColumn === 'status' && (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}</div>
                  </th>
                  {activeTab === 'approval' && (
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Payment Form Link</th>
                  )}
                  {activeTab !== 'create' && (
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                  )}
                </tr>
              </thead>`;

  content = content.slice(0, startIndex) + newThead + content.slice(endIndex);
}

// Replace the table body row columns
const oldRowStart = '                      {/* Selection checkbox */}';
const oldRowEnd = '                      {/* Row Action buttons */}';
const rowStartIndex = content.indexOf(oldRowStart);
const rowEndIndex = content.indexOf(oldRowEnd);

if (rowStartIndex > -1 && rowEndIndex > -1) {
  const newRow = `                      {/* Bulk Selection checkbox */}
                      {activeTab === 'payment' && (
                        <td className="px-6 py-4">
                          <input type="checkbox" className="rounded-md border-gray-300 focus:ring-gray-900/20 w-4 h-4 cursor-pointer" checked={isChecked} onChange={(e) => handleSelectRow(e, utility.sheetRowIndex)} />
                        </td>
                      )}
                      {/* Single Approval Checkbox */}
                      {activeTab === 'approval' && (
                        <td className="px-6 py-4">
                          <input type="checkbox" className="rounded-md border-gray-300 focus:ring-gray-900/20 w-4 h-4 cursor-pointer" onChange={(e) => handleApprovalCheckbox(utility.sheetRowIndex, e)} />
                        </td>
                      )}

                      {activeTab === 'create' && (
                        <td className="px-6 py-4 text-gray-500 font-medium whitespace-nowrap">{utility.timestamp || '—'}</td>
                      )}
                      <td className="px-6 py-4 font-bold text-gray-950 whitespace-nowrap">
                        <div className="flex items-center gap-1.5"><Zap size={14} className="text-gray-700" /><span>{utility.id}</span></div>
                      </td>
                      <td className="px-6 py-4 text-gray-800 font-medium whitespace-nowrap">{utility.firmName || '—'}</td>
                      <td className="px-6 py-4 text-gray-800 font-medium whitespace-nowrap">{utility.personName || '—'}</td>
                      {activeTab === 'create' && (
                        <td className="px-6 py-4 text-gray-800 font-medium whitespace-nowrap">{utility.userName || '—'}</td>
                      )}
                      <td className="px-6 py-4 text-gray-600 font-medium whitespace-nowrap">{utility.department || '—'}</td>
                      <td className="px-6 py-4 text-gray-600 font-medium whitespace-nowrap">{utility.groupHead || '—'}</td>
                      <td className="px-6 py-4 font-medium text-gray-700 whitespace-nowrap">{utility.payTo}</td>
                      <td className="px-6 py-4 text-right font-bold text-gray-900 whitespace-nowrap">{formatCurrency(utility.amount)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {utility.billImage ? (
                          <a href={utility.billImage} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-gray-700 hover:text-gray-900 font-bold hover:underline">
                            <Paperclip size={13} /><span>View</span>
                          </a>
                        ) : (<span className="text-gray-400 italic text-xs">No File</span>)}
                      </td>
                      <td className="px-6 py-4 text-gray-500 font-medium whitespace-nowrap">{utility.billDate ? utility.billDate.split('T')[0] : '—'}</td>
                      <td className="px-6 py-4 text-gray-500 font-medium whitespace-nowrap">{utility.dueDate ? utility.dueDate.split('T')[0] : '—'}</td>
                      <td className="px-6 py-4 text-gray-500 max-w-[180px] truncate whitespace-nowrap" title={utility.remarks}>{utility.remarks || '—'}</td>
                      <td className="px-6 py-4 text-right font-bold text-rose-600 whitespace-nowrap">{utility.tdsAmount > 0 ? \`-\${formatCurrency(utility.tdsAmount)}\` : 'No TDS'}</td>
                      <td className="px-6 py-4 text-right font-bold text-emerald-700 whitespace-nowrap">{formatCurrency(utility.amountPaid)}</td>
                      <td className="px-6 py-4 text-right font-bold text-amber-600 whitespace-nowrap">{formatCurrency(utility.outstanding)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={cn(
                          "px-2.5 py-1 rounded-full text-xs font-bold inline-block text-center border min-w-[110px]",
                          utility.status === 'Completed' && "bg-emerald-50 text-emerald-700 border-emerald-100",
                          utility.status === 'Approved' && "bg-indigo-50 text-indigo-700 border-indigo-100",
                          utility.status?.includes('Pending') && "bg-amber-50 text-amber-700 border-amber-100",
                          utility.status === 'Rejected' && "bg-rose-50 text-rose-700 border-rose-100",
                          utility.status === 'On Hold' && "bg-gray-100 text-gray-700 border-gray-200"
                        )}>{utility.status}</span>
                      </td>
                      {activeTab === 'approval' && (
                        <td className="px-6 py-4 text-gray-500 font-medium whitespace-nowrap">
                          {utility.paymentFormLink ? (
                            <a href={utility.paymentFormLink} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">Link</a>
                          ) : '—'}
                        </td>
                      )}
                      
`;
  content = content.slice(0, rowStartIndex) + newRow + content.slice(rowEndIndex);
}

// Ensure Actions is not rendered for create tab
const rowActionStart = '                      {/* Row Action buttons */}';
const rowActionEnd = '                    </tr>';
const actionStartIdx = content.indexOf(rowActionStart);
const actionEndIdx = content.indexOf(rowActionEnd, actionStartIdx);

if (actionStartIdx > -1 && actionEndIdx > -1) {
  const originalActionBlock = content.slice(actionStartIdx, actionEndIdx);
  if (!originalActionBlock.includes('{activeTab !== \'create\' && (')) {
    const wrappedActionBlock = `                      {/* Row Action buttons */}
                      {activeTab !== 'create' && (
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end items-center gap-2">
` + originalActionBlock.split('<div className="flex justify-end items-center gap-2">')[1].split('</td>')[0] + `                        </td>
                      )}
`;
    content = content.slice(0, actionStartIdx) + wrappedActionBlock + content.slice(actionEndIdx);
  }
}

fs.writeFileSync(filePath, content);
console.log('Successfully patched Utility.jsx');
