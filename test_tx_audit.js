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
        console.log('Critère 1 - Émetteur présent:', data.includes('Alexandre Moreau'));
        console.log('Critère 1 - Destinataire présent:', data.includes('Bénéficiaire') || data.includes('recipient'));
        console.log('Critère 1 - Horodatage présent:', data.includes('Horodatage') || data.includes('2026-09'));
        console.log('Critère 2 - Filtre Montant présent:', data.includes('minAmount') && data.includes('maxAmount'));
        console.log('Critère 2 - Filtre Date présent:', data.includes('dateStart') && data.includes('dateEnd'));
        console.log('Critère 2 - Filtre Comptes présent:', data.includes('name="q"'));

        // Test 2: Export CSV
        http.get('http://localhost:3000/admin/transactions/export', { headers: { 'Cookie': cookie } }, exportRes => {
          let csv = '';
          exportRes.on('data', c => csv += c);
          exportRes.on('end', () => {
            console.log('\n--- TEST EXPORT CSV ---');
            console.log('Critère 3 - Export Status:', exportRes.statusCode);
            console.log('Critère 3 - Content-Type:', exportRes.headers['content-type']);
            console.log('Critère 3 - Content-Disposition:', exportRes.headers['content-disposition']);
            console.log('Critère 3 - CSV Headers:', csv.includes('Reference SEPA;Date et Heure;Emetteur'));
            console.log('Critère 3 - CSV Data:', csv.includes('VIR-SEPA-2026-001'));
          });
        });
      });
    });
  });
  req.write(loginData);
  req.end();
}
testTransactions();
