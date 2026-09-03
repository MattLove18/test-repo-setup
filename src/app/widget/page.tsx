import type { Metadata } from "next";
import Link from "next/link";
import { DeskWidget } from "@/components/widget/DeskWidget";

export const metadata: Metadata = {
  title: "Desk briefing · Cash Flow Architects",
  description: "Hourly pipeline briefing for the Mac desktop, 7:00 AM to 5:00 PM Central.",
};

export default function WidgetPage() {
  return (
    <main className="desk-shell">
      <DeskWidget />
      <aside className="desk-setup">
        <p className="desk-kicker">Put this on the Mac</p>
        <ol>
          <li>
            After deploy, open this same URL on the MacBook
            {` `}(<code>/widget</code>, plus <code>?token=</code> if you set one).
          </li>
          <li>
            Safari → File → Add to Dock. That gives you a small Cash Flow app you can keep on the
            desktop or in Stage Manager.
          </li>
          <li>
            For a true desktop widget, install{" "}
            <a href="https://tracesof.net/uebersicht/">Übersicht</a> and drop in{" "}
            <code>widgets/cashflow-briefing.jsx</code> from this repo.
          </li>
        </ol>
        <p>
          <Link className="ghost-btn" href="/">
            Open the full drawing
          </Link>
        </p>
      </aside>
    </main>
  );
}
