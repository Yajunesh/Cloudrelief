import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, Card, Field, Input } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";

export default function AdminLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const user = await login(email, password);
      if (user.role !== "admin") {
        setError("This account is not an admin.");
        return;
      }
      navigate("/admin");
    } catch (err) {
      setError(err.response?.data?.detail || "Login failed");
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      <div className="overflow-hidden rounded-3xl border border-ink/10 shadow-2xl bg-white grid grid-cols-1 md:grid-cols-2">
        {/* Visual Command Center Side */}
        <div className="relative min-h-[260px] md:min-h-[480px] bg-ink overflow-hidden flex flex-col justify-between p-6 sm:p-8 text-white">
          <img
            src="/command-center.jpg"
            alt="Disaster Incident Command Center"
            className="absolute inset-0 h-full w-full object-cover object-center opacity-60 mix-blend-luminosity scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/60 to-transparent" />

          {/* Top telemetry pill */}
          <div className="relative z-10">
            <span className="inline-flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-xs font-mono text-emerald-400 border border-emerald-500/30 backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              DISPATCH COMMAND ONLINE
            </span>
          </div>

          {/* Bottom title & info */}
          <div className="relative z-10">
            <p className="font-mono text-xs uppercase tracking-widest text-amber-300">
              Agency Operations Portal
            </p>
            <h2 className="mt-1 font-serif text-2xl sm:text-3xl text-white font-medium">
              Incident Response Console
            </h2>
            <p className="mt-2 text-xs text-graphite/90 text-zinc-300 leading-relaxed">
              Authorized emergency coordinators and field response personnel only. Real-time GIS routing, AI severity triage, and unit deployment.
            </p>
          </div>
        </div>

        {/* Form Side */}
        <div className="flex flex-col justify-center p-6 sm:p-10 bg-paper">
          <div className="mb-6">
            <h1 className="text-2xl font-serif tracking-tight text-ink">Sign in to console</h1>
            <p className="mt-1 text-xs text-graphite">
              Enter your administrative credentials to manage live emergency incidents.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4" autoComplete="off">
            <Field label="Admin Email">
              <Input
                type="email"
                placeholder="admin@cloudrelief.local"
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
              Access Command Center
            </Button>
          </form>

          <div className="mt-6 border-t border-ink/5 pt-4 text-center">
            <Link to="/login" className="text-xs text-graphite hover:text-ink underline">
              Switch to Citizen Portal →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
