const apiUrl = "https://script.google.com/macros/s/AKfycbxH_TMsqQkK3XpPUR4-999K7Q0R-P0WNd0rc1vL9b_KYMFB2xMN6VDP6vXqaNw4Kk3b/exec";

async function run() {
  try {
    // 1. Fetch current UTILITY data to get the headers and row index
    const response = await fetch(`${apiUrl}?sheet=UTILITY`);
    const res = await response.json();
    if (!res.success) {
      console.error("Failed to fetch UTILITY:", res);
      return;
    }
    
    // Find header row (which we know is at index 5, row 6 in Sheets)
    const headerRow = res.data[5];
    console.log("Current headers:", headerRow);
    
    // Add new columns if they are not already present
    const newColumns = [
      'Payment Number',
      'Payment Mode',
      'Transaction Reference',
      'Payment Date',
      'Payment Attachment',
      'Payment Remarks'
    ];
    
    const updatedHeaders = [...headerRow];
    newColumns.forEach(col => {
      if (!updatedHeaders.includes(col)) {
        updatedHeaders.push(col);
      }
    });
    
    console.log("Updated headers to save:", updatedHeaders);
    
    // Call the POST API to update the header row (row index 6)
    const params = new URLSearchParams();
    params.append('sheetName', 'UTILITY');
    params.append('action', 'update');
    params.append('rowIndex', '6');
    params.append('rowData', JSON.stringify(updatedHeaders));
    
    const postRes = await fetch(apiUrl, {
      method: 'POST',
      body: params,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }).then(r => r.json());
    
    console.log("Result of updating headers:", postRes);
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
