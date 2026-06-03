const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const cloudinary = require('cloudinary').v2;
const { buildProposalEmail } = require('./portfolio-bot-template');
const { buildStoryFirstEmail } = require('./storyfirst-email-template');
const { buildStoryFirstPdfBuffer } = require('./storyfirst-proposal-pdf');
const { buildEmailSafeHtmlTemplate } = require('./custom-html-email-template');

function toBool(value, fallback) {
  if (value == null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
}

function normalizeProfileKey(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_');
}

function readProfileValue(profile, baseKey) {
  const normalizedProfile = normalizeProfileKey(profile);
  if (normalizedProfile) {
    const profileKey = `${baseKey}_${normalizedProfile}`;
    if (process.env[profileKey] != null && process.env[profileKey] !== '') {
      return process.env[profileKey];
    }
  }
  return process.env[baseKey];
}

function getPortfolioBotConfig() {
  const profile = String(process.env.MAIL_PROFILE || 'tworeel').trim().toLowerCase();
  return {
    profile,
    host: String(readProfileValue(profile, 'SMTP_HOST') || '').trim(),
    port: Number(readProfileValue(profile, 'SMTP_PORT') || 587),
    secure: toBool(readProfileValue(profile, 'SMTP_SECURE'), false),
    user: String(readProfileValue(profile, 'SMTP_USER') || '').trim(),
    pass: String(readProfileValue(profile, 'SMTP_PASS') || '').trim(),
    from: String(readProfileValue(profile, 'MAIL_FROM') || readProfileValue(profile, 'SMTP_USER') || '').trim(),
    replyTo: String(readProfileValue(profile, 'MAIL_REPLY_TO') || '').trim(),
    botName: String(readProfileValue(profile, 'PORTFOLIO_BOT_NAME') || 'Anon Studios').trim(),
    botEmail: String(readProfileValue(profile, 'PORTFOLIO_BOT_EMAIL') || readProfileValue(profile, 'MAIL_FROM') || readProfileValue(profile, 'SMTP_USER') || '').trim(),
  };
}

function isPortfolioBotConfigured() {
  const config = getPortfolioBotConfig();
  return Boolean(config.host && config.port && config.user && config.pass && config.from);
}

function createTransport() {
  const config = getPortfolioBotConfig();
  if (!isPortfolioBotConfigured()) {
    throw new Error('Anon Studios mailer is not fully configured');
  }

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });
}

function configureCloudinary() {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error('Cloudinary is not fully configured for proposal asset hosting');
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'proposal';
}

