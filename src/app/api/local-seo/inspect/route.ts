import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, expectedName, expectedPhone, expectedAddress } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Valid URL is required' }, { status: 400 });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url.startsWith('http') ? url : `https://${url}`);
    } catch {
      return NextResponse.json({ error: 'Malformed URL provided' }, { status: 400 });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    let html = '';
    let httpStatus = 0;

    try {
      const response = await fetch(parsedUrl.toString(), {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 WatechLocalSeoAudit/1.0',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });
      httpStatus = response.status;
      html = await response.text();
    } catch (err: unknown) {
      clearTimeout(timeout);
      return NextResponse.json(
        {
          success: false,
          error: `Could not reach target website: ${err instanceof Error ? err.message : String(err)}`,
        },
        { status: 502 }
      );
    } finally {
      clearTimeout(timeout);
    }

    const htmlLower = html.toLowerCase();

    // 1. Schema.org JSON-LD extraction
    let hasLocalBusinessSchema = false;
    let schemaType = '';
    let schemaTelephone = '';
    let schemaAddress = '';

    const jsonLdMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
    if (jsonLdMatches) {
      for (const tag of jsonLdMatches) {
        try {
          const content = tag.replace(/<script[^>]*>|<\/script>/gi, '').trim();
          const parsed = JSON.parse(content);
          const items = Array.isArray(parsed) ? parsed : [parsed];

          for (const item of items) {
            const types = Array.isArray(item['@type']) ? item['@type'] : [item['@type']];
            const isLocal = types.some((t: string) =>
              /LocalBusiness|HVACBusiness|ProfessionalService|HomeAndConstructionBusiness|Organization/i.test(t || '')
            );

            if (isLocal) {
              hasLocalBusinessSchema = true;
              schemaType = types.join(', ');
              if (item.telephone) schemaTelephone = String(item.telephone);
              if (item.address) {
                schemaAddress = typeof item.address === 'object' ? JSON.stringify(item.address) : String(item.address);
              }
            }
          }
        } catch {
          // Ignore parse errors on individual JSON-LD blocks
        }
      }
    }

    // 2. Microdata fallback
    if (!hasLocalBusinessSchema && /itemtype=["'][^"']*(LocalBusiness|HVACBusiness|HomeAndConstructionBusiness)/i.test(html)) {
      hasLocalBusinessSchema = true;
      schemaType = 'Microdata LocalBusiness';
    }

    // 3. Geo Meta Tags
    const hasGeoMetaTags =
      /<meta[^>]*name=["'](geo\.position|geo\.placename|ICBM)["']/i.test(html) ||
      /<meta[^>]*content=["'][^"']*["'][^>]*name=["'](geo\.position|geo\.placename|ICBM)["']/i.test(html);

    // 4. Google Maps Embed or Link
    const hasGoogleMapEmbed =
      htmlLower.includes('maps.google.com') ||
      htmlLower.includes('google.com/maps') ||
      /<iframe[^>]*src=["'][^"']*(maps|google\.com\/maps)[^"']*["']/i.test(html);

    // 5. Service Area & Location Landing Page links
    const serviceAreaRegex = /href=["']([^"']*(?:service-area|locations?|coverage|cities|dallas|fort-worth|arlington|plano)[^"']*)["']/gi;
    const foundLocationLinks: string[] = [];
    let linkMatch;
    while ((linkMatch = serviceAreaRegex.exec(html)) !== null && foundLocationLinks.length < 5) {
      if (!foundLocationLinks.includes(linkMatch[1])) {
        foundLocationLinks.push(linkMatch[1]);
      }
    }

    // 6. NAP Cross-Verification
    let phoneFound = false;
    if (expectedPhone) {
      const cleanExpectedPhone = expectedPhone.replace(/\D/g, '');
      const rawHtmlNumbers = html.replace(/\D/g, '');
      phoneFound = rawHtmlNumbers.includes(cleanExpectedPhone) || html.includes(expectedPhone);
    }

    let addressSnippetFound = false;
    if (expectedAddress) {
      const addressParts = expectedAddress.split(',').map((p: string) => p.trim().toLowerCase());
      addressSnippetFound = addressParts.some((part: string) => part.length > 4 && htmlLower.includes(part));
    }

    return NextResponse.json({
      success: true,
      httpStatus,
      targetUrl: parsedUrl.toString(),
      hasLocalBusinessSchema,
      schemaDetails: {
        type: schemaType || undefined,
        telephone: schemaTelephone || undefined,
        address: schemaAddress || undefined,
      },
      hasGeoMetaTags,
      hasGoogleMapEmbed,
      hasServiceAreaPages: foundLocationLinks.length > 0,
      serviceAreaLinksFound: foundLocationLinks,
      napCrossCheck: {
        phoneFound,
        addressSnippetFound,
        expectedPhoneProvided: !!expectedPhone,
        expectedAddressProvided: !!expectedAddress,
      },
      inspectedAt: new Date().toISOString(),
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown server error during Local SEO inspection',
      },
      { status: 500 }
    );
  }
}
