const API_KEY = "AIzaSyDtxLebf3PUeSv_5SC-52k3_Q4wpql73Mc";

async function compareVersions() {
    const versions = ["v1", "v1beta"];
    const model = "gemini-1.5-flash";

    for (const v of versions) {
        try {
            console.log(`Testing ${model} on ${v}...`);
            const res = await fetch(`https://generativelanguage.googleapis.com/${v}/models/${model}:generateContent?key=${API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: "hi" }] }] })
            });
            const data = await res.json();
            if (data.candidates) {
                console.log(`✅ ${model} on ${v} WORKS!`);
            } else {
                console.log(`❌ ${model} on ${v} FAILED: ${data.error?.message || JSON.stringify(data)}`);
            }
        } catch (e) {
            console.log(`❌ ${model} on ${v} ERROR: ${e.message}`);
        }
    }
}

compareVersions();
