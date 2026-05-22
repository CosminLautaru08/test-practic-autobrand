import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import axios from 'axios';

interface CachedExchangeRates {
  fetchedAt: number;
  rates: Map<string, number>;
}

@Injectable()
export class ExchangeRateService {
  private static readonly ECB_RATES_URL =
    'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml';
  private static readonly CACHE_TTL_MS = 60 * 60 * 1000;

  private readonly logger = new Logger(ExchangeRateService.name);
  private cachedRates?: CachedExchangeRates;
  private pendingRatesPromise?: Promise<Map<string, number>>;

  async convertAmountToRon(
    amount: number,
    currency: string,
  ): Promise<{ exchangeRate: number; amountRon: number }> {
    const exchangeRate = await this.getExchangeRateToRon(currency);

    return {
      exchangeRate,
      amountRon: this.normalizeAmount(amount * exchangeRate),
    };
  }

  async getExchangeRateToRon(currency: string): Promise<number> {
    const normalizedCurrency = this.normalizeCurrency(currency);

    if (normalizedCurrency === 'RON') {
      return 1;
    }

    const rates = await this.getRates();
    const ronPerEuro = rates.get('RON');

    if (!ronPerEuro) {
      throw new ServiceUnavailableException(
        'RON exchange rate is unavailable.',
      );
    }

    if (normalizedCurrency === 'EUR') {
      return this.normalizeExchangeRate(ronPerEuro);
    }

    const currencyPerEuro = rates.get(normalizedCurrency);

    if (!currencyPerEuro) {
      throw new ServiceUnavailableException(
        `Exchange rate for ${normalizedCurrency} is unavailable.`,
      );
    }

    return this.normalizeExchangeRate(ronPerEuro / currencyPerEuro);
  }

  private async getRates(): Promise<Map<string, number>> {
    if (this.hasFreshCache()) {
      return this.cachedRates!.rates;
    }

    if (!this.pendingRatesPromise) {
      this.pendingRatesPromise = this.fetchRates();
    }

    try {
      return await this.pendingRatesPromise;
    } finally {
      this.pendingRatesPromise = undefined;
    }
  }

  private hasFreshCache(): boolean {
    return Boolean(
      this.cachedRates &&
        Date.now() - this.cachedRates.fetchedAt <
          ExchangeRateService.CACHE_TTL_MS,
    );
  }

  private async fetchRates(): Promise<Map<string, number>> {
    try {
      const response = await axios.get<string>(
        ExchangeRateService.ECB_RATES_URL,
        {
          responseType: 'text',
          timeout: 10000,
        },
      );

      const rates = this.parseRates(response.data);

      this.cachedRates = {
        fetchedAt: Date.now(),
        rates,
      };

      return rates;
    } catch (error) {
      this.logger.error(
        'Failed to fetch ECB exchange rates.',
        error instanceof Error ? error.stack : undefined,
      );
      throw new ServiceUnavailableException(
        'Exchange rates could not be loaded.',
      );
    }
  }

  private parseRates(xml: string): Map<string, number> {
    const rates = new Map<string, number>([['EUR', 1]]);

    for (const match of xml.matchAll(
      /<Cube currency=['"]([A-Z]{3})['"] rate=['"]([\d.]+)['"]\/>/g,
    )) {
      const rate = Number.parseFloat(match[2]);

      if (!Number.isNaN(rate)) {
        rates.set(match[1].toUpperCase(), rate);
      }
    }

    if (!rates.has('RON')) {
      throw new ServiceUnavailableException(
        'RON exchange rate is unavailable.',
      );
    }

    return rates;
  }

  private normalizeCurrency(currency: string): string {
    return currency.trim().toUpperCase();
  }

  private normalizeAmount(value: number): number {
    return Number(value.toFixed(2));
  }

  private normalizeExchangeRate(value: number): number {
    return Number(value.toFixed(4));
  }
}
