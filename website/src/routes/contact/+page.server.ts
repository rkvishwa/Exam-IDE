import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';
import { env } from '$env/dynamic/private';
import nodemailer from 'nodemailer';

type ContactValues = {
  name: string;
  email: string;
  message: string;
};

type ContactFieldErrors = {
  name?: string;
  email?: string;
  message?: string;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getFormText = (formData: FormData, key: keyof ContactValues) => {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
};

const validate = (values: ContactValues): ContactFieldErrors => {
  const errors: ContactFieldErrors = {};

  if (!values.name) {
    errors.name = 'Name is required.';
  } else if (values.name.length < 2) {
    errors.name = 'Name must be at least 2 characters.';
  }

  if (!values.email) {
    errors.email = 'Email is required.';
  } else if (!EMAIL_REGEX.test(values.email)) {
    errors.email = 'Please enter a valid email address.';
  }

  if (!values.message) {
    errors.message = 'Message is required.';
  } else if (values.message.length < 10) {
    errors.message = 'Message must be at least 10 characters.';
  } else if (values.message.length > 3000) {
    errors.message = 'Message must be 3000 characters or fewer.';
  }

  return errors;
};

const getSmtpPort = () => {
  const parsedPort = Number.parseInt(env.SMTP_PORT ?? '', 10);
  return Number.isFinite(parsedPort) ? parsedPort : 587;
};

const getSmtpSecure = (port: number) => {
  const explicitSecure = (env.SMTP_SECURE ?? '').toLowerCase();
  if (explicitSecure === 'true') return true;
  if (explicitSecure === 'false') return false;
  return port === 465;
};

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const buildAcknowledgementEmail = (name: string) => {
  const safeName = escapeHtml(name);
  const text = `Hi ${name},\n\nWe received your message. Thanks for contacting Sonar IDE.\n\nOur team will review your message and get back to you if needed.\n\nRegards,\nSonar IDE Team`;
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
      <p>Hi ${safeName},</p>
      <p>We received your message. Thanks for contacting <strong>Sonar IDE</strong>.</p>
      <p>Our team will review your message and get back to you if needed.</p>
      <p>Regards,<br />Sonar IDE Team</p>
    </div>
  `;

  return { text, html };
};

export const actions: Actions = {
  default: async ({ request }) => {
    try {
      console.log("Action started");
      const formData = await request.formData();
      console.log("Got formData");

      const values: ContactValues = {
        name: getFormText(formData, 'name'),
        email: getFormText(formData, 'email').toLowerCase(),
        message: getFormText(formData, 'message')
      };
      console.log("Parsed values:", values);

    const errors = validate(values);
    if (Object.keys(errors).length > 0) {
      return fail(400, {
        success: false,
        message: 'Please fix the highlighted fields and submit again.',
        errors,
        values
      });
    }

    if (!env.SMTP_HOST || !env.SMTP_FROM) {
      console.error('Missing SMTP_HOST or SMTP_FROM for contact form email delivery.');
      return fail(500, {
        success: false,
        message: 'Email service is not configured yet. Please try again later.',
        values
      });
    }

    const smtpPort = getSmtpPort();
    const transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: smtpPort,
      secure: getSmtpSecure(smtpPort),
      auth:
        env.SMTP_USER && env.SMTP_PASS
          ? {
              user: env.SMTP_USER,
              pass: env.SMTP_PASS
            }
          : undefined
    });

    const inboxAddress = env.CONTACT_INBOX_EMAIL || env.SMTP_FROM;
    const acknowledgement = buildAcknowledgementEmail(values.name);
    const safeNameForSubject = values.name.replace(/[\r\n]+/g, ' ').trim();

    try {
      await transporter.sendMail({
        from: env.SMTP_FROM,
        to: values.email,
        replyTo: inboxAddress,
        subject: 'We received your message - Sonar IDE',
        text: acknowledgement.text,
        html: acknowledgement.html
      });

      await transporter.sendMail({
        from: env.SMTP_FROM,
        to: inboxAddress,
        replyTo: values.email,
        subject: `New contact form message from ${safeNameForSubject}`,
        text: `Name: ${values.name}\nEmail: ${values.email}\n\nMessage:\n${values.message}`
      });

      return {
        success: true,
        message: 'Thanks. We received your email and sent a confirmation message.',
        values: {
          name: '',
          email: '',
          message: ''
        }
      };
    } catch (error) {
      console.error('Failed to send contact form emails:', error);
      return fail(500, {
        success: false,
        message: 'We could not send the confirmation email right now. Please try again later.',
        values
      });
    }
  }
};