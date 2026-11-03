import { v2 as cloudinary } from 'cloudinary'
import dotenv from 'dotenv'

// Ensure dotenv is loaded
dotenv.config()

// Configure Cloudinary with explicit values
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
})

// Log to verify config is loaded
console.log('📸 Cloudinary Configuration Status:')
console.log('   Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME || '❌ Missing')
console.log('   API Key:', process.env.CLOUDINARY_API_KEY ? '✅ Present' : '❌ Missing')
console.log('   API Secret:', process.env.CLOUDINARY_API_SECRET ? '✅ Present' : '❌ Missing')

export default cloudinary
