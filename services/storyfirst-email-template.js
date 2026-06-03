function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildStoryFirstEmail(payload = {}) {
  const subject = String(payload.subject || 'Story First - A Creator Experience Proposal').trim();
  const toName = String(payload.toName || 'Caleb Nwachi').trim();
  const role = String(payload.role || 'Co-founder, Wiflow').trim();
  const format = String(payload.format || 'One-Day Creator Experience').trim();
  const duration = String(payload.duration || '3-4 Hours').trim();
  const greetingName = String(payload.greetingName || 'Caleb').trim();
  const hostedByOne = String(payload.hostedByOne || 'Anon Studio Films').trim();
  const hostedByTwo = String(payload.hostedByTwo || 'Barney Photography').trim();
  const closingUrl = String(payload.closingUrl || '').trim();
  const introPara1 = String(payload.introPara1 || "Hope you're doing well. I wanted to reach out about an exciting collaboration opportunity we'd love to explore with GRACETONE Studios.").trim();
  const introPara2 = String(payload.introPara2 || "We've been thinking about ways to create more meaningful connections in the creative community, and we believe there's something special we could build together. Rather than another traditional workshop, we're envisioning something more interactive and authentic.").trim();
  const introPara3 = String(payload.introPara3 || "I've put together a proposal below that outlines our vision for a one-day creator experience. Would love to hear your thoughts and see if this resonates with what you're building at GRACETONE Studios.").trim();
  const signoffLabel = String(payload.signoffLabel || 'Best,').trim();
  const signoffTeam = String(payload.signoffTeam || 'The teams at Anon Studio Films & Barney Photography').trim();
  const footerPrimaryName = String(payload.footerPrimaryName || 'Anon Studio Films').trim();
  const footerPrimaryRole = String(payload.footerPrimaryRole || 'Creative Direction & Cinematography').trim();
  const footerSecondaryName = String(payload.footerSecondaryName || 'Barney Photography').trim();
  const footerSecondaryRole = String(payload.footerSecondaryRole || 'led by Barnabas Peters').trim();
  const showFooterSecondary = payload.showFooterSecondary === undefined ? true : Boolean(payload.showFooterSecondary);
  const attachmentNote = String(payload.attachmentNote || 'The full proposal deck is attached as a PDF for easy review and sharing.').trim();

  const html = `
<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#edebe4;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#edebe4;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:760px;border-collapse:collapse;background:#f5f0e8;">
            <tr>
              <td style="padding:52px 48px 40px;background:#1a3c2e;">
                <div style="font-family:Arial,sans-serif;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#e8a830;font-weight:bold;margin:0 0 16px;">Collaboration Proposal · 2026</div>
                <div style="font-family:Georgia,serif;font-size:62px;line-height:.92;font-weight:bold;color:#ffffff;">STORY<br><span style="color:#e8a830;font-style:italic;">FIRST.</span></div>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;border-collapse:collapse;border-top:1px solid rgba(255,255,255,.12);">
                  <tr>
                    <td width="25%" valign="top" style="padding:22px 12px 0 0;">
                      <div style="font-family:Arial,sans-serif;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,.45);font-weight:bold;">To</div>
                      <div style="font-family:Arial,sans-serif;font-size:13px;line-height:18px;color:rgba(255,255,255,.88);padding-top:4px;">${escapeHtml(toName)}</div>
                    </td>
                    <td width="25%" valign="top" style="padding:22px 12px 0 0;">
                      <div style="font-family:Arial,sans-serif;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,.45);font-weight:bold;">Role</div>
                      <div style="font-family:Arial,sans-serif;font-size:13px;line-height:18px;color:rgba(255,255,255,.88);padding-top:4px;">${escapeHtml(role)}</div>
                    </td>
                    <td width="25%" valign="top" style="padding:22px 12px 0 0;">
                      <div style="font-family:Arial,sans-serif;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,.45);font-weight:bold;">Format</div>
                      <div style="font-family:Arial,sans-serif;font-size:13px;line-height:18px;color:rgba(255,255,255,.88);padding-top:4px;">${escapeHtml(format)}</div>
                    </td>
                    <td width="25%" valign="top" style="padding:22px 0 0 0;">
                      <div style="font-family:Arial,sans-serif;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,.45);font-weight:bold;">Duration</div>
                      <div style="font-family:Arial,sans-serif;font-size:13px;line-height:18px;color:rgba(255,255,255,.88);padding-top:4px;">${escapeHtml(duration)}</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:12px 48px;background:#0d1f1a;font-family:Arial,sans-serif;font-size:11px;line-height:16px;color:rgba(255,255,255,.78);">
                <span style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,.45);font-weight:bold;">Hosted by</span>
                <span style="padding-left:16px;">${escapeHtml(hostedByOne)}</span>
                <span style="padding:0 14px;color:rgba(255,255,255,.28);">|</span>
                <span>${escapeHtml(hostedByTwo)}</span>
              </td>
            </tr>

            <tr>
              <td style="padding:36px 48px;background:#fafaf7;border-bottom:1px solid rgba(13,31,26,.08);">
                <p style="margin:0 0 16px;font-family:Arial,sans-serif;font-size:14px;line-height:24px;color:#0d1f1a;"><strong>Hi ${escapeHtml(greetingName)},</strong></p>
                <p style="margin:0 0 16px;font-family:Arial,sans-serif;font-size:14px;line-height:24px;color:#0d1f1a;">${escapeHtml(introPara1)}</p>
                <p style="margin:0 0 16px;font-family:Arial,sans-serif;font-size:14px;line-height:24px;color:#0d1f1a;">${escapeHtml(introPara2)}</p>
                <p style="margin:0 0 16px;font-family:Arial,sans-serif;font-size:14px;line-height:24px;color:#0d1f1a;">${escapeHtml(introPara3)}</p>
                <p style="margin:0;font-family:Arial,sans-serif;font-size:14px;line-height:24px;color:#0d1f1a;"><strong>${escapeHtml(signoffLabel)}</strong><br>${escapeHtml(signoffTeam)}</p>
              </td>
            </tr>

            <tr>
              <td style="padding:24px 48px;background:#ebe6dc;border-bottom:2px solid #e8a830;text-align:center;">
                <div style="font-family:Georgia,serif;font-size:28px;line-height:34px;font-weight:bold;color:#0d1f1a;">Collaboration Proposal</div>
                <div style="padding-top:6px;font-family:Arial,sans-serif;font-size:14px;line-height:20px;color:rgba(13,31,26,.68);font-style:italic;">Story First: A Creator Experience</div>
              </td>
            </tr>

            <tr>
              <td style="padding:0;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                  <tr>
                    <td width="56%" valign="top" style="padding:36px 32px;background:#2a6e54;">
                      <div style="font-family:Arial,sans-serif;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#e8a830;font-weight:bold;margin:0 0 12px;">Introduction</div>
                      <div style="font-family:Georgia,serif;font-size:24px;line-height:30px;font-weight:bold;color:#ffffff;margin:0 0 14px;">A new kind of creative experience</div>
                      <div style="font-family:Arial,sans-serif;font-size:13px;line-height:22px;color:rgba(255,255,255,.78);">We'd like to explore a collaboration with GRACETONE Studios to host a one-day creator experience - bringing together emerging and growing creatives in photography and cinematography.<br><br>Rather than a traditional masterclass, this is a collaborative experience blending storytelling, live creation, and real-time interaction.</div>
                    </td>
                    <td width="44%" valign="top" style="padding:28px;background:#f5f0e8;">
                      <div style="padding:12px 0;border-bottom:1px solid rgba(13,31,26,.1);">
                        <div style="font-family:Georgia,serif;font-size:36px;line-height:1;font-weight:bold;color:#2a6e54;">3-4</div>
                        <div style="padding-top:6px;font-family:Arial,sans-serif;font-size:12px;line-height:18px;color:rgba(13,31,26,.58);">Hour immersive experience</div>
                      </div>
                      <div style="padding:16px 0;border-bottom:1px solid rgba(13,31,26,.1);">
                        <div style="font-family:Georgia,serif;font-size:36px;line-height:1;font-weight:bold;color:#2a6e54;">2</div>
                        <div style="padding-top:6px;font-family:Arial,sans-serif;font-size:12px;line-height:18px;color:rgba(13,31,26,.58);">Collaborating studios</div>
                      </div>
                      <div style="padding:16px 0 0;">
                        <div style="font-family:Georgia,serif;font-size:36px;line-height:1;font-weight:bold;color:#2a6e54;">5</div>
                        <div style="padding-top:6px;font-family:Arial,sans-serif;font-size:12px;line-height:18px;color:rgba(13,31,26,.58);">Curated experience segments</div>
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:40px 48px;background:#f5f0e8;">
                <div style="font-family:Arial,sans-serif;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#e8a830;font-weight:bold;margin:0 0 10px;">Concept Overview</div>
                <div style="font-family:Georgia,serif;font-size:40px;line-height:46px;font-weight:bold;color:#0d1f1a;">Story First:<br><span style="color:#2a6e54;font-style:italic;">A Creator Experience</span></div>
                <div style="padding-top:12px;font-family:Arial,sans-serif;font-size:15px;line-height:22px;color:rgba(13,31,26,.66);font-style:italic;">A curated session where creatives don't just listen - they engage, create, and connect.</div>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;border-collapse:separate;">
                  <tr>
                    <td width="50%" valign="top" style="padding:0 8px 16px 0;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fafaf7;border-left:3px solid #2a6e54;">
                        <tr><td style="padding:22px 20px;">
                          <div style="font-family:Arial,sans-serif;font-size:13px;line-height:18px;font-weight:bold;color:#2a6e54;margin-bottom:8px;">Core Focus</div>
                          <div style="font-family:Arial,sans-serif;font-size:12px;line-height:20px;color:rgba(13,31,26,.72);">Helping creatives move from random content creation to intentional storytelling across photography and video.</div>
                        </td></tr>
                      </table>
                    </td>
                    <td width="50%" valign="top" style="padding:0 0 16px 8px;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fafaf7;border-left:3px solid #e8a830;">
                        <tr><td style="padding:22px 20px;">
                          <div style="font-family:Arial,sans-serif;font-size:13px;line-height:18px;font-weight:bold;color:#e8a830;margin-bottom:8px;">Format</div>
                          <div style="font-family:Arial,sans-serif;font-size:12px;line-height:20px;color:rgba(13,31,26,.72);">Fluid, conversational, and immersive. A shared creative journey led by working professionals.</div>
                        </td></tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td width="50%" valign="top" style="padding:0 8px 0 0;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fafaf7;border-left:3px solid #c8561a;">
                        <tr><td style="padding:22px 20px;">
                          <div style="font-family:Arial,sans-serif;font-size:13px;line-height:18px;font-weight:bold;color:#c8561a;margin-bottom:8px;">Audience</div>
                          <div style="font-family:Arial,sans-serif;font-size:12px;line-height:20px;color:rgba(13,31,26,.72);">Emerging and growing creatives in photography and cinematography seeking real-world insight.</div>
                        </td></tr>
                      </table>
                    </td>
                    <td width="50%" valign="top" style="padding:0 0 0 8px;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fafaf7;border-left:3px solid #2a6e54;">
                        <tr><td style="padding:22px 20px;">
                          <div style="font-family:Arial,sans-serif;font-size:13px;line-height:18px;font-weight:bold;color:#2a6e54;margin-bottom:8px;">Outcome</div>
                          <div style="font-family:Arial,sans-serif;font-size:12px;line-height:20px;color:rgba(13,31,26,.72);">Participants leave with stronger storytelling frameworks, genuine connections, and practical knowledge.</div>
                        </td></tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:40px 48px;background:#0d1f1a;">
                <div style="font-family:Arial,sans-serif;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#e8a830;font-weight:bold;margin:0 0 10px;">Experience Structure</div>
                <div style="font-family:Georgia,serif;font-size:42px;line-height:46px;font-weight:bold;color:#ffffff;margin-bottom:28px;">The Flow</div>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                  ${[
                    ['1','15 mins','Opening Conversation','A relaxed, guided discussion setting the tone around storytelling, creative growth, and industry realities.','Tone Setting'],
                    ['2','30 mins','Storytelling Breakdown','Live breakdown of selected works - intent behind visuals, emotional direction, creative decision-making.','Interactive'],
                    ['3','30-40 mins','Creator Conversations','How We See Stories and What Its Really Like - honest, hangout-style sessions across photography and film.','Honest · Inclusive'],
                    ['4','30-40 mins','Live Shoot Experience','A scene created and directed live. Attendees observe and participate - lighting, composition, story-driven shooting.','Hands-On'],
                    ['5','30 mins','Creative Circles','Small group discussions - share challenges, exchange ideas, connect with others in similar fields.','Networking'],
                  ].map(step => `
                    <tr>
                      <td valign="top" width="34" style="padding:0 0 24px;">
                        <div style="width:24px;height:24px;border-radius:50%;background:#1a3c2e;border:2px solid #2a6e54;color:#e8a830;font-family:Arial,sans-serif;font-size:11px;line-height:20px;font-weight:bold;text-align:center;">${step[0]}</div>
                      </td>
                      <td valign="top" width="92" style="padding:4px 16px 24px 0;font-family:Arial,sans-serif;font-size:11px;line-height:16px;color:rgba(232,168,48,.8);font-weight:bold;">${step[1]}</td>
                      <td valign="top" style="padding:0 0 24px;">
                        <div style="font-family:Arial,sans-serif;font-size:16px;line-height:22px;color:#ffffff;font-weight:bold;margin-bottom:6px;">${step[2]}</div>
                        <div style="font-family:Arial,sans-serif;font-size:12px;line-height:20px;color:rgba(255,255,255,.6);margin-bottom:10px;">${step[3]}</div>
                        <span style="display:inline-block;background:#2a6e54;color:#ffffff;font-family:Arial,sans-serif;font-size:9px;letter-spacing:1px;text-transform:uppercase;font-weight:bold;padding:4px 8px;">${step[4]}</span>
                      </td>
                    </tr>
                  `).join('')}
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:0;background:#f5f0e8;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                  <tr>
                    <td width="58%" valign="top" style="padding:40px 32px 40px 48px;">
                      <div style="font-family:Arial,sans-serif;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#e8a830;font-weight:bold;margin:0 0 10px;">Why This Matters</div>
                      <div style="font-family:Georgia,serif;font-size:26px;line-height:32px;font-weight:bold;color:#0d1f1a;margin-bottom:24px;">Built for the<br>creative community</div>
                      ${[
                        ['Strengthen the community','Build lasting relationships between emerging and established creatives in one shared space.'],
                        ['Encourage intentional storytelling','Shift creators from reactive content to purposeful, story-driven visual work.'],
                        ['Provide real-world insight','Practical, unfiltered knowledge from working professionals - not theory, lived experience.'],
                        ['Foster meaningful connections','Creative Circles ensure this is the start of ongoing collaboration, not just an event.'],
                      ].map(item => `
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 20px;padding-bottom:18px;border-bottom:1px solid rgba(13,31,26,.08);">
                          <tr>
                            <td width="40" valign="top" style="padding:2px 0 0;">
                              <div style="width:24px;height:24px;background:#1a3c2e;"></div>
                            </td>
                            <td valign="top">
                              <div style="font-family:Arial,sans-serif;font-size:13px;line-height:18px;font-weight:bold;color:#0d1f1a;margin-bottom:6px;">${item[0]}</div>
                              <div style="font-family:Arial,sans-serif;font-size:12px;line-height:20px;color:rgba(13,31,26,.66);">${item[1]}</div>
                            </td>
                          </tr>
                        </table>
                      `).join('')}
                    </td>
                    <td width="42%" valign="top" style="padding:40px 48px 40px 24px;background:#1a3c2e;">
                      <div style="font-family:Georgia,serif;font-size:24px;line-height:30px;font-weight:bold;color:#ffffff;margin-bottom:12px;">Why GRACETONE Studios?</div>
                      <div style="font-family:Arial,sans-serif;font-size:13px;line-height:22px;color:rgba(255,255,255,.68);">We believe GRACETONE Studios is the ideal partner - offering a strong creative environment, aligned with the vision of community growth, and a space perfectly suited for both learning and hands-on interaction.</div>
                      <div style="margin-top:20px;display:inline-block;background:#e8a830;color:#0d1f1a;font-family:Arial,sans-serif;font-size:12px;line-height:16px;font-weight:bold;letter-spacing:1px;padding:8px 16px;">Ideal Creative Partner</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:40px 48px;background:#f5f0e8;">
                <div style="font-family:Arial,sans-serif;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#e8a830;font-weight:bold;margin:0 0 10px;">Next Steps</div>
                <div style="font-family:Georgia,serif;font-size:42px;line-height:46px;font-weight:bold;color:#0d1f1a;">Let's build<br><span style="color:#2a6e54;font-style:italic;">this together.</span></div>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;border-collapse:collapse;">
                  <tr>
                    ${[
                      ['01','Suitable Dates','Align on a date that works for the GRACETONE Studios calendar and allows time for preparation.'],
                      ['02','Venue Coordination','Define the layout, technical needs, and creative setup to serve both the shoot and conversation segments.'],
                      ['03','Collaboration Structure','Establish the roles, credit, and visibility arrangements for both parties in this partnership.'],
                    ].map((step, index) => `
                      <td width="33.33%" valign="top" style="padding:${index === 0 ? '0 10px 0 0' : index === 1 ? '0 10px' : '0 0 0 10px'};">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fafaf7;border:1px solid rgba(13,31,26,.06);">
                          <tr><td style="padding:24px 20px;">
                            <div style="font-family:Arial,sans-serif;font-size:13px;line-height:18px;font-weight:bold;color:#0d1f1a;margin-bottom:8px;">${step[1]}</div>
                            <div style="font-family:Arial,sans-serif;font-size:12px;line-height:20px;color:rgba(13,31,26,.66);">${step[2]}</div>
                          </td></tr>
                        </table>
                      </td>
                    `).join('')}
                  </tr>
                </table>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:32px;border-collapse:collapse;background:#1a3c2e;">
                  <tr>
                    <td valign="top" style="padding:24px 28px;">
                      <div style="font-family:Arial,sans-serif;font-size:16px;line-height:22px;color:#ffffff;font-weight:bold;margin-bottom:4px;">Let's continue the conversation.</div>
                      <div style="font-family:Arial,sans-serif;font-size:12px;line-height:20px;color:rgba(255,255,255,.64);">I'd love to set up a call to discuss this further. ${escapeHtml(attachmentNote)}</div>
                    </td>
                    <td valign="middle" align="right" style="padding:24px 28px;">
                      <span style="display:inline-block;background:#e8a830;color:#0d1f1a;font-family:Arial,sans-serif;font-size:12px;line-height:16px;font-weight:bold;padding:10px 18px;">PDF Attached</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:24px 48px;background:#ebe6dc;border-top:1px solid rgba(13,31,26,.08);">
                <div style="font-family:Arial,sans-serif;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:rgba(13,31,26,.45);font-weight:bold;margin-bottom:12px;">Sent by</div>
                <div style="font-family:Arial,sans-serif;font-size:13px;line-height:18px;font-weight:bold;color:#0d1f1a;">${escapeHtml(footerPrimaryName)}</div>
                <div style="font-family:Arial,sans-serif;font-size:10px;line-height:16px;color:rgba(13,31,26,.58);${showFooterSecondary ? 'margin-bottom:14px;' : ''}">${escapeHtml(footerPrimaryRole)}</div>
                ${showFooterSecondary ? `
                  <div style="font-family:Arial,sans-serif;font-size:13px;line-height:18px;font-weight:bold;color:#0d1f1a;">${escapeHtml(footerSecondaryName)}</div>
                  <div style="font-family:Arial,sans-serif;font-size:10px;line-height:16px;color:rgba(13,31,26,.58);">${escapeHtml(footerSecondaryRole)}</div>
                ` : ''}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`.trim();

  const text = [
    `Hi ${greetingName},`,
    '',
    'Story First: A Creator Experience',
    '',
    introPara1,
    '',
    introPara2,
    '',
    introPara3,
    '',
    `${signoffLabel} ${signoffTeam}`,
    '',
    'Collaboration Proposal',
    `To: ${toName}`,
    `Role: ${role}`,
    `Format: ${format}`,
    `Duration: ${duration}`,
  ].join('\n');

  return { subject, html, text };
}

module.exports = { buildStoryFirstEmail };
