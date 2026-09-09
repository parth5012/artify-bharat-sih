/**
 * Artify Bharat - Web Bluetooth 58mm ESC/POS Thermal Printer Utility
 * Connects directly to portable 58mm (2-inch, 32-column) Bluetooth POS printers
 * using navigator.bluetooth.requestDevice and constructs binary ESC/POS bytecode.
 * Zero external libraries / Zero external keys.
 */

export interface ThermalPrintPassportData {
  itemTitle: string;
  artisanName: string;
  clusterName?: string;
  state?: string;
  giTagName?: string;
  verificationShortcode: string; // e.g., "A7X-9B2"
  fairPriceInr: number;
  statutoryWageInr?: number;
  dropoffTrackingPin?: string;
  issuedAt?: string;
}

export class ESCPOSBuilder {
  private buffer: number[] = [];

  // ESC/POS Command Constants
  private static readonly ESC = 0x1b;
  private static readonly GS = 0x1d;
  private static readonly LF = 0x0a;

  public initialize(): this {
    this.buffer.push(ESCPOSBuilder.ESC, 0x40); // ESC @ (Initialize printer)
    return this;
  }

  public alignCenter(): this {
    this.buffer.push(ESCPOSBuilder.ESC, 0x61, 0x01); // ESC a 1
    return this;
  }

  public alignLeft(): this {
    this.buffer.push(ESCPOSBuilder.ESC, 0x61, 0x00); // ESC a 0
    return this;
  }

  public alignRight(): this {
    this.buffer.push(ESCPOSBuilder.ESC, 0x61, 0x02); // ESC a 2
    return this;
  }

  public setBold(enabled: boolean): this {
    this.buffer.push(ESCPOSBuilder.ESC, 0x45, enabled ? 0x01 : 0x00); // ESC E n
    return this;
  }

  public setTextSize(widthMultiplier: number = 1, heightMultiplier: number = 1): this {
    // GS ! n (n = (width-1)*16 + (height-1))
    const w = Math.min(Math.max(widthMultiplier, 1), 4) - 1;
    const h = Math.min(Math.max(heightMultiplier, 1), 4) - 1;
    const n = (w << 4) | h;
    this.buffer.push(ESCPOSBuilder.GS, 0x21, n);
    return this;
  }

  public text(str: string): this {
    const encoder = new TextEncoder();
    const encoded = encoder.encode(str);
    for (let i = 0; i < encoded.length; i++) {
      this.buffer.push(encoded[i]);
    }
    return this;
  }

  public line(str: string = ''): this {
    this.text(str);
    this.buffer.push(ESCPOSBuilder.LF);
    return this;
  }

  public divider(): this {
    return this.line('--------------------------------'); // 32 characters for 58mm paper
  }

  public doubleDivider(): this {
    return this.line('================================');
  }

  public feed(lines: number = 3): this {
    this.buffer.push(ESCPOSBuilder.ESC, 0x64, lines); // ESC d n
    return this;
  }

  public cut(): this {
    this.buffer.push(ESCPOSBuilder.GS, 0x56, 0x41, 0x10); // GS V 'A' 16 (Partial cut)
    return this;
  }

  public getBytes(): Uint8Array {
    return new Uint8Array(this.buffer);
  }
}

/**
 * Builds standard 58mm Digital Heritage Passport ESC/POS payload.
 */
