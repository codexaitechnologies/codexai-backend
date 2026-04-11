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
 * Sends a brochure request confirmation email to a prospective student
 * @param {Object} user - User object with email, fullName, and course
 * @param {string} brochureLink - Link to the course brochure
 * @returns {Promise} Email send response
 */
const sendBrochureRequestEmail = async (user, brochureLink) => {
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
            margin: 0;
            padding: 0;
            background-color: #f0f2f5;
          }
          .wrapper {
            background-color: #f0f2f5;
            padding: 40px 20px;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 24px rgba(0,0,0,0.08);
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
          }
          .header-icon {
            font-size: 48px;
            margin-bottom: 12px;
            display: block;
          }
          .header h1 {
            margin: 0 0 6px;
            font-size: 26px;
            font-weight: 700;
            letter-spacing: -0.3px;
          }
          .header p {
            margin: 0;
            font-size: 14px;
            opacity: 0.85;
          }
          .content {
            padding: 36px 32px;
          }
          .greeting {
            font-size: 16px;
            color: #222;
            margin-bottom: 16px;
          }
          .intro-text {
            font-size: 15px;
            color: #555;
            margin-bottom: 24px;
          }
          .highlight-card {
            background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%);
            border: 1px solid #c4b5fd;
            border-radius: 10px;
            padding: 20px 24px;
            margin: 24px 0;
          }
          .highlight-card .label {
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #7c3aed;
            margin-bottom: 6px;
          }
          .highlight-card .course-name {
            font-size: 20px;
            font-weight: 700;
            color: #4c1d95;
            margin: 0;
          }
          .cta-section {
            text-align: center;
            margin: 32px 0;
          }
          .cta-section p {
            font-size: 15px;
            color: #555;
            margin-bottom: 16px;
          }
          .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #ffffff !important;
            padding: 14px 36px;
            text-decoration: none;
            border-radius: 6px;
            font-size: 15px;
            font-weight: 700;
            letter-spacing: 0.3px;
          }
          .brochure-contents {
            background-color: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 20px 24px;
            margin: 24px 0;
          }
          .brochure-contents h3 {
            margin: 0 0 14px;
            font-size: 14px;
            font-weight: 700;
            color: #374151;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .brochure-contents ul {
            margin: 0;
            padding-left: 20px;
          }
          .brochure-contents li {
            margin: 8px 0;
            font-size: 14px;
            color: #6b7280;
          }
          .next-steps {
            background-color: #f0fdf4;
            border-left: 4px solid #22c55e;
            border-radius: 0 8px 8px 0;
            padding: 16px 20px;
            margin: 24px 0;
          }
          .next-steps h4 {
            margin: 0 0 8px;
            font-size: 14px;
            font-weight: 700;
            color: #15803d;
          }
          .next-steps p {
            margin: 0;
            font-size: 14px;
            color: #166534;
          }
          .divider {
            border: none;
            border-top: 1px solid #f0f0f0;
            margin: 28px 0;
          }
          .sign-off {
            font-size: 15px;
            color: #444;
          }
          .footer {
            background-color: #f9fafb;
            border-top: 1px solid #e5e7eb;
            padding: 24px 32px;
            text-align: center;
          }
          .footer p {
            margin: 4px 0;
            font-size: 12px;
            color: #9ca3af;
          }
          .footer .brand {
            font-size: 13px;
            font-weight: 700;
            color: #6b7280;
            margin-bottom: 8px !important;
          }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="container">
            <div class="header">
              <span class="header-icon">📬</span>
              <h1>🎓 Welcome to CodexAI</h1>
              <p>Code | Innovate | AI </p>
            </div>

            <div class="content">
              <p class="greeting">Hi <strong>${fullName}</strong>,</p>

              <p class="intro-text">
                Thank you for your interest in CodexAI! We've received your brochure request and we're excited to share everything this course has to offer.
              </p>

              <div class="highlight-card">
                <div class="label">You requested a brochure for</div>
                <p class="course-name">${course}</p>
              </div>

              <div class="cta-section">
                <p>Click the button below to download your course brochure:</p>
                <a href="${brochureLink}" class="cta-button">📄 Download Brochure</a>
              </div>

              <div class="brochure-contents">
                <h3>What's inside the brochure</h3>
                <ul>
                  <li>Full course syllabus and learning outcomes</li>
                  <li>Week-by-week breakdown of topics and projects</li>
                  <li>Mentorship structure and community access</li>
                  <li>Assessment criteria and certification details</li>
                  <li>Pricing, batch schedule, and enrollment process</li>
                </ul>
              </div>

              <div class="next-steps">
                <h4>What happens next?</h4>
                <p>Our team will reach out to you shortly to answer any questions and guide you through the enrollment process. Feel free to reply to this email or contact us anytime.</p>
              </div>

              <hr class="divider">

              <p class="sign-off">
                If you have any questions in the meantime, we're happy to help at
                <a href="mailto:codexaitechnologies@gmail.com" style="color: #667eea;">codexaitechnologies@gmail.com</a>.
              </p>

              <p class="sign-off">
                Warm regards,<br>
                <strong>The CodexAI Team</strong>
              </p>
            </div>

            <div class="footer">
              <p class="brand">CodexAI Learning Platform</p>
              <p>codexaitechnologies@gmail.com &nbsp;|&nbsp; www.codexai.co.in</p>
              <p style="margin-top: 12px; font-size: 11px; color: #d1d5db;">This is an automated email. Please do not reply directly to this message.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  const textTemplate = `
Your Brochure is Ready — CodexAI

Hi ${fullName},

Thank you for your interest in CodexAI! We've received your brochure request and we're excited to share everything this course has to offer.

Course: ${course}

Download your brochure here:
${brochureLink}

WHAT'S INSIDE THE BROCHURE
• Full course syllabus and learning outcomes
• Week-by-week breakdown of topics and projects
• Mentorship structure and community access
• Assessment criteria and certification details
• Pricing, batch schedule, and enrollment process

WHAT HAPPENS NEXT?
Our team will reach out to you shortly to answer any questions and guide you through the enrollment process.

---

If you have any questions, contact us at codexaitechnologies@gmail.com.

Warm regards,
The CodexAI Team

---
CodexAI Learning Platform
Email: codexaitechnologies@gmail.com| Website: www.codexai.co.in

This is an automated email. Please do not reply directly.
  `;

  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: email,
    subject: `Your ${course} Brochure from CodexAI`,
    html: htmlTemplate,
    text: textTemplate,
  };

  try {
    const transporter = createTransporter();
    const result = await transporter.sendMail(mailOptions);
    console.log('Brochure request email sent successfully:', {
      MessageId: result.messageId,
      email: email,
      course: course,
    });
    return result;
  } catch (error) {
    console.error('Error sending brochure request email:', error);
    throw error;
  }
};

