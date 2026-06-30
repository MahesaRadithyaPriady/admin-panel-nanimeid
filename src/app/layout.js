import "./globals.css";
import ToasterProvider from "@/components/ToasterProvider";

export const metadata = {
  title: "NanimeID Admin Login",
  description: "Login ke panel admin NanimeID. Registrasi tidak tersedia.",
  icons: {
    icon: "https://web.nanimeid.xyz/logo.png",
    shortcut: "https://web.nanimeid.xyz/logo.png",
    apple: "https://web.nanimeid.xyz/logo.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>
        <ToasterProvider />
        {children}
      </body>
    </html>
  );
}
