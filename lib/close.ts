// Close CRM integration — creates a lead via POST /api/v1/lead/
// Skips entirely if credentials aren't configured.

import type { EvaluateResponse } from './types';

interface CloseLeadResponse {
  id: string;
  [key: string]: unknown;
}

function getCloseConfig() {
  const apiKey = process.env.CLOSE_API_KEY;
  const leadStatusId = process.env.CLOSE_LEAD_STATUS_ID;
  const cfPropertyAddress = process.env.CLOSE_CF_PROPERTY_ADDRESS;
  const cfAuditSummary = process.env.CLOSE_CF_AUDIT_SUMMARY;
  const cfLeadSource = process.env.CLOSE_CF_LEAD_SOURCE;

  if (!apiKey || !leadStatusId) {
    return null; // Not configured — skip
  }

  return {
    apiKey,
    leadStatusId,
    cf: {
      propertyAddress: cfPropertyAddress,
      auditSummary: cfAuditSummary,
      leadSource: cfLeadSource,
    },
  };
}

export async function createLead(
  input: { ownerName: string; email: string; phone: string },
  evaluateResponse: EvaluateResponse
): Promise<string | undefined> {
  const closeConfig = getCloseConfig();

  if (!closeConfig) {
    console.log('[Close CRM] Skipped — credentials not configured');
    return undefined;
  }

  const addressStr = evaluateResponse.address;

  const customFields: Record<string, unknown> = {};
  if (closeConfig.cf.propertyAddress) customFields[`custom.${closeConfig.cf.propertyAddress}`] = addressStr;
  
  const formattedRevenue = Math.round(evaluateResponse.market.projectedAnnualRentRevenue).toLocaleString();
  if (closeConfig.cf.auditSummary) {
    customFields[`custom.${closeConfig.cf.auditSummary}`] = `Projected Revenue: $${formattedRevenue}/yr The prop is ${evaluateResponse.summary.confidence * 100}% confident to be ${evaluateResponse.summary.canOperateSTR ? 'Eligible' : 'Not Eligible'}`;
  }
  if (closeConfig.cf.leadSource) customFields[`custom.${closeConfig.cf.leadSource}`] = 'STR Magic Lead';

  const payload = {
    name: `STR Magic Lead: ${input.ownerName} — ${addressStr}`,
    status_id: closeConfig.leadStatusId,
    contacts: [
      {
        name: input.ownerName,
        emails: [{ type: 'office', email: input.email }],
        phones: [{ type: 'mobile', phone: input.phone }],
      },
    ],
    ...customFields,
  };

  const credentials = Buffer.from(`${closeConfig.apiKey}:`).toString('base64');

  const response = await fetch('https://api.close.com/api/v1/lead/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${credentials}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Close CRM] Failed to create lead:', response.status, errorText);
    throw new Error(`Close CRM error: ${response.status}`);
  }

  const data = (await response.json()) as CloseLeadResponse;
  console.log('[Close CRM] Lead created:', data.id);
  return data.id;
}
