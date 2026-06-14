import type { Metadata } from "next";
import { Poppins, Righteous } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-poppins",
});

const righteous = Righteous({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-righteous",
});

export const metadata: Metadata = {
  title: "KaraokeHub — Turn Any Screen Into Karaoke Night",
  description: "Create a virtual karaoke room instantly, invite friends via QR code, search YouTube, and sing along in real-time. No sign-ups, no ads, 100% free.",
  keywords: ["karaoke", "singing", "real-time party", "youtube karaoke", "karaokehub", "social music app"],
  openGraph: {
    title: "KaraokeHub — Turn Any Screen Into Karaoke Night",
    description: "Create a virtual karaoke room instantly and sing along in real-time.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${poppins.variable} ${righteous.variable} h-full antialiased dark`}
      style={{ colorScheme: "dark" }}
    >
      <body className="min-h-full flex flex-col bg-[#09090b] text-[#f8fafc]">
        {children}
      </body>
    </html>
  );
}
