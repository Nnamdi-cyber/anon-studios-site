const fs = require('fs');
const path = require('path');

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function decodeBasicEntities(value) {
  return String(value || '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function normalizeBrokenEncoding(value) {
  return String(value || '')
    .replace(/â€”/g, '—')
    .replace(/â€“/g, '–')
    .replace(/Â·/g, '·');
}

function stripTags(value) {
  return decodeBasicEntities(
    normalizeBrokenEncoding(String(value || '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ' '))
  )
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractAll(source, regex, mapper) {
  const items = [];
  let match;
  while ((match = regex.exec(source))) {
    items.push(mapper(match));
  }
  return items;
}

function parseSourceHtml(source) {
  const titleMatch = source.match(/<title>([\s\S]*?)<\/title>/i);
  const ctaHeadlineMatch = source.match(/<div class="cta-headline">([\s\S]*?)<\/div>/i);
  const ctaSubMatch = source.match(/<p class="cta-sub">([\s\S]*?)<\/p>/i);
  const footerBrandMatch = source.match(/<div class="footer-brand">([\s\S]*?)<\/div>/i);
  const footerNoteMatch = source.match(/<div class="footer-note">([\s\S]*?)<\/div>/i);

  const pageImages = extractAll(
    source,
    /<img class="page-img" src="([^"]+)" alt="([^"]*)">/gi,
    match => ({
      src: match[1],
      alt: stripTags(match[2] || 'Proposal Page'),
    })
  );

  const labels = extractAll(
    source,
    /<span>([^<]+)<\/span>/gi,
    match => stripTags(match[1])
  ).filter(label => [
    'Event Overview',
    'Creative Direction',
    'Why We Want To Partner',
  ].includes(label));

  const teamNames = extractAll(
    source,
    /<div class="team-name">([\s\S]*?)<\/div>/gi,
    match => stripTags(match[1])
  );

  const teamRoles = extractAll(
    source,
    /<div class="team-role">([\s\S]*?)<\/div>/gi,
    match => stripTags(match[1])
  );

  const emails = extractAll(
    source,
    /href="mailto:([^"]+)"/gi,
    match => String(match[1] || '').trim()
  );

  const phones = extractAll(
    source,
    /href="tel:([^"]+)"/gi,
    match => String(match[1] || '').trim()
  );

  const team = teamNames.map((name, index) => ({
    name,
    role: teamRoles[index] || '',
  }));

  return {
    title: stripTags(titleMatch ? titleMatch[1] : '2Reel Studios Proposal'),
    ctaHeadline: ctaHeadlineMatch ? normalizeBrokenEncoding(ctaHeadlineMatch[1]).replace(/<br\s*\/?>/gi, '<br>') : 'Download Full Proposal',
    ctaSub: ctaSubMatch ? normalizeBrokenEncoding(ctaSubMatch[1]).replace(/<br\s*\/?>/gi, '<br>') : '',
    footerBrand: stripTags(footerBrandMatch ? footerBrandMatch[1] : '2Reel Studios · 2026'),
    footerNote: stripTags(footerNoteMatch ? footerNoteMatch[1] : 'Confidential - Partnership Proposal'),
    pageImages,
    labels,
    team,
    emails,
    phones,
  };
}

function renderTeamRows(team) {
  if (!team.length) return '';
  return team.map(member => `
    <tr>
      <td style="padding:0 0 14px 0;border-bottom:1px solid #2e2e2e;">
        <div style="font-family:Arial,sans-serif;font-size:18px;line-height:1.1;font-weight:700;color:#ffffff;text-transform:uppercase;letter-spacing:0.5px;">${escapeHtml(member.name)}</div>
        ${member.role ? `<div style="font-family:Arial,sans-serif;font-size:11px;line-height:1.5;color:#a3a3a3;text-transform:uppercase;letter-spacing:2px;padding-top:3px;">${escapeHtml(member.role)}</div>` : ''}
      </td>
    </tr>
  `).join('');
}

function renderContactRows(label, values, formatter) {
  if (!values.length) return '';
  return `
    <tr>
      <td style="font-family:Arial,sans-serif;font-size:13px;line-height:1.8;color:#f3f3f3;">
        ${values.map(value => formatter(value)).join('<br>')}
      </td>
    </tr>
  `;
}

