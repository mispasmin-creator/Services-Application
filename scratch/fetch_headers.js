const apiUrl = "https://script.google.com/macros/s/AKfycbxH_TMsqQkK3XpPUR4-999K7Q0R-P0WNd0rc1vL9b_KYMFB2xMN6VDP6vXqaNw4Kk3b/exec";

async function run() {
  try {
    const response = await fetch(`${apiUrl}?sheet=UTILITY`);
    const res = await response.json();
    if (res.success && res.data) {
      console.log("Total rows:", res.data.length);
      res.data.forEach((row, i) => {
        if (row && row.some(cell => String(cell).trim() === 'UT-Utility No.')) {
          console.log(`Found UT-Utility No. in Row ${i}:`, row);
        }
        if (row && row.some(cell => String(cell).trim() === 'Utility No.')) {
          console.log(`Found Utility No. in Row ${i}:`, row);
        }
      });
    }
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
