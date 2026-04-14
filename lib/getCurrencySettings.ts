import { cache } from "react";
import { db } from "@/lib/db";
import {
  DEFAULT_CURRENCY_SETTINGS,
  normalizeCurrencySettings,
  type PublicCurrencySettings,
} from "@/lib/currencySettings";

export const getCurrencySettings = cache(async (): Promise<PublicCurrencySettings> => {
  try {
    const settings = await db.query.currencySettings.findFirst({
      where: (table, { eq }) => eq(table.id, DEFAULT_CURRENCY_SETTINGS.id),
    });

    return normalizeCurrencySettings(
      settings
        ? {
            id: settings.id,
            name: settings.name,
            symbol: settings.symbol,
            description: settings.description,
            isActive: settings.isActive,
          }
        : null,
    );
  } catch (error) {
    console.error("Error fetching currency settings:", error);
    return DEFAULT_CURRENCY_SETTINGS;
  }
});