function buildPlainTextFromHtml(html) {
  return String(html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&mdash;/g, '-')
    .replace(/&ndash;/g, '-')
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function normalizeCustomEmailHtml(html) {
  return String(html || '')
    .replace(/â€”/g, '&mdash;')
    .replace(/Â·/g, '·')
    .replace(/â€“/g, '-');
}

function injectDownloadUrlIntoHtml(html, downloadUrl) {
  const safeUrl = String(downloadUrl || '').trim();
  if (!safeUrl) return html;

  return String(html || '')
    .replace(/\{\{PROPOSAL_DOWNLOAD_URL\}\}/g, safeUrl)
    .replace(/href="2REELMAKEMUSIC\.pdf"[^>]*download="[^"]*"/gi, `href="${safeUrl}" target="_blank" rel="noopener noreferrer"`);
}

async function uploadProposalPdf(pdfPath, publicIdHint) {
  const resolvedPath = path.resolve(String(pdfPath || '').trim());
  if (!resolvedPath || !fs.existsSync(resolvedPath)) {
    throw new Error(`Proposal PDF was not found at ${resolvedPath}`);
  }

  configureCloudinary();
  const folder = String(process.env.CLOUDINARY_PROPOSAL_FOLDER || 'anon-studios/proposals').trim();
  const uploadResult = await cloudinary.uploader.upload(resolvedPath, {
    folder,
    public_id: slugify(publicIdHint || path.parse(resolvedPath).name),
    resource_type: 'raw',
    overwrite: true,
    invalidate: true,
    use_filename: false,
    unique_filename: false,
  });

  return uploadResult.secure_url;
}

async function sendProposalEmail(payload) {
  const config = getPortfolioBotConfig();
  const to = String(payload && payload.to ? payload.to : '').trim();
  if (!to) {
    throw new Error('A recipient email is required');
  }

  const rendered = buildProposalEmail(payload || {});
  const transport = createTransport();
  const info = await transport.sendMail({
    from: config.from,
    to,
    replyTo: config.replyTo || undefined,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    headers: {
      'X-Anon-Studios': config.botName,
    },
  });

  return {
    ok: true,
    subject: rendered.subject,
    to,
    messageId: info.messageId,
    accepted: info.accepted || [],
    rejected: info.rejected || [],
    preview: {
      html: rendered.html,
      text: rendered.text,
      meta: rendered.meta,
    },
  };
}

async function sendStoryFirstEmail(payload) {
  const config = getPortfolioBotConfig();
  const to = String(payload && payload.to ? payload.to : '').trim();
  if (!to) {
    throw new Error('A recipient email is required');
  }

  const rendered = buildStoryFirstEmail(payload || {});
  const pdfBuffer = await buildStoryFirstPdfBuffer(payload || {});
  const transport = createTransport();
  const info = await transport.sendMail({
    from: config.from,
    to,
    replyTo: config.replyTo || undefined,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    headers: {
      'X-Anon-Studios': config.botName,
      'X-Anon-Template': 'story-first-v1',
    },
    attachments: [
      {
        filename: 'StoryFirst_Proposal_GRACETONE_Studios.pdf',
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  });

  return {
    ok: true,
    subject: rendered.subject,
    to,
    messageId: info.messageId,
    accepted: info.accepted || [],
    rejected: info.rejected || [],
    preview: {
      html: rendered.html,
      text: rendered.text,
    },
  };
}

async function sendCustomHtmlEmail(payload) {
  const config = getPortfolioBotConfig();
  const to = String(payload && payload.to ? payload.to : '').trim();
  if (!to) {
    throw new Error('A recipient email is required');
  }

  const htmlPath = path.resolve(String(payload && payload.htmlPath ? payload.htmlPath : '').trim());
  if (!htmlPath || !fs.existsSync(htmlPath)) {
    throw new Error(`Custom HTML template was not found at ${htmlPath}`);
  }

  const subject = String(payload && payload.subject ? payload.subject : 'Proposal').trim();

  let downloadUrl = String(payload && payload.downloadUrl ? payload.downloadUrl : '').trim();
  const pdfPath = String(payload && payload.pdfPath ? payload.pdfPath : '').trim();
  if (!downloadUrl && pdfPath) {
    downloadUrl = await uploadProposalPdf(pdfPath, `${subject}-download`);
  }

  const useEmailSafeTemplate = payload && payload.emailSafe !== false;
  const htmlSource = fs.readFileSync(htmlPath, 'utf8');
  const normalizedHtml = normalizeCustomEmailHtml(htmlSource);
  const rendered = useEmailSafeTemplate
    ? buildEmailSafeHtmlTemplate({
        htmlPath,
        subject,
        downloadUrl,
      })
    : {
        subject,
        html: injectDownloadUrlIntoHtml(normalizedHtml, downloadUrl),
        text: buildPlainTextFromHtml(injectDownloadUrlIntoHtml(normalizedHtml, downloadUrl)),
      };
  const attachments = [];
  const attachPdf = payload && payload.attachPdf === true;

  if (pdfPath) {
    const resolvedPdf = path.resolve(pdfPath);
    if (attachPdf && fs.existsSync(resolvedPdf)) {
      attachments.push({
        filename: path.basename(resolvedPdf),
        path: resolvedPdf,
        contentType: 'application/pdf',
      });
    }
  }

  const logoPath = String(payload && payload.logoPath ? payload.logoPath : '').trim();
  if (logoPath) {
    const resolvedLogo = path.resolve(logoPath);
    if (fs.existsSync(resolvedLogo)) {
      attachments.push({
        filename: path.basename(resolvedLogo),
        path: resolvedLogo,
      });
    }
  }

  const transport = createTransport();
  const info = await transport.sendMail({
    from: config.from,
    to,
    replyTo: config.replyTo || undefined,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    attachments,
    headers: {
      'X-Anon-Studios': config.botName,
      'X-Anon-Template': 'custom-html-v1',
    },
  });

  return {
    ok: true,
    subject: rendered.subject,
    to,
    messageId: info.messageId,
    accepted: info.accepted || [],
    rejected: info.rejected || [],
    preview: {
      html: rendered.html,
      text: rendered.text,
      downloadUrl,
    },
  };
}

module.exports = {
  buildProposalEmail,
  buildStoryFirstEmail,
  buildStoryFirstPdfBuffer,
  createTransport,
  getPortfolioBotConfig,
  isPortfolioBotConfigured,
  sendCustomHtmlEmail,
  sendProposalEmail,
  sendStoryFirstEmail,
};
