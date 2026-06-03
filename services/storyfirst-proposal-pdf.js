const PDFDocument = require('pdfkit');

function buildStoryFirstPdfBuffer(payload = {}) {
  return new Promise((resolve, reject) => {
    try {
      const toName = String(payload.toName || 'Caleb Nwachi').trim();
      const role = String(payload.role || 'Co-founder, Wiflow').trim();
      const greetingName = String(payload.greetingName || 'Caleb').trim();
      const introPara1 = String(payload.introPara1 || "Hope you're doing well. I wanted to reach out about an exciting collaboration opportunity we'd love to explore with GRACETONE Studios.").trim();
      const introPara2 = String(payload.introPara2 || "We've been thinking about ways to create more meaningful connections in the creative community, and we believe there's something special we could build together. Rather than another traditional workshop, we're envisioning something more interactive and authentic.").trim();
      const introPara3 = String(payload.introPara3 || "I've put together a proposal below that outlines our vision for a one-day creator experience. Would love to hear your thoughts and see if this resonates with what you're building at GRACETONE Studios.").trim();

      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 54, bottom: 54, left: 56, right: 56 },
        info: {
          Title: 'Story First - A Creator Experience Proposal',
          Author: 'Anon Studios',
          Subject: 'Collaboration Proposal',
        },
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const colors = {
        ink: '#0D1F1A',
        forest: '#1A3C2E',
        sage: '#2A6E54',
        gold: '#E8A830',
        mist: '#EBE6DC',
        cream: '#F5F0E8',
        gray: '#5B615C',
      };

      function sectionEyebrow(text) {
        doc.moveDown(0.4);
        doc.font('Helvetica-Bold').fontSize(9).fillColor(colors.gold).text(text.toUpperCase(), { characterSpacing: 2 });
        doc.moveDown(0.2);
      }

      function sectionTitle(text, color = colors.ink) {
        doc.font('Times-Bold').fontSize(24).fillColor(color).text(text);
        doc.moveDown(0.35);
      }

      function body(text, color = colors.gray) {
        doc.font('Helvetica').fontSize(11.5).fillColor(color).text(text, {
          lineGap: 4,
        });
      }

      doc.rect(0, 0, doc.page.width, 170).fill(colors.forest);
      doc.fillColor(colors.gold).font('Helvetica-Bold').fontSize(9).text('COLLABORATION PROPOSAL · 2026', 56, 46, {
        characterSpacing: 2,
      });
      doc.fillColor('#FFFFFF').font('Times-Bold').fontSize(40).text('STORY', 56, 72);
      doc.fillColor(colors.gold).font('Times-Italic').fontSize(40).text('FIRST.', 56, 110);

      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9).text('TO', 56, 148, { characterSpacing: 1.6 });
      doc.font('Helvetica').fontSize(11).text(toName, 56, 162);
      doc.font('Helvetica-Bold').fontSize(9).text('ROLE', 220, 148, { characterSpacing: 1.6 });
      doc.font('Helvetica').fontSize(11).text(role, 220, 162);
      doc.font('Helvetica-Bold').fontSize(9).text('FORMAT', 390, 148, { characterSpacing: 1.6 });
      doc.font('Helvetica').fontSize(11).text('One-Day Creator Experience', 390, 162);

      doc.y = 210;

      sectionEyebrow('Introduction');
      sectionTitle('A new kind of creative experience');
      body(`Hi ${greetingName},`);
      doc.moveDown(0.6);
      body(introPara1);
      doc.moveDown(0.4);
      body(introPara2);
      doc.moveDown(0.4);
      body(introPara3);

      doc.moveDown(1.2);
      sectionEyebrow('Concept Overview');
      sectionTitle('Story First: A Creator Experience');
      body("A curated session where creatives don't just listen - they engage, create, and connect.");

      doc.moveDown(0.9);
      [
        ['Core Focus', 'Helping creatives move from random content creation to intentional storytelling across photography and video.'],
        ['Format', 'Fluid, conversational, and immersive. A shared creative journey led by working professionals.'],
        ['Audience', 'Emerging and growing creatives in photography and cinematography seeking real-world insight.'],
        ['Outcome', 'Participants leave with stronger storytelling frameworks, genuine connections, and practical knowledge.'],
      ].forEach(([label, copy]) => {
        doc.font('Helvetica-Bold').fontSize(11).fillColor(colors.sage).text(label);
        doc.font('Helvetica').fontSize(11).fillColor(colors.gray).text(copy, { indent: 10 });
        doc.moveDown(0.5);
      });

      doc.addPage();
      sectionEyebrow('Experience Structure');
      sectionTitle('The Flow');
      [
        ['15 mins', 'Opening Conversation', 'A relaxed, guided discussion setting the tone around storytelling, creative growth, and industry realities.'],
        ['30 mins', 'Storytelling Breakdown', 'Live breakdown of selected works - intent behind visuals, emotional direction, creative decision-making.'],
        ['30-40 mins', 'Creator Conversations', 'How We See Stories and What Its Really Like - honest, hangout-style sessions across photography and film.'],
        ['30-40 mins', 'Live Shoot Experience', 'A scene created and directed live. Attendees observe and participate - lighting, composition, story-driven shooting.'],
        ['30 mins', 'Creative Circles', 'Small group discussions - share challenges, exchange ideas, connect with others in similar fields.'],
      ].forEach((item, index) => {
        doc.circle(68, doc.y + 8, 11).fillAndStroke(colors.forest, colors.sage);
        doc.fillColor(colors.gold).font('Helvetica-Bold').fontSize(10).text(String(index + 1), 64, doc.y + 3);
        doc.fillColor(colors.gold).font('Helvetica-Bold').fontSize(10).text(item[0], 92, doc.y - 2);
        doc.fillColor(colors.ink).font('Helvetica-Bold').fontSize(13).text(item[1], 160, doc.y - 2);
        doc.fillColor(colors.gray).font('Helvetica').fontSize(11).text(item[2], 160, doc.y + 16, { width: 340, lineGap: 3 });
        doc.moveDown(2.8);
      });

      sectionEyebrow('Why This Matters');
      sectionTitle('Built for the creative community');
      [
        'Strengthen the community through real collaboration between emerging and established creatives.',
        'Encourage intentional storytelling over reactive content making.',
        'Provide practical, real-world insight from working professionals.',
        'Foster meaningful creative relationships that continue beyond the event itself.',
      ].forEach(point => {
        doc.fillColor(colors.ink).font('Helvetica-Bold').fontSize(11).text('•', { continued: true });
        doc.fillColor(colors.gray).font('Helvetica').fontSize(11).text(` ${point}`, { indent: 6 });
        doc.moveDown(0.3);
      });

      doc.moveDown(0.8);
      sectionEyebrow('Partnership');
      sectionTitle('Why GRACETONE Studios?');
      body('We believe GRACETONE Studios is the ideal partner - offering a strong creative environment, aligned with the vision of community growth, and a space perfectly suited for both learning and hands-on interaction.');

      doc.moveDown(1.1);
      sectionEyebrow('Next Steps');
      sectionTitle("Let's build this together.");
      [
        'Suitable Dates: Align on a date that works for the GRACETONE Studios calendar and allows time for preparation.',
        'Venue Coordination: Define the layout, technical needs, and creative setup to serve both the shoot and conversation segments.',
        'Collaboration Structure: Establish the roles, credit, and visibility arrangements for both parties in this partnership.',
      ].forEach(step => {
        body(step, colors.ink);
        doc.moveDown(0.45);
      });

      doc.moveDown(1);
      doc.roundedRect(56, doc.y, 483, 68, 6).fill(colors.forest);
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(13).text("Let's continue the conversation.", 76, doc.y + 16);
      doc.fillColor('#D8D5CF').font('Helvetica').fontSize(10.5).text('The Story First proposal deck is attached as a PDF for easy review and sharing.', 76, doc.y + 36);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = {
  buildStoryFirstPdfBuffer,
};
