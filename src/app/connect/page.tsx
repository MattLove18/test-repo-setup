import type { Metadata } from "next";
import Link from "next/link";
import { ConnectHubForm } from "@/components/blueprint/ConnectHubForm";

export const metadata: Metadata = {
  title: "Connect Captivation Hub · Cash Flow Architects",
  description: "Link the client pipeline drawing to your Captivation Hub sub-account.",
};

export default function ConnectPage() {
  return (
    <main className="sheet">
      <div className="drawing connect-sheet">
        <header className="title-block">
          <div>
            <p className="firm-name">Cash Flow Architects</p>
            <p className="firm-loc">Two-way sync with Captivation Hub</p>
          </div>
          <div className="sheet-meta">
            <h1>Connect Hub</h1>
            <p>A Private Integration token plus your Location ID unlocks the live client pipeline.</p>
          </div>
          <p>
            <Link className="ghost-btn" href="/">
              Back to drawing
            </Link>
          </p>
        </header>
        <ConnectHubForm />
      </div>
    </main>
  );
}
