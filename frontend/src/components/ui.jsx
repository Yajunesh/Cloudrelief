const BUTTON_VARIANTS = {
  primary: "bg-ink text-paper hover:bg-ink/85",
  ghost: "border border-ink/15 text-ink hover:border-ink/30 hover:bg-mist",
  peach: "bg-peach text-sienna hover:bg-peach/70",
  quiet: "text-graphite hover:text-ink",
};

export function Button({ as: As = "button", variant = "primary", className = "", ...props }) {
  return (
    <As
      className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${BUTTON_VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}

export function Card({ accent = false, className = "", ...props }) {
  return (
    <div
      className={`rounded-3xl p-5 ${accent ? "bg-peach text-sienna" : "border border-ink/[0.06] bg-paper"} ${className}`}
      {...props}
    />
  );
}

export function Field({ label, children }) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1.5 block text-xs font-medium uppercase tracking-tight text-graphite">
          {label}
        </span>
      )}
      {children}
    </label>
  );
}

const inputClasses =
  "w-full rounded-2xl border border-ink/15 bg-paper px-4 py-3 text-sm text-ink placeholder:text-graphite/40 outline-none transition-all focus:border-ink/60 focus:ring-2 focus:ring-ink/5";

export function Input({ className = "", ...props }) {
  return <input className={`${inputClasses} ${className}`} {...props} />;
}

export function TextArea({ className = "", ...props }) {
  return <textarea className={`${inputClasses} ${className}`} {...props} />;
}

export function Eyebrow({ children, className = "" }) {
  return (
    <p className={`text-xs font-medium uppercase tracking-tight text-graphite ${className}`}>
      {children}
    </p>
  );
}
