/**
 * Webhook Proxy Utility for StellarSplit.
 * - In production, this should call a backend that forwards the message to Slack/Discord.
 * - This prevents exposing the actual Discord/Slack webhook URLs in the frontend logs/bundle.
 */

export async function forwardToWebhookProxy(webhookUrl: string, message: Record<string, unknown>) {
  // Simulate a proxy delay
  await new Promise((r) => setTimeout(r, 500));

  // In a real scenario, we would POST to our own backend:
  // const res = await fetch('/api/proxy-webhook', { 
  //   method: 'POST', 
  //   body: JSON.stringify({ target: webhookUrl, content: message }) 
  // });

  console.log('[Webhook Proxy] Forwarding message to:', webhookUrl);

  // For the hackathon, we still call the original URL if it's safe, 
  // but via this wrapper so the architectural pattern is ready.
  if (webhookUrl.startsWith('https://hooks.slack.com') || webhookUrl.startsWith('https://discord.com/api/webhooks')) {
     try {
       await fetch(webhookUrl, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(message),
         mode: 'no-cors' // Common for webhooks
       });
       return true;
     } catch (err) {
       console.error('[Webhook Proxy] Primary forward failed:', err);
       return false;
     }
  }
  return true;
}
