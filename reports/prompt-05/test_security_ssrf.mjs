import assert from 'node:assert';

async function runSecuritySsrfTests() {
  console.log('====================================================');
  console.log('TEST SUITE 1: SSRF, PORT & METADATA SECURITY DEFENSES');
  console.log('====================================================\n');

  const attackVectors = [
    { name: 'IPv4 Loopback (127.0.0.1)', url: 'http://127.0.0.1:80' },
    { name: 'IPv4 Loopback with internal port (127.0.0.1:3000)', url: 'http://127.0.0.1:3000' },
    { name: 'Localhost alias', url: 'http://localhost:8080' },
    { name: 'AWS/GCP Link-Local Metadata (169.254.169.254)', url: 'http://169.254.169.254/latest/meta-data/' },
    { name: 'Private Network RFC1918 (10.0.0.1)', url: 'http://10.0.0.1:8080' },
    { name: 'Private Network RFC1918 (192.168.1.1)', url: 'http://192.168.1.1:80' },
    { name: 'Restricted Port (SSH 22)', url: 'http://scanme.nmap.org:22' },
    { name: 'Restricted Port (PostgreSQL 5432)', url: 'http://scanme.nmap.org:5432' },
    { name: 'Restricted Port (Redis 6379)', url: 'http://scanme.nmap.org:6379' },
    { name: 'Internal domain suffix (.local)', url: 'http://printer.office.local' },
    { name: 'Internal domain suffix (.internal)', url: 'http://db.cluster.internal' },
  ];

  const results = [];

  for (const vector of attackVectors) {
    // Test 1: Website Audit API
    const resAudit = await fetch('http://localhost:3000/api/audit/inspect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: vector.url }),
    });
    const dataAudit = await resAudit.json();
    const isAuditBlocked = resAudit.status === 403 || resAudit.status === 400 || (dataAudit.error && dataAudit.error.includes('SSRF'));

    // Test 2: Contact Extract API
    const resContact = await fetch('http://localhost:3000/api/contact/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: vector.url }),
    });
    const dataContact = await resContact.json();
    const isContactBlocked = resContact.status === 403 || resContact.status === 400 || (dataContact.error && dataContact.error.includes('SSRF'));

    // Test 3: Competitor Snapshot API
    const resCompetitor = await fetch('http://localhost:3000/api/competitor/snapshot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ watchId: 'watch-sec-test', url: vector.url }),
    });
    const dataComp = await resCompetitor.json();
    const isCompBlocked = resCompetitor.status === 400 || resCompetitor.status === 403;

    const allBlocked = isAuditBlocked && isContactBlocked && isCompBlocked;
    results.push({
      vector: vector.name,
      url: vector.url,
      auditStatus: resAudit.status,
      contactStatus: resContact.status,
      competitorStatus: resCompetitor.status,
      blocked: allBlocked,
    });

    console.log(`  [${allBlocked ? 'BLOCKED' : 'FAILED'}] ${vector.name} -> Audit:${resAudit.status}, Contact:${resContact.status}, Comp:${resCompetitor.status}`);
  }

  const allPassed = results.every(r => r.blocked);
  console.log(`\nSSRF Security Verdict: ${allPassed ? 'PASS (100% Blocked)' : 'FAIL'}`);

  return { suite: 'Security & SSRF', passed: allPassed, totalVectors: results.length, details: results };
}

runSecuritySsrfTests()
  .then(res => {
    if (!res.passed) process.exit(1);
  })
  .catch(err => {
    console.error('Test suite error:', err);
    process.exit(1);
  });
