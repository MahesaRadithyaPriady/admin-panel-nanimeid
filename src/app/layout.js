import "./globals.css";
import ToasterProvider from "@/components/ToasterProvider";

export const metadata = {
  title: "NanimeID Admin Login",
  description: "Login ke panel admin NanimeID. Registrasi tidak tersedia.",
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
