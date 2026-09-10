import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, Field, Input } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";

export default function CitizenRegister() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await register(email, password, fullName);
      navigate("/report");
    } catch (err) {
      setError(err.response?.data?.detail || "Registration failed");
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      <div className="overflow-hidden rounded-3xl border border-ink/10 shadow-2xl bg-white grid grid-cols-1 md:grid-cols-2">
        {/* Visual Hero Side */}
        <div className="relative min-h-[240px] md:min-h-[480px] bg-ink overflow-hidden flex flex-col justify-between p-6 sm:p-8 text-white">
          <img
            src="/hero.jpg"
            alt="Community Relief Operations"
            className="absolute inset-0 h-full w-full object-cover object-center scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/40 to-transparent" />

          {/* Top telemetry pill */}
          <div className="relative z-10">
            <span className="inline-flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-xs font-mono text-emerald-400 border border-emerald-500/30 backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              CITIZEN REGISTRATION
            </span>
          </div>

          {/* Bottom title & info */}
          <div className="relative z-10">
            <p className="font-mono text-xs uppercase tracking-widest text-amber-300">
              Community Emergency Network
            </p>
            <h2 className="mt-1 font-serif text-2xl sm:text-3xl text-white font-medium">
              Join CloudRelief
            </h2>
            <p className="mt-2 text-xs text-zinc-300 leading-relaxed">
              Create a free account to report local hazards, receive localized emergency advisories, and track rescue operations.
            </p>
          </div>
        </div>

        {/* Form Side */}
        <div className="flex flex-col justify-center p-6 sm:p-10 bg-paper">
          <div className="mb-6">
            <h1 className="text-2xl font-serif tracking-tight text-ink">Create an account</h1>
            <p className="mt-1 text-xs text-graphite">
              Get direct access to disaster reporting and live relief updates.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <Field label="Full name">
              <Input
                type="text"
                placeholder="Jane Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </Field>

            <Field label="Email">
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Field>

            <Field label="Password">
              <Input
                type="password"
                placeholder="Min 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </Field>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full py-3">
              Register Account
            </Button>
          </form>

          <div className="mt-6 border-t border-ink/5 pt-4 text-center">
            <p className="text-xs text-graphite">
              Already have an account?{" "}
              <Link to="/login" className="text-ink font-semibold underline underline-offset-2">
                Log in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
