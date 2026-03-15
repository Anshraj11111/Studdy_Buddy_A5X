const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

/**
 * Upload a file (File object or base64 dataURL) to Cloudinary
 * @param {File|string} file - File object or base64 string
 * @param {string} folder - Cloudinary folder name
 * @returns {Promise<{url: string, publicId: string}>}
 */
export async function uploadToCloudinary(file, folder = 'studdy-buddy') {
  const formData = new FormData()

  if (typeof file === 'string' && file.startsWith('data:')) {
    // base64 dataURL — convert to blob
    const res = await fetch(file)
    const blob = await res.blob()
    formData.append('file', blob)
  } else {
    formData.append('file', file)
  }

  formData.append('upload_preset', UPLOAD_PRESET)
  formData.append('folder', folder)

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`,
    { method: 'POST', body: formData }
  )

  if (!response.ok) {
    const err = await response.json()
    throw new Error(err.error?.message || 'Cloudinary upload failed')
  }

  const data = await response.json()
  return { url: data.secure_url, publicId: data.public_id }
}
