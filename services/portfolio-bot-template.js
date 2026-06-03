function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeList(value) {
  if (Array.isArray(value)) return value.map(item => String(item || '').trim()).filter(Boolean);
  return String(value || '')
    .split('\n')
    .map(item => item.trim())
    .filter(Boolean);
}

function money(value) {
  const text = String(value || '').trim();
  return text || 'Custom quote';
}

function renderList(items) {
  if (!items.length) return '';
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;border-collapse:collapse">
      ${items.map(item => `
        <tr>
          <td width="18" valign="top" style="padding:0 0 12px;color:#2dd4a0;font-family:Arial,sans-serif;font-size:13px;line-height:20px">+</td>
          <td valign="top" style="padding:0 0 12px;color:#d9d5ce;font-family:Arial,sans-serif;font-size:14px;line-height:20px">${escapeHtml(item)}</td>
        </tr>
      `).join('')}
    </table>
  `;
}

function renderTextList(items) {
  if (!items.length) return '';
  return items.map(item => `- ${item}`).join('\n');
}

function buildProposalEmail(payload) {
  const clientName = String(payload.clientName || 'there').trim();
  const projectName = String(payload.projectName || 'your project').trim();
  const subject = String(payload.subject || `Proposal for ${projectName}`).trim();
  const greeting = String(payload.greeting || `Hi ${clientName},`).trim();
  const intro = String(payload.intro || 'Thank you for reaching out. I put together a proposal below so you can quickly review the creative direction, deliverables, and next steps.').trim();
  const creativeDirection = String(payload.creativeDirection || 'Cinematic visuals shaped by light, movement, and intention, with a polished delivery designed for both impact and clarity.').trim();
  const scope = normalizeList(payload.scope);
  const deliverables = normalizeList(payload.deliverables);
  const timeline = String(payload.timeline || 'Timeline to be confirmed after final scope approval.').trim();
  const investment = money(payload.investment);
  const nextSteps = String(payload.nextSteps || 'If this direction feels right, reply to this email and I will lock in the next steps, schedule, and production details.').trim();
  const ctaLabel = String(payload.ctaLabel || 'Reply To Confirm').trim();
  const ctaUrl = String(payload.ctaUrl || '').trim();
  const signatureName = String(payload.signatureName || process.env.PORTFOLIO_BOT_SIGNATURE_NAME || 'Nnamdi Raphael').trim();
  const signatureTitle = String(payload.signatureTitle || process.env.PORTFOLIO_BOT_SIGNATURE_TITLE || 'Anon Studios').trim();
  const footerNote = String(payload.footerNote || 'Prepared and shared by Anon Studios.').trim();

  const html = `
<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#0a0908;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#0a0908;">
      <tr>
        <td align="center" style="padding:40px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:720px;border-collapse:collapse;background:#11100f;border:1px solid rgba(255,255,255,.08);">
            <tr>
              <td style="padding:32px 32px 24px;background:linear-gradient(180deg,#151311 0%,#11100f 100%);border-bottom:1px solid rgba(255,255,255,.08);">
                <div style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:4px;text-transform:uppercase;color:#2dd4a0;margin:0 0 16px;">Anon Studios</div>
                <div style="font-family:Impact,'Arial Narrow Bold',sans-serif;font-size:54px;line-height:.92;letter-spacing:1px;color:#f0ebe2;margin:0 0 16px;">PROPOSAL</div>
                <div style="font-family:Arial,sans-serif;font-size:16px;line-height:24px;color:#c8c3bc;max-width:500px;">${escapeHtml(projectName)}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 18px;font-family:Arial,sans-serif;font-size:15px;line-height:24px;color:#f0ebe2;">${escapeHtml(greeting)}</p>
                <p style="margin:0 0 20px;font-family:Arial,sans-serif;font-size:15px;line-height:24px;color:#c8c3bc;">${escapeHtml(intro)}</p>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;border-collapse:collapse;background:#0d0c0b;border:1px solid rgba(45,212,160,.18);">
                  <tr>
                    <td style="padding:18px 20px;">
                      <div style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#2dd4a0;margin:0 0 10px;">Creative Direction</div>
                      <div style="font-family:Arial,sans-serif;font-size:15px;line-height:24px;color:#d9d5ce;">${escapeHtml(creativeDirection)}</div>
                    </td>
                  </tr>
                </table>

                ${scope.length ? `
                  <div style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#2dd4a0;margin:0 0 12px;">Scope</div>
                  ${renderList(scope)}
                ` : ''}

                ${deliverables.length ? `
                  <div style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#2dd4a0;margin:0 0 12px;">Deliverables</div>
                  ${renderList(deliverables)}
                ` : ''}

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;border-collapse:collapse;">
                  <tr>
                    <td width="50%" valign="top" style="padding:0 12px 0 0;">
                      <div style="padding:18px 20px;background:#0d0c0b;border:1px solid rgba(255,255,255,.08);">
                        <div style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#2dd4a0;margin:0 0 10px;">Timeline</div>
                        <div style="font-family:Arial,sans-serif;font-size:14px;line-height:22px;color:#d9d5ce;">${escapeHtml(timeline)}</div>
                      </div>
                    </td>
                    <td width="50%" valign="top" style="padding:0 0 0 12px;">
                      <div style="padding:18px 20px;background:#0d0c0b;border:1px solid rgba(255,255,255,.08);">
                        <div style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#2dd4a0;margin:0 0 10px;">Investment</div>
                        <div style="font-family:Impact,'Arial Narrow Bold',sans-serif;font-size:30px;line-height:1;color:#f0ebe2;">${escapeHtml(investment)}</div>
                      </div>
                    </td>
                  </tr>
                </table>

                <p style="margin:0 0 22px;font-family:Arial,sans-serif;font-size:15px;line-height:24px;color:#c8c3bc;">${escapeHtml(nextSteps)}</p>

                ${ctaUrl ? `
                  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 28px;border-collapse:collapse;">
                    <tr>
                      <td style="background:#2dd4a0;">
                        <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;padding:14px 20px;font-family:'Courier New',monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#090908;text-decoration:none;">${escapeHtml(ctaLabel)}</a>
                      </td>
                    </tr>
                  </table>
                ` : ''}

                <div style="margin:28px 0 0;padding-top:20px;border-top:1px solid rgba(255,255,255,.08);">
                  <div style="font-family:Arial,sans-serif;font-size:15px;line-height:24px;color:#f0ebe2;">${escapeHtml(signatureName)}</div>
                  <div style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#2dd4a0;margin-top:4px;">${escapeHtml(signatureTitle)}</div>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 32px 24px;border-top:1px solid rgba(255,255,255,.08);font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:rgba(240,235,226,.38);">
                ${escapeHtml(footerNote)}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`.trim();

  const text = [
    greeting,
    '',
    projectName.toUpperCase(),
    '',
    intro,
    '',
    'Creative Direction',
    creativeDirection,
    '',
    scope.length ? `Scope\n${renderTextList(scope)}\n` : '',
    deliverables.length ? `Deliverables\n${renderTextList(deliverables)}\n` : '',
    `Timeline\n${timeline}\n`,
    `Investment\n${investment}\n`,
    nextSteps,
    '',
    ctaUrl ? `${ctaLabel}: ${ctaUrl}` : '',
    '',
    `${signatureName}`,
    `${signatureTitle}`,
    '',
    footerNote,
  ].filter(Boolean).join('\n');

  return {
    subject,
    html,
    text,
    meta: {
      projectName,
      clientName,
      scopeCount: scope.length,
      deliverablesCount: deliverables.length,
    },
  };
}

module.exports = {
  buildProposalEmail,
};
