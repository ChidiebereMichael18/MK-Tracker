import { NextResponse } from 'next/server';

const NUMVERIFY_KEY = process.env.NUMVERIFY_API_KEY || '';
const ABSTRACT_KEY = process.env.ABSTRACT_API_KEY || '';

// Country code to flag emoji
function countryFlag(code) {
  if (!code || code.length !== 2) return '🌍';
  return code.toUpperCase().replace(/./g, ch =>
    String.fromCodePoint(0x1F1E6 - 65 + ch.charCodeAt(0))
  );
}

// Determine line type label
function lineTypeLabel(lineType) {
  const map = {
    mobile: 'Mobile',
    landline: 'Landline',
    voip: 'VoIP',
    toll_free: 'Toll-Free',
    premium_rate: 'Premium Rate',
    shared_cost: 'Shared Cost',
    personal_number: 'Personal',
    pager: 'Pager',
    uan: 'UAN',
    unknown: 'Unknown',
  };
  return map[lineType?.toLowerCase()] || lineType || 'Unknown';
}

// Simple spam signal heuristic based on number format + type
function estimateRisk(data) {
  let score = 0;
  if (data.line_type === 'voip') score += 35;
  if (data.line_type === 'premium_rate') score += 50;
  if (!data.carrier) score += 20;
  if (!data.valid) score += 40;
  return Math.min(score, 95);
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const number = searchParams.get('number');

  if (!number) {
    return NextResponse.json({ error: 'Phone number required' }, { status: 400 });
  }

  // Check if API keys are configured
  if (!NUMVERIFY_KEY && !ABSTRACT_KEY) {
    return NextResponse.json({
      error: 'no_keys',
      message: 'No API keys configured. Add NUMVERIFY_API_KEY or ABSTRACT_API_KEY to .env.local'
    }, { status: 200 });
  }

  let result = null;

  // Try NumVerify first
  if (NUMVERIFY_KEY) {
    try {
      const cleanNumber = number.replace(/\s+/g, '');
      const url = `http://apilayer.net/api/validate?access_key=${NUMVERIFY_KEY}&number=${encodeURIComponent(cleanNumber)}&format=1`;
      const res = await fetch(url, { next: { revalidate: 0 } });
      const data = await res.json();

      if (data && !data.error) {
        const riskScore = estimateRisk(data);
        result = {
          source: 'NumVerify',
          number: data.international_format || number,
          valid: data.valid,
          country: data.country_name || 'Unknown',
          countryCode: data.country_code || '',
          flag: countryFlag(data.country_code),
          dialCode: data.country_prefix || '',
          carrier: data.carrier || 'Unknown Carrier',
          lineType: lineTypeLabel(data.line_type),
          lineTypeRaw: data.line_type || 'unknown',
          localFormat: data.local_format || '',
          intlFormat: data.international_format || '',
          location: data.location || '',
          riskScore,
          riskLevel: riskScore < 25 ? 'LOW' : riskScore < 55 ? 'MEDIUM' : 'HIGH',
          possibleApps: getPossibleApps(data.line_type, data.valid),
        };
      }
    } catch (err) {
      console.error('NumVerify error:', err);
    }
  }

  // Try AbstractAPI if NumVerify failed or not configured
  if (!result && ABSTRACT_KEY) {
    try {
      const cleanNumber = number.replace(/\s+/g, '');
      const url = `https://phonevalidation.abstractapi.com/v1/?api_key=${ABSTRACT_KEY}&phone=${encodeURIComponent(cleanNumber)}`;
      const res = await fetch(url, { next: { revalidate: 0 } });
      const data = await res.json();

      if (data && !data.error) {
        const riskScore = estimateRisk({ line_type: data.type, carrier: data.carrier?.name, valid: data.valid });
        result = {
          source: 'AbstractAPI',
          number: data.phone || number,
          valid: data.valid,
          country: data.country?.name || 'Unknown',
          countryCode: data.country?.code || '',
          flag: countryFlag(data.country?.code),
          dialCode: `+${data.country?.prefix || ''}`,
          carrier: data.carrier?.name || 'Unknown Carrier',
          lineType: lineTypeLabel(data.type),
          lineTypeRaw: data.type || 'unknown',
          localFormat: data.local_format || '',
          intlFormat: data.phone || '',
          location: '',
          riskScore,
          riskLevel: riskScore < 25 ? 'LOW' : riskScore < 55 ? 'MEDIUM' : 'HIGH',
          possibleApps: getPossibleApps(data.type, data.valid),
        };
      }
    } catch (err) {
      console.error('AbstractAPI error:', err);
    }
  }

  if (!result) {
    // Graceful demo mode — return formatted number info without API
    return NextResponse.json({
      error: 'lookup_failed',
      message: 'Could not retrieve data. Check your API key is valid and has remaining quota.'
    }, { status: 200 });
  }

  return NextResponse.json(result);
}

function getPossibleApps(lineType, valid) {
  if (!valid) return [];
  const apps = [];
  if (lineType !== 'landline') {
    apps.push({ name: 'WhatsApp', likely: true });
    apps.push({ name: 'Telegram', likely: lineType !== 'voip' });
    apps.push({ name: 'Signal', likely: lineType === 'mobile' });
  }
  if (lineType === 'mobile') {
    apps.push({ name: 'iMessage', likely: true });
    apps.push({ name: 'Snapchat', likely: true });
  }
  return apps;
}
