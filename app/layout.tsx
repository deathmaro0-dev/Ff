import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "АЛЮФОРТ — строительство загородных домов", description: "Проектируем и строим загородные дома для жизни.", robots: { index: true, follow: true } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="ru"><body>{children}</body></html>; }