import {
  BadRequestException,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Parser } from 'json2csv';

const pdfParse = require('pdf-parse');
const pdf = pdfParse.default ?? pdfParse;

interface InvoiceRow {
  productCode: string;
  productName: string;
  unitPrice: number;
  currency: string;
  quantity: number;
}

interface ProductMatch {
  productCode: string;
  productName: string;
  lineIndex: number;
}

@Injectable()
export class InvoiceService {
  async processInvoice(buffer: Buffer): Promise<string> {
    let data: { text?: string };
    try {
      data = await pdf(buffer);
    } catch {
      throw new BadRequestException(
        'The uploaded file could not be read as a valid PDF invoice.',
      );
    }

    const text = data.text || '';
    const rows = this.extractRows(text);

    if (rows.length === 0) {
      throw new UnprocessableEntityException(
        'No product rows could be extracted from the uploaded invoice.',
      );
    }

    const parser = new Parser({
      fields: [
        'productCode',
        'productName',
        'unitPrice',
        'currency',
        'quantity',
      ],
    });

    return parser.parse(rows);
  }

  private extractRows(text: string): InvoiceRow[] {
    const lines = this.normalizeLines(text);
    const invoiceCurrency = this.extractInvoiceCurrency(lines) ?? 'RON';
    const structuredRows = this.extractStructuredRows(lines, invoiceCurrency);

    if (structuredRows.length > 0) {
      return structuredRows;
    }

    return this.extractGenericRows(lines, invoiceCurrency);
  }

