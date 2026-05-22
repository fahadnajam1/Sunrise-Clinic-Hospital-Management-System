/**
 * Sunrise Medical Clinic — Create All Users via Admin API
 * 
 * USAGE:
 *   1. Get your SERVICE ROLE key from:
 *      https://supabase.com/dashboard/project/cthzvnzlzmkigwfzybxn/settings/api
 *      (it's the "service_role" key — keep it secret!)
 *   2. Set it below or pass as env var: SERVICE_ROLE_KEY=xxx node scripts/create-users.js
 *   3. Run: node scripts/create-users.js
 */

const SUPABASE_URL = 'https://cthzvnzlzmkigwfzybxn.supabase.co';

// ✅ SERVICE ROLE KEY — bypasses all rate limits and RLS
// Get from: https://supabase.com/dashboard/project/cthzvnzlzmkigwfzybxn/settings/api
const SERVICE_ROLE_KEY = process.env.SERVICE_ROLE_KEY || 'PASTE_YOUR_SERVICE_ROLE_KEY_HERE';

const USERS = [
  { email: 'admin@sunrise.clinic',     password: 'Sunrise@2025', full_name: 'System Administrator', role: 'admin' },
  { email: 'doctor@sunrise.clinic',    password: 'Sunrise@2025', full_name: 'Dr. James Wilson',      role: 'doctor' },
  { email: 'nurse@sunrise.clinic',     password: 'Sunrise@2025', full_name: 'Emily Chen',            role: 'nurse' },
  { email: 'reception@sunrise.clinic', password: 'Sunrise@2025', full_name: 'Sarah Parker',          role: 'receptionist' },
  { email: 'billing@sunrise.clinic',   password: 'Sunrise@2025', full_name: 'Michael Torres',        role: 'billing' },
];

async function createAdminUser(user) {
  // Admin API — /auth/v1/admin/users — requires service_role key, no rate limit
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({
      email: user.email,
      password: user.password,
      email_confirm: true,   // Mark email as confirmed immediately — no verification email needed
      user_metadata: {
        full_name: user.full_name,
        role: user.role,
      },
    }),
  });

  const body = await res.json();

  if (!res.ok) {
    const msg = body?.msg || body?.message || body?.error_description || JSON.stringify(body);
    throw new Error(msg);
  }

  return body;
}

async function main() {
  if (SERVICE_ROLE_KEY === 'PASTE_YOUR_SERVICE_ROLE_KEY_HERE') {
    console.error('\n❌ ERROR: You must set your Supabase service role key!');
    console.error('\nGet it from:');
    console.error('  👉 https://supabase.com/dashboard/project/cthzvnzlzmkigwfzybxn/settings/api');
    console.error('\nThen run:');
    console.error('  $env:SERVICE_ROLE_KEY="eyJ...your_key..."; node scripts/create-users.js\n');
    process.exit(1);
  }

  console.log('🏥 Sunrise Medical Clinic — Creating all users via Admin API (no rate limit)...\n');

  let created = 0, skipped = 0, failed = 0;

  for (const user of USERS) {
    process.stdout.write(`  ${user.role.padEnd(14)} ${user.email.padEnd(32)} ... `);
    try {
      const result = await createAdminUser(user);
      console.log(`✅ Created  (id: ${result.id?.slice(0, 8)}...)`);
      created++;
    } catch (err) {
      if (err.message?.toLowerCase().includes('already been registered') || err.message?.toLowerCase().includes('already exists')) {
        console.log(`⚠️  Already exists`);
        skipped++;
      } else {
        console.log(`❌ FAILED: ${err.message}`);
        failed++;
      }
    }
  }

  console.log('\n─────────────────────────────────────────────');
  console.log(`  ✅ Created: ${created}  ⚠️  Skipped: ${skipped}  ❌ Failed: ${failed}`);
  console.log('─────────────────────────────────────────────');
  console.log('\n📋 All accounts use password: Sunrise@2025');
  console.log('   The app login page should now work for all demo accounts.\n');
}

main().catch(err => {
  console.error('\n❌ Fatal error:', err.message);
  process.exit(1);
});
