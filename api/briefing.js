// Vercel Serverless Function — POST /api/briefing
// Sends cinematic dual-email via Resend API

const ALLOWED_TYPES = ['landing', 'pwa', 'ecommerce', 'mobile', 'automation', 'brand'];
const ALLOWED_TIMELINES = ['rush', 'standard', 'flexible'];
const ALLOWED_BUDGETS = ['under1k', '1k-3k', '3k-5k', '5k-10k', '10k+'];
const ALLOWED_FEATURES = ['auth', 'payments', 'cms', 'api', 'email', 'analytics'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sendJson(res, status, body) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(status).json(body);
}

function sanitize(str, maxLen) {
  if (typeof str !== 'string') return '';
  return str.replace(/[\r\n\x00-\x1f]/g, ' ').trim().slice(0, maxLen);
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  try {
    const body = req.body;
    if (!body || typeof body !== 'object') {
      return sendJson(res, 400, { error: 'Invalid request body' });
    }

    const name = sanitize(body.name, 100);
    const email = sanitize(body.email, 254);
    const phone = sanitize(body.phone, 30);
    const vision = sanitize(body.vision, 2000);
    const assets = sanitize(body.assets, 1000);
    const estimate = sanitize(body.estimate, 50);

    if (!name || !email) {
      return sendJson(res, 400, { error: 'Name and email required' });
    }

    if (!EMAIL_RE.test(email)) {
      return sendJson(res, 400, { error: 'Invalid email address' });
    }

    const type = ALLOWED_TYPES.includes(body.type) ? body.type : null;
    const timeline = ALLOWED_TIMELINES.includes(body.timeline) ? body.timeline : null;
    const budget = ALLOWED_BUDGETS.includes(body.budget) ? body.budget : null;
    const pages = Math.max(1, Math.min(20, parseInt(body.pages, 10) || 3));

    let features = [];
    if (Array.isArray(body.features)) {
      features = body.features.filter(f => ALLOWED_FEATURES.includes(f));
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) {
      console.error('[BRIEFING] RESEND_API_KEY not set');
      return sendJson(res, 500, { error: 'Server configuration error' });
    }

    const typeNames = {
      landing: 'Landing Page',
      pwa: 'PWA Deployment',
      ecommerce: 'E-Commerce Build',
      mobile: 'Mobile App',
      automation: 'Automation & AI',
      brand: 'Brand Identity',
    };
    const typeName = typeNames[type] || type || 'General';

    const timelineNames = {
      rush: '🔥 Rush (ASAP)',
      standard: '⚡ Standard',
      flexible: '🕐 Flexible',
    };
    const timelineName = timelineNames[timeline] || 'Not specified';

    const budgetNames = {
      'under1k': 'Under $1K',
      '1k-3k': '$1K – $3K',
      '3k-5k': '$3K – $5K',
      '5k-10k': '$5K – $10K',
      '10k+': '$10K+',
    };
    const budgetName = budgetNames[budget] || 'Not specified';

    const featureList = features.length > 0 ? features.join(', ') : 'None selected';

    const internalHtml = buildCinematicBriefingEmail({
      name, email, phone, typeName, pages, featureList, timelineName, budgetName, estimate, vision, assets,
    });

    const confirmationHtml = buildConfirmationEmail({ name, typeName, estimate });

    // Send internal briefing first, then confirmation
    const internalRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'codewithsolo.com <noreply@mail.codewithsolo.com>',
        to: ['cod3blackagency@gmail.com', 'silverwatkins@gmail.com'],
        subject: `Mission Briefing: ${typeName} — ${name}`,
        html: internalHtml,
        reply_to: email,
        tags: [{ name: 'category', value: 'briefing' }],
      }),
    });

    const internalResult = await internalRes.json();
    console.log('[BRIEFING] Internal email:', internalRes.status, JSON.stringify(internalResult));

    if (!internalRes.ok) {
      console.error('[BRIEFING] Internal email failed:', JSON.stringify(internalResult));
      return sendJson(res, 502, { error: 'Failed to send briefing' });
    }

    // Send confirmation to client — don't block success on this
    let confirmationSent = false;
    try {
      const confirmRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'codewithsolo.com <noreply@mail.codewithsolo.com>',
          to: [email],
          subject: `Your project briefing — codewithsolo.com`,
          html: confirmationHtml,
          reply_to: 'cod3blackagency@gmail.com',
          tags: [{ name: 'category', value: 'confirmation' }],
        }),
      });
      const confirmResult = await confirmRes.json();
      console.log('[BRIEFING] Confirm email:', confirmRes.status, JSON.stringify(confirmResult));
      confirmationSent = confirmRes.ok;
    } catch (confirmErr) {
      console.error('[BRIEFING] Confirmation email error:', confirmErr.message);
    }

    return sendJson(res, 200, { success: true, id: internalResult.id, confirmationSent });

  } catch (err) {
    console.error('[BRIEFING] Error:', err);
    return sendJson(res, 500, { error: 'Internal error' });
  }
}

