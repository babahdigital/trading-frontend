import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import { Link } from '@/i18n/navigation';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ExecutionPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <EnterpriseNav />
      <main className="max-w-4xl mx-auto px-6 py-20">
        {/* Back */}
        <Link
          href="/platform"
          className="inline-flex items-center gap-1.5 text-sm text-accent hover:text-accent/80 transition-colors mb-8"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Platform overview
        </Link>

        {/* Hero */}
        <section className="mb-20">
          <h1 className="font-display text-display-lg md:text-display-xl text-foreground mb-6">
            Sub-millisecond execution, institutional infrastructure.
          </h1>
          <p className="text-muted-foreground leading-relaxed mb-8 max-w-2xl">
            Execution quality determines whether a valid signal becomes a profitable
            trade. The BabahAlgo execution infrastructure is engineered for minimal
            latency, maximum reliability, and complete auditability at every stage of the
            order lifecycle.
          </p>
        </section>

        {/* Latency */}
        <section className="mb-16">
          <h2 className="font-display text-display-sm text-foreground mb-4">
            Latency architecture
          </h2>
          <div className="border border-border rounded-lg p-8 bg-card mb-6">
            <h3 className="font-display text-lg text-foreground mb-3">
              ZeroMQ bridge specifications
            </h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              The ZeroMQ bridge is the critical link between the strategy engine (running
              in Docker on Linux) and MetaTrader 5 (running on Windows). Communication
              occurs over TCP sockets on localhost, eliminating network latency entirely.
              Messages are serialized using a compact binary protocol that encodes trade
              commands (OPEN, MODIFY, CLOSE) with full parameters (symbol, direction, lot
              size, stop-loss, take-profit) in under 100 bytes per message.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-6">
              The bridge operates in a request-reply pattern: the strategy engine sends a
              command and blocks until the MT5 EA confirms receipt and processing. This
              synchronous pattern ensures order integrity -- no command is lost or
              duplicated. Measured round-trip latency in production consistently falls
              below 2 milliseconds.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="border border-border rounded-lg p-8 bg-background text-center">
                <p className="font-mono text-lg text-accent mb-1">&lt;2ms</p>
                <p className="text-xs text-muted-foreground">Round-trip latency</p>
              </div>
              <div className="border border-border rounded-lg p-8 bg-background text-center">
                <p className="font-mono text-lg text-accent mb-1">&lt;100B</p>
                <p className="text-xs text-muted-foreground">Message size</p>
              </div>
              <div className="border border-border rounded-lg p-8 bg-background text-center">
                <p className="font-mono text-lg text-accent mb-1">TCP</p>
                <p className="text-xs text-muted-foreground">Transport</p>
              </div>
              <div className="border border-border rounded-lg p-8 bg-background text-center">
                <p className="font-mono text-lg text-accent mb-1">REQ/REP</p>
                <p className="text-xs text-muted-foreground">Pattern</p>
              </div>
            </div>
          </div>
        </section>

        {/* Broker Integration */}
        <section className="mb-16">
          <h2 className="font-display text-display-sm text-foreground mb-4">
            Broker integration
          </h2>
          <div className="border border-border rounded-lg p-8 bg-card">
            <p className="text-muted-foreground leading-relaxed mb-4">
              MetaTrader 5 serves as the broker connectivity layer. The MT5 expert advisor
              is a stateless order executor -- it receives commands from the ZeroMQ bridge,
              validates them against the broker&apos;s trading conditions, and submits them to
              the liquidity pool. The EA performs pre-submission checks including symbol
              availability, minimum lot size compliance, margin sufficiency, and trading
              hours validation.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Order types supported include market orders (immediate execution), pending
              limit orders, and stop orders. All orders include attached stop-loss and
              take-profit levels set at the time of submission. Position modifications
              (stop adjustment, trailing stop ratchet) are handled as separate MODIFY
              commands through the bridge.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Fill confirmations are returned to the strategy engine through the same
              ZeroMQ channel, including the actual fill price, slippage (if any), and the
              broker-assigned ticket number. This data is logged to PostgreSQL for
              reconciliation and slippage analysis.
            </p>
          </div>
        </section>

        {/* VPS Infrastructure */}
        <section className="mb-16">
          <h2 className="font-display text-display-sm text-foreground mb-4">
            VPS infrastructure
          </h2>
          <div className="space-y-6">
            <div className="border border-border rounded-lg p-8 bg-card">
              <h3 className="font-display text-lg text-foreground mb-3">
                Dedicated hardware
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                The trading engine runs on a dedicated VPS with guaranteed resources: no
                shared CPU cores, no memory overcommitment, and NVMe SSD storage for
                database I/O. The server is located in a data center with redundant power,
                cooling, and network connectivity. Physical proximity to major broker
                servers minimizes network latency for the final leg of order transmission.
              </p>
            </div>
            <div className="border border-border rounded-lg p-8 bg-card">
              <h3 className="font-display text-lg text-foreground mb-3">
                Network security
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                All external access is routed through Cloudflare Tunnel. The VPS has no
                publicly exposed ports. Administrative access requires Cloudflare Access
                authentication. Internal communication between Docker containers occurs on
                an isolated bridge network. The MT5 terminal communicates with the broker
                through its native encrypted protocol, and with the strategy engine
                exclusively through the localhost ZeroMQ socket.
              </p>
            </div>
          </div>
        </section>

        {/* Monitoring and Failover */}
        <section className="mb-16">
          <h2 className="font-display text-display-sm text-foreground mb-4">
            Monitoring and failover
          </h2>
          <div className="space-y-6">
            <div className="border border-border rounded-lg p-8 bg-card">
              <h3 className="font-display text-lg text-foreground mb-3">
                Health check system
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                A dedicated monitoring service polls all critical components every 60
                seconds: ZeroMQ bridge connectivity, MT5 terminal status, broker connection
                state, PostgreSQL availability, and system resource utilization (CPU,
                memory, disk). Each check has a defined healthy/degraded/critical threshold.
                Degraded status triggers a warning notification. Critical status triggers
                the automated response protocol.
              </p>
            </div>
            <div className="border border-border rounded-lg p-8 bg-card">
              <h3 className="font-display text-lg text-foreground mb-3">
                Automated response protocol
              </h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                When a critical health check failure is detected, the system follows a
                deterministic response sequence:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground text-sm">
                <li>Immediately pause all new trade signals</li>
                <li>Attempt automated recovery (service restart, reconnection)</li>
                <li>If recovery fails within 30 seconds, close all open positions at market</li>
                <li>Disable the strategy engine and enter safe mode</li>
                <li>Send critical alert to the operations team with full diagnostic payload</li>
                <li>Log the entire incident timeline for post-mortem analysis</li>
              </ol>
            </div>
            <div className="border border-border rounded-lg p-8 bg-card">
              <h3 className="font-display text-lg text-foreground mb-3">
                Uptime targets
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                The system targets 99.9% uptime during market hours (Sunday 17:00 ET to
                Friday 17:00 ET). Scheduled maintenance windows are limited to weekends
                when markets are closed. Unscheduled downtime triggers the automated
                response protocol described above, ensuring that positions are never left
                unmanaged during an outage.
              </p>
            </div>
          </div>
        </section>
      </main>
      <EnterpriseFooter />
    </div>
  );
}
