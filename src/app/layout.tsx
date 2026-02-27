import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ConvexClientProvider } from "../components/ConvexClientProvider";
import BottomBar from "../components/BottomBar";

export const metadata: Metadata = {
  title: "RPG Life System",
  description: "Gamify your life",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600;700&family=Cinzel:wght@400;600;700&family=Rajdhani:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ConvexClientProvider>
          {/* Pad bottom so content isn't hidden under fixed nav bar (72px bar height) */}
          <div style={{ paddingBottom: "80px" }}>
            {children}
          </div>
          {/* Fixed bottom nav — anchored to visual viewport, always above Safari toolbar */}
          <BottomBar />
        </ConvexClientProvider>
      </body>
    </html>
  );
}
