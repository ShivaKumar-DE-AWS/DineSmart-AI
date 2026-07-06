export function generateQrHtml(titleText: string, qrSvgMarkup: string, restaurantName: string, includePrintScript: boolean = true): string {
  const script = includePrintScript ? `<script>window.onload=()=>{setTimeout(()=>window.print(),800)};</script>` : "";
  return `<!doctype html><html><head><title>${restaurantName} — QR</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&display=swap" rel="stylesheet">
    <style>
      @page { margin: 0; size: 900px 1400px; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #111; font-family: 'Inter', sans-serif; }
      .card {
        width: 860px; min-height: 1340px; background: #0D0D0D;
        border: 3px solid #B5943A; border-radius: 24px;
        padding: 50px 45px 35px; display: flex; flex-direction: column;
        position: relative; overflow: hidden;
      }
      /* Subtle warm overlay */
      .card::before { content: ''; position: absolute; inset: 0; background: radial-gradient(ellipse at top center, rgba(181,148,58,0.06) 0%, transparent 60%); pointer-events: none; }

      .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; position: relative; z-index: 1; }
      .brand { display: flex; flex-direction: column; }
      .brand-name { font-family: 'Playfair Display', serif; font-size: 48px; font-weight: 900; color: #B5943A; line-height: 1; letter-spacing: 1px; }
      .brand-tag { display: inline-block; background: #B5943A; color: #0D0D0D; font-size: 14px; font-weight: 800; padding: 4px 18px; border-radius: 4px; letter-spacing: 4px; margin-top: 6px; text-transform: uppercase; }
      .brand-sub { color: #FAF5EC; font-size: 14px; margin-top: 8px; letter-spacing: 3px; text-transform: uppercase; font-weight: 600; }
      .logo-right { text-align: right; color: #FAF5EC; }
      .logo-right .name { font-size: 28px; font-weight: 800; }
      .logo-right .name span { color: #6BAF36; }
      .logo-right .tagline { font-size: 10px; color: #6BAF36; letter-spacing: 3px; text-transform: uppercase; font-weight: 600; }

      .scan-title { text-align: center; margin-bottom: 8px; position: relative; z-index: 1; }
      .scan-title h1 { font-family: 'Inter', sans-serif; font-size: 48px; font-weight: 900; color: #6BAF36; letter-spacing: 3px; }
      .scan-sub { text-align: center; color: #FAF5EC; font-size: 22px; font-weight: 600; letter-spacing: 2px; margin-bottom: 35px; }

      .content { display: flex; gap: 25px; flex: 1; position: relative; z-index: 1; }
      .col-left, .col-right { width: 200px; }
      .col-center { flex: 1; display: flex; flex-direction: column; align-items: center; }

      .col-header { border: 2px solid #888; color: #FAF5EC; font-size: 13px; font-weight: 800; text-align: center; padding: 8px; border-radius: 8px; margin-bottom: 25px; letter-spacing: 2px; text-transform: uppercase; }
      .step { margin-bottom: 22px; }
      .step-icon { font-size: 28px; margin-bottom: 6px; display: block; }
      .step-title { font-size: 13px; font-weight: 800; color: #6BAF36; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 3px; }
      .step-desc { font-size: 11px; color: #999; line-height: 1.5; }

      .right-step { display: flex; flex-direction: column; align-items: flex-end; text-align: right; margin-bottom: 28px; }
      .right-icon { font-size: 30px; margin-bottom: 6px; }
      .right-title { font-size: 14px; font-weight: 700; color: #FAF5EC; }
      .right-sub { font-size: 12px; color: #999; }

      .qr-wrap {
        background: #FAF5EC; padding: 18px; border-radius: 20px;
        border: 5px solid #6BAF36; box-shadow: 0 0 40px rgba(107,175,54,0.15);
        margin-bottom: 25px;
      }
      .qr-wrap svg { display: block; width: 320px; height: 320px; }

      .actions { display: flex; justify-content: center; gap: 25px; margin-bottom: 25px; }
      .action-item { display: flex; flex-direction: column; align-items: center; gap: 6px; }
      .action-icon { width: 45px; height: 45px; border: 2px solid #6BAF36; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 22px; }
      .action-label { font-size: 12px; font-weight: 700; color: #FAF5EC; letter-spacing: 2px; }

      .slogan { font-family: 'Playfair Display', serif; font-style: italic; font-size: 32px; color: #FAF5EC; text-align: center; margin-bottom: 30px; }
      .slogan span { color: #6BAF36; }

      .caution { background: #FAF5EC; border-radius: 14px; display: flex; overflow: hidden; margin-bottom: 25px; width: 100%; }
      .caution-left { background: #D32F2F; width: 100px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #fff; padding: 12px; flex-shrink: 0; }
      .caution-left .warn-icon { font-size: 36px; }
      .caution-left .warn-text { font-size: 11px; font-weight: 900; letter-spacing: 2px; margin-top: 2px; }
      .caution-right { flex: 1; display: flex; align-items: center; padding: 15px 25px; color: #0D0D0D; font-size: 16px; font-weight: 600; line-height: 1.5; }
      .caution-right strong { color: #D32F2F; }

      .footer { text-align: center; margin-top: auto; }
      .footer-thanks { font-family: 'Playfair Display', serif; font-style: italic; color: #B5943A; font-size: 20px; margin-bottom: 12px; }
      .footer-links { display: flex; justify-content: center; gap: 40px; color: #6BAF36; font-size: 14px; font-weight: 600; }

      .table-badge {
        position: absolute; top: -2px; left: 50%; transform: translateX(-50%);
        background: #B5943A; color: #0D0D0D; font-size: 18px; font-weight: 900;
        padding: 8px 40px; border-radius: 0 0 16px 16px; letter-spacing: 2px; z-index: 5;
      }
      
      /* Print adjustments */
      @media print {
        @page { margin: 0; size: 900px 1400px; }
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }
    </style></head><body>
    <div class="card">
      <div class="table-badge">${titleText}</div>
      <div class="header">
        <div class="brand">
          <div class="brand-name">${restaurantName.toUpperCase()}</div>
          <div class="brand-tag">EXCLUSIVE</div>
          <div class="brand-sub">MULTI CUISINE RESTAURANT</div>
        </div>
        <div class="logo-right">
          <div class="name">🍽️ Smart<span>Dine</span> AI</div>
          <div class="tagline">AI-POWERED DINING EXPERIENCE</div>
        </div>
      </div>

      <div class="scan-title"><h1>SCAN TO ORDER</h1></div>
      <div class="scan-sub">Talk. Order. Enjoy.</div>

      <div class="content">
        <div class="col-left">
          <div class="col-header">HOW TO ORDER</div>
          <div class="step"><span class="step-icon">📱</span><div class="step-title">1. Scan</div><div class="step-desc">Scan the QR code from your table.</div></div>
          <div class="step"><span class="step-icon">💬</span><div class="step-title">2. Chat or Talk</div><div class="step-desc">Chat or talk with our AI Waiter.</div></div>
          <div class="step"><span class="step-icon">📋</span><div class="step-title">3. Explore & Order</div><div class="step-desc">Explore the menu, get recommendations and add to cart.</div></div>
          <div class="step"><span class="step-icon">💳</span><div class="step-title">4. Pay Securely</div><div class="step-desc">Make secure payment and place your order.</div></div>
          <div class="step"><span class="step-icon">🔔</span><div class="step-title">5. Track & Enjoy</div><div class="step-desc">Track your order in real-time and enjoy your meal!</div></div>
        </div>
        <div class="col-center">
          <div class="qr-wrap">${qrSvgMarkup}</div>
          <div class="actions">
            <div class="action-item"><div class="action-icon">📱</div><div class="action-label">SCAN</div></div>
            <div class="action-item"><div class="action-icon">🛎️</div><div class="action-label">ORDER</div></div>
            <div class="action-item"><div class="action-icon">💳</div><div class="action-label">PAY</div></div>
            <div class="action-item"><div class="action-icon">🍽️</div><div class="action-label">ENJOY</div></div>
          </div>
          <div class="slogan">We serve, <span>you enjoy! 💚</span></div>
        </div>
        <div class="col-right">
          <div class="col-header">WHY CHOOSE US?</div>
          <div class="right-step"><span class="right-icon">⭐</span><div class="right-title">Personalized</div><div class="right-sub">Recommendations</div></div>
          <div class="right-step"><span class="right-icon">⚡</span><div class="right-title">Faster</div><div class="right-sub">Service</div></div>
          <div class="right-step"><span class="right-icon">✅</span><div class="right-title">Hygienic &</div><div class="right-sub">Contactless</div></div>
          <div class="right-step"><span class="right-icon">😊</span><div class="right-title">Better Dining</div><div class="right-sub">Experience</div></div>
        </div>
      </div>

      <div class="caution">
        <div class="caution-left"><span class="warn-icon">⚠</span><span class="warn-text">CAUTION</span></div>
        <div class="caution-right">Preview the QR Link Generator before clicking the link to <strong> avoid QR scams.</strong></div>
      </div>

      <div class="footer">
        <div class="footer-thanks">~ Thank you for dining with us! ~</div>
        <div class="footer-links">
          <span>🌐 www.smartdineai.co.in</span>
          <span>📸 @smartdine.ai</span>
        </div>
      </div>
    </div>
    ${script}
    </body></html>`;
}
