import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, Field, Input } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";

export default function CitizenLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await login(email, password);
      navigate("/report");
    } catch (err) {
      setError(err.response?.data?.detail || "Login failed");
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      <div className="overflow-hidden rounded-3xl border border-ink/10 shadow-2xl bg-white grid grid-cols-1 md:grid-cols-2">
        {/* Visual Hero Side */}
        <div className="relative min-h-[240px] md:min-h-[460px] bg-ink overflow-hidden flex flex-col justify-between p-6 sm:p-8 text-white">
          <img
            src="/hero.jpg"
            alt="Disaster Response"
            className="absolute inset-0 h-full w-full object-cover object-center scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/40 to-transparent" />

          {/* Top telemetry pill */}
          <div className="relative z-10">
            <span className="inline-flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-xs font-mono text-emerald-400 border border-emerald-500/30 backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              CITIZEN RELIEF ACCESS
            </span>
          </div>

          {/* Bottom title & info */}
          <div className="relative z-10">
            <p className="font-mono text-xs uppercase tracking-widest text-amber-300">
              Community Emergency Network
            </p>
            <h2 className="mt-1 font-serif text-2xl sm:text-3xl text-white font-medium">
              Report & Track Incidents
            </h2>
            <p className="mt-2 text-xs text-zinc-300 leading-relaxed">
              Submit real-time geo-located incident reports, track relief updates, and request immediate disaster assistance.
            </p>
          </div>
        </div>

        {/* Form Side */}
        <div className="flex flex-col justify-center p-6 sm:p-10 bg-paper">
          <div className="mb-6">
            <h1 className="text-2xl font-serif tracking-tight text-ink">Welcome back</h1>
            <p className="mt-1 text-xs text-graphite">
              Sign in to your citizen account to file or track emergency reports.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4" autoComplete="off">
            <Field label="Email">
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="off"
                required
              />
            </Field>

            <Field label="Password">
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </Field>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full py-3">
              Log in
            </Button>
          </form>

          <div className="mt-6 flex flex-col gap-2 border-t border-ink/5 pt-4 text-center">
            <p className="text-xs text-graphite">
              No account?{" "}
              <Link to="/register" className="text-ink font-semibold underline underline-offset-2">
                Register here
              </Link>
            </p>
            <Link to="/admin/login" className="text-xs text-graphite/70 hover:text-ink">
              Agency Administrator? Sign in here →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
