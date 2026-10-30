import { render, type RenderOptions } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement, ReactNode } from "react";

import { DEFAULT_LOCALE, type Locale, TIME_ZONE } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";

import en from "../../messages/en.json";
import ja from "../../messages/ja.json";
import vi from "../../messages/vi.json";

const MESSAGES: Record<Locale, Messages> = { vi, en, ja };

interface RenderWithIntlOptions extends Omit<RenderOptions, "wrapper"> {
  locale?: Locale;
}

/** Renders a component the way the app does: inside the next-intl provider for one locale. */
export function renderWithIntl(
  ui: ReactElement,
  { locale = DEFAULT_LOCALE, ...options }: RenderWithIntlOptions = {},
) {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <NextIntlClientProvider locale={locale} messages={MESSAGES[locale]} timeZone={TIME_ZONE}>
        {children}
      </NextIntlClientProvider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...options });
}
