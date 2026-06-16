const apiUrl = "https://script.google.com/macros/s/AKfycbxH_TMsqQkK3XpPUR4-999K7Q0R-P0WNd0rc1vL9b_KYMFB2xMN6VDP6vXqaNw4Kk3b/exec";

async function run() {
  try {
    const response = await fetch(`${apiUrl}?sheet=Master`);
    const res = await response.json();
    console.log("Success:", res.success);
    if (res.success && res.data) {
      console.log("Total rows in Master:", res.data.length);
      for (let i = 0; i < Math.min(10, res.data.length); i++) {
        console.log(`Row ${i}:`, res.data[i]);
      }
    } else {
      console.log("No data or unsuccessful:", res);
    }
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
