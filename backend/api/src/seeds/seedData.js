import dotenv from 'dotenv';
import { connectDB, dbState } from '../config/db.js';
import { User } from '../models/User.js';
import { Ward } from '../models/Ward.js';

dotenv.config();

const DEMO_ADMIN = {
  name: 'Er. Rajesh Khajuria',
  email: 'cityadmin@civicconnect.demo',
  password: 'CityAdmin123!',
  role: 'CITY_ADMIN',
  department: 'Central Municipal Commissioner Secretariat',
};

const SAMPLE_WARDS = [
  {
    id: 1,
    number: 1,
    name: 'Panjtirthi & Old Heritage City',
    zone: 'Old City',
    councillor: 'Rajesh Gupta',
    contactNumber: '+91 94191 00001',
    centerCoordinates: { latitude: 32.741, longitude: 74.868 },
    localityAliases: ['panjtirthi', 'heritage city', 'old city', 'pacca danga'],
  },
  {
    id: 2,
    number: 2,
    name: 'Jullaka Mohalla & Kanak Mandi',
    zone: 'Old City',
    councillor: 'Vipul Sharma',
    contactNumber: '+91 94191 00002',
    centerCoordinates: { latitude: 32.735, longitude: 74.866 },
    localityAliases: ['jullaka mohalla', 'kanak mandi', 'raghunath bazaar'],
  },
  {
    id: 20,
    number: 20,
    name: 'Gandhi Nagar Central & Gol Market',
    zone: 'South Jammu',
    councillor: 'Chander Mohan Gupta',
    contactNumber: '+91 94191 00020',
    centerCoordinates: { latitude: 32.7088, longitude: 74.8631 },
    localityAliases: ['gandhi nagar', 'gol market', 'aupsara road'],
  },
];

async function seed() {
  await connectDB();

  if (!dbState.isConnected) {
    console.error('[Seed] Database not connected. Aborting seed operation.');
    process.exit(1);
  }

  console.log('[Seed] Seeding demo administrative user...');
  const existingAdmin = await User.findOne({ email: DEMO_ADMIN.email });
  if (!existingAdmin) {
    await User.create(DEMO_ADMIN);
    console.log(`[Seed] Created admin account: ${DEMO_ADMIN.email}`);
  } else {
    console.log('[Seed] Admin account already exists.');
  }

  console.log('[Seed] Seeding sample Jammu municipal wards...');
  for (const wardData of SAMPLE_WARDS) {
    await Ward.findOneAndUpdate({ id: wardData.id }, wardData, { upsert: true });
  }
  console.log(`[Seed] Seeded ${SAMPLE_WARDS.length} wards successfully.`);

  process.exit(0);
}

seed().catch((err) => {
  console.error('[Seed] Error during seeding:', err);
  process.exit(1);
});
