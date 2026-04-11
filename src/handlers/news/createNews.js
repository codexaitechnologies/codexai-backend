const { v4: uuidv4 } = require('uuid');
const { dynamodb, formatResponse, handleError } = require('../../utils/dynamodb');

const TABLE_NAME = process.env.NEWS_TABLE;

/**
 * Lambda handler for creating a new news post (admin only)
 * 
 * Request body:
 *   - title: string (required)
 *   - content: string (required)
 *   - category: string (required)
 *   - description: string (optional) - short summary
 *   - imageUrl: string (optional)
 *   - status: string (optional, default: 'draft') - draft, published, archived
 *   - author: string (optional)
 *   - tags: string[] (optional)
 * 
 * Returns:
 *   - 201: News post created successfully
 *   - 400: Missing or invalid required fields
 *   - 500: Server error
 */
exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);

    // Validate required fields
    const requiredFields = ['title', 'content', 'category'];
    const missingFields = requiredFields.filter(field => !body[field]);

    if (missingFields.length > 0) {
      return formatResponse(400, {
        error: `Missing required fields: ${missingFields.join(', ')}`,
      });
    }

    if (!TABLE_NAME) {
      return formatResponse(500, {
        error: 'News table not configured',
      });
    }

    const postId = uuidv4();
    const now = new Date().toISOString();

    const newsPost = {
      postId: postId,
      title: body.title,
      content: body.content,
      category: body.category,
      description: body.description || '',
      imageUrl: body.imageUrl || null,
      status: body.status || 'draft',
      author: body.author || 'Admin',
      tags: body.tags || [],
      createdAt: now,
      updatedAt: now,
      publishedAt: body.status === 'published' ? now : null,
      views: 0,
    };

    const params = {
      TableName: TABLE_NAME,
      Item: newsPost,
    };

    await dynamodb.put(params).promise();

    console.log('News post created:', postId);

    return formatResponse(201, {
      message: 'News post created successfully',
      post: newsPost,
    });
  } catch (error) {
    console.error('Create news post error:', error);
    return handleError(error, 'Failed to create news post');
  }
};
