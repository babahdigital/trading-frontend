import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import { ArchitectureDiagram } from '@/components/diagrams/architecture-diagram';
import { Link } from '@/i18n/navigation';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function TechnologyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <EnterpriseNav />
      <main id="main-content">

        {/* Hero */}
        <section className="section-padding border-b border-white/8">
          <div className="container-default px-6">
            <Link
              href="/platform"
              className="inline-flex items-center gap-1.5 text-sm text-amber-400 hover:text-amber-400/80 transition-colors mb-8"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Platform overview
            </Link>
            <p className="t-eyebrow mb-4">Platform Technology</p>
            <h1 className="t-display-page mb-6">
              AI engine, execution infrastructure, and monitoring.
            </h1>
            <p className="text-foreground/60 leading-relaxed mb-8 max-w-2xl">
              Every component in the BabahAlgo technology stack is purpose-built for
              automated trading. There are no general-purpose frameworks, no shared
              hosting, and no third-party signal dependencies. The system owns the full
              pipeline from analysis to execution.
            </p>
            {/* Architecture Diagram */}
            <div className="card-enterprise">
              <ArchitectureDiagram />
            </div>
          </div>
        </section>

        {/* AI Advisor */}
        <section className="section-padding border-b border-white/8">
          <div className="container-default px-6">
            <p className="t-eyebrow mb-4">Analysis Engine</p>
            <h2 className="t-display-sub mb-4">AI Advisor</h2>
            <div className="card-enterprise">
              <h3 className="font-display text-lg text-foreground mb-3">
                Gemini 2.5 Flash Integration
              </h3>
              <p className="text-foreground/60 leading-relaxed mb-4">
                The AI advisor uses Google&apos;s Gemini 2.5 Flash model to perform real-time
                market analysis for each monitored instrument. Every 15 minutes, the system
                submits a structured prompt containing current OHLCV data, recent price
                action context, active position state, and recent trade history. The model
                returns a JSON-structured response with directional bias, confidence score,
                key support and resistance levels, timeframe-specific analysis, and risk
                commentary.
              </p>
              <p className="text-foreground/60 leading-relaxed mb-4">
                Confidence scoring operates on a 0-100 scale. Scores below 70 suppress new
                entries for the pair. Scores between 70-80 require full multi-timeframe
                technical confluence. Scores above 80 allow entry with reduced confluence
                requirements. A neutral bias reading pauses all new entries regardless of
                technical signals.
              </p>
              <div className="grid md:grid-cols-3 gap-4 mt-6">
                <div className="border border-white/8 rounded-lg p-4 bg-background text-center">
                  <p className="font-mono text-lg text-amber-400 mb-1">15 min</p>
                  <p className="t-body-sm text-foreground/60">Analysis cycle</p>
                </div>
                <div className="border border-white/8 rounded-lg p-4 bg-background text-center">
                  <p className="font-mono text-lg text-amber-400 mb-1">14 pairs</p>
                  <p className="t-body-sm text-foreground/60">Monitored instruments</p>
                </div>
                <div className="border border-white/8 rounded-lg p-4 bg-background text-center">
                  <p className="font-mono text-lg text-amber-400 mb-1">0-100</p>
                  <p className="t-body-sm text-foreground/60">Confidence scoring</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Execution */}
        <section className="section-padding border-b border-white/8">
          <div className="container-default px-6">
            <p className="t-eyebrow mb-4">Order Routing</p>
            <h2 className="t-display-sub mb-4">Execution pipeline</h2>
            <div className="card-enterprise mb-6">
              <h3 className="font-display text-lg text-foreground mb-3">
                ZeroMQ Bridge
              </h3>
              <p className="text-foreground/60 leading-relaxed mb-4">
                Order routing between the strategy engine and MetaTrader 5 is handled by a
                custom ZeroMQ bridge. ZeroMQ is a high-performance asynchronous messaging
                library that provides socket-level communication without the overhead of
                HTTP or REST protocols. The bridge serializes trade commands (open, modify,
                close) into compact binary messages and transmits them to the MT5 expert
                advisor via TCP sockets on localhost.
              </p>
              <p className="text-foreground/60 leading-relaxed mb-4">
                Measured end-to-end latency from signal generation to order submission is
                consistently below 2 milliseconds in production. This includes message
                serialization, socket transmission, deserialization, and MT5 order queue
                insertion. Actual fill latency depends on broker infrastructure and is
                typically 50-200ms additional.
              </p>
              <div className="grid md:grid-cols-2 gap-4 mt-6">
                <div className="border border-white/8 rounded-lg p-4 bg-background text-center">
                  <p className="font-mono text-lg text-amber-400 mb-1">&lt;2ms</p>
                  <p className="t-body-sm text-foreground/60">Bridge latency</p>
                </div>
                <div className="border border-white/8 rounded-lg p-4 bg-background text-center">
                  <p className="font-mono text-lg text-amber-400 mb-1">TCP/localhost</p>
                  <p className="t-body-sm text-foreground/60">Transport protocol</p>
                </div>
              </div>
            </div>

            <div className="card-enterprise">
              <h3 className="font-display text-lg text-foreground mb-3">
                MetaTrader 5 Integration
              </h3>
              <p className="text-foreground/60 leading-relaxed">
                The MT5 expert advisor operates as a lightweight order executor. It receives
                commands from the ZeroMQ bridge, validates them against the broker&apos;s trading
                conditions (symbol availability, margin requirements, trading hours), and
                submits them to the broker&apos;s liquidity pool. Position management -- including
                stop-loss modification, trailing stop ratcheting, and forced closure -- is
                handled entirely through the bridge. The EA maintains no independent trading
                logic, ensuring the strategy engine is the single source of truth.
              </p>
            </div>
          </div>
        </section>

        {/* Infrastructure */}
        <section className="section-padding border-b border-white/8">
          <div className="container-default px-6">
            <p className="t-eyebrow mb-4">System Architecture</p>
            <h2 className="t-display-sub mb-4">Infrastructure</h2>
            <div className="space-y-6">
              <div className="card-enterprise">
                <h3 className="font-display text-lg text-foreground mb-3">
                  Zero-trust architecture
                </h3>
                <p className="text-foreground/60 leading-relaxed">
                  All network access to the trading infrastructure is routed through
                  Cloudflare Tunnel. There are no open ports, no public IP addresses exposed,
                  and no direct SSH access from the internet. Administrative access requires
                  Cloudflare Access authentication with hardware key verification. The tunnel
                  provides DDoS protection, TLS termination, and access logging as a
                  byproduct of its architecture.
                </p>
              </div>

              <div className="card-enterprise">
                <h3 className="font-display text-lg text-foreground mb-3">
                  VPS isolation
                </h3>
                <p className="text-foreground/60 leading-relaxed">
                  The trading engine runs on a dedicated VPS with no shared tenancy. The
                  server is provisioned with guaranteed CPU cores, dedicated RAM, and SSD
                  storage to eliminate resource contention. The operating system is hardened
                  with minimal attack surface -- only the services required for trading
                  operation are installed and running.
                </p>
              </div>

              <div className="card-enterprise">
                <h3 className="font-display text-lg text-foreground mb-3">
                  PostgreSQL and Docker
                </h3>
                <p className="text-foreground/60 leading-relaxed">
                  All trading state -- positions, signals, risk parameters, audit logs,
                  account metrics -- is persisted in PostgreSQL. The database provides ACID
                  compliance, point-in-time recovery, and structured query capability for
                  post-trade analysis. The entire application stack is containerized with
                  Docker, enabling reproducible deployments, version-locked dependencies, and
                  rapid rollback in the event of a deployment issue.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Monitoring */}
        <section className="section-padding">
          <div className="container-default px-6">
            <p className="t-eyebrow mb-4">Operations</p>
            <h2 className="t-display-sub mb-4">Monitoring</h2>
            <div className="space-y-6">
              <div className="card-enterprise">
                <h3 className="font-display text-lg text-foreground mb-3">
                  24/7 health checks
                </h3>
                <p className="text-foreground/60 leading-relaxed">
                  Automated health checks run every 60 seconds, verifying connectivity to the
                  broker, ZeroMQ bridge responsiveness, database availability, AI advisor
                  reachability, and system resource utilization. Any check failure triggers an
                  immediate alert to the operations team and initiates a pre-defined response
                  protocol.
                </p>
              </div>

              <div className="card-enterprise">
                <h3 className="font-display text-lg text-foreground mb-3">
                  Kill-switch mechanism
                </h3>
                <p className="text-foreground/60 leading-relaxed">
                  A hardware-level kill switch can halt all trading activity within seconds.
                  When activated, the system closes all open positions at market, cancels all
                  pending orders, and disables the strategy engine. The kill switch can be
                  triggered manually through the admin dashboard, automatically by the
                  catastrophic breaker risk layer, or remotely via an authenticated API
                  endpoint.
                </p>
              </div>

              <div className="card-enterprise">
                <h3 className="font-display text-lg text-foreground mb-3">
                  Audit logging
                </h3>
                <p className="text-foreground/60 leading-relaxed">
                  Every action in the system is logged with a timestamp, actor identification,
                  action type, and full payload. This includes trade signals generated, risk
                  checks passed/failed, orders submitted, fills received, position
                  modifications, and administrative actions. Logs are stored in PostgreSQL
                  with a 90-day online retention and archived to cold storage for compliance
                  purposes. All logs are available for query through the admin dashboard.
                </p>
              </div>
            </div>
          </div>
        </section>

      </main>
      <EnterpriseFooter />
    </div>
  );
}
