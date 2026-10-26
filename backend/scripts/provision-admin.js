/**
 * CivicConnect Administrator Provisioning Script
 *
 * Secure CLI utility to provision or promote an administrative user in MongoDB.
 *
 * Security Principles:
 * - Never adds hardcoded passwords or authentication bypass backdoors.
 * - Enforces standard OTP verification: the admin logs in using their provisioned phone number.
 * - The server-signed JWT embeds role: 'admin', which grants privileged access to:
 *   - GET /api/complaints (all city complaints)
 *   - PATCH /api/complaints/:id/status (municipal triage & status progression)
 *
 * Usage:
 *   node scripts/provision-admin.js [phone_number] [full_name]
 * Example:
 *   node scripts/provision-admin.js 9419100001 "JMC Chief Municipal Officer"
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../dist/config/db.js';
import { UserModel } from '../dist/modules/auth/user.model.js';
import { normalizeIndianMobile, isValidIndianMobile } from '../dist/utils/phone.js';

const rawPhone = process.argv[2] || process.env.ADMIN_PHONE || '9419100001';
const rawName = process.argv[3] || process.env.ADMIN_NAME || 'JMC Municipal Administrator';

if (!isValidIndianMobile(rawPhone)) {
  console.error(`[Error] Invalid mobile number provided: "${rawPhone}". Must be a valid 10-digit Indian mobile number.`);
  process.exit(1);
}

const normalizedPhone = normalizeIndianMobile(rawPhone);

async function provisionAdmin() {
  console.log('===============================================================');
  console.log('CivicConnect — Secure Administrator Account Provisioning');
  console.log('===============================================================\n');

  try {
    console.log(`[Database] Connecting to MongoDB...`);
    await connectDB();

    console.log(`[Admin] Looking up user record for: ${normalizedPhone}...`);
    let user = await UserModel.findOne({ phoneNumber: normalizedPhone });

    if (!user) {
      console.log(`[Admin] User does not exist. Creating new administrative account...`);
      user = new UserModel({
        phoneNumber: normalizedPhone,
        fullName: rawName,
        wardNumber: 1, // Central Administrative Ward
        role: 'admin',
        isPhoneVerified: true,
      });
    } else {
      console.log(`[Admin] Existing user found (Current Role: ${user.role}). Promoting to "admin"...`);
      user.role = 'admin';
      user.isPhoneVerified = true;
      if (!user.fullName) {
        user.fullName = rawName;
      }
    }

    await user.save();

    console.log('\n---------------------------------------------------------------');
    console.log('SUCCESS: Administrator Account Provisioned Successfully!');
    console.log('---------------------------------------------------------------');
    console.log(`  User ID:       ${user._id}`);
    console.log(`  Phone Number:  ${user.phoneNumber}`);
    console.log(`  Full Name:     ${user.fullName}`);
    console.log(`  Assigned Role: ${user.role} (Privileged Access Enabled)`);
    console.log(`  Phone Verified: ${user.isPhoneVerified}`);
    console.log('---------------------------------------------------------------');
    console.log('\nLogin Instructions for Demo / Evaluation:');
    console.log(`1. Navigate to the login screen on the frontend.`);
    console.log(`2. Enter the administrator phone number: ${user.phoneNumber}`);
    console.log(`3. Request OTP and complete verification.`);
    console.log(`4. The server will issue a signed JWT containing role: 'admin'.`);
    console.log(`5. The frontend will automatically unlock the Admin Dashboard and Grievance Management tools.`);
    console.log('===============================================================\n');
  } catch (err) {
    console.error('[Error] Administrator provisioning failed:', err);
    process.exit(1);
  } finally {
    await disconnectDB();
  }
}

provisionAdmin();
