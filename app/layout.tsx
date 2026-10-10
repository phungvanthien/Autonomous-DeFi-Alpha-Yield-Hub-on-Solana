import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SolanaWalletProvider } from "@/components/wallet/wallet-context";
import { AppShell } from "@/components/navigation/app-shell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Solana Autonomous DeFi Hub | Copy-Trade & Multi-DEX LP Agent",
  description: "Autonomous smart money whale tracker and Multi-DEX LP fee harvester on Solana",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var clean = function(el) {
                    if (el && el.nodeType === 1) {
                      if (el.hasAttribute('bis_skin_checked')) el.removeAttribute('bis_skin_checked');
                      if (el.hasAttribute('bis_register')) el.removeAttribute('bis_register');
                    }
                  };
                  var cleanAll = function() {
                    try {
                      var els = document.querySelectorAll('[bis_skin_checked], [bis_register]');
                      for (var i = 0; i < els.length; i++) {
                        els[i].removeAttribute('bis_skin_checked');
                        els[i].removeAttribute('bis_register');
                      }
                    } catch (e) {}
                  };
                  cleanAll();
                  var observer = new MutationObserver(function(mutations) {
                    for (var i = 0; i < mutations.length; i++) {
                      var m = mutations[i];
                      if (m.type === 'attributes') {
                        if (m.attributeName === 'bis_skin_checked' || m.attributeName === 'bis_register') {
                          m.target.removeAttribute(m.attributeName);
                        }
                      } else if (m.type === 'childList') {
                        for (var j = 0; j < m.addedNodes.length; j++) {
                          var node = m.addedNodes[j];
                          if (node.nodeType === 1) {
                            clean(node);
                            var matches = node.querySelectorAll ? node.querySelectorAll('[bis_skin_checked], [bis_register]') : [];
                            for (var k = 0; k < matches.length; k++) {
                              matches[k].removeAttribute('bis_skin_checked');
                              matches[k].removeAttribute('bis_register');
                            }
                          }
                        }
                      }
                    }
                  });
                  observer.observe(document.documentElement, {
                    attributes: true,
                    childList: true,
                    subtree: true,
                    attributeFilter: ['bis_skin_checked', 'bis_register']
                  });
                  window.addEventListener('DOMContentLoaded', cleanAll);
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning className="min-h-full flex flex-col bg-zinc-950 text-white">
        <SolanaWalletProvider>
          <AppShell>{children}</AppShell>
        </SolanaWalletProvider>
      </body>
    </html>
  );
}
