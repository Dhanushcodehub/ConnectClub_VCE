const fs = require('fs');

async function testUpload() {
  try {
    const formData = new FormData();
    const pngBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
    const blob = new Blob([pngBuffer], { type: 'image/png' });
    formData.append('file', blob, 'test.png');
    formData.append('type', 'image');

    const res = await fetch('http://localhost:3000/api/upload', {
      method: 'POST',
      body: formData
    });

    const data = await res.json();
    console.log("Status:", res.status);
    console.log("Response:", data);
  } catch (e) {
    console.error("Fetch Error:", e);
  }
}

testUpload();
