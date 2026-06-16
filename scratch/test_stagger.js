const apiUrl = "https://script.google.com/macros/s/AKfycbxH_TMsqQkK3XpPUR4-999K7Q0R-P0WNd0rc1vL9b_KYMFB2xMN6VDP6vXqaNw4Kk3b/exec";

async function run() {
  try {
    console.log("Fetching OFFER...");
    const offersRes = await fetch(`${apiUrl}?sheet=OFFER`).then(r => r.json());
    console.log("OFFER Success:", offersRes.success);
    await new Promise(resolve => setTimeout(resolve, 80));
    
    console.log("Fetching SERVICE...");
    const servicesRes = await fetch(`${apiUrl}?sheet=SERVICE`).then(r => r.json());
    console.log("SERVICE Success:", servicesRes.success);
    await new Promise(resolve => setTimeout(resolve, 80));
    
    console.log("Fetching UTILITY...");
    const utilitiesRes = await fetch(`${apiUrl}?sheet=UTILITY`).then(r => r.json());
    console.log("UTILITY Success:", utilitiesRes.success);
    await new Promise(resolve => setTimeout(resolve, 80));
    
    console.log("Fetching Master...");
    const masterRes = await fetch(`${apiUrl}?sheet=Master`)
      .then(r => r.json())
      .catch((err) => {
        console.error("Master fetch failed inside catch:", err);
        return { success: false, data: [] };
      });
    console.log("Master Success:", masterRes.success);
    if (masterRes.success && masterRes.data) {
      console.log("Master data length:", masterRes.data.length);
      console.log("First row of Master:", masterRes.data[0]);
      console.log("Second row of Master:", masterRes.data[1]);
    }
  } catch (err) {
    console.error("Outer error:", err);
  }
}

run();
