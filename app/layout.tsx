import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "CRM",
  description: "Internal task and workflow management for the FieldVision AI team."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster
          position="bottom-right"
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
