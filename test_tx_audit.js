const http = require('http');

async function testTransactions() {
  const loginData = 'name=admin%40hosbank.fr&password=Admin123%21';
  const req = http.request('http://localhost:3000/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(loginData) }
  }, res => {
    const rawCookies = res.headers['set-cookie'];
    const cookie = rawCookies ? rawCookies.map(c => c.split(';')[0]).join('; ') : '';

    // Test 1: Main page
    http.get('http://localhost:3000/admin/transactions', { headers: { 'Cookie': cookie } }, txRes => {
      let data = '';
      txRes.on('data', c => data += c);
      txRes.on('end', () => {
        console.log('--- TEST TRANSACTIONS PAGE ---');
        console.log('Status:', txRes.statusCode);
        console.log('Test - Émetteur présent:', data.includes('Alexandre Moreau'));
        console.log('Test - Destinataire présent:', data.includes('Bénéficiaire') || data.includes('recipient'));
        console.log('Test - Horodatage présent:', data.includes('Horodatage') || data.includes('2026-09'));
        console.log('Test - Filtre Montant présent:', data.includes('minAmount') && data.includes('maxAmount'));
        console.log('Test - Filtre Date présent:', data.includes('dateStart') && data.includes('dateEnd'));
        console.log('Test - Filtre Comptes présent:', data.includes('name="q"'));

        // Test 2: Export CSV
        http.get('http://localhost:3000/admin/transactions/export', { headers: { 'Cookie': cookie } }, exportRes => {
          let csv = '';
          exportRes.on('data', c => csv += c);
          exportRes.on('end', () => {
            console.log('\n--- TEST EXPORT CSV ---');
            console.log('Export Status:', exportRes.statusCode);
            console.log('Content-Type:', exportRes.headers['content-type']);
            console.log('Content-Disposition:', exportRes.headers['content-disposition']);
            console.log('CSV Headers:', csv.includes('Reference SEPA;Date et Heure;Emetteur'));
            console.log('CSV Data:', csv.includes('VIR-SEPA-2026-001'));
          });
        });
      });
    });
  });
  req.write(loginData);
  req.end();
}
testTransactions();
