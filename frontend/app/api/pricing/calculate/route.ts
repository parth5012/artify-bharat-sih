import { NextResponse } from 'next/server';
import { asObject, jsonError } from '@/backend/http';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = asObject(await request.json().catch(() => null));
    if (!body) {
      return jsonError('Request body must be valid JSON.', 400);
    }

    const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:8000';
    const response = await fetch(`${backendUrl}/api/v1/pricing/calculate-market`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_name: typeof body.product_name === 'string' ? body.product_name : '',
        description: typeof body.description === 'string' ? body.description : '',
        materials: Array.isArray(body.materials) ? body.materials : [],
        making_days: typeof body.making_days === 'number' ? body.making_days : Number(body.making_days ?? 0),
        location: typeof body.location === 'string' ? body.location : '',
        image_data_url: typeof body.image_data_url === 'string' ? body.image_data_url : null,
        raw_material_image_data_url: typeof body.raw_material_image_data_url === 'string' ? body.raw_material_image_data_url : null,
        latitude: typeof body.latitude === 'number' ? body.latitude : null,
        longitude: typeof body.longitude === 'number' ? body.longitude : null,
        weight_kg: typeof body.weight_kg === 'number' ? body.weight_kg : (body.weight_kg !== undefined && body.weight_kg !== null ? Number(body.weight_kg) : null),
      }),
    });

    const data = await response.json().catch(() => ({ detail: 'Unable to parse backend response.' }));
    if (!response.ok) {
      const message = typeof data?.detail === 'string' ? data.detail : 'Pricing calculation failed.';
      return NextResponse.json({ error: message }, { status: response.status || 400 });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('[pricing proxy]', error);
    return jsonError('Unable to calculate a fair price right now.', 500);
  }
}
