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
 *   - image: string (optional) - course image URL
 *   - color: string (optional) - primary color for the course
 *   - highlights: string[] (optional) - key highlights of the course
 *   - curriculum: CurriculumModule[] (optional) - [{week, title, topics}]
 *   - outcomes: string[] (optional) - learning outcomes
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
    const requiredFields = ['title', 'duration', 'iconName', 'description', 'features', 'projectCount', 'link', 'colorClass', 'price'];
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

    // Validate optional fields if provided
    if (body.highlights && !Array.isArray(body.highlights)) {
      return formatResponse(400, {
        error: 'highlights must be an array',
      });
    }

    if (body.curriculum && !Array.isArray(body.curriculum)) {
      return formatResponse(400, {
        error: 'curriculum must be an array',
      });
    }

    if (body.outcomes && !Array.isArray(body.outcomes)) {
      return formatResponse(400, {
        error: 'outcomes must be an array',
      });
    }

    if(body.price && (typeof body.price !== 'number' || body.price < 0)) {
      return formatResponse(400, {
        error: 'price must be a non-negative number',
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
        price: body.price || 1,
        features: body.features,
        projectCount: body.projectCount,
        link: body.link,
        colorClass: body.colorClass,
        isFlagship: body.isFlagship || false,
        ...(body.image && { image: body.image }),
        ...(body.color && { color: body.color }),
        ...(body.highlights && { highlights: body.highlights }),
        ...(body.curriculum && { curriculum: body.curriculum }),
        ...(body.outcomes && { outcomes: body.outcomes }),
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
