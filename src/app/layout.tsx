import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "AEGIS AI — Intelligence Workbench", description: "Mission intelligence workbench" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
