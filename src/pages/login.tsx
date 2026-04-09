import { useState } from "react";
import { supabase } from "@/lib/supabase";

interface LoginProps {
  onLogin: (username: string) => void;
}

type Mode = "login" | "register";

export default function Login({ onLogin }: LoginProps) {
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [shaking, setShaking] = useState(false);
  const [loading, setLoading] = useState(false);

  function triggerError(msg: string) {
    setError(msg);
    setShaking(true);
    setTimeout(() => setShaking(false), 500);
    setTimeout(() => setError(""), 4000);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    const trimUser = username.trim();
    const trimPass = password.trim();

    if (!trimUser || !trimPass) {
      triggerError("يرجى ملء جميع الحقول");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: trimUser,
      password: trimPass,
    });

    setLoading(false);

    if (error || !data.user) {
      triggerError("بيانات الدخول غير صحيحة");
      setPassword("");
      return;
    }

    onLogin(data.user.email || trimUser);
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();

    const trimUser = username.trim();
    const trimPass = password.trim();

    if (!trimUser || !trimPass) {
      triggerError("يرجى ملء جميع الحقول");
      return;
    }

    if (trimPass.length < 6) {
      triggerError("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: trimUser,
      password: trimPass,
    });

    setLoading(false);

    if (error) {
      triggerError(error.message);
      return;
    }

    if (!data.user) {
      triggerError("تعذر إنشاء الحساب");
      return;
    }

    onLogin(data.user.email || trimUser);
  }

  function switchMode(m: Mode) {
    setMode(m);
    setUsername("");
    setPassword("");
    setError("");
  }

  return (
    <div
      dir="rtl"
      style={{
        fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          background: "rgba(255,255,255,0.15)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderRadius: 25,
          padding: "40px 35px",
          width: "100%",
          maxWidth: 400,
          border: "1px solid rgba(255,255,255,0.25)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          animation: shaking ? "shake 0.45s ease" : "none",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 56, marginBottom: 8 }}>🏢</div>
          <h1 style={{ color: "white", fontSize: "1.75em", fontWeight: "bold", margin: 0 }}>
            Insurance Pro
          </h1>
          <p style={{ color: "rgba(255,255,255,0.7)", marginTop: 6, fontSize: "0.9em" }}>
            {mode === "login" ? "سجّل دخولك للمتابعة" : "إنشاء حساب جديد"}
          </p>
        </div>

        <div style={{ display: "flex", background: "rgba(0,0,0,0.2)", borderRadius: 12, padding: 4, marginBottom: 24 }}>
          {(["login", "register"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              style={{
                flex: 1,
                padding: "10px",
                border: "none",
                borderRadius: 10,
                fontSize: 14,
                fontWeight: "bold",
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 0.2s",
                background: mode === m ? "white" : "transparent",
                color: mode === m ? "#764ba2" : "rgba(255,255,255,0.75)",
                boxShadow: mode === m ? "0 2px 8px rgba(0,0,0,0.2)" : "none",
              }}
            >
              {m === "login" ? "🔑 تسجيل دخول" : "✨ حساب جديد"}
            </button>
          ))}
        </div>

        <form onSubmit={mode === "login" ? handleLogin : handleRegister}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", color: "rgba(255,255,255,0.85)", fontSize: "0.9em", fontWeight: "bold", marginBottom: 6 }}>
              👤 البريد الإلكتروني
            </label>
            <input
              type="email"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(""); }}
              placeholder="example@email.com"
              autoFocus
              style={{
                width: "100%",
                padding: "14px 16px",
                border: "2px solid rgba(255,255,255,0.3)",
                borderRadius: 12,
                fontSize: 15,
                background: "rgba(255,255,255,0.9)",
                direction: "rtl",
                boxSizing: "border-box",
                outline: "none",
              }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", color: "rgba(255,255,255,0.85)", fontSize: "0.9em", fontWeight: "bold", marginBottom: 6 }}>
              🔒 كلمة المرور
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                placeholder="أدخل كلمة المرور"
                style={{
                  width: "100%",
                  padding: "14px 50px 14px 16px",
                  border: "2px solid rgba(255,255,255,0.3)",
                  borderRadius: 12,
                  fontSize: 15,
                  background: "rgba(255,255,255,0.9)",
                  direction: "rtl",
                  boxSizing: "border-box",
                  outline: "none",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", cursor: "pointer", fontSize: 18, color: "#888", padding: 0 }}
              >
                {showPass ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          {error && (
            <div style={{ background: "rgba(255,80,80,0.25)", border: "1px solid rgba(255,120,120,0.5)", borderRadius: 10, padding: "10px 14px", color: "white", textAlign: "center", marginBottom: 16, fontSize: "0.88em", fontWeight: "bold" }}>
              ❌ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "16px",
              background: mode === "login"
                ? "linear-gradient(45deg, #4CAF50, #45a049)"
                : "linear-gradient(45deg, #2196F3, #1976D2)",
              color: "white",
              border: "none",
              borderRadius: 15,
              fontSize: 16,
              fontWeight: "bold",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
              boxShadow: mode === "login"
                ? "0 6px 20px rgba(76,175,80,0.4)"
                : "0 6px 20px rgba(33,150,243,0.4)",
            }}
          >
            {loading
              ? "⏳ يرجى الانتظار..."
              : mode === "login"
              ? "🔓 دخول"
              : "✅ إنشاء الحساب"}
          </button>
        </form>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-10px); }
          40% { transform: translateX(10px); }
          60% { transform: translateX(-8px); }
          80% { transform: translateX(8px); }
        }
      `}</style>
    </div>
  );
}