const sendTiketUpdateStatusEmail = async (email, fullName, ticketId, status, comments) => {
  const htmlTemplate = `
    <p>Dear <strong>${fullName}</strong>,</p>
    <p>Your support ticket with ID <strong>${ticketId}</strong> has been updated to the status: <strong>${status}</strong>.</p>
    <p>Comments: ${comments}</p>
    <p>If you have any questions or need further assistance, please don't hesitate to contact our support team.</p>
    <br/>
    <p>Best regards,<br/>CodeXAI Team</p>
  `;

  const textTemplate = `
Dear ${fullName},

Your support ticket with ID ${ticketId} has been updated to the status: ${status}.

Comments: ${comments}

If you have any questions or need further assistance, please don't hesitate to contact our support team.

Best regards,
CodeXAI Team
  `;

  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: email,
    subject: `Update on Your Support Ticket - ${ticketId}`,
    html: htmlTemplate,
    text: textTemplate,
  };

  try {
    const transporter = createTransporter();
    const result = await transporter.sendMail(mailOptions);
    console.log('Support ticket update email sent successfully:', {
      MessageId: result.messageId,
      email: email,
      ticketId: ticketId,
      status: status,
    });
    return result;
  } catch (error) {
    console.error('Error sending support ticket update email:', error);
    throw error;
  }
};

