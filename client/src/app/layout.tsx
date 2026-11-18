import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '../context/AuthContext';
import { SocketProvider } from '../context/SocketContext';
import { Navbar } from '../components/Navbar';
import { Shield } from 'lucide-react';

export const metadata: Metadata = {
  title: 'StreamShare | Secure P2P OTT Subscription Marketplace & Direct Chat',
  description: 'Military-grade secure peer-to-peer OTT subscription classifieds and encrypted real-time messaging exchange.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-slate-100 flex flex-col font-sans antialiased selection:bg-brand-500/30 selection:text-brand-200">
        <AuthProvider>
          <SocketProvider>
            <Navbar />
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
              {children}
            </main>
            <footer className="border-t border-slate-800/80 bg-surface/50 py-8 mt-12 text-center text-xs text-slate-500">
              <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-brand-400" />
                  <span className="font-semibold text-slate-300">StreamShare Security Framework</span>
                  <span>— TLS 1.3 / WSS Enforced & TDE Protected</span>
                </div>
                <p>© 2026 StreamShare P2P Protocol. Production Architecture Blueprint.</p>
              </div>
            </footer>
          </SocketProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

