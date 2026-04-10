const { uploadFile, generatePresignedUrl } = require('../utils/s3');
const { formatResponse, handleError } = require('../utils/dynamodb');

/**
 * Upload document file to S3
 * Accepts multipart/form-data with file, filename, contentType, email
 * Returns: fileKey, presignedUrl, fileSize, uploadedAt
 * NOTE: Authentication removed for testing
 */
exports.handler = async (event) => {
  try {
    // Parse multipart/form-data
    const busboy = require('busboy');
    
    return new Promise((resolve, reject) => {
      const bb = busboy({ headers: event.headers });
      const fields = {};
      let fileBuffer = null;
      let filename = null;
      let contentType = null;

      bb.on('field', (fieldname, val) => {
        fields[fieldname] = val;
      });

      bb.on('file', (fieldname, file, info) => {
        filename = info.filename;
        contentType = info.mimeType || 'application/octet-stream';

        const chunks = [];
        file.on('data', (data) => {
          chunks.push(data);
        });
        
        file.on('end', () => {
          fileBuffer = Buffer.concat(chunks);
        });
      });

      bb.on('close', async () => {
        try {
          // Validate required fields
          const email = fields.email;

          if (!fileBuffer || fileBuffer.length === 0) {
            return resolve(formatResponse(400, {
              error: 'Missing required field: file (upload a file)',
            }));
          }

          if (!filename) {
            return resolve(formatResponse(400, {
              error: 'Missing required field: filename',
            }));
          }

          if (!contentType && !fields.contentType) {
            return resolve(formatResponse(400, {
              error: 'Missing required field: contentType',
            }));
          }

          if (!email) {
            return resolve(formatResponse(400, {
              error: 'Missing required field: email (form field)',
            }));
          }

          const finalContentType = fields.contentType || contentType;

          // Validate file extension matches content type
          const filenameExtension = filename.split('.').pop().toLowerCase();
          const extensionContentTypeMap = {
            pdf: 'application/pdf',
            doc: 'application/msword',
            docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            xls: 'application/vnd.ms-excel',
            xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            jpg: 'image/jpeg',
            jpeg: 'image/jpeg',
            png: 'image/png',
            gif: 'image/gif',
            txt: 'text/plain',
            zip: 'application/zip',
          };

          if (extensionContentTypeMap[filenameExtension] && extensionContentTypeMap[filenameExtension] !== finalContentType) {
            console.warn(
              `Extension-ContentType mismatch: .${filenameExtension} claims ${finalContentType}, expected ${extensionContentTypeMap[filenameExtension]}`,
            );
            // Still allow upload but log warning
          }

          // Upload file to S3
          let uploadResult;
          try {
            uploadResult = await uploadFile(fileBuffer, filename, finalContentType, email);
          } catch (uploadError) {
            console.error('File upload error:', uploadError);
            return resolve(formatResponse(400, {
              error: uploadError.message || 'Failed to upload file',
            }));
          }

          // Generate presigned URL
          let presignedUrlResult;
          try {
            presignedUrlResult = await generatePresignedUrl(uploadResult.fileKey);
          } catch (presignedError) {
            console.error('Presigned URL generation error:', presignedError);
            return resolve(formatResponse(500, {
              error: 'Failed to generate download URL',
            }));
          }

          return resolve(formatResponse(200, {
            message: 'File uploaded successfully',
            file: {
              fileKey: uploadResult.fileKey,
              filename: filename,
              fileSize: uploadResult.fileSize,
              contentType: finalContentType,
              uploadedAt: uploadResult.uploadedAt,
              uploadedBy: email,
            },
            presignedUrl: presignedUrlResult.presignedUrl,
            urlExpiresIn: presignedUrlResult.expiresIn,
            urlExpiresAt: presignedUrlResult.expiresAt,
          }));
        } catch (error) {
          console.error('Upload document error:', error);
          return resolve(handleError(error));
        }
      });

      bb.on('error', (error) => {
        console.error('Busboy error:', error);
        reject(error);
      });

      event.body ? bb.write(Buffer.from(event.body, 'base64')) : bb.write(event.body);
      bb.end();
    });
  } catch (error) {
    console.error('Upload document error:', error);
    return handleError(error);
  }
};
