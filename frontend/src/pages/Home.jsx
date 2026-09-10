import { Link } from "react-router-dom";
import { Button, Card, Eyebrow } from "../components/ui";
import SeverityBadge from "../components/SeverityBadge";
import { useAuth } from "../context/AuthContext";

export default function Home() {
  const { user, logout } = useAuth();

  return (
    <div className="relative mx-auto max-w-page overflow-hidden px-6 pb-28 pt-6 sm:px-10">
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute -right-24 top-0 h-96 w-96 rounded-full bg-peach/50 blur-3xl" />
      <div className="pointer-events-none absolute -left-20 top-40 h-80 w-80 rounded-full bg-amber-100/40 blur-3xl" />

      {/* Main Hero Header */}
      <section className="relative mx-auto max-w-3xl text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white/80 px-4 py-1.5 shadow-sm backdrop-blur-sm">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
          <Eyebrow className="text-[11px] tracking-wider text-ink font-semibold">
            Next-Gen Disaster Response Network
          </Eyebrow>
        </div>

        <h1 className="mt-5 text-[42px] leading-[1.06] tracking-tighter text-ink sm:text-[62px]">
          Rapid incident triage,
          <br />
          <span className="italic font-serif text-sienna">instant aid dispatch.</span>
        </h1>

        <p className="mx-auto mt-5 max-w-xl text-[16px] leading-relaxed text-graphite">
          Citizens report emergencies in seconds with GPS and photos. CloudRelief leverages
          cloud AI vision and real-time GIS mapping to triage severity and mobilize emergency crews first where needed most.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button as={Link} to="/report" variant="primary" className="py-3 px-6 shadow-md hover:shadow-lg transition-all">
            Report an Incident
          </Button>

          {user ? (
            <>
              {user.role === "citizen" ? (
                <Button as={Link} to="/my-reports" variant="ghost" className="py-3 px-6">
                  My Reports
                </Button>
              ) : (
                <Button as={Link} to="/admin" variant="peach" className="py-3 px-6">
                  Command Center
                </Button>
              )}
              <Button variant="ghost" onClick={logout} className="py-3 px-6 text-xs text-graphite hover:text-ink">
                Log out ({user.email})
              </Button>
            </>
          ) : (
            <>
              <Button as={Link} to="/login" variant="ghost" className="py-3 px-6">
                Citizen Portal
              </Button>
              <Button as={Link} to="/admin/login" variant="peach" className="py-3 px-6">
                Admin Command Center
              </Button>
            </>
          )}
        </div>
      </section>

      {/* Visual Showcase with Generated Hero Image */}
      <section className="relative mt-12 mx-auto max-w-5xl">
        <div className="relative overflow-hidden rounded-3xl border border-ink/10 shadow-2xl bg-ink/5">
          <img
            src="/hero.jpg"
            alt="CloudRelief Disaster Response Operations"
            className="w-full h-[360px] sm:h-[480px] object-cover object-center transform hover:scale-[1.01] transition-transform duration-700"
          />

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/20 to-transparent pointer-events-none" />

          {/* Floating Badges */}
          <div className="absolute top-4 left-4 sm:top-6 sm:left-6 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-ink/70 px-3.5 py-1.5 text-xs font-medium text-paper backdrop-blur-md border border-white/10">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Live GIS Telemetry
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-ink/70 px-3.5 py-1.5 text-xs font-medium text-paper backdrop-blur-md border border-white/10">
              ⚡ AWS Serverless AI Intake
            </span>
          </div>

          <div className="absolute bottom-6 left-6 right-6 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 text-paper">
            <div>
              <p className="text-xs font-mono uppercase tracking-wider text-amber-300">
                Continuous Monitoring & Triage
              </p>
              <h2 className="text-xl sm:text-2xl font-serif text-white mt-0.5">
                Autonomous Severity Scoring & Rescue Routing
              </h2>
            </div>
            <Link
              to="/report"
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-semibold text-ink shadow-sm hover:bg-mist transition-colors"
            >
              Submit Live Report →
            </Link>
          </div>
        </div>
      </section>

      {/* Disaster Categories & Scientific Methodology from Report */}
      <section className="relative mt-12 grid grid-cols-1 gap-5 sm:grid-cols-3">
        <Card className="shadow-float border border-ink/[0.08] hover:border-ink/20 transition-all">
          <Eyebrow>Disaster Categories</Eyebrow>
          <p className="mt-2 font-serif text-xl text-ink">Flood • Fire • Structural</p>
          <p className="mt-1 text-xs text-graphite">
            Trained and tuned to detect acute natural and urban hazards: rising flood waters, active blazes, and structural building collapses.
          </p>
          <div className="mt-4 flex items-center justify-between border-t border-ink/5 pt-3">
            <span className="text-xs font-mono text-graphite">Rekognition Vision AI</span>
            <SeverityBadge score={0.96} />
          </div>
        </Card>

        <Card accent className="shadow-float border border-sienna/20">
          <Eyebrow className="text-sienna/70">Severity scoring formula</Eyebrow>
          <p className="mt-2 font-mono text-xs font-semibold text-sienna">
            (AI × 0.5) + (Keywords × 0.25) + (Density × 0.25)
          </p>
          <p className="mt-2 text-xs text-sienna/90 leading-relaxed">
            Multi-factor weighted algorithms automatically calculate severity from visual image features, urgent text signals, and geographic clustering.
          </p>
        </Card>

        <Card className="shadow-float border border-ink/[0.08] hover:border-ink/20 transition-all">
          <Eyebrow>Dual-Track Architecture</Eyebrow>
          <p className="mt-2 font-serif text-xl tracking-tight text-ink">AWS FaaS vs. VM IaaS</p>
          <p className="mt-2 text-xs text-graphite leading-relaxed">
            Empirical benchmarking under high-concurrency disaster loads (10 → 500 users) comparing latency, throughput, and operational costs.
          </p>
        </Card>
      </section>
    </div>
  );
}
