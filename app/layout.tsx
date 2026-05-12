import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "FieldVision CRM",
  description: "Internal task and workflow management for the FieldVision AI team.",
  applicationName: "FieldVision",
  appleWebApp: {
    capable: true,
    title: "FieldVision",
    statusBarStyle: "default"
  },
  formatDetection: {
    telephone: false
  }
};

export const viewport: Viewport = {
  themeColor: "#2563EB",
  colorScheme: "light",
  viewportFit: "cover"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="touch-manipulation">
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              borderRadius: "14px",
              border: "1px solid #E2E8F0",
              boxShadow: "0 12px 32px -8px rgba(15,23,42,0.18)"
            }
          }}
        />
      </body>
    </html>
  );
}
