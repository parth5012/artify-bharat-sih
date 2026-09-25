import {NextResponse} from 'next/server';
import {verifyArtisanId, compareArtisanDetails} from '@/lib/dummyArtisanRegistry';
import {asObject} from '@/backend/http';

export const runtime = 'nodejs';

/**
 * Artisan ID Verification Endpoint (Demo/Prototype)
 * 
 * POST /api/artisans/verify
 * Body: { artisanId: string, spokenDetails?: { name, phone, location, craft } }
 * 
 * Returns verification result with match status
 */
export async function POST(request: Request) {
  try {
    const body = asObject(await request.json().catch(() => null));
    const artisanId = typeof body?.artisanId === 'string' ? body.artisanId.trim() : '';

    if (!artisanId) {
      return NextResponse.json(
        { error: 'Artisan ID is required' },
        { status: 400 }
      );
    }

    // Verify artisan ID against dummy registry
    const verificationResult = await verifyArtisanId(artisanId);

    if (!verificationResult.found || !verificationResult.artisan) {
      return NextResponse.json({
        found: false,
        artisanId,
        message: `Artisan ID ${artisanId} not found in registry`,
      });
    }

    // If spoken details provided, compare them
    let matchStatus;
    if (body?.spokenDetails) {
      matchStatus = compareArtisanDetails(
        body.spokenDetails,
        verificationResult.artisan
      );
    }

    return NextResponse.json({
      found: true,
      artisanId,
      artisan: verificationResult.artisan,
      matchStatus,
      message: 'Artisan ID verified successfully',
    });
  } catch (error) {
    console.error('Artisan verification error:', error);
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    );
  }
}
