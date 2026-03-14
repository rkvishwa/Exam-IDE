import React, { useState, useEffect, useCallback } from "react";
import { Eye, EyeOff, Radar, Sun, Moon } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import "./Login.css";

type Tab = "login" | "register";

export default function Login() {
  const { login, register } = useAuth();
  const [tab, setTab] = useState<Tab>("login");

  // Login state
  const [loginTeam, setLoginTeam] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register state
  const [regTeam, setRegTeam] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [studentIds, setStudentIds] = useState<string[]>([""]);

  const [loading, setLoading] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Toast state
  const [toast, setToast] = useState<{
    message: string;
    type: "error" | "success";
  } | null>(null);

  /** Resolve the effective display theme ("light" or "dark") from an ide-theme value. */
  const resolveTheme = (saved: string | null): "light" | "dark" => {
    if (saved === "light") return "light";
    if (saved === "dark") return "dark";
    // "system" or null — fall back to OS preference
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark";
  };

  const [theme, setTheme] = useState<"light" | "dark">(() =>
    resolveTheme(localStorage.getItem("ide-theme"))
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Re-sync when the IDE (same window) changes the theme via settings
  useEffect(() => {
    const handleIdeThemeChanged = () => {
      setTheme(resolveTheme(localStorage.getItem("ide-theme")));
    };
    window.addEventListener("ide-theme-changed", handleIdeThemeChanged);
    return () => window.removeEventListener("ide-theme-changed", handleIdeThemeChanged);
  }, []);

  // Listen for system theme changes (only relevant when ide-theme is "system" or unset)
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: light)");
    const handleChange = (e: MediaQueryListEvent) => {
      const saved = localStorage.getItem("ide-theme");
      if (!saved || saved === "system") {
        setTheme(e.matches ? "light" : "dark");
      }
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === "light" ? "dark" : "light";
      // Persist to localStorage so the IDE and future sessions pick it up
      localStorage.setItem("ide-theme", next);
      return next;
    });
  };

  const showToast = useCallback(
    (message: string, type: "error" | "success") => {
      setToast({ message, type });
    },
    [],
  );

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const switchTab = (t: Tab) => {
    setTab(t);
    setToast(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginTeam.trim() || !loginPassword.trim()) {
      showToast("Please fill in all fields", "error");
      return;
    }
    setLoading(true);
    const result = await login(loginTeam.trim(), loginPassword);
    setLoading(false);
    if (!result.success) {
      showToast(
        result.error || "Account not found or invalid credentials",
        "error",
      );
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = regTeam.trim();
    const pass = regPassword.trim();
    const ids = studentIds.map((s) => s.trim()).filter(Boolean);

    if (!name || !pass) {
      showToast("Team name and password are required", "error");
      return;
    }
    if (ids.length === 0) {
      showToast("Add at least one student ID", "error");
      return;
    }
    const uniqueIds = new Set(ids);
    if (uniqueIds.size !== ids.length) {
      showToast("Duplicate student IDs are not allowed", "error");
      return;
    }
    setLoading(true);
    const result = await register(name, pass, ids);
    setLoading(false);
    if (result.success) {
      showToast("Registration successful! Please sign in.", "success");
      setRegTeam("");
      setRegPassword("");
      setStudentIds([""]);
      setTab("login");
    } else {
      showToast(result.error || "Registration failed", "error");
    }
  };

  const addStudentId = () => {
    if (studentIds.length < 5) {
      setStudentIds([...studentIds, ""]);
    }
  };

  const removeStudentId = (index: number) => {
    if (studentIds.length > 1) {
      setStudentIds(studentIds.filter((_, i) => i !== index));
    }
  };

  const updateStudentId = (index: number, value: string) => {
    const updated = [...studentIds];
    updated[index] = value;
    setStudentIds(updated);
  };

  return (
    <div className="login-layout">
      <button
        className="theme-toggle-btn"
        onClick={toggleTheme}
        aria-label="Toggle theme"
      >
        {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
      </button>

      {toast && (
        <div
          className={`toast toast-${toast.type}`}
          onClick={() => setToast(null)}
        >
          <span className="toast-icon">
            {toast.type === "error" ? "✕" : "✓"}
          </span>
          <span>{toast.message}</span>
        </div>
      )}

      <div className="login-hero">
        <div className="hero-content">
          <div className="hero-icon">
            <Radar size={120} className="radar-icon" />
          </div>
          <h1>Sonar Code Editor</h1>
          <p>
            The secure, monitored environment for coding exams and team
            assessments.
          </p>
        </div>
        <div className="hero-decoration"></div>
      </div>

      <div className="login-panel">
        <div className="login-panel-inner">
          <div className="login-header">
            <div className="login-logo-mobile">
              <Radar size={32} className="radar-icon" />
            </div>
            <h2>{tab === "login" ? "Welcome back" : "Create an account"}</h2>
            <p>
              {tab === "login"
                ? "Sign in to your team account to continue"
                : "Register a new team to get started"}
            </p>
          </div>

          <div className="login-tab-bar">
            <button
              className={`login-tab-btn ${tab === "login" ? "active" : ""}`}
              onClick={() => switchTab("login")}
              type="button"
            >
              Sign In
            </button>
            <button
              className={`login-tab-btn ${tab === "register" ? "active" : ""}`}
              onClick={() => switchTab("register")}
              type="button"
            >
              Register
            </button>
          </div>

          {tab === "login" ? (
            <form onSubmit={handleLogin} className="login-form">
              <div className="form-group">
                <label htmlFor="loginTeam">Team Name</label>
                <input
                  id="loginTeam"
                  type="text"
                  value={loginTeam}
                  onChange={(e) => setLoginTeam(e.target.value)}
                  placeholder="Enter your team name"
                  autoComplete="username"
                  autoFocus
                  disabled={loading}
                />
              </div>
              <div className="form-group">
                <label htmlFor="loginPassword">Password</label>
                <div className="password-wrapper">
                  <input
                    id="loginPassword"
                    type={showLoginPassword ? "text" : "password"}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    tabIndex={-1}
                    aria-label={
                      showLoginPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showLoginPassword ? (
                      <EyeOff size={16} />
                    ) : (
                      <Eye size={16} />
                    )}
                  </button>
                </div>
              </div>
              <button type="submit" className="login-btn" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="login-form">
              <div className="form-group">
                <label htmlFor="regTeam">Team Name</label>
                <input
                  id="regTeam"
                  type="text"
                  value={regTeam}
                  onChange={(e) => setRegTeam(e.target.value)}
                  placeholder="Choose a team name"
                  autoComplete="off"
                  autoFocus
                  disabled={loading}
                />
              </div>
              <div className="form-group">
                <label htmlFor="regPassword">Password</label>
                <div className="password-wrapper">
                  <input
                    id="regPassword"
                    type={showRegPassword ? "text" : "password"}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Choose a password"
                    autoComplete="new-password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    tabIndex={-1}
                    aria-label={
                      showRegPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showRegPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label>Student IDs ({studentIds.length}/5)</label>
                <div className="student-ids-list">
                  {studentIds.map((id, i) => (
                    <div className="student-id-row" key={i}>
                      <input
                        type="text"
                        value={id}
                        onChange={(e) => updateStudentId(i, e.target.value)}
                        placeholder={`Student ID #${i + 1}`}
                        autoComplete="off"
                        disabled={loading}
                      />
                      {studentIds.length > 1 && (
                        <button
                          type="button"
                          className="id-remove-btn"
                          onClick={() => removeStudentId(i)}
                          disabled={loading}
                          title="Remove"
                        >
                          −
                        </button>
                      )}
                    </div>
                  ))}
                  {studentIds.length < 5 && (
                    <button
                      type="button"
                      className="id-add-btn"
                      onClick={addStudentId}
                      disabled={loading}
                    >
                      <span className="plus-icon">+</span> Add Member
                    </button>
                  )}
                </div>
              </div>
              <button type="submit" className="login-btn" disabled={loading}>
                {loading ? "Registering..." : "Register Team"}
              </button>
            </form>
          )}

          <div className="login-footer">
            <div className="offline-note">
              <span
                className="dot offline"
                style={{ display: "inline-block", marginRight: 6 }}
              />
              Offline mode available with cached credentials
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
