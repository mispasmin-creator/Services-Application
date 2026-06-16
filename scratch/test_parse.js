const apiUrl = "https://script.google.com/macros/s/AKfycbxH_TMsqQkK3XpPUR4-999K7Q0R-P0WNd0rc1vL9b_KYMFB2xMN6VDP6vXqaNw4Kk3b/exec";

const findHeaderRow = (data, knownCol) => {
  if (!data || !data.length) return { headerIdx: -1, headers: [] };
  for (let i = 0; i < data.length; i++) {
    if (data[i] && data[i].some(cell => String(cell).trim() === knownCol)) {
      return { headerIdx: i, headers: data[i] };
    }
  }
  return { headerIdx: -1, headers: [] };
};

async function run() {
  try {
    const utilitiesRes = await fetch(`${apiUrl}?sheet=UTILITY`).then(r => r.json());
    console.log("Success:", utilitiesRes.success);
    
    // Check with 'UT-Utility No.'
    let { headerIdx, headers } = findHeaderRow(utilitiesRes.data, 'UT-Utility No.');
    console.log("With 'UT-Utility No.': headerIdx =", headerIdx, "headers length =", headers.length);
    
    // Check with 'Utility No.'
    let res2 = findHeaderRow(utilitiesRes.data, 'Utility No.');
    console.log("With 'Utility No.': headerIdx =", res2.headerIdx, "headers length =", res2.headers.length);
    
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
