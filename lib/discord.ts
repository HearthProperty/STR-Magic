// Discord notification — fire-and-forget.
// If this fails, we log the error but never block the lead submission.

import type { EvaluateResponse } from './types';

export async function sendLeadNotification(
  input: { ownerName: string; email: string; phone: string },
  evaluateResponse: EvaluateResponse,
  resultUrl: string
): Promise<boolean> {
  try {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) {
      console.log('[Discord] Skipped — webhook url not configured');
      return false;
    }

    const formattedRevenue = Math.round(evaluateResponse.market.projectedAnnualRentRevenue).toLocaleString();

    const embed = {
      title: '🏠 New STR Magic Lead',
      color: 16750848,
      fields: [
        { name: 'Name', value: input.ownerName, inline: true },
        { name: 'Email', value: input.email, inline: true },
        { name: 'Phone', value: input.phone, inline: true },
        { name: 'Property', value: evaluateResponse.address, inline: false },
        { name: 'Estimated Revenue', value: `$${formattedRevenue}/yr`, inline: true },
        { name: 'Eligibility', value: evaluateResponse.summary.canOperateSTR ? 'Eligible' : 'Not Eligible', inline: true },
        { name: 'Confidence', value: `${Math.round(evaluateResponse.summary.confidence * 100)}%`, inline: true },
        { name: 'Result URL', value: resultUrl, inline: false },
      ],
      timestamp: new Date().toISOString(),
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Discord] Webhook failed:', response.status, errorText);
      return false;
    }

    console.log('[Discord] Lead notification sent successfully');
    return true;
  } catch (error) {
    console.error('[Discord] Webhook error:', error);
    return false;
  }
}
