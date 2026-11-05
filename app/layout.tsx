import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NOVA STUDIO — AI Creator Space",
  description: "Private AI studio for creating photos and videos for NOVA.",
  robots: { index: false, follow: false }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body>{children}</body></html>;
}
