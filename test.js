const fetch = require('node-fetch') || globalThis.fetch;
fetch('http://localhost:3000/api/admin/create-member', { 
  method: 'POST', 
  headers: { 'Content-Type': 'application/json' }, 
  body: JSON.stringify({ email: 'test@test.com', password: 'password123', displayName: 'Test User' }) 
})
.then(r => r.text())
.then(t => { 
  const match = t.match(/"message":"([^"]+)"/); 
  if(match) console.log("ERROR MESSAGE:", match[1]); 
  else console.log(t.substring(0,500)); 
})
.catch(console.error);
