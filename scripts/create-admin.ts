/**
 * Run once to create the admin/owner account:
 *   npx ts-node --esm scripts/create-admin.ts
 *
 * Or via tsx:
 *   npx tsx scripts/create-admin.ts
 */
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('Set MONGODB_URI in your environment first.');
  process.exit(1);
}

// ── Change these ────────────────────────────────────────────
const ADMIN_NAME = 'Roszhan Raj';
const ADMIN_EMAIL = 'roszhan23@gmail.com';   // change to your email
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? '';
// ────────────────────────────────────────────────────────────

if (!ADMIN_PASSWORD || ADMIN_PASSWORD.length < 8) {
  console.error('Set ADMIN_PASSWORD env var (min 8 chars) before running.');
  process.exit(1);
}

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true, lowercase: true },
  password: String,
  provider: { type: String, default: 'credentials' },
}, { timestamps: true });

async function main() {
  await mongoose.connect(MONGODB_URI!);
  const User = mongoose.models.User || mongoose.model('User', UserSchema);

  const existing = await User.findOne({ email: ADMIN_EMAIL });
  if (existing) {
    console.log(`User ${ADMIN_EMAIL} already exists.`);
    await mongoose.disconnect();
    return;
  }

  const hashed = await bcrypt.hash(ADMIN_PASSWORD, 12);
  await User.create({ name: ADMIN_NAME, email: ADMIN_EMAIL, password: hashed, provider: 'credentials' });
  console.log(`✓ Admin account created: ${ADMIN_EMAIL}`);
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
