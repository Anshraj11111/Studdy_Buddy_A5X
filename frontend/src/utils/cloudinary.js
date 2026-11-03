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

  // Determine the correct endpoint and resource type based on file
  const isPDF = file.type === 'application/pdf' || file.name?.endsWith('.pdf')
  const isDoc = file.type?.includes('word') || file.type?.includes('document') || 
                file.name?.endsWith('.doc') || file.name?.endsWith('.docx')
  
  let endpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`
  
  // For PDFs and docs, explicitly use raw upload with proper flags
  if (isPDF || isDoc) {
    endpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/raw/upload`
    formData.append('resource_type', 'raw')
    formData.append('flags', 'attachment') // Force download, not preview
  }

  const response = await fetch(endpoint, { method: 'POST', body: formData })

  if (!response.ok) {
    const err = await response.json()
    throw new Error(err.error?.message || 'Cloudinary upload failed')
  }

  const data = await response.json()
  return { url: data.secure_url, publicId: data.public_id }
}
