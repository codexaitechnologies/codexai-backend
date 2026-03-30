const nodemailer = require('nodemailer');

/**
 * Create Gmail transporter with App Password
 */
const createTransporter = () => {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    throw new Error('Missing GMAIL_USER or GMAIL_APP_PASSWORD environment variables');
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
};

/**
 * Sends a welcome email to a new user with course brochure
 * @param {Object} user - User object with email, fullName, and course
 * @param {string} brochureLink - Link to the course brochure
 * @returns {Promise} SES send email response
 */
const sendWelcomeEmail = async (user, brochureLink) => {
  const { email, fullName, course } = user;

  const htmlTemplate = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9f9f9;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 8px 8px 0 0;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
          }
          .content {
            background-color: white;
            padding: 30px;
            border: 1px solid #e0e0e0;
          }
          .greeting {
            font-size: 16px;
            margin-bottom: 20px;
            color: #555;
          }
          .course-info {
            background-color: #f0f7ff;
            border-left: 4px solid #667eea;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .course-info h3 {
            margin-top: 0;
            color: #667eea;
          }
          .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 4px;
            margin: 20px 0;
            font-weight: bold;
            transition: transform 0.3s;
          }
          .cta-button:hover {
            transform: scale(1.05);
          }
          .features {
            margin: 20px 0;
            padding: 15px;
            background-color: #f9f9f9;
            border-radius: 4px;
          }
          .features ul {
            margin: 10px 0;
            padding-left: 20px;
          }
          .features li {
            margin: 8px 0;
            color: #555;
          }
          .footer {
            background-color: #f5f5f5;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #888;
            border: 1px solid #e0e0e0;
            border-top: none;
            border-radius: 0 0 8px 8px;
          }
          .footer p {
            margin: 5px 0;
          }
          .divider {
            border: none;
            border-top: 2px solid #e0e0e0;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎓 Welcome to CodexAI</h1>
          </div>
          
          <div class="content">
            <p class="greeting">Dear <strong>${fullName}</strong>,</p>
            
            <p>Thank you for registering with CodexAI! We are thrilled to welcome you to our growing community of learners and innovators.</p>
            
            <p>Your registration for the <strong>${course}</strong> course has been successfully confirmed. We are committed to providing you with world-class education and support throughout your learning journey.</p>
            
            <div class="course-info">
              <h3>📚 Your Enrolled Course</h3>
              <p><strong>Course Name:</strong> ${course}</p>
              <p>We're excited to have you join this transformative learning experience. This course is designed to equip you with cutting-edge skills and practical knowledge.</p>
            </div>
            
            <div class="features">
              <h3>✨ What's Awaiting You</h3>
              <ul>
                <li>Comprehensive curriculum with industry-standard content</li>
                <li>Hands-on projects and real-world applications</li>
                <li>Expert mentorship and community support</li>
                <li>Certification upon successful completion</li>
                <li>Lifetime access to course materials</li>
              </ul>
            </div>
            
            <p>To get started and explore the course details, please download our comprehensive course brochure:</p>
            
            <center>
              <a href="${brochureLink}" class="cta-button">📄 Download Course Brochure</a>
            </center>
            
            <p>The brochure contains detailed information about:</p>
            <ul>
              <li>Course syllabus and learning outcomes</li>
              <li>Week-by-week breakdown of topics</li>
              <li>Project descriptions and deliverables</li>
              <li>Assessment criteria and evaluation methods</li>
              <li>Support resources and community access</li>
            </ul>
            
            <hr class="divider">
            
            <p>If you have any questions or need assistance, our support team is here to help. Please don't hesitate to reach out to us.</p>
            
            <p>We're looking forward to seeing you succeed!</p>
            
            <p>Warm regards,<br>
            <strong>The CodexAI Team</strong><br>
            Empowering Through Education</p>
          </div>
          
          <div class="footer">
            <p><strong>CodexAI Learning Platform</strong></p>
            <p>Email: support@codexai.com | Website: www.codexai.com</p>
            <p>Thank you for being part of our learning community!</p>
            <p style="margin-top: 15px; font-size: 11px;">This is an automated email. Please do not reply directly. For support, visit our website or contact our team.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const textTemplate = `
Welcome to CodexAI

Dear ${fullName},

Thank you for registering with CodexAI! We are thrilled to welcome you to our growing community of learners and innovators.

Your registration for the ${course} course has been successfully confirmed. We are committed to providing you with world-class education and support throughout your learning journey.

YOUR ENROLLED COURSE
Course Name: ${course}

We're excited to have you join this transformative learning experience. This course is designed to equip you with cutting-edge skills and practical knowledge.

WHAT'S AWAITING YOU
• Comprehensive curriculum with industry-standard content
• Hands-on projects and real-world applications
• Expert mentorship and community support
• Certification upon successful completion
• Lifetime access to course materials

To get started and explore the course details, please download our comprehensive course brochure:
${brochureLink}

The brochure contains detailed information about:
• Course syllabus and learning outcomes
• Week-by-week breakdown of topics
• Project descriptions and deliverables
• Assessment criteria and evaluation methods
• Support resources and community access

---

If you have any questions or need assistance, our support team is here to help. Please don't hesitate to reach out to us.

We're looking forward to seeing you succeed!

Warm regards,
The CodexAI Team
Empowering Through Education

---
CodexAI Learning Platform
Email: support@codexai.com
Website: www.codexai.com

This is an automated email. Please do not reply directly. For support, visit our website or contact our team.
  `;

  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: email,
    subject: `Welcome to CodexAI - ${course} Course Registration Confirmed`,
    html: htmlTemplate,
    text: textTemplate,
  };

  try {
    const transporter = createTransporter();
    const result = await transporter.sendMail(mailOptions);
    console.log('Welcome email sent successfully:', {
      MessageId: result.messageId,
      email: email,
      course: course,
    });
    return result;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    throw error;
  }
};

module.exports = {
  sendWelcomeEmail,
};