  private normalizeLines(text: string): string[] {
    return text
      .replace(/\r/g, '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  }

  private extractInvoiceCurrency(lines: string[]): string | null {
    for (let index = 0; index < lines.length; index += 1) {
      if (!/Moneda facturii/i.test(lines[index])) {
        continue;
      }

      const nextLine = lines[index + 1];
      if (nextLine && this.isCurrencyCode(nextLine)) {
        return nextLine.toUpperCase();
      }
    }

    return this.extractCurrency(lines);
  }

  private extractStructuredRows(
    lines: string[],
    invoiceCurrency: string,
  ): InvoiceRow[] {
    const sectionStart = this.findLineItemSectionStart(lines);
    const rows: InvoiceRow[] = [];

    for (let index = sectionStart; index < lines.length; index += 1) {
      const markerCode = this.extractMarkerCode(lines[index]);
      if (!markerCode) {
        continue;
      }

      const blockStart = Math.max(sectionStart, index - 12);
      const block = lines.slice(blockStart, index);
      const product = this.findStructuredProduct(block, markerCode);

      if (!product) {
        continue;
      }

      const unitPrice = this.extractStructuredUnitPrice(
        block,
        product.lineIndex,
      );
      const quantity = this.extractStructuredQuantity(block, product.lineIndex);
      const currency = this.extractCurrency(block) ?? invoiceCurrency;

      if (unitPrice === null || quantity === null) {
        continue;
      }

      rows.push({
        productCode: product.productCode,
        productName: product.productName,
        unitPrice: this.normalizeAmount(unitPrice),
        currency,
        quantity: this.normalizeQuantity(quantity),
      });
    }

    return this.deduplicateRows(rows);
  }

  private extractGenericRows(
    lines: string[],
    invoiceCurrency: string,
  ): InvoiceRow[] {
    const sectionStart = this.findLineItemSectionStart(lines);
    const sectionEnd = this.findLineItemSectionEnd(lines, sectionStart);
    const scopedLines = lines.slice(sectionStart, sectionEnd);
    const rows: InvoiceRow[] = [];

    for (let index = 0; index < scopedLines.length; index += 1) {
      const inlineProduct = this.extractInlineProduct(scopedLines[index]);
      const product = inlineProduct
        ? { ...inlineProduct, lineIndex: index }
        : this.extractSplitProduct(scopedLines, index);

      if (!product) {
        continue;
      }

      const contextStart = product.lineIndex;
      const contextEnd = Math.min(scopedLines.length, contextStart + 6);
      const context = scopedLines.slice(contextStart, contextEnd);
      const currency = this.extractCurrency(context) ?? invoiceCurrency;
      const unitPrice = this.extractGenericUnitPrice(context);
      const quantity = this.extractGenericQuantity(context);

      if (unitPrice === null || quantity === null) {
        continue;
      }

      rows.push({
        productCode: product.productCode,
        productName: product.productName,
        unitPrice: this.normalizeAmount(unitPrice),
        currency,
        quantity: this.normalizeQuantity(quantity),
      });

      if (!inlineProduct) {
        index += 1;
      }
    }

    return this.deduplicateRows(rows);
  }

  private findLineItemSectionStart(lines: string[]): number {
    const headerPattern =
      /Nume articol\/Descriere articol|Cod produs|Denumire produs|Linia/i;

    for (let index = 0; index < lines.length; index += 1) {
      if (headerPattern.test(lines[index])) {
        return index;
      }
    }

    return 0;
  }

  private findLineItemSectionEnd(lines: string[], startIndex: number): number {
    for (let index = startIndex + 1; index < lines.length; index += 1) {
      if (/Instructiuni de plata|Nr\. cont|Pagina$/i.test(lines[index])) {
        return index;
      }
    }

    return lines.length;
  }

  private findStructuredProduct(
    block: string[],
    markerCode: string,
  ): ProductMatch | null {
    const directPattern = new RegExp(
      `^${this.escapeRegExp(markerCode)}\\s+(.+)$`,
      'i',
    );

    for (let index = block.length - 1; index >= 0; index -= 1) {
      const line = block[index];
      const directMatch = line.match(directPattern);

      if (directMatch && this.isLikelyProductName(directMatch[1])) {
        return {
          productCode: markerCode,
          productName: directMatch[1].trim(),
          lineIndex: index,
        };
      }
    }

    for (let index = block.length - 1; index >= 0; index -= 1) {
      const inlineProduct = this.extractInlineProduct(block[index]);
      if (inlineProduct) {
        return { ...inlineProduct, lineIndex: index };
      }
    }

    for (let index = block.length - 1; index >= 1; index -= 1) {
      if (block[index].toUpperCase() !== markerCode.toUpperCase()) {
        continue;
      }

      const previousLine = block[index - 1];
      if (!this.isLikelyProductName(previousLine)) {
        continue;
      }

      return {
        productCode: markerCode,
        productName: previousLine.trim(),
        lineIndex: index - 1,
      };
    }

    return null;
  }

  private extractStructuredUnitPrice(
    block: string[],
    productLineIndex: number,
  ): number | null {
    const currencyIndex = this.findCurrencyIndex(block, productLineIndex);

    if (currencyIndex > 0) {
      const candidate = this.parseNumber(block[currencyIndex - 1]);
      if (candidate !== null) {
        return candidate;
      }
    }

    for (let index = 0; index < productLineIndex; index += 1) {
      const candidate = this.parseNumber(block[index]);
      if (candidate === null || this.looksLikeVatRate(candidate)) {
        continue;
      }

      return candidate;
    }

    return null;
  }

  private extractStructuredQuantity(
    block: string[],
    productLineIndex: number,
  ): number | null {
    const currencyIndex = this.findCurrencyIndex(block, productLineIndex);

    if (currencyIndex !== -1) {
      for (
        let index = currencyIndex + 1;
        index < productLineIndex;
        index += 1
      ) {
        const candidate = this.parseNumber(block[index]);
        if (candidate === null || candidate === 0) {
          continue;
        }

        return candidate;
      }
    }

    for (let index = productLineIndex - 1; index >= 0; index -= 1) {
      const candidate = this.parseNumber(block[index]);
      if (
        candidate === null ||
        candidate === 0 ||
        this.looksLikeVatRate(candidate)
      ) {
        continue;
      }

      if (Math.abs(candidate) <= 1000) {
        return candidate;
      }
    }

    return null;
  }

  private extractGenericUnitPrice(context: string[]): number | null {
    const currencyIndex = this.findCurrencyIndex(context, context.length);

    if (currencyIndex > 0) {
      const beforeCurrency = this.parseNumber(context[currencyIndex - 1]);
      if (beforeCurrency !== null) {
        return beforeCurrency;
      }
    }

    if (currencyIndex !== -1 && currencyIndex + 1 < context.length) {
      const afterCurrency = this.parseNumber(context[currencyIndex + 1]);
      if (afterCurrency !== null) {
        return afterCurrency;
      }
    }

    for (let index = 1; index < context.length; index += 1) {
      const candidate = this.parseNumber(context[index]);
      if (candidate !== null) {
        return candidate;
      }
    }

    return null;
  }

  private extractGenericQuantity(context: string[]): number | null {
    const currencyIndex = this.findCurrencyIndex(context, context.length);

    if (currencyIndex !== -1) {
      for (let index = currencyIndex + 1; index < context.length; index += 1) {
        const candidate = this.parseNumber(context[index]);
        if (candidate !== null && candidate !== 0) {
          return candidate;
        }
      }
    }

    for (let index = context.length - 1; index >= 1; index -= 1) {
      const candidate = this.parseNumber(context[index]);
      if (candidate !== null && candidate !== 0) {
        return candidate;
      }
    }

    return null;
  }

  private extractInlineProduct(line: string): ProductMatch | null {
    const match = line.match(/^([A-Z0-9/-]{3,40})\s+(.+)$/i);
    if (!match) {
      return null;
    }

    const productCode = match[1].trim().toUpperCase();
    const productName = match[2].trim();

    if (
      !this.isLikelyInlineCode(productCode) ||
      !this.isLikelyProductName(productName)
    ) {
      return null;
    }

    return {
      productCode,
      productName,
      lineIndex: 0,
    };
  }

  private extractSplitProduct(
    lines: string[],
    lineIndex: number,
  ): ProductMatch | null {
    const productCode = lines[lineIndex]?.trim().toUpperCase();
    const productName = lines[lineIndex + 1]?.trim();

    if (
      !productCode ||
      !productName ||
      !this.isLikelyStandaloneCode(productCode) ||
      !this.isLikelyProductName(productName)
    ) {
      return null;
    }

    return {
      productCode,
      productName,
      lineIndex,
    };
  }

  private extractMarkerCode(line: string): string | null {
    const match = line.match(
      /Identificator vanzator articol pentru linia\s+\d+\s*:\s*([A-Z0-9/-]+?)(?=[A-Z][a-z]|$)/i,
    );

    return match?.[1]?.trim().toUpperCase() ?? null;
  }

  private extractCurrency(lines: string[]): string | null {
    for (const line of lines) {
      if (this.isCurrencyCode(line)) {
        return line.toUpperCase();
      }
    }

    return null;
  }

  private findCurrencyIndex(lines: string[], upperBound: number): number {
    const end = Math.min(lines.length, upperBound);

    for (let index = 0; index < end; index += 1) {
      if (this.isCurrencyCode(lines[index])) {
        return index;
      }
    }

    return -1;
  }

  private parseNumber(value: string): number | null {
    if (!/^[-+]?\d+(?:[.,]\d+)?$/.test(value.trim())) {
      return null;
    }

    const parsedValue = Number.parseFloat(value.replace(',', '.'));
    return Number.isNaN(parsedValue) ? null : parsedValue;
  }

  private isLikelyInlineCode(value: string): boolean {
    if (value.length < 3 || value.length > 40) {
      return false;
    }

    if (this.isRomanianVatCode(value) || this.isIban(value)) {
      return false;
    }

    if (/^[A-Z]+$/i.test(value)) {
      return false;
    }

    return /[A-Z0-9]/.test(value);
  }

  private isLikelyStandaloneCode(value: string): boolean {
    if (!this.isLikelyInlineCode(value)) {
      return false;
    }

    return /[A-Z]/.test(value) && /\d/.test(value);
  }

  private isLikelyProductName(value: string): boolean {
    if (value.length < 3 || !/[A-Za-z]/.test(value)) {
      return false;
    }

    return !this.isNoise(value);
  }

  private isNoise(value: string): boolean {
    return /factura|emitere|vanzator|cumparator|identificator|tva|total|plata|cont|banca|pagina|moneda|scadenta|adresa|telefon|e-?mail|codul|cota|valoare|deduceri|rotunjire|instructiuni|taraprovenienta|nume(nr)?|data scadenta/i.test(
      value,
    );
  }

  private isCurrencyCode(value: string): boolean {
    return /^(RON|EUR|USD|GBP|CHF)$/i.test(value.trim());
  }

  private isRomanianVatCode(value: string): boolean {
    return /^RO\d{6,}$/i.test(value);
  }

  private isIban(value: string): boolean {
    return /^RO\d{2}[A-Z0-9]{14,}$/i.test(value);
  }

  private looksLikeVatRate(value: number): boolean {
    const normalized = Math.abs(value);
    return (
      Number.isInteger(normalized) &&
      [5, 9, 19, 20, 21, 24].includes(normalized)
    );
  }

  private normalizeAmount(value: number): number {
    return Number(Math.abs(value).toFixed(2));
  }

  private normalizeQuantity(value: number): number {
    return Number(Math.abs(value).toFixed(3));
  }

  private deduplicateRows(rows: InvoiceRow[]): InvoiceRow[] {
    const uniqueRows = new Map<string, InvoiceRow>();

    for (const row of rows) {
      const key = [
        row.productCode,
        row.productName,
        row.unitPrice,
        row.currency,
        row.quantity,
      ].join('|');

      if (!uniqueRows.has(key)) {
        uniqueRows.set(key, row);
      }
    }

    return [...uniqueRows.values()];
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