export function buildPassportReceipt(data: ThermalPrintPassportData): Uint8Array {
  const builder = new ESCPOSBuilder();

  builder
    .initialize()
    .alignCenter()
    .setTextSize(1, 2)
    .setBold(true)
    .line('ARTIFY BHARAT')
    .setTextSize(1, 1)
    .setBold(false)
    .line('Govt of India - MoSJE (PS 26090)')
    .line('Cryptographic Heritage Passport')
    .doubleDivider()
    .alignLeft()
    .setBold(true)
    .line(`ITEM: ${data.itemTitle.toUpperCase()}`)
    .setBold(false)
    .line(`Artisan: ${data.artisanName}`);

  if (data.clusterName) {
    builder.line(`Cluster: ${data.clusterName}`);
  }
  if (data.state) {
    builder.line(`State: ${data.state}`);
  }
  if (data.giTagName) {
    builder
      .setBold(true)
      .line(`GI TAG: ${data.giTagName}`)
      .setBold(false);
  }

  builder
    .divider()
    .alignCenter()
    .line('VERIFICATION SHORTCODE')
    .setTextSize(2, 2)
    .setBold(true)
    .line(`[ ${data.verificationShortcode} ]`)
    .setTextSize(1, 1)
    .setBold(false)
    .divider()
    .alignLeft();

  if (data.statutoryWageInr !== undefined && data.statutoryWageInr !== null) {
    builder.line(`Fair Wage Paid : Rs. ${data.statutoryWageInr}`);
  }

  builder
    .setBold(true)
    .line(`Retail Price   : Rs. ${data.fairPriceInr}`)
    .setBold(false);

  if (data.dropoffTrackingPin) {
    builder
      .divider()
      .alignCenter()
      .setBold(true)
      .line(`CSC / POST DROPOFF PIN: ${data.dropoffTrackingPin}`)
      .setBold(false);
  }

  builder
    .divider()
    .alignCenter()
    .line(`Issued: ${data.issuedAt || new Date().toLocaleDateString('en-IN')}`)
    .line('100% Middleman-Free Escrow')
    .feed(3)
    .cut();

  return builder.getBytes();
}

/**
 * Connects via Web Bluetooth and sends ESC/POS byte sequence to a 58mm printer.
 */
export async function printToBluetoothThermalPrinter(
  passportData: ThermalPrintPassportData,
  onProgress?: (msg: string) => void
): Promise<{ success: boolean; deviceName: string }> {
  const nav = typeof navigator !== 'undefined' ? (navigator as any) : null;
  if (!nav || !nav.bluetooth) {
    throw new Error('Web Bluetooth API is not supported in this browser. Please use Chrome/Edge on Desktop or Android.');
  }

  onProgress?.('Scanning for Bluetooth 58mm Thermal Printers...');

  let device: any;
  try {
    device = await nav.bluetooth.requestDevice({
      filters: [
        { namePrefix: 'MPT' },
        { namePrefix: 'POS' },
        { namePrefix: 'RPP' },
        { namePrefix: 'Printer' },
        { namePrefix: 'Thermal' },
        { namePrefix: 'BlueTooth' },
        { namePrefix: 'BT-' },
      ],
      optionalServices: [
        '000018f0-0000-1000-8000-00805f9b34fb', // Standard POS Printer Service
        'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
        '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC transparent service
        0x18f0,
        0xffe0,
      ],
    });
  } catch (err: any) {
    if (err.name === 'NotFoundError' || err.message?.includes('cancelled')) {
      throw new Error('Bluetooth pairing cancelled by user.');
    }
    throw new Error(`Bluetooth scan error: ${err.message || err.name}`);
  }

  onProgress?.(`Connecting to ${device.name || 'Thermal Printer'}...`);
  const server = await device.gatt?.connect();
  if (!server) {
    throw new Error('Failed to establish Bluetooth GATT server connection.');
  }

  onProgress?.('Locating printer write characteristic...');
  let writeCharacteristic: any = null;

  try {
    const services = await server.getPrimaryServices();
    for (const service of services) {
      try {
        const characteristics = await service.getCharacteristics();
        for (const char of characteristics) {
          if (char.properties.write || char.properties.writeWithoutResponse) {
            writeCharacteristic = char;
            break;
          }
        }
        if (writeCharacteristic) break;
      } catch {
        // Continue searching next service
      }
    }
  } catch (gattErr: any) {
    throw new Error(`GATT service discovery failed: ${gattErr.message}`);
  }

  if (!writeCharacteristic) {
    throw new Error('Could not discover a writable characteristic on this Bluetooth printer.');
  }

  onProgress?.('Transmitting ESC/POS Digital Heritage Passport bytecode...');
  const bytePayload = buildPassportReceipt(passportData);

  // Write in 100-byte MTU chunks to avoid packet dropping over Bluetooth LE
  const CHUNK_SIZE = 100;
  for (let i = 0; i < bytePayload.length; i += CHUNK_SIZE) {
    const chunk = bytePayload.slice(i, i + CHUNK_SIZE);
    if (writeCharacteristic.writeValueWithoutResponse) {
      await writeCharacteristic.writeValueWithoutResponse(chunk);
    } else {
      await writeCharacteristic.writeValue(chunk);
    }
    await new Promise((res) => setTimeout(res, 30));
  }

  onProgress?.('Print complete!');
  return {
    success: true,
    deviceName: device.name || '58mm Thermal Printer',
  };
}
