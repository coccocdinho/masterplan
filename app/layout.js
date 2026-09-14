import "../styles/globals.css";

export const metadata = {
  title: "Master Plan — BES",
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body className="bg-slate-50 font-sans text-slate-800">{children}</body>
    </html>
  );
}
