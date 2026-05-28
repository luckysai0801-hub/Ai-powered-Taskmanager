require('dotenv').config();
const mongoose = require('mongoose');

async function testConnection() {
  console.log('=== AI Task Manager Connection Diagnostics ===\n');

  // 1. Check Google Client Credentials
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  console.log('--- Google OAuth 2.0 Credentials ---');
  if (!googleClientId || googleClientId === 'DUMMY_CLIENT_ID') {
    console.log('❌ GOOGLE_CLIENT_ID: Not configured or still using dummy value.');
  } else {
    console.log(`✅ GOOGLE_CLIENT_ID: Configured (${googleClientId.substring(0, 15)}...)`);
  }

  if (!googleClientSecret || googleClientSecret === 'DUMMY_CLIENT_SECRET') {
    console.log('❌ GOOGLE_CLIENT_SECRET: Not configured or still using dummy value.');
  } else {
    console.log('✅ GOOGLE_CLIENT_SECRET: Configured (Hidden for security)');
  }
  console.log('');

  // 2. Check JWT Secrets
  const jwtAccess = process.env.JWT_ACCESS_SECRET;
  const jwtRefresh = process.env.JWT_REFRESH_SECRET;
  
  console.log('--- JWT Secrets ---');
  if (!jwtAccess || jwtAccess === 'super_secret_access_key_12345') {
    console.log('⚠️  JWT_ACCESS_SECRET: Using default/weak secret. Recommended to generate a secure random string.');
  } else {
    console.log('✅ JWT_ACCESS_SECRET: Configured');
  }
  if (!jwtRefresh || jwtRefresh === 'super_secret_refresh_key_67890') {
    console.log('⚠️  JWT_REFRESH_SECRET: Using default/weak secret. Recommended to generate a secure random string.');
  } else {
    console.log('✅ JWT_REFRESH_SECRET: Configured');
  }
  console.log('');

  // 3. Check Gemini API Key
  const geminiKey = process.env.GEMINI_API_KEY;
  console.log('--- Gemini API Key ---');
  if (!geminiKey || geminiKey === 'DUMMY_GEMINI_KEY') {
    console.log('❌ GEMINI_API_KEY: Not configured or still using dummy value.');
  } else {
    console.log(`✅ GEMINI_API_KEY: Configured (${geminiKey.substring(0, 5)}...)`);
  }
  console.log('');

  // 4. Test MongoDB Connection
  const uri = process.env.MONGODB_URI;
  console.log('--- MongoDB Database Connection ---');
  if (!uri) {
    console.log('❌ MONGODB_URI: Not configured in .env file.');
    process.exit(1);
  }

  console.log(`Connecting to: ${uri.startsWith('mongodb+srv://') ? 'MongoDB Atlas (Cloud)' : 'Local MongoDB (localhost)'}...`);
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log('✅ MongoDB: Successfully connected to the database!');
  } catch (error) {
    console.log(`❌ MongoDB: Connection failed!`);
    console.log(`   Error: ${error.message}`);
    console.log('\nCommon causes:');
    console.log('1. IP Address Whitelisting: Did you forget to add 0.0.0.0/0 under "Network Access" in MongoDB Atlas?');
    console.log('2. Credentials: Are your database username and password in the MONGODB_URI correct?');
    console.log('3. Password Special Characters: If your password contains characters like @, :, /, or +, you must URL-encode them.');
  } finally {
    await mongoose.disconnect();
    console.log('\nDiagnostics complete.');
  }
}

testConnection();
