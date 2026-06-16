const apiUrl = "https://script.google.com/macros/s/AKfycbxH_TMsqQkK3XpPUR4-999K7Q0R-P0WNd0rc1vL9b_KYMFB2xMN6VDP6vXqaNw4Kk3b/exec";

async function run() {
  try {
    const response = await fetch(`${apiUrl}?sheet=UTILITY`);
    const res = await response.json();
    if (res.success && res.data) {
      const rows = res.data.slice(6); // Slice after header row
      const mapped = rows.map((row, idx) => ({
        sheetRowIndex: 7 + idx,
        timestamp: row[0] || '',
        id: row[1] || '',
        firmName: row[2] || '',
        personName: row[3] || '',
        userName: row[4] || '',
        department: row[5] || '',
        groupHead: row[6] || '',
        payTo: row[7] || '',
        amount: parseFloat(row[8]) || 0,
        billImage: row[9] || '',
        billDate: row[10] || '',
        dueDate: row[11] || '',
        remarks: row[12] || '',
        tdsAmount: parseFloat(row[13]) || 0,
        amountPaid: parseFloat(row[14]) || 0,
        outstanding: parseFloat(row[15]) || 0,
        status: row[16] || '',
        planned1: row[17] || '',
        actual1: row[18] || '',
        delay1: row[19] || '',
        planned2: row[20] || '',
        actual2: row[21] || '',
        delay2: row[22] || '',
      }));
      console.log("Mapped utility row 0:", mapped[0]);
    }
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
