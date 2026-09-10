import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
    <div className="mx-auto mt-12 max-w-sm px-6">
      <h1 className="mb-6 text-center text-3xl tracking-tighter text-ink">Admin console</h1>
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

    </div>
  );
}