// ═══════════════════════════════════════════════════════
// CINEMATIC BRIEFING EMAIL — sent to cod3blackagency@gmail.com
// ═══════════════════════════════════════════════════════
function buildCinematicBriefingEmail({ name, email, phone, typeName, pages, featureList, timelineName, budgetName, estimate, vision, assets }) {
  const phoneRow = phone ? `
                <tr>
                  <td style="padding:8px 16px;font-family:'Courier New',monospace;font-size:12px;color:#7a8599;letter-spacing:1px;width:120px;vertical-align:top;">PHONE</td>
                  <td style="padding:8px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;color:#e0e6f0;">${escHtml(phone)}</td>
                </tr>` : '';

  const visionBlock = vision ? `
          <tr>
            <td style="padding:0 30px 24px;">
              <div style="background:linear-gradient(135deg,#141928 0%,#1a2035 100%);border:1px solid rgba(0,212,255,0.15);border-radius:8px;padding:20px;">
                <p style="font-family:'Courier New',monospace;font-size:11px;color:#00d4ff;letter-spacing:2px;margin:0 0 10px;">PROJECT VISION</p>
                <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;color:#c8d0e0;line-height:1.7;margin:0;white-space:pre-wrap;">${escHtml(vision)}</p>
              </div>
            </td>
          </tr>` : '';

  const assetsBlock = assets ? `
          <tr>
            <td style="padding:0 30px 24px;">
              <div style="background:linear-gradient(135deg,#141928 0%,#1a2035 100%);border:1px solid rgba(44,255,143,0.15);border-radius:8px;padding:20px;">
                <p style="font-family:'Courier New',monospace;font-size:11px;color:#2cff8f;letter-spacing:2px;margin:0 0 10px;">EXISTING ASSETS</p>
                <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;color:#c8d0e0;line-height:1.7;margin:0;white-space:pre-wrap;">${escHtml(assets)}</p>
              </div>
            </td>
          </tr>` : '';

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background-color:#0b0b14;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#0b0b14;">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color:#111827;border-radius:12px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.5),0 0 60px rgba(0,212,255,0.05);">
          <tr>
            <td style="background:linear-gradient(135deg,#0f1326 0%,#1a1a2e 50%,#0f1326 100%);padding:40px 30px;text-align:center;border-bottom:1px solid rgba(0,212,255,0.2);">
              <p style="font-family:'Courier New',monospace;font-size:11px;color:#00d4ff;letter-spacing:3px;margin:0 0 12px;opacity:0.8;">◆ INCOMING TRANSMISSION</p>
              <h1 style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:26px;font-weight:700;color:#ffffff;margin:0 0 8px;letter-spacing:-0.5px;">Mission Briefing Received</h1>
              <p style="font-family:'Courier New',monospace;font-size:13px;color:#2cff8f;margin:0;">via codewithsolo.com</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 30px 8px;">
              <p style="font-family:'Courier New',monospace;font-size:11px;color:#00d4ff;letter-spacing:2px;margin:0 0 14px;">OPERATIVE DETAILS</p>
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background:linear-gradient(135deg,#141928 0%,#1a2035 100%);border:1px solid rgba(255,255,255,0.08);border-radius:8px;overflow:hidden;">
                <tr>
                  <td style="padding:8px 16px;font-family:'Courier New',monospace;font-size:12px;color:#7a8599;letter-spacing:1px;width:120px;vertical-align:top;">NAME</td>
                  <td style="padding:8px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;color:#ffffff;font-weight:600;">${escHtml(name)}</td>
                </tr>
                <tr>
                  <td style="padding:8px 16px;font-family:'Courier New',monospace;font-size:12px;color:#7a8599;letter-spacing:1px;width:120px;vertical-align:top;">EMAIL</td>
                  <td style="padding:8px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;color:#00d4ff;"><a href="mailto:${escHtml(email)}" style="color:#00d4ff;text-decoration:none;">${escHtml(email)}</a></td>
                </tr>${phoneRow}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 30px 8px;">
              <p style="font-family:'Courier New',monospace;font-size:11px;color:#00d4ff;letter-spacing:2px;margin:0 0 14px;">MISSION PARAMETERS</p>
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background:linear-gradient(135deg,#141928 0%,#1a2035 100%);border:1px solid rgba(255,255,255,0.08);border-radius:8px;overflow:hidden;">
                <tr>
                  <td style="padding:8px 16px;font-family:'Courier New',monospace;font-size:12px;color:#7a8599;letter-spacing:1px;width:120px;">TYPE</td>
                  <td style="padding:8px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;color:#ffffff;font-weight:600;">${escHtml(typeName)}</td>
                </tr>
                <tr>
                  <td style="padding:8px 16px;font-family:'Courier New',monospace;font-size:12px;color:#7a8599;letter-spacing:1px;width:120px;">SCOPE</td>
                  <td style="padding:8px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;color:#e0e6f0;">${escHtml(String(pages))} pages/screens</td>
                </tr>
                <tr>
                  <td style="padding:8px 16px;font-family:'Courier New',monospace;font-size:12px;color:#7a8599;letter-spacing:1px;width:120px;">FEATURES</td>
                  <td style="padding:8px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;color:#e0e6f0;">${escHtml(featureList)}</td>
                </tr>
                <tr>
                  <td style="padding:8px 16px;font-family:'Courier New',monospace;font-size:12px;color:#7a8599;letter-spacing:1px;width:120px;">TIMELINE</td>
                  <td style="padding:8px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;color:#e0e6f0;">${escHtml(timelineName)}</td>
                </tr>
                <tr>
                  <td style="padding:8px 16px;font-family:'Courier New',monospace;font-size:12px;color:#7a8599;letter-spacing:1px;width:120px;">BUDGET</td>
                  <td style="padding:8px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;color:#e0e6f0;">${escHtml(budgetName)}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 30px;">
              <div style="background:linear-gradient(135deg,#0a1628 0%,#0f1e36 100%);border:1px solid rgba(0,212,255,0.3);border-radius:8px;padding:20px;text-align:center;">
                <p style="font-family:'Courier New',monospace;font-size:11px;color:#7a8599;letter-spacing:2px;margin:0 0 8px;">ESTIMATED RANGE</p>
                <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:28px;font-weight:900;color:#00d4ff;margin:0;letter-spacing:-1px;">${escHtml(estimate || '$0 – $0')}</p>
              </div>
            </td>
          </tr>
          ${visionBlock}
          ${assetsBlock}
          <tr>
            <td style="padding:8px 30px 28px;text-align:center;">
              <a href="mailto:${escHtml(email)}" style="display:inline-block;background:linear-gradient(135deg,#00d4ff 0%,#2cff8f 100%);color:#0b0b14;padding:14px 40px;text-decoration:none;border-radius:8px;font-weight:700;font-size:14px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;letter-spacing:0.5px;">Reply to ${escHtml(name)}</a>
            </td>
          </tr>
          <tr>
            <td style="background:linear-gradient(135deg,#0a0e1a 0%,#0f1326 100%);padding:20px 30px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
              <p style="font-family:'Courier New',monospace;font-size:11px;color:#4a5568;margin:0;">◆ codewithsolo.com — Cod3BlackAgency</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ═══════════════════════════════════════════════════════
// CONFIRMATION EMAIL — sent to the client
// ═══════════════════════════════════════════════════════
function buildConfirmationEmail({ name, typeName, estimate }) {
  const firstName = name.split(' ')[0];
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background-color:#0b0b14;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#0b0b14;">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color:#111827;border-radius:12px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.5),0 0 60px rgba(0,212,255,0.05);">
          <tr>
            <td style="background:linear-gradient(135deg,#0f1326 0%,#1a1a2e 50%,#0f1326 100%);padding:50px 30px;text-align:center;border-bottom:1px solid rgba(0,212,255,0.2);">
              <p style="font-family:'Courier New',monospace;font-size:11px;color:#2cff8f;letter-spacing:3px;margin:0 0 16px;">◆ TRANSMISSION CONFIRMED</p>
              <h1 style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:24px;font-weight:700;color:#ffffff;margin:0 0 8px;letter-spacing:-0.5px;">Mission Briefing Received</h1>
              <p style="font-family:'Courier New',monospace;font-size:12px;color:rgba(255,255,255,0.5);margin:0;">codewithsolo.com</p>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 30px;line-height:1.7;color:#c8d0e0;">
              <p style="font-size:16px;margin:0 0 20px;">Hey ${escHtml(firstName)},</p>
              <p style="font-size:15px;margin:0 0 20px;">Your <span style="color:#00d4ff;font-weight:600;">${escHtml(typeName)}</span> mission briefing has been received and logged. I'll review the full brief and respond within <strong style="color:#ffffff;">24 hours</strong> with next steps.</p>
              <div style="background:linear-gradient(135deg,#141928 0%,#1a2035 100%);border:1px solid rgba(0,212,255,0.15);border-radius:8px;padding:20px;margin:24px 0;">
                <p style="font-family:'Courier New',monospace;font-size:11px;color:#7a8599;letter-spacing:2px;margin:0 0 8px;">YOUR ESTIMATE</p>
                <p style="font-size:22px;font-weight:900;color:#00d4ff;margin:0;">${escHtml(estimate || 'Pending review')}</p>
                <p style="font-family:'Courier New',monospace;font-size:11px;color:#4a5568;margin:8px 0 0;">Final quote after briefing review</p>
              </div>
              <p style="font-size:15px;margin:0 0 20px;color:#9ca3af;">In the meantime, feel free to reply to this email with any additional details, references, or inspiration — the more context, the sharper the build.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 30px 32px;text-align:center;">
              <a href="https://codewithsolo.com" style="display:inline-block;background:linear-gradient(135deg,#00d4ff 0%,#2cff8f 100%);color:#0b0b14;padding:14px 36px;text-decoration:none;border-radius:8px;font-weight:700;font-size:14px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">View Portfolio</a>
            </td>
          </tr>
          <tr>
            <td style="background:linear-gradient(135deg,#0a0e1a 0%,#0f1326 100%);padding:24px 30px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
              <p style="font-family:'Courier New',monospace;font-size:11px;color:#4a5568;margin:0 0 4px;">Solomon Watkins — Cod3BlackAgency</p>
              <p style="font-family:'Courier New',monospace;font-size:11px;color:#4a5568;margin:0;">Ship fast. Ship polished. Ship solo.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