/**
 * Sends a simple welcome email (without brochure link)
 * @param {Object} user - User object with email, fullName, and course
 * @returns {Promise} Email send response
 */
const sendSimpleWelcomeEmail = async (user) => {
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
            
            <hr class="divider">
            
            <p>If you have any questions or need assistance, our support team is here to help. Please don't hesitate to reach out to us.</p>
            
            <p>We're looking forward to seeing you succeed!</p>
            
            <p>Warm regards,<br>
            <strong>The CodexAI Team</strong><br>
            Empowering Through Education</p>
          </div>
          
          <div class="footer">
            <p><strong>CodexAI Learning Platform</strong></p>
            <p>Email: codexaitechnologies@gmail.com| Website: www.codexai.co.in</p>
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

---

If you have any questions or need assistance, our support team is here to help. Please don't hesitate to reach out to us.

We're looking forward to seeing you succeed!

Warm regards,
The CodexAI Team
Empowering Through Education

---
CodexAI Learning Platform
Email: codexaitechnologies@gmail.com
Website: www.codexai.co.in

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
    console.log('Simple welcome email sent successfully:', {
      MessageId: result.messageId,
      email: email,
      course: course,
    });
    return result;
  } catch (error) {
    console.error('Error sending simple welcome email:', error);
    throw error;
  }
};

/**
 * Sends a generic transactional email
 * @param {Object} options - Email options: to, subject, html, text (optional)
 * @returns {Promise} Email send response
 */
const sendEmail = async ({ to, subject, html, text }) => {
  const mailOptions = {
    from: process.env.GMAIL_USER,
    to,
    subject,
    html,
    ...(text && { text }),
  };

  const transporter = createTransporter();
  const result = await transporter.sendMail(mailOptions);
  console.log('Email sent successfully:', { MessageId: result.messageId, to, subject });
  return result;
};

/**
 * Sends a ticket confirmation email to the user after a brochure enquiry is submitted
 * @param {Object} enquiry - Enquiry object with fullName, email, course, enquiryId, createdAt
 * @returns {Promise} Email send response
 */
