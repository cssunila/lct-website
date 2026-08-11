import type { Metadata } from "next";
import localFont from 'next/font/local'
import "./globals.css";
import { cn } from "@/lib/utils";

const poppins = localFont({
  src: [
    {
      path: './fonts/poppins/Poppins-Thin.ttf',
      weight: '100',
      style: 'normal',
    },
    {
      path: './fonts/poppins/Poppins-Light.ttf',
      weight: '300',
      style: 'normal',
    },
    {
      path: './fonts/poppins/Poppins-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: './fonts/poppins/Poppins-SemiBold.ttf',
      weight: '600',
      style: 'normal',
    },
    {
      path: './fonts/poppins/Poppins-Bold.ttf',
      weight: '700',
      style: 'normal',
    }
  ],
  variable: '--font-poppins'
});

const space_grotesk = localFont({
  src: [
    {
      path: './fonts/space_grotesk/SpaceGrotesk-Light.ttf',
      weight: '300',
      style: 'normal',
    },
    {
      path: './fonts/space_grotesk/SpaceGrotesk-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: './fonts/space_grotesk/SpaceGrotesk-SemiBold.ttf',
      weight: '600',
      style: 'normal',
    },
    {
      path: './fonts/space_grotesk/SpaceGrotesk-Bold.ttf',
      weight: '700',
      style: 'normal',
    }
  ],
  variable: '--font-space-grotesk'
});

export const metadata: Metadata = {
  title: "LCT-K (Lomba Cepat Tepat Komputer)",
  description: "Lomba Cepat Tepat Komputer",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", poppins.variable, space_grotesk.variable)}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
