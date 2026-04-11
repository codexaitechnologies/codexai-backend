const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  GetObjectCommand,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'ap-south-1' });

const S3_BUCKET = process.env.SUPPORT_DOCUMENTS_BUCKET || 'codexai-support-documents';
const PRESIGNED_URL_EXPIRY = 7 * 24 * 60 * 60; // 7 days in seconds

/**
 * Upload file to S3 bucket
 * @param {Buffer} fileBuffer - File content as buffer
 * @param {string} filename - Original filename
 * @param {string} contentType - MIME type
 * @param {string} email - User email for organization
 * @returns {Promise<Object>} - File key, uploadedAt, and fileSize
 */
async function uploadFile(fileBuffer, filename, contentType, email) {
  try {
    // Validate inputs
    if (!fileBuffer || !filename || !contentType || !email) {
      throw new Error('Missing required parameters: fileBuffer, filename, contentType, email');
    }

    // Validate file size (max 10MB)
    const maxFileSize = 10 * 1024 * 1024; // 10MB
    if (fileBuffer.length > maxFileSize) {
      throw new Error('File size exceeds maximum limit of 10MB');
    }

    // Validate content type (allowed types)
    const allowedTypes = [
      'application/pdf',
      'application/msword', // .doc
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/vnd.ms-excel', // .xls
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'image/jpeg',
      'image/png',
      'image/gif',
      'text/plain',
      'application/zip',
    ];

    if (!allowedTypes.includes(contentType)) {
      throw new Error(`Unsupported file type: ${contentType}`);
    }

    // Generate S3 key: support-documents/{email}/{timestamp}_{filename}
    const timestamp = Date.now();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileKey = `support-documents/${email}/${timestamp}_${sanitizedFilename}`;

    // Upload to S3
    const params = {
      Bucket: S3_BUCKET,
      Key: fileKey,
      Body: fileBuffer,
      ContentType: contentType,
      Metadata: {
        'original-filename': filename,
        'uploaded-by': email,
        'uploaded-at': new Date().toISOString(),
      },
    };

    const uploadResult = await s3Client.send(new PutObjectCommand(params));

    console.log(`File uploaded successfully: ${fileKey}`);

    return {
      fileKey,
      etag: uploadResult.ETag,
      uploadedAt: new Date().toISOString(),
      fileSize: fileBuffer.length,
    };
  } catch (error) {
    console.error('Error uploading file to S3:', error);
    throw error;
  }
}

/**
 * Generate presigned URL for file download
 * @param {string} fileKey - S3 file key
 * @param {number} expirySeconds - URL expiry time in seconds (default: 7 days)
 * @returns {Promise<Object>} - Presigned URL and expiration time
 */
async function generatePresignedUrl(fileKey, expirySeconds = PRESIGNED_URL_EXPIRY) {
  try {
    if (!fileKey) {
      throw new Error('File key is required');
    }

    const command = new GetObjectCommand({ Bucket: S3_BUCKET, Key: fileKey });
    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: expirySeconds });

    return {
      presignedUrl,
      expiresIn: expirySeconds,
      expiresAt: new Date(Date.now() + expirySeconds * 1000).toISOString(),
    };
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    throw error;
  }
}

/**
 * Delete file from S3 bucket
 * @param {string} fileKey - S3 file key
 * @returns {Promise<void>}
 */
async function deleteFile(fileKey) {
  try {
    if (!fileKey) {
      throw new Error('File key is required');
    }

    const params = {
      Bucket: S3_BUCKET,
      Key: fileKey,
    };

    await s3Client.send(new DeleteObjectCommand(params));
    console.log(`File deleted successfully: ${fileKey}`);
  } catch (error) {
    console.error('Error deleting file from S3:', error);
    throw error;
  }
}

/**
 * List files uploaded by a user
 * @param {string} email - User email
 * @returns {Promise<Array>} - Array of file objects
 */
async function listUserFiles(email) {
  try {
    if (!email) {
      throw new Error('Email is required');
    }

    const params = {
      Bucket: S3_BUCKET,
      Prefix: `support-documents/${email}/`,
    };

    const result = await s3Client.send(new ListObjectsV2Command(params));

    if (!result.Contents) {
      return [];
    }

    return result.Contents.map((item) => ({
      fileKey: item.Key,
      filename: item.Key.split('/').pop(),
      fileSize: item.Size,
      uploadedAt: item.LastModified.toISOString(),
    }));
  } catch (error) {
    console.error('Error listing files:', error);
    throw error;
  }
}

module.exports = {
  uploadFile,
  generatePresignedUrl,
  deleteFile,
  listUserFiles,
};
