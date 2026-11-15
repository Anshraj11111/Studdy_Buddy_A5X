import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
dotenv.config();

const checkPassword = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI_PRIMARY);
    console.log('✅ Connected to PRIMARY database\n');

    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));

    // Find user with this email
    const user = await User.findOne({ email: 'smriti.soni@student.com' }).lean();
    
    if (!user) {
      console.log('❌ User not found with email: smriti.soni@student.com');
      await mongoose.disconnect();
      return;
    }

    console.log('📋 User Details:');
    console.log(`Name: ${user.name}`);
    console.log(`Email: ${user.email}`);
    console.log(`Role: ${user.role}`);
    console.log(`School Name: ${user.schoolName || 'N/A'}`);
    console.log(`School Password (hashed): ${user.schoolPassword || 'N/A'}`);
    console.log(`Personal Password (hashed): ${user.password || 'N/A'}`);
    console.log(`Has Free Access: ${user.hasFreeAccess || false}`);
    console.log(`Is Premium: ${user.isPremium || false}`);

    // Test school password
    const testSchoolPassword = '103PVQ5O';
    
    if (user.schoolPassword) {
      const isValidSchool = await bcrypt.compare(testSchoolPassword, user.schoolPassword);
      console.log(`\n🔐 School Password Test (${testSchoolPassword}):`);
      console.log(`Result: ${isValidSchool ? '✅ VALID' : '❌ INVALID'}`);
    } else {
      console.log('\n⚠️  No school password set for this user');
    }

    // Find all schools
    const allUsers = await User.find({ 
      schoolName: { $exists: true, $ne: null },
      schoolPassword: { $exists: true, $ne: null }
    }).select('name email schoolName schoolPassword').lean();

    console.log(`\n📚 All Schools in Database (${allUsers.length}):\n`);
    
    const schools = {};
    for (const u of allUsers) {
      if (!schools[u.schoolName]) {
        schools[u.schoolName] = {
          name: u.schoolName,
          hashedPassword: u.schoolPassword,
          users: []
        };
      }
      schools[u.schoolName].users.push(u.email);
    }

    for (const [schoolName, data] of Object.entries(schools)) {
      console.log(`School: ${schoolName}`);
      console.log(`  Users: ${data.users.length}`);
      console.log(`  Sample users: ${data.users.slice(0, 3).join(', ')}`);
      
      // Test password against this school's hash
      const isValid = await bcrypt.compare(testSchoolPassword, data.hashedPassword);
      console.log(`  Password "103PVQ5O": ${isValid ? '✅ VALID' : '❌ INVALID'}`);
      console.log('');
    }

    await mongoose.disconnect();
    console.log('✅ Disconnected');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

checkPassword();
