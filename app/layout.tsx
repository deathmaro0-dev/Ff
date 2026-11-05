import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "NOVA STUDIO — AI Creator Space", description: "Private AI studio for NOVA." };
export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) { return <html lang="ru"><body>{children}</body></html>; }
