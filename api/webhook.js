const crypto = require('crypto');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const secret = process.env.KASERA_WEBHOOK_SECRET;
    const signature = req.headers['kasera-signature'];
    const body = JSON.stringify(req.body);

    // Verifikasi Signature HMAC-SHA256 dari Kasera
    if (secret && signature) {
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(body)
        .digest('hex');

      if (signature !== expectedSignature) {
        return res.status(400).json({ error: 'Invalid signature' });
      }
    }

    const event = req.body;

    // Jika pembayaran sukses
    if (event.event === 'payment.paid' || event.status === 'PAID') {
      const amount = event.amount || event.data?.amount;
      const orderId = event.reference_id || event.data?.reference_id;

      // Kirim notifikasi Telegram (Opsional)
      if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
        const message = `✅ *Pembayaran Kasera Pay Sukses!*\n\n` +
                        `• *ID Ref:* \`${orderId}\`\n` +
                        `• *Nominal:* Rp ${Number(amount).toLocaleString('id-ID')}\n` +
                        `• *Status:* PAID (Lunas)`;

        await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: process.env.TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: 'Markdown'
          })
        });
      }
    }

    return res.status(200).json({ status: 'success' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error' });
  }
};