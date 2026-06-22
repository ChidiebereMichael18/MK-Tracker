import "./globals.css";

export const metadata = {
  title: "MK-Tracker OSINT Platform",
  description: "Full-spectrum OSINT: live location tracking, phone number intelligence, and custom bait message builder.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
