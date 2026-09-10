import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, Card, Field, Input } from "../../components/ui";
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
    <div className="mx-auto mt-12 max-w-sm px-6">
      <h1 className="mb-6 text-center text-3xl tracking-tighter text-ink">Welcome back</h1>
      <Card className="shadow-float">
        <form onSubmit={onSubmit} className="space-y-4">
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
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Field>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full">
            Log in
          </Button>
        </form>
      </Card>
      <p className="mt-4 text-center text-sm text-graphite">
        No account?{" "}
        <Link to="/register" className="text-ink underline underline-offset-2">
          Register
        </Link>
      </p>

    </div>
  );
}
