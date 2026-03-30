const { v4: uuidv4 } = require('uuid');
const { dynamodb, formatResponse, handleError } = require('../utils/dynamodb');

const TABLE_NAME = process.env.COURSES_TABLE;

/**
 * Lambda handler for creating a new course
 * 
 * Request body:
 *   - title: string (required)
 *   - duration: string (required)
 *   - iconName: string (required) - name of the Lucide icon
 *   - description: string (required)
 *   - features: string[] (required)
 *   - projectCount: string (required)
 *   - link: string (required)
 *   - colorClass: object (required) - {from, to, icon, badge, border, hoverBorder, hoverShadow}
 *   - isFlagship: boolean (optional)
 * 
 * Returns:
 *   - 201: Course created successfully
 *   - 400: Missing or invalid required fields
 *   - 500: Server error
 */
exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);

    // Validate required fields
    const requiredFields = ['title', 'duration', 'iconName', 'description', 'features', 'projectCount', 'link', 'colorClass'];
    const missingFields = requiredFields.filter(field => !body[field]);

    if (missingFields.length > 0) {
      return formatResponse(400, {
        error: `Missing required fields: ${missingFields.join(', ')}`,
      });
    }

    // Validate colorClass has all required properties
    const colorClassRequiredFields = ['from', 'to', 'icon', 'badge', 'border', 'hoverBorder', 'hoverShadow'];
    const missingColorFields = colorClassRequiredFields.filter(field => !body.colorClass[field]);

    if (missingColorFields.length > 0) {
      return formatResponse(400, {
        error: `Missing colorClass fields: ${missingColorFields.join(', ')}`,
      });
    }

    // Validate features is an array
    if (!Array.isArray(body.features)) {
      return formatResponse(400, {
        error: 'features must be an array',
      });
    }

    const courseId = uuidv4();
    const timestamp = new Date().toISOString();

    const params = {
      TableName: TABLE_NAME,
      Item: {
        courseId,
        title: body.title,
        duration: body.duration,
        iconName: body.iconName,
        description: body.description,
        features: body.features,
        projectCount: body.projectCount,
        link: body.link,
        colorClass: body.colorClass,
        isFlagship: body.isFlagship || false,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    };

    await dynamodb.put(params).promise();

    return formatResponse(201, {
      message: 'Course created successfully',
      course: params.Item,
    });
  } catch (error) {
    return handleError(error);
  }
};