function buildEmailSafeHtmlTemplate({
  htmlPath,
  subject,
  downloadUrl,
}) {
  const resolvedPath = path.resolve(String(htmlPath || '').trim());
  if (!resolvedPath || !fs.existsSync(resolvedPath)) {
    throw new Error(`Custom HTML template was not found at ${resolvedPath}`);
  }

  const source = fs.readFileSync(resolvedPath, 'utf8');
  const parsed = parseSourceHtml(source);
  const emailSubject = String(subject || parsed.title || '2Reel Studios Proposal').trim();
  const proposalLabel = parsed.labels.length ? parsed.labels : ['Event Overview', 'Creative Direction', 'Why We Want To Partner'];

  const proposalBlocks = parsed.pageImages.map((image, index) => `
    ${proposalLabel[index] ? `
    <tr>
      <td style="padding:0;background:#f5c518;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding:11px 28px;font-family:Arial,sans-serif;font-size:13px;line-height:1;color:#111111;font-weight:700;letter-spacing:3px;text-transform:uppercase;">
              ${escapeHtml(proposalLabel[index])}
            </td>
          </tr>
        </table>
      </td>
    </tr>` : ''}
    <tr>
      <td style="padding:0;background:#ffffff;">
        <img src="${image.src}" alt="${escapeHtml(image.alt || `Proposal Page ${index + 1}`)}" width="640" style="display:block;width:100%;max-width:640px;height:auto;border:0;outline:none;text-decoration:none;">
      </td>
    </tr>
    ${index < parsed.pageImages.length - 1 ? `
    <tr>
      <td style="padding:0 28px;background:#ffffff;">
        <div style="height:1px;line-height:1px;font-size:1px;background:#ececec;">&nbsp;</div>
      </td>
    </tr>` : ''}
  `).join('');

  return {
    subject: emailSubject,
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${escapeHtml(emailSubject)}</title>
</head>
<body style="margin:0;padding:0;background:#e8e8e8;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#e8e8e8;margin:0;padding:0;width:100%;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="640" style="width:100%;max-width:640px;background:#ffffff;">
          <tr>
            <td style="padding:14px 28px;background:#111111;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="left" style="font-family:Arial,sans-serif;font-size:24px;line-height:1;color:#ffffff;font-weight:700;letter-spacing:1px;">
                    2Reel Studios <span style="color:#f5c518;">•</span>
                  </td>
                  <td align="right" style="font-family:Arial,sans-serif;font-size:10px;line-height:1.4;color:#9e9e9e;letter-spacing:2px;text-transform:uppercase;">
                    Media Partnership Proposal
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${proposalBlocks}

          <tr>
            <td style="padding:0;background:#111111;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:46px 28px 40px 28px;text-align:center;background:#111111;">
                    <div style="font-family:Arial,sans-serif;font-size:11px;line-height:1.5;color:#f5c518;text-transform:uppercase;letter-spacing:4px;padding-bottom:16px;">Proposal Access</div>
                    <div style="font-family:Arial,sans-serif;font-size:42px;line-height:1;color:#ffffff;font-weight:700;text-transform:uppercase;letter-spacing:2px;padding-bottom:10px;">
                      ${parsed.ctaHeadline}
                    </div>
                    <div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.7;color:#bdbdbd;padding-bottom:28px;">
                      ${parsed.ctaSub}
                    </div>
                    <a href="${escapeHtml(downloadUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:16px 34px;background:#f5c518;color:#111111;text-decoration:none;font-family:Arial,sans-serif;font-size:16px;line-height:1;font-weight:700;letter-spacing:2px;text-transform:uppercase;border-radius:2px;">
                      Download Full Proposal
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:40px 28px;background:#1a1a1a;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td valign="top" width="50%" style="padding-right:16px;">
                    <div style="font-family:Arial,sans-serif;font-size:13px;line-height:1.2;color:#f5c518;font-weight:700;letter-spacing:3px;text-transform:uppercase;padding-bottom:18px;">Core Team</div>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      ${renderTeamRows(parsed.team)}
                    </table>
                  </td>
                  <td valign="top" width="50%" style="padding-left:16px;">
                    <div style="font-family:Arial,sans-serif;font-size:13px;line-height:1.2;color:#f5c518;font-weight:700;letter-spacing:3px;text-transform:uppercase;padding-bottom:18px;">Contact</div>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      ${renderContactRows('email', parsed.emails, value => `<a href="mailto:${escapeHtml(value)}" style="color:#ffffff;text-decoration:none;">${escapeHtml(value)}</a>`)}
                      ${renderContactRows('phone', parsed.phones, value => `<a href="tel:${escapeHtml(value)}" style="color:#ffffff;text-decoration:none;">${escapeHtml(value.replace(/^\+/, '+').replace(/(\d{3})(\d{3})(\d{4,})$/, '$1 $2 $3'))}</a>`)}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:18px 28px;background:#111111;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="left" style="font-family:Arial,sans-serif;font-size:12px;line-height:1.5;color:#f3f3f3;">
                    ${escapeHtml(parsed.footerBrand)}
                  </td>
                  <td align="right" style="font-family:Arial,sans-serif;font-size:12px;line-height:1.5;color:#8e8e8e;">
                    ${escapeHtml(parsed.footerNote)}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim(),
    text: buildPlainText(parsed, emailSubject, downloadUrl),
  };
}

function buildPlainText(parsed, subject, downloadUrl) {
  const lines = [
    subject,
    '',
    '2Reel Studios Media Partnership Proposal',
    '',
  ];

  parsed.pageImages.forEach((_, index) => {
    if (parsed.labels[index]) lines.push(parsed.labels[index]);
  });

  if (parsed.ctaSub) {
    lines.push('', stripTags(parsed.ctaSub));
  }

  if (downloadUrl) {
    lines.push('', `Download proposal: ${downloadUrl}`);
  }

  if (parsed.emails.length) {
    lines.push('', `Email: ${parsed.emails.join(', ')}`);
  }

  if (parsed.phones.length) {
    lines.push(`Phone: ${parsed.phones.join(', ')}`);
  }

  return lines.join('\n').trim();
}

module.exports = {
  buildEmailSafeHtmlTemplate,
};