const sendTicketConfirmationMail = async ({ fullName, email, phoneNumber, category, description, documents, enquiryId, createdAt }) => {
  const documentLinks = Array.isArray(documents) && documents.length > 0
    ? documents.map((doc, i) => `<li><a href="${doc}" style="color:#667eea;">Attachment ${i + 1}</a></li>`).join('')
    : null;

  const documentLinksText = Array.isArray(documents) && documents.length > 0
    ? documents.map((doc, i) => `  Attachment ${i + 1}: ${doc}`).join('\n')
    : null;

  const htmlTemplate = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .header h1 { margin: 0; font-size: 26px; }
          .content { background-color: white; padding: 30px; border: 1px solid #e0e0e0; }
          .ticket-box { background-color: #f0f7ff; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; border-radius: 4px; }
          .ticket-box h3 { margin-top: 0; color: #667eea; }
          .ticket-id { font-size: 18px; font-weight: bold; color: #764ba2; letter-spacing: 1px; }
          .description-box { background-color: #f9f9f9; border: 1px solid #e0e0e0; padding: 12px; border-radius: 4px; margin: 10px 0; font-size: 14px; color: #555; white-space: pre-wrap; }
          .footer { background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #888; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px; }
          .footer p { margin: 5px 0; }
          .divider { border: none; border-top: 2px solid #e0e0e0; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎫 Support Ticket Created</h1>
          </div>
          <div class="content">
            <p>Dear <strong>${fullName}</strong>,</p>
            <p>Thank you for reaching out to CodexAI Support! Your ticket has been successfully created and our team will get back to you within 24–48 hours.</p>
            <div class="ticket-box">
              <h3>📋 Ticket Details</h3>
              <p><strong>Ticket ID:</strong> <span class="ticket-id">${enquiryId}</span></p>
              <p><strong>Phone:</strong> ${phoneNumber}</p>
              <p><strong>Category:</strong> ${category}</p>
              <p><strong>Status:</strong> Open</p>
              <p><strong>Submitted At:</strong> ${createdAt}</p>
            </div>
            <p><strong>Your Query:</strong></p>
            <div class="description-box">${description}</div>
            ${documentLinks ? `<p><strong>Attachments:</strong></p><ul>${documentLinks}</ul>` : ''}
            <hr class="divider">
            <p>You can reference your <strong>Ticket ID: ${enquiryId}</strong> for any follow-up queries.</p>
            <p>If you have any urgent questions, contact us at <a href="mailto:codexaitechnologies@gmail.com">codexaitechnologies@gmail.com</a>.</p>
            <p>Warm regards,<br><strong>CodexAI Support Team</strong></p>
          </div>
          <div class="footer">
            <p><strong>CodexAI Learning Platform</strong></p>
            <p>Email: codexaitechnologies@gmail.com| Website: www.codexai.co.in</p>
            <p style="margin-top: 15px; font-size: 11px;">This is an automated email. Please do not reply directly.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const textTemplate = `
Support Ticket Created - CodexAI

Dear ${fullName},

Your support ticket has been successfully created.

TICKET DETAILS
--------------
Ticket ID   : ${enquiryId}
Phone       : ${phoneNumber}
Category    : ${category}
Status      : Open
Submitted At: ${createdAt}

Your Query:
${description}
${documentLinksText ? `\nAttachments:\n${documentLinksText}` : ''}

Our team will respond within 24-48 hours.
For follow-up, reference Ticket ID: ${enquiryId}

CodexAI Support Team
codexaitechnologies@gmail.com| www.codexai.co.in
  `;

  return sendEmail({
    to: email,
    subject: `Support Ticket Created [${enquiryId}] - ${category}`,
    html: htmlTemplate,
    text: textTemplate,
  });
};

/**
 * Sends a welcome/registration confirmation email after email verification
 * @param {Object} user - User object with email and fullName
 * @returns {Promise} Email send response
 */
const sendWelcomeRegistrationEmail = async ({ email, fullName }) => {
  const htmlTemplate = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f0f2f5; }
          .wrapper { background-color: #f0f2f5; padding: 40px 20px; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 44px 32px; text-align: center; }
          .header-icon { font-size: 52px; display: block; margin-bottom: 14px; }
          .header h1 { margin: 0 0 8px; font-size: 28px; font-weight: 700; letter-spacing: -0.3px; }
          .header p { margin: 0; font-size: 14px; opacity: 0.85; }
          .content { padding: 36px 32px; }
          .greeting { font-size: 17px; font-weight: 600; color: #111; margin-bottom: 12px; }
          .intro { font-size: 15px; color: #555; margin-bottom: 28px; }
          .verified-badge { display: inline-flex; align-items: center; gap: 8px; background: #f0fdf4; border: 1px solid #86efac; border-radius: 999px; padding: 8px 18px; font-size: 14px; font-weight: 600; color: #15803d; margin-bottom: 28px; }
          .perks { background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 22px 26px; margin-bottom: 28px; }
          .perks h3 { margin: 0 0 14px; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #374151; }
          .perks ul { margin: 0; padding-left: 20px; }
          .perks li { margin: 9px 0; font-size: 14px; color: #6b7280; }
          .cta-section { text-align: center; margin: 28px 0; }
          .cta-button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff !important; padding: 14px 38px; text-decoration: none; border-radius: 6px; font-size: 15px; font-weight: 700; letter-spacing: 0.3px; }
          .support-note { background: #fefce8; border: 1px solid #fde047; border-radius: 8px; padding: 14px 18px; font-size: 13px; color: #854d0e; margin-bottom: 24px; }
          .divider { border: none; border-top: 1px solid #f0f0f0; margin: 24px 0; }
          .sign-off { font-size: 15px; color: #444; }
          .footer { background-color: #f9fafb; border-top: 1px solid #e5e7eb; padding: 22px 32px; text-align: center; }
          .footer .brand { font-size: 13px; font-weight: 700; color: #6b7280; margin: 0 0 6px; }
          .footer p { margin: 4px 0; font-size: 12px; color: #9ca3af; }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="container">
            <div class="header">
              <span class="header-icon">🎉</span>
              <h1>Welcome to CodexAI!</h1>
              <p>Your account is verified and ready to go.</p>
            </div>
            <div class="content">
              <p class="greeting">Hi ${fullName},</p>
              <p class="intro">We're thrilled to have you on board! Your email has been successfully verified and your CodexAI account is now fully active.</p>

              <div class="verified-badge">
                ✅ Email Verified &amp; Account Active
              </div>

              <div class="perks">
                <h3>What you can do now</h3>
                <ul>
                  <li>Browse our full catalogue of AI &amp; Tech courses</li>
                  <li>Enroll in courses and start learning immediately</li>
                  <li>Track your progress and earn certifications</li>
                  <li>Connect with mentors and the learner community</li>
                  <li>Access exclusive resources and project materials</li>
                </ul>
              </div>

              <div class="cta-section">
                <a href="https://codexai.co.in" class="cta-button">🚀 Explore Courses</a>
              </div>

              <div class="support-note">
                💡 <strong>Need help getting started?</strong> Our support team is always here. Reach out at <a href="mailto:codexaitechnologies@gmail.com" style="color:#92400e;">codexaitechnologies@gmail.com</a>
              </div>

              <hr class="divider">
              <p class="sign-off">
                Looking forward to seeing you grow,<br>
                <strong>The CodexAI Team</strong>
              </p>
            </div>
            <div class="footer">
              <p class="brand">CodexAI Learning Platform</p>
              <p>codexaitechnologies@gmail.com&nbsp;|&nbsp; www.codexai.co.in</p>
              <p style="margin-top: 10px; font-size: 11px; color: #d1d5db;">This is an automated email. Please do not reply directly to this message.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  const textTemplate = `
Welcome to CodexAI, ${fullName}!

Your email has been successfully verified and your account is now fully active.

WHAT YOU CAN DO NOW
- Browse our full catalogue of AI & Tech courses
- Enroll in courses and start learning immediately
- Track your progress and earn certifications
- Connect with mentors and the learner community
- Access exclusive resources and project materials

Explore courses at: https://codexai.co.in

Need help? Contact us at codexaitechnologies@gmail.com

Looking forward to seeing you grow,
The CodexAI Team

---
CodexAI Learning Platform
codexaitechnologies@gmail.com| www.codexai.co.in
  `;

  return sendEmail({
    to: email,
    subject: `Welcome to CodexAI, ${fullName}! Your account is ready 🎉`,
    html: htmlTemplate,
    text: textTemplate,
  });
};

/**
 * Sends a payment confirmation / enrollment receipt email to the user
 * @param {Object} params
 * @param {string} params.email - Recipient email
 * @param {string} params.fullName - Student full name
 * @param {string} params.courseName - Enrolled course name
 * @param {string} params.paymentId - Razorpay payment ID
 * @param {string} params.orderId - Razorpay order ID
 * @param {number} params.amount - Amount paid (in INR)
 * @param {string} params.currency - Currency code (e.g. INR)
 * @param {string} params.method - Payment method (card / upi / netbanking etc.)
 * @param {string} params.paidAt - ISO timestamp of payment
 */
const sendPaymentConfirmationEmail = async ({
  email,
  fullName,
  courseName,
  paymentId,
  orderId,
  amount,
  currency = 'INR',
  method = '',
  paidAt,
}) => {
  const formattedAmount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(amount);

  const formattedDate = new Date(paidAt || Date.now()).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  });

  const methodLabel = method
    ? method.charAt(0).toUpperCase() + method.slice(1).replace(/_/g, ' ')
    : 'Online';

  const receiptNumber = `RCP-${paymentId.slice(-8).toUpperCase()}`;

  const htmlTemplate = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f0f2f5; }
          .wrapper { background-color: #f0f2f5; padding: 40px 20px; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 44px 32px; text-align: center; }
          .header-icon { font-size: 52px; display: block; margin-bottom: 14px; }
          .header h1 { margin: 0 0 8px; font-size: 28px; font-weight: 700; letter-spacing: -0.3px; }
          .header p { margin: 0; font-size: 14px; opacity: 0.85; }
          .content { padding: 36px 32px; }
          .greeting { font-size: 17px; font-weight: 600; color: #111; margin-bottom: 12px; }
          .intro { font-size: 15px; color: #555; margin-bottom: 28px; }
          .success-badge { display: inline-flex; align-items: center; gap: 8px; background: #f0fdf4; border: 1px solid #86efac; border-radius: 999px; padding: 8px 18px; font-size: 14px; font-weight: 600; color: #15803d; margin-bottom: 28px; }
          .receipt-box { border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; margin-bottom: 28px; }
          .receipt-table { width: 100%; border-collapse: collapse; }
          .receipt-table-header td { background: #f9fafb; border-bottom: 1px solid #e5e7eb; padding: 14px 20px; }
          .receipt-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.7px; color: #6b7280; }
          .receipt-no { font-size: 13px; font-weight: 700; color: #374151; text-align: right; }
          .receipt-row td { padding: 13px 20px; border-bottom: 1px solid #f3f4f6; font-size: 14px; vertical-align: middle; }
          .receipt-row:last-child td { border-bottom: none; }
          .receipt-key { color: #6b7280; width: 40%; }
          .receipt-val { font-weight: 600; color: #111; text-align: right; }
          .receipt-total td { background: #f0fdf4; padding: 16px 20px; border-top: 2px solid #86efac; vertical-align: middle; }
          .receipt-total-key { font-size: 15px; font-weight: 700; color: #15803d; }
          .receipt-total-val { font-size: 20px; font-weight: 800; color: #15803d; text-align: right; }
          .course-card { background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%); border: 1px solid #c4b5fd; border-radius: 10px; padding: 20px 24px; margin-bottom: 28px; }
          .course-card .label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.7px; color: #7c3aed; margin-bottom: 6px; }
          .course-card .name { font-size: 18px; font-weight: 700; color: #1e1b4b; margin: 0; }
          .next-steps { background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 22px 26px; margin-bottom: 28px; }
          .next-steps h3 { margin: 0 0 14px; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #374151; }
          .next-steps ul { margin: 0; padding-left: 20px; }
          .next-steps li { margin: 9px 0; font-size: 14px; color: #6b7280; }
          .cta-section { text-align: center; margin: 28px 0; }
          .cta-button { display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff !important; padding: 14px 38px; text-decoration: none; border-radius: 6px; font-size: 15px; font-weight: 700; letter-spacing: 0.3px; }
          .support-note { background: #fefce8; border: 1px solid #fde047; border-radius: 8px; padding: 14px 18px; font-size: 13px; color: #854d0e; margin-bottom: 24px; }
          .divider { border: none; border-top: 1px solid #f0f0f0; margin: 24px 0; }
          .sign-off { font-size: 15px; color: #444; }
          .footer { background-color: #f9fafb; border-top: 1px solid #e5e7eb; padding: 22px 32px; text-align: center; }
          .footer .brand { font-size: 13px; font-weight: 700; color: #6b7280; margin: 0 0 6px; }
          .footer p { margin: 4px 0; font-size: 12px; color: #9ca3af; }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="container">
            <div class="header">
              <span class="header-icon">🎓</span>
              <h1>Enrollment Confirmed!</h1>
              <p>Your payment was successful and your seat is reserved.</p>
            </div>
            <div class="content">
              <p class="greeting">Hi ${fullName},</p>
              <p class="intro">Great news — your payment has been received and you're now officially enrolled. Here's your payment receipt for your records.</p>

              <div class="success-badge">✅ Payment Successful</div>

              <div class="course-card">
                <div class="label">Enrolled Course</div>
                <p class="name">${courseName}</p>
              </div>

              <div class="receipt-box">
                <table class="receipt-table" cellpadding="0" cellspacing="0">
                  <tr class="receipt-table-header">
                    <td class="receipt-label">Payment Receipt</td>
                    <td class="receipt-no">${receiptNumber}</td>
                  </tr>
                  <tr class="receipt-row">
                    <td class="receipt-key">Payment ID</td>
                    <td class="receipt-val">${paymentId}</td>
                  </tr>
                  <tr class="receipt-row">
                    <td class="receipt-key">Order ID</td>
                    <td class="receipt-val">${orderId}</td>
                  </tr>
                  <tr class="receipt-row">
                    <td class="receipt-key">Payment Method</td>
                    <td class="receipt-val">${methodLabel}</td>
                  </tr>
                  <tr class="receipt-row">
                    <td class="receipt-key">Date &amp; Time</td>
                    <td class="receipt-val">${formattedDate} IST</td>
                  </tr>
                  <tr class="receipt-total">
                    <td class="receipt-total-key">Amount Paid</td>
                    <td class="receipt-total-val">${formattedAmount}</td>
                  </tr>
                </table>
              </div>

              <div class="next-steps">
                <h3>What happens next?</h3>
                <ul>
                  <li>Our team will reach out to share onboarding details</li>
                  <li>You'll receive course materials and schedule information</li>
                  <li>Access your learning portal at <strong>codexai.co.in</strong></li>
                  <li>Join our learner community for peer support</li>
                </ul>
              </div>

              <div class="cta-section">
                <a href="https://codexai.co.in" class="cta-button">🚀 Start Learning</a>
              </div>

              <div class="support-note">
                💡 <strong>Questions about your enrollment?</strong> Contact us at <a href="mailto:codexaitechnologies@gmail.com" style="color:#92400e;">codexaitechnologies@gmail.com</a> with your Payment ID.
              </div>

              <hr class="divider">
              <p class="sign-off">
                Excited to have you on this journey,<br>
                <strong>The CodexAI Team</strong>
              </p>
            </div>
            <div class="footer">
              <p class="brand">CodexAI Learning Platform</p>
              <p>codexaitechnologies@gmail.com&nbsp;|&nbsp;www.codexai.co.in</p>
              <p style="margin-top: 10px; font-size: 11px; color: #d1d5db;">This is an automated receipt. Please do not reply directly to this message.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  const textTemplate = `
Enrollment Confirmed — ${courseName}

Hi ${fullName},

Your payment was successful and you're now enrolled in ${courseName}.

--- PAYMENT RECEIPT ---
Receipt No : ${receiptNumber}
Payment ID : ${paymentId}
Order ID   : ${orderId}
Method     : ${methodLabel}
Date       : ${formattedDate} IST
Amount Paid: ${formattedAmount}
-----------------------

What happens next?
- Our team will reach out with onboarding details
- You'll receive course materials and schedule information
- Access your learning portal at codexai.co.in

Questions? Email codexaitechnologies@gmail.com with your Payment ID.

Excited to have you on this journey,
The CodexAI Team

---
CodexAI Learning Platform
codexaitechnologies@gmail.com | www.codexai.co.in
  `;

  return sendEmail({
    to: email,
    subject: `Payment Confirmed — You're enrolled in ${courseName}! 🎓`,
    html: htmlTemplate,
    text: textTemplate,
  });
};

module.exports = {
  sendEmail,
  sendBrochureRequestEmail,
  sendSimpleWelcomeEmail,
  sendTicketConfirmationMail,
  sendTiketUpdateStatusEmail,
  sendWelcomeRegistrationEmail,
  sendPaymentConfirmationEmail,
};
