// Configuration
const CLOUD_NAME = 'dhqutbesl';
const UPLOAD_PRESET = 'financeFlow';
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

/**
 * Uploads an image to Cloudinary and returns the secure URL.
 * @param uri - The local URI of the image (from ImagePicker)
 * @returns The secure URL of the uploaded image or null if failed
 */
export const uploadToCloudinary = async (
  uri: string
): Promise<string | null> => {
  try {
    // Create a FormData object
    // We send the file directly as a blob/file object, avoiding Base64 conversion.
    const data = new FormData();

    // Append the file.
    // Note: The object structure { uri, type, name } is required for React Native's fetch to handle files.
    data.append('file', {
      uri: uri,
      type: 'image/jpeg', // We assume JPEG for camera photos, but this works for most images
      name: 'upload.jpg',
    } as any); // 'as any' is needed because TS types for FormData often don't include this RN-specific object

    data.append('upload_preset', UPLOAD_PRESET);
    data.append('cloud_name', CLOUD_NAME);

    // Send POST request to Cloudinary
    const response = await fetch(CLOUDINARY_URL, {
      method: 'POST',
      body: data,
      headers: {
        Accept: 'application/json',
        // Do NOT set 'Content-Type': 'multipart/form-data' manually;
        // the fetch API sets it automatically with the correct boundary.
      },
    });

    const result = await response.json();

    // Check for secure_url in the response
    if (result.secure_url) {
      return result.secure_url;
    } else {
      console.error('Cloudinary Upload Error:', result);
      return null;
    }
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    return null;
  }
};
