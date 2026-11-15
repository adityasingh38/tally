const REVENUECAT_SECRET_API_KEY = Deno.env.get('REVENUECAT_SECRET_API_KEY') ?? '';
const ENTITLEMENT_ID = 'Tally Pro';

export function revenueCatConfigured(): boolean {
  return !!REVENUECAT_SECRET_API_KEY;
}

export async function hasProEntitlement(userId: string): Promise<boolean> {
  if (!REVENUECAT_SECRET_API_KEY) return false;
  const response = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`, {
    headers: {
      Authorization: `Bearer ${REVENUECAT_SECRET_API_KEY}`,
      Accept: 'application/json',
    },
  });
  if (!response.ok) throw new Error(`RevenueCat returned ${response.status}`);
  const data = await response.json();
  const entitlement = data?.subscriber?.entitlements?.[ENTITLEMENT_ID];
  if (!entitlement) return false;
  return !entitlement.expires_date || new Date(entitlement.expires_date).getTime() > Date.now();
}
