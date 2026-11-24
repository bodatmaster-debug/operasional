import type { Metadata } from "next";
import { FluentUiProvider } from "@/components/fluent-ui-provider";
import { UiStateProvider } from "@/components/ui-state-provider";
import "flag-icons/css/flag-icons.min.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Operasional",
  description: "Dashboard lokal untuk pengelolaan SPPG, Yayasan, aset, dan pemeliharaan.",
  icons: { icon: "/operasional-logo.png" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id">
      <body>
        <UiStateProvider>
          <FluentUiProvider>{children}</FluentUiProvider>
        </UiStateProvider>
      </body>
    </html>
  );
}
