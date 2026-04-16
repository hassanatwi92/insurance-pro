import { useState, useEffect, useRef } from "react";
import type { Page } from "../types";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { supabase } from "@/lib/supabase";
interface Installment {
  index: number;
  due_date: string;
  payment_date: string;
  method: string;
  receipt_num: string;
  amount: string;
  paid: boolean;
}
interface BrokerItem {
  name: string;
  code: string;
}
interface Policy {
id?: number;  user_id: string;
  policy_num: string;
  client_name: string;
  policy_type: string;
  insurance_company: string;
  broker_name?: string;
  broker_code?: string;
  buy_price: number;
  sell_price: number;
  profit: number;
  paid_company: boolean;
  date: string;
  client_payment_type: "cash" | "installment";
  cash_date?: string;
  cash_method?: string;
  cash_receipt_num?: string;
  installments_count?: number;
  installments?: Installment[];
}
type PaidFilter = "all" | "paid" | "unpaid";
type SearchField = "all" | "client_name" | "policy_num" | "insurance_company" | "policy_type" | "broker";
function remainingInstallments(p: Policy): number {
  if (p.client_payment_type !== "installment" || !p.installments) return 0;
  return p.installments.filter((i) => !i.paid).length;
}
function formatDateDMY(dateStr?: string): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  return `${d}-${m}-${y}`;
}
function getTodayDMY(): string {
  const now = new Date();
  const d = String(now.getDate()).padStart(2, "0");
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const y = now.getFullYear();
  return `${d}-${m}-${y}`;
}
export default function Home({
  username,
  page,
  setPage,
  isCompaniesPage,
}: {
  username: string;
  page: Page;
  setPage: (p: Page) => void;
  isCompaniesPage?: boolean;
}) {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [paidFilter, setPaidFilter] = useState<PaidFilter>("all");
  const [searchText, setSearchText] = useState("");
  const [companyPolicies, setCompanyPolicies] = useState<Policy[]>([]);
  const [searchField, setSearchField] = useState<SearchField>("all");
  const [message, setMessage] = useState<{ text: string; type: "success" | "warning" | "info" } | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [paymentModal, setPaymentModal] = useState<Policy | null>(null);
  const [companyList, setCompanyList] = useState<string[]>([]);
  const [showCompanyManager, setShowCompanyManager] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [policyTypes, setPolicyTypes] = useState<string[]>([]);
  const [brokers, setBrokers] = useState<BrokerItem[]>([]);
  const [showBrokerManager, setShowBrokerManager] = useState(false);
  const [newBrokerName, setNewBrokerName] = useState("");
  const [newBrokerCode, setNewBrokerCode] = useState("");
  const [showPolicyTypeManager, setShowPolicyTypeManager] = useState(false);
  const [newPolicyType, setNewPolicyType] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [editModal, setEditModal] = useState<Policy | null>(null);
  const [allClientNames, setAllClientNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  // userIdRef to avoid re-fetching
  const userIdRef = useRef<string>("");
  const filteredClients = allClientNames
    .filter((name) => name.toLowerCase().includes(clientSearch.toLowerCase()))
    .slice(0, 10);
  const [form, setForm] = useState({
    policy_num: "",
    client_name: "",
    policy_type: "",
    insurance_company: "",
    broker_code: "",
    buy_price: "",
    sell_price: "",
    client_payment_type: "cash" as "cash" | "installment",
    cash_date: "",
    cash_method: "",
    cash_receipt_num: "",
    installments_count: "2",
  });
  const [formInstallments, setFormInstallments] = useState<
    { date: string; method: string; receipt_num: string; amount: string }[]
  >([
    { date: "", method: "", receipt_num: "", amount: "" },
    { date: "", method: "", receipt_num: "", amount: "" },
  ]);
  // =============================================
  // LOAD DATA FROM SUPABASE
  // =============================================
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      userIdRef.current = user.id;
      const userId = user.id;
const policiesUserId = userId;      // 1. policies
      const { data: policiesData, error: policiesError } = await supabase
        .from("policies")
        .select("*")
        .eq("user_id", policiesUserId);
      if (!policiesError && policiesData) {
      const pageType = isCompaniesPage ? "companies" : "clients";

setPolicies(
  policiesData
    .filter((p) => p.data?.page === pageType)
    .map((p) => ({
      ...p.data,
      id: p.id,
    }))
);;
      } else {
        setPolicies([]);
      }
      // 2. company policies (للـ autofill في صفحة الزبائن)
      if (!isCompaniesPage) {
        const { data: companyPoliciesData } = await supabase
          .from("policies")
          .select("*")
.eq("user_id", userId)
        if (companyPoliciesData) {
          setCompanyPolicies(companyPoliciesData.map((p) => p.data as Policy));
        }
      }
      
      // 3. company list
      const { data: companiesData } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", userId)
        .eq("key", "companies")
        .single();
      setCompanyList(companiesData?.value ?? []);
      // 4. client names
      const { data: clientsData } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", userId)
        .eq("key", "clients")
        .single();
      setAllClientNames(clientsData?.value ?? []);
      // 5. brokers
      const { data: brokersData } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", userId)
        .eq("key", "brokers")
        .single();
      setBrokers(brokersData?.value ?? []);
      // 6. policy types
      const { data: typesData } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", userId)
        .eq("key", "policyTypes")
        .single();
      setPolicyTypes(typesData?.value ?? []);
      setLoading(false);
      const filtered = policiesData.filter(
  (p) => p.data.page === (isCompaniesPage ? "companies" : "clients")
);
setPolicies(
  filtered.map((p) => ({
    ...p.data,
    id: p.id,
  }))
);
    }
    loadData();
  }, [username, isCompaniesPage]);
  // =============================================
  // CONFIRM PASSWORD via Supabase Auth
  // =============================================
  async function confirmPassword(): Promise<boolean> {
    const entered = prompt("🔐 أدخل كلمة المرور:");
    if (!entered) return false;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) return false;
    const { error } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: entered,
    });
    if (error) {
      alert("❌ كلمة المرور غير صحيحة");
      return false;
    }
    return true;
  }
  // =============================================
  // SAVE POLICIES TO SUPABASE
  // =============================================
  async function saveData(updatedPolicies: Policy[]) {
  setPolicies(updatedPolicies);

  const userId = userIdRef.current;

  // امسح كل شي لهيدا المستخدم
  const pageType = isCompaniesPage ? "companies" : "clients";

await supabase
  .from("policies")
  .delete()
  .eq("user_id", userId)
  .eq("data->>page", pageType);

  // رجّع خزّن من جديد
  const rows = updatedPolicies.map((p) => ({
    user_id: userId,
    data: p,
  }));

  const { error } = await supabase.from("policies").insert(rows);

  if (error) {
    console.error("SAVE ERROR:", error);
  }
}
  // =============================================
  // SAVE SETTINGS TO SUPABASE
  // =============================================
  async function saveSetting(key: string, value: unknown) {
    const userId = userIdRef.current;
    await supabase.from("user_settings").upsert(
  { user_id: userId, key, value },
  { onConflict: "user_id,key" }
);
  }
  async function saveCompanyList(list: string[]) {
    setCompanyList(list);
    await saveSetting("companies", list);
  }
  async function savePolicyTypes(list: string[]) {
    setPolicyTypes(list);
    await saveSetting("policyTypes", list);
  }
  async function saveClientNames(list: string[]) {
    setAllClientNames(list);
    await saveSetting("clients", list);
  }
  async function saveBrokers(list: BrokerItem[]) {
    setBrokers(list);
    await saveSetting("brokers", list);
  }
  // =============================================
  // BROKER FUNCTIONS
  // =============================================
  async function addBroker() {
    const name = newBrokerName.trim();
    const code = newBrokerCode.trim();
    if (!name || !code) return;
    const exists = brokers.some(
      (b) => b.name === name || b.code.toLowerCase() === code.toLowerCase()
    );
    if (exists) {
      setNewBrokerName("");
      setNewBrokerCode("");
      return;
    }
    await saveBrokers([...brokers, { name, code }]);
    setNewBrokerName("");
    setNewBrokerCode("");
  }
  async function deleteBroker(code: string) {
    await saveBrokers(brokers.filter((b) => b.code !== code));
  }
  // =============================================
  // POLICY TYPE FUNCTIONS
  // =============================================
  async function addPolicyType() {
    const name = newPolicyType.trim();
    if (!name) return;
    if (policyTypes.includes(name)) {
      setNewPolicyType("");
      return;
    }
    await savePolicyTypes([...policyTypes, name]);
    setNewPolicyType("");
  }
  async function deletePolicyType(name: string) {
    await savePolicyTypes(policyTypes.filter((t) => t !== name));
  }
  // =============================================
  // COMPANY FUNCTIONS
  // =============================================
  async function addCompanyToList() {
    const name = newCompanyName.trim();
    if (!name) return;
    if (companyList.includes(name)) {
      setNewCompanyName("");
      return;
    }
    await saveCompanyList([...companyList, name]);
    setNewCompanyName("");
  }
  async function deleteCompanyFromList(name: string) {
    await saveCompanyList(companyList.filter((c) => c !== name));
  }
  // =============================================
  // LOGOUT
  // =============================================
  async function logout() {
    await supabase.auth.signOut();
    sessionStorage.removeItem("insurance_auth");
    window.location.reload();
  }
  function showMessage(text: string, type: "success" | "warning" | "info") {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  }
  function updateInstallmentsCount(count: string) {
    const n = Math.max(1, Math.min(60, parseInt(count) || 1));
    const current = formInstallments;
    const next = Array.from(
      { length: n },
      (_, i) => current[i] || { date: "", method: "", receipt_num: "", amount: "" }
    );
    setFormInstallments(next);
    setForm({ ...form, installments_count: String(n) });
  }
  function autofillFromCompanyPolicy(policyNum: string) {
    if (isCompaniesPage) return;
    const matched = companyPolicies.find(
      (p) => p.policy_num.trim().toLowerCase() === policyNum.trim().toLowerCase()
    );
    if (!matched) return;
    setForm((prev) => ({
      ...prev,
      policy_num: policyNum,
      client_name: matched.client_name || "",
      policy_type: matched.policy_type || "",
      insurance_company: matched.insurance_company || "",
      broker_code: matched.broker_code || "",
    }));
  }
  // =============================================
  // ADD POLICY
  // =============================================
  async function addPolicy() {
    const buy = parseFloat(form.buy_price) || 0;
    const sell = parseFloat(form.sell_price) || 0;
    const profit = sell - buy;
    if (!form.policy_num || !form.client_name) {
      showMessage("يرجى ملء رقم البوليصة واسم العميل", "warning");
      return;
    }
    const selectedBroker = brokers.find((b) => b.code === form.broker_code);
    const userId = userIdRef.current;
const policiesUserId = userId;  
  const newPolicy = {
  page: isCompaniesPage ? "companies" : "clients",
      user_id: policiesUserId,
      policy_num: form.policy_num,
      client_name: form.client_name,
      policy_type: form.policy_type,
      insurance_company: form.insurance_company,
      broker_name: selectedBroker?.name || "",
      broker_code: selectedBroker?.code || "",
      buy_price: buy,
      sell_price: sell,
      profit,
      paid_company: false,
      date: getTodayDMY(),
      client_payment_type: form.client_payment_type,
      ...(form.client_payment_type === "cash"
        ? {
            cash_date: form.cash_date,
            cash_method: form.cash_method,
            cash_receipt_num: form.cash_receipt_num,
          }
        : {
            installments_count: parseInt(form.installments_count),
            installments: formInstallments.map((ins, i) => ({
              index: i + 1,
              due_date: ins.date,
              payment_date: "",
              method: ins.method,
              receipt_num: ins.receipt_num,
              amount: ins.amount,
              paid: false,
            })),
          }),
    };
    await saveData([newPolicy, ...policies]);
    const trimmedClientName = form.client_name.trim();
    if (trimmedClientName && !allClientNames.includes(trimmedClientName)) {
      await saveClientNames([...allClientNames, trimmedClientName]);
    }
    setForm({
      policy_num: "",
      client_name: "",
      policy_type: "",
      insurance_company: "",
      broker_code: "",
      buy_price: "",
      sell_price: "",
      client_payment_type: "cash",
      cash_date: "",
      cash_method: "",
      cash_receipt_num: "",
      installments_count: "2",
    });
    setClientSearch("");
    setFormInstallments([
      { date: "", method: "", receipt_num: "", amount: "" },
      { date: "", method: "", receipt_num: "", amount: "" },
    ]);
    setShowDialog(false);
    showMessage(`✅ تمت إضافة البوليصة! الربح: $${profit.toFixed(2)}`, "success");
  }
  // =============================================
  // TOGGLE INSTALLMENT
  // =============================================
  async function toggleInstallment(policyId: number, instIndex: number) {
    const updated = policies.map((p) => {
      if (p.id !== policyId || !p.installments) return p;
      const updatedInstallments = p.installments.map((ins) =>
        ins.index === instIndex ? { ...ins, paid: !ins.paid } : ins
      );
      const anyPaid = updatedInstallments.some((ins) => ins.paid);
      return { ...p, installments: updatedInstallments, paid_company: anyPaid };
    });
    await saveData(updated);
    setPaymentModal((prev) => {
      if (!prev || prev.id !== policyId || !prev.installments) return prev;
      const updatedInstallments = prev.installments.map((ins) =>
        ins.index === instIndex ? { ...ins, paid: !ins.paid } : ins
      );
      const anyPaid = updatedInstallments.some((ins) => ins.paid);
      return { ...prev, installments: updatedInstallments, paid_company: anyPaid };
    });
  }
  // =============================================
  // UPDATE INSTALLMENT FIELD
  // =============================================
  async function updateInstallmentField(
    policyId: number,
    instIndex: number,
    field: "due_date" | "payment_date" | "method" | "receipt_num" | "amount",
    value: string
  ) {
    const patchPolicy = (p: Policy): Policy => {
      if (p.id !== policyId || !p.installments) return p;
      const updated = p.installments.map((ins) => {
        if (ins.index !== instIndex) return ins;
        const newIns = { ...ins, [field]: value };
        newIns.paid = !!(newIns.payment_date && newIns.method);
        return newIns;
      });
      const anyPaid = updated.some((ins) => ins.paid);
      return { ...p, installments: updated, paid_company: anyPaid };
    };
    const newPolicies = policies.map(patchPolicy);
    await saveData(newPolicies);
    setPaymentModal((prev) => (prev ? patchPolicy(prev) : prev));
  }
  // =============================================
  // DELETE POLICY (kept for future use)
  // =============================================
  async function _deletePolicy(id: number) {
    if (window.confirm("هل أنت متأكد من حذف هذه البوليصة؟")) {
      const updated = policies.filter((p) => p.id !== id);
      await saveData(updated);
      showMessage("🗑️ تم حذف البوليصة", "warning");
    }
  }
  void _deletePolicy; // suppress unused warning
  // =============================================
  // CLEAR ALL DATA
  // =============================================
 
  // =============================================
  // FILTER
  // =============================================
  const displayed = policies.filter((p) => {
    const q = searchText.trim().toLowerCase();
    if (!q) return true;
    if (searchField === "client_name") return p.client_name.toLowerCase().includes(q);
    if (searchField === "policy_num") return p.policy_num.toLowerCase().includes(q);
    if (searchField === "insurance_company") return (p.insurance_company || "").toLowerCase().includes(q);
    if (searchField === "policy_type") return (p.policy_type || "").toLowerCase().includes(q);
    if (searchField === "broker") return (p.broker_code || "").toLowerCase().includes(q);
    return (
      p.client_name.toLowerCase().includes(q) ||
      p.policy_num.toLowerCase().includes(q) ||
      (p.insurance_company || "").toLowerCase().includes(q) ||
      (p.policy_type || "").toLowerCase().includes(q) ||
      (p.broker_code || "").toLowerCase().includes(q)
    );
  });
  function getPaidFilterLabel(value: PaidFilter) {
    if (value === "paid") return "مدفوع";
    if (value === "unpaid") return "غير مدفوع";
    return "الكل";
  }
  function getPrintSearchLabel() {
    const value = searchText.trim();
    if (!value) return "";
    if (searchField === "client_name") return `اسم العميل: ${value}`;
    if (searchField === "policy_num") return `رقم البوليصة: ${value}`;
    if (searchField === "insurance_company") return `شركة التأمين: ${value}`;
    if (searchField === "policy_type") return `نوع البوليصة: ${value}`;
    if (searchField === "broker") {
      const broker = brokers.find((b) => b.code.toLowerCase() === value.toLowerCase());
      return broker ? `الوسيط: ${broker.name} / كود: ${broker.code}` : `كود الوسيط: ${value}`;
    }
    return `بحث: ${value}`;
  }
  const displayedProfit = displayed.reduce((sum, p) => sum + p.profit, 0);
  const unpaidCount = policies.filter((p) => !p.paid_company).length;
  const paidCount = policies.filter((p) => p.paid_company).length;
  const isFiltered = paidFilter !== "all" || searchText.trim() !== "";
  const fieldStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 14px",
    border: "2px solid #e0e0e0",
    borderRadius: 10,
    fontSize: 14,
    outline: "none",
    direction: "rtl",
    boxSizing: "border-box",
    fontFamily: "inherit",
  };
  const labelStyle: React.CSSProperties = {
    display: "block",
    marginBottom: 4,
    fontWeight: "bold",
    color: "#555",
    fontSize: "0.88em",
  };
  let totalBuy = 0;
  let totalSell = 0;
  let totalInstallments = 0;
  displayed.forEach((p) => {
    if (p.installments && p.installments.length > 0) {
      const visibleInstallments = p.installments.filter((ins) => {
        const isPaid = !!(ins.payment_date && ins.method);
        if (paidFilter === "paid") return isPaid;
        if (paidFilter === "unpaid") return !isPaid;
        return true;
      });
      if (visibleInstallments.length > 0) {
        totalBuy += p.buy_price;
        totalSell += p.sell_price;
        visibleInstallments.forEach((ins) => {
          if (ins.method !== "ملغى") {
            totalInstallments += parseFloat(ins.amount || "0");
          }
        });
      }
    } else {
      const isPaid = !!(p.cash_date && p.cash_method);
      if (paidFilter === "paid" && !isPaid) return;
      if (paidFilter === "unpaid" && isPaid) return;
      totalBuy += p.buy_price;
      totalSell += p.sell_price;
      totalInstallments += p.sell_price;
    }
  });
  if (loading) {
    return (
      <div dir="rtl" style={{ fontFamily: "system-ui", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "white", fontSize: "1.3em", fontWeight: "bold" }}>⏳ جاري التحميل...</div>
      </div>
    );
  }
  return (
    <div dir="rtl" style={{ fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", minHeight: "100vh", padding: "20px" }}>
      <div style={{ maxWidth: 1300, margin: "0 auto", background: "rgba(255,255,255,0.15)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderRadius: 25, padding: 40, border: "1px solid rgba(255,255,255,0.2)" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <button onClick={logout} style={{ background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 10, padding: "8px 14px", color: "white", cursor: "pointer", fontSize: 13, fontFamily: "inherit", fontWeight: "bold" }}>🚪 خروج</button>
          <div style={{ background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 10, padding: "8px 14px", color: "white", fontSize: 12, fontWeight: "bold", textAlign: "center" }}>👤 {username.slice(0, 8)}...</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <h1 style={{ color: "white", textAlign: "center", fontSize: "1.7em", fontWeight: "bold", margin: 0, flex: 1 }}>🏢 Insurance Pro</h1>
        </div>
        {/* Nav tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          {([
            { key: "clients", label: "👥 الزبائن" },
            { key: "companies", label: "🏦 الشركات" },
          ] as { key: Page; label: string }[]).map(({ key, label }) => (
            <button key={key} onClick={() => setPage(key)} style={{ flex: 1, padding: "11px", border: "none", borderRadius: 12, fontSize: 14, fontWeight: "bold", cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s", background: page === key ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.2)", color: page === key ? "#764ba2" : "white", boxShadow: page === key ? "0 4px 15px rgba(0,0,0,0.2)" : "none" }}>
              {label}
            </button>
          ))}
        </div>
        {/* Search */}
        <div style={{ display: "flex", gap: 8, margin: "10px 0", alignItems: "center" }}>
          <select value={searchField} onChange={(e) => setSearchField(e.target.value as SearchField)} style={{ padding: "12px 10px", border: "none", borderRadius: 12, fontSize: 13, background: "rgba(255,255,255,0.9)", cursor: "pointer", fontFamily: "inherit", direction: "rtl", flexShrink: 0 }}>
            <option value="all">🔍 الكل</option>
            <option value="client_name">👤 اسم العميل</option>
            <option value="policy_num">📄 رقم البوليصة</option>
            <option value="insurance_company">🏦 شركة التأمين</option>
            <option value="policy_type">📋 نوع البوليصة</option>
            <option value="broker">👔 كود الوسيط</option>
          </select>
          <div style={{ position: "relative", flex: 1 }}>
            <input value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="ابحث..." style={{ ...inputStyle, margin: 0 }} />
            {searchText && <button onClick={() => setSearchText("")} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", cursor: "pointer", fontSize: 14, color: "#999" }}>✕</button>}
          </div>
        </div>
        {/* Paid filter toggles */}
        <div style={{ display: "flex", gap: 8, margin: "10px 0" }}>
          {([
            { value: "all", label: `📋 الكل (${policies.length})`, color: "#2196F3" },
            { value: "unpaid", label: `❌ غير مدفوع (${unpaidCount})`, color: "#f44336" },
            { value: "paid", label: `✅ مدفوع (${paidCount})`, color: "#4CAF50" },
          ] as { value: PaidFilter; label: string; color: string }[]).map(({ value, label, color }) => (
            <button key={value} onClick={() => setPaidFilter(value)} style={{ flex: 1, padding: "11px 6px", border: "none", borderRadius: 12, fontSize: 13, fontWeight: "bold", cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s", background: paidFilter === value ? color : "rgba(255,255,255,0.25)", color: "white", boxShadow: paidFilter === value ? `0 4px 15px ${color}88` : "none", outline: paidFilter === value ? "2px solid white" : "none", outlineOffset: 2 }}>
              {label}
            </button>
          ))}
        </div>
        <Btn onClick={() => setShowDialog(true)} color="linear-gradient(45deg,#4CAF50,#45a049)">➕ إضافة بوليصة جديدة</Btn>
        {isCompaniesPage && (
          <Btn onClick={() => setShowCompanyManager(true)} color="linear-gradient(45deg,#0288D1,#0f3460)">🏦 إدارة شركات التأمين ({companyList.length})</Btn>
        )}
        <Btn onClick={() => setShowPolicyTypeManager(true)} color="linear-gradient(45deg,#8E24AA,#6A1B9A)">
          📋 إدارة أنواع البوالص ({policyTypes.length})
        </Btn>
        <Btn onClick={() => setShowBrokerManager(true)} color="linear-gradient(45deg,#FB8C00,#EF6C00)">
          👔 إدارة الوسطاء ({brokers.length})
        </Btn>
       
        {message && (
          <div style={{ margin: "15px 0", padding: 18, borderRadius: 15, background: message.type === "success" ? "rgba(76,175,80,0.3)" : "rgba(244,67,54,0.3)", color: "white", textAlign: "center", fontWeight: "bold", border: "1px solid rgba(255,255,255,0.3)" }}>
            {message.text}
          </div>
        )}
        {displayed.length > 0 && (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "15px 0 10px", flexWrap: "wrap", gap: 8 }}>
              <div style={{ color: "white", fontWeight: "bold", fontSize: "1em", opacity: 0.9 }}>
                {isFiltered ? `🔍 النتائج: ${displayed.length} بوليصة — إجمالي الربح: $${displayedProfit.toFixed(2)}` : `📋 جميع البوليصات (${policies.length}) — إجمالي الربح: $${displayedProfit.toFixed(2)}`}
              </div>
              <button onClick={() => window.print()} style={{ background: "rgba(255,255,255,0.9)", color: "#764ba2", border: "none", borderRadius: 10, padding: "8px 16px", fontWeight: "bold", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>🖨️ طباعة</button>
            </div>
            <div id="print-table" className={isCompaniesPage ? "companies-print" : "clients-print"} style={{ overflowX: "auto" }}>
              <div id="print-title" style={{ display: "none" }}>🏢 Insurance Pro — {isCompaniesPage ? "صفحة الشركات" : "صفحة الزبائن"}</div>
              <div id="print-summary" style={{ display: "none" }}>
                {searchText.trim() && <div className="print-meta-line">🔍 {getPrintSearchLabel()}</div>}
                {paidFilter !== "all" && <div className="print-meta-line">📊 الفلترة: {getPaidFilterLabel(paidFilter)}</div>}
              </div>
              <table style={{ minWidth: "1200px", width: "100%", marginTop: 10, background: "white", borderRadius: 15, overflow: "hidden", boxShadow: "0 10px 30px rgba(0,0,0,0.2)", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["رقم البوليصة", "العميل", "نوع", "شركة", "سعر الشراء", "سعر البيع", "رقم القسط", "القسط", "تاريخ الاستحقاق", "تاريخ الدفع", "طريقة الدفع", "رقم الواصل", "مدفوع", "Broker"].map((h) => (
                      <th key={h} style={{ background: "linear-gradient(45deg,#2196F3,#1976D2)", color: "white", padding: "11px 18px", fontWeight: "bold", fontSize: "0.8em", whiteSpace: "nowrap" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayed.flatMap((p, i) => {
                    const rows: React.ReactNode[] = [];
                    if (p.installments && p.installments.length > 0) {
                      p.installments.forEach((ins, idx) => {
                        const isPaid = !!(ins.payment_date && ins.method);
                        if (paidFilter === "paid" && !isPaid) return;
                        if (paidFilter === "unpaid" && isPaid) return;
                        rows.push(
                          <tr key={`${p.id}-${idx}`} style={{ background: (i + idx) % 2 === 0 ? "#fff" : "#f9f9f9" }}>
                            <td style={tdStyle}>{p.policy_num}</td>
                            <td style={tdStyle}>{p.client_name}</td>
                            <td style={tdStyle}>
                              {p.policy_type ? <span style={{ background: "#E3F2FD", color: "#1565C0", borderRadius: 5, padding: "2px 7px", fontSize: "0.8em", fontWeight: "bold" }}>{p.policy_type}</span> : <span style={{ color: "#bbb" }}>—</span>}
                            </td>
                            <td style={tdStyle}>
                              {p.insurance_company ? <span style={{ background: "#F3E5F5", color: "#6A1B9A", borderRadius: 5, padding: "2px 7px", fontSize: "0.8em", fontWeight: "bold" }}>{p.insurance_company}</span> : <span style={{ color: "#bbb" }}>—</span>}
                            </td>
                            <td style={tdStyle}>${p.buy_price.toFixed(2)}</td>
                            <td style={tdStyle}>${p.sell_price.toFixed(2)}</td>
                            <td style={tdStyle}>{ins.index}/{p.installments_count}</td>
                            <td style={tdStyle}>${parseFloat(ins.amount || "0").toFixed(2)}</td>
                            <td style={tdStyle}>{formatDateDMY(ins.due_date)}</td>
                            <td style={tdStyle}>
                              <DatePicker
                                selected={ins.payment_date ? new Date(ins.payment_date) : null}
                                onChange={(date: Date | null) => {
                                  if (date) {
                                    const y = date.getFullYear();
                                    const m = String(date.getMonth() + 1).padStart(2, "0");
                                    const d = String(date.getDate()).padStart(2, "0");
                                    updateInstallmentField(p.id, ins.index, "payment_date", `${y}-${m}-${d}`);
                                  } else {
                                    updateInstallmentField(p.id, ins.index, "payment_date", "");
                                  }
                                }}
                                dateFormat="dd-MM-yyyy"
                                placeholderText="dd-mm-yyyy"
                                customInput={<input style={{ width: "110%", textAlign: "center", border: "1px solid #ddd", borderRadius: "4px" }} />}
                              />
                            </td>
                            <td style={tdStyle}>
                              {ins.method === "ملغى" ? (
                                <span style={{ color: "#999", fontWeight: "bold" }}>ملغى</span>
                              ) : (
                                <input type="text" value={ins.method || ""} onChange={(e) => updateInstallmentField(p.id, ins.index, "method", e.target.value)} placeholder="طريقة الدفع" style={{ width: "100%" }} />
                              )}
                            </td>
                            <td style={tdStyle}>
                              <input type="text" value={ins.receipt_num || ""} onChange={(e) => updateInstallmentField(p.id, ins.index, "receipt_num", e.target.value)} placeholder="رقم الواصل" style={{ width: "100%" }} />
                            </td>
                            <td style={tdStyle}>
                              <div style={{ display: "flex", gap: 4, justifyContent: "center", alignItems: "center" }}>
                                {isPaid ? <span style={{ color: "#4CAF50", fontWeight: "bold" }}>✔</span> : <span style={{ color: "#f44336", fontWeight: "bold" }}>✖</span>}
                                <button
                                  onClick={() => {
                                    confirmPassword().then((ok) => {
                                      if (ok) setEditModal(p);
                                    });
                                  }}
                                  style={{ background: "#FFC107", border: "none", borderRadius: 6, padding: "6px 10px", cursor: "pointer", fontSize: "0.75em" }}
                                >✏️</button>
                                <button
                                  onClick={async () => {
                                    const ok = await confirmPassword();
                                    if (!ok) return;
                                    if (!window.confirm("هل تريد حذف هذا القسط؟")) return;
                                    const today = new Date().toISOString().split("T")[0];
                                    const updated = policies.map((pol) => {
                                      if (pol.id !== p.id || !pol.installments) return pol;
                                      const newInstallments = pol.installments
                                        .filter((i) => i.index !== ins.index)
                                        .map((i, idx) => ({ ...i, index: idx + 1 }));
                                      if (newInstallments.length > 0) {
                                        return { ...pol, installments: newInstallments, installments_count: newInstallments.length };
                                      }
                                      return {
                                        ...pol,
                                        buy_price: 0,
                                        sell_price: 0,
                                        profit: 0,
                                        installments_count: 1,
                                        installments: [{ index: 1, due_date: ins.due_date, payment_date: today, method: "ملغى", receipt_num: "", amount: "0", paid: true }],
                                      };
                                    });
                                    await saveData(updated);
                                  }}
                                  style={{ background: "#f44336", color: "white", border: "none", borderRadius: 6, padding: "3px 6px", cursor: "pointer", fontSize: "0.8em" }}
                                >🗑️</button>
                              </div>
                            </td>
                            <td style={tdStyle}>{p.broker_code || "-"}</td>
                          </tr>
                        );
                      });
                    } else {
                      const isPaid = !!(p.cash_date && p.cash_method);
                      if (paidFilter === "paid" && !isPaid) return rows;
                      if (paidFilter === "unpaid" && isPaid) return rows;
                      rows.push(
                        <tr key={p.id} style={{ background: i % 2 === 0 ? "#fff" : "#f9f9f9" }}>
                          <td style={tdStyle}>{p.policy_num}</td>
                          <td style={tdStyle}>{p.client_name}</td>
                          <td style={tdStyle}>
                            {p.policy_type ? <span style={{ background: "#E3F2FD", color: "#1565C0", borderRadius: 5, padding: "2px 7px", fontSize: "0.8em", fontWeight: "bold" }}>{p.policy_type}</span> : <span style={{ color: "#bbb" }}>—</span>}
                          </td>
                          <td style={tdStyle}>
                            {p.insurance_company ? <span style={{ background: "#F3E5F5", color: "#6A1B9A", borderRadius: 5, padding: "2px 7px", fontSize: "0.8em", fontWeight: "bold" }}>{p.insurance_company}</span> : <span style={{ color: "#bbb" }}>—</span>}
                          </td>
                          <td style={tdStyle}>${p.buy_price.toFixed(2)}</td>
                          <td style={tdStyle}>${p.sell_price.toFixed(2)}</td>
                          <td style={tdStyle}>1/1</td>
                          <td style={tdStyle}>${p.sell_price.toFixed(2)}</td>
                          <td style={tdStyle}>{formatDateDMY(p.cash_date)}</td>
                          <td style={tdStyle}>{formatDateDMY(p.cash_date)}</td>
                          <td style={tdStyle}>{p.cash_method || "-"}</td>
                          <td style={tdStyle}>{p.cash_receipt_num || "-"}</td>
                          <td style={tdStyle}>
                            <div style={{ display: "flex", gap: 4, justifyContent: "center", alignItems: "center" }}>
                              {isPaid ? <span style={{ color: "#4CAF50", fontWeight: "bold" }}>✔</span> : <span style={{ color: "#f44336", fontWeight: "bold" }}>✖</span>}
                              <button
                                onClick={() => {
                                  confirmPassword().then((ok) => {
                                    if (ok) setEditModal(p);
                                  });
                                }}
                                style={{ background: "#FFC107", border: "none", borderRadius: 6, padding: "6px 10px", cursor: "pointer", fontSize: "0.75em" }}
                              >✏️</button>
                              <button
                                onClick={async () => {
                                  const ok = await confirmPassword();
                                  if (!ok) return;
                                  if (!window.confirm("هل تريد إلغاء هذه الدفعة النقدية؟")) return;
                                  const today = new Date().toISOString().split("T")[0];
                                  const updated = policies.map((pol) => {
                                    if (pol.id !== p.id) return pol;
                                    return { ...pol, buy_price: 0, sell_price: 0, profit: 0, cash_date: today, cash_method: "ملغى", cash_receipt_num: "", paid_company: true };
                                  });
                                  await saveData(updated);
                                }}
                                style={{ background: "#f44336", color: "white", border: "none", borderRadius: 6, padding: "3px 6px", cursor: "pointer", fontSize: "0.8em" }}
                              >🗑️</button>
                            </div>
                          </td>
                          <td style={tdStyle}>{p.broker_code || "-"}</td>
                        </tr>
                      );
                    }
                    return rows;
                  })}
                  {/* صف المجموع للشاشة */}
                  <tr className="clients-total-row normal-total-row" style={{ background: "#fff3cd", fontWeight: "bold" }}>
                    <td colSpan={4}>المجموع</td>
                    <td className="total-buy-cell">${totalBuy.toFixed(2)}</td>
                    <td className="total-sell-cell">${totalSell.toFixed(2)}</td>
                    <td></td>
                    <td className="total-installments">${totalInstallments.toFixed(2)}</td>
                    <td colSpan={6}></td>
                  </tr>
                  {/* صف المجموع للطباعة */}
                  <tr className="print-only-total-row" style={{ background: "#fff3cd", fontWeight: "bold", display: "none" }}>
                    <td colSpan={4}>المجموع</td>
                    <td></td>
                    <td className="total-installments">${totalInstallments.toFixed(2)}</td>
                    <td colSpan={5}></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}
        {displayed.length === 0 && !message && (
          <div style={{ color: "rgba(255,255,255,0.7)", textAlign: "center", marginTop: 30, fontSize: "1.1em" }}>
            {isFiltered ? "🔍 لا توجد نتائج لهذا البحث" : "📭 لا يوجد بوالص بعد"}
          </div>
        )}
      </div>
      {/* ===================== ADD POLICY DIALOG ===================== */}
      {showDialog && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 1000, padding: 20, overflowY: "auto" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowDialog(false); }}>
          <div dir="rtl" style={{ background: "white", borderRadius: 20, padding: 28, width: "100%", maxWidth: 500, boxShadow: "0 20px 60px rgba(0,0,0,0.3)", margin: "20px auto" }}>
            <h2 style={{ textAlign: "center", marginBottom: 20, color: "#333", fontSize: "1.2em" }}>➕ إضافة بوليصة جديدة</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <div>
                <label style={labelStyle}>رقم البوليصة *</label>
                <input type="text" value={form.policy_num} onChange={(e) => { const value = e.target.value; setForm({ ...form, policy_num: value }); if (!isCompaniesPage) autofillFromCompanyPolicy(value); }} placeholder="POL-001" style={fieldStyle} />
              </div>
              <div>
                <label style={labelStyle}>نوع البوليصة</label>
                {policyTypes.length > 0 ? (
                  <select value={form.policy_type} onChange={(e) => setForm({ ...form, policy_type: e.target.value })} style={{ ...fieldStyle, background: "white" }}>
                    <option value="">— اختر النوع —</option>
                    {policyTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                ) : (
                  <div style={{ color: "#aaa", fontSize: 12 }}>أضف أنواع من زر الإدارة</div>
                )}
              </div>
              <div style={{ position: "relative" }}>
                <label style={labelStyle}>اسم العميل *</label>
                <input type="text" value={clientSearch || form.client_name} onChange={(e) => { setClientSearch(e.target.value); setForm({ ...form, client_name: e.target.value }); }} placeholder="اكتب اسم العميل..." style={fieldStyle} />
                {clientSearch && filteredClients.length > 0 && (
                  <div style={{ position: "absolute", top: "100%", right: 0, left: 0, background: "white", border: "1px solid #ddd", borderRadius: 8, maxHeight: 150, overflowY: "auto", zIndex: 1000 }}>
                    {filteredClients.map((name) => (
                      <div key={name} onClick={() => { setForm({ ...form, client_name: name }); setClientSearch(""); }} style={{ padding: 10, cursor: "pointer", borderBottom: "1px solid #eee" }}>{name}</div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label style={labelStyle}>🏦 شركة التأمين</label>
                {companyList.length > 0 ? (
                  <select value={form.insurance_company} onChange={(e) => setForm({ ...form, insurance_company: e.target.value })} style={{ ...fieldStyle, background: "white" }}>
                    <option value="">— اختر الشركة —</option>
                    {companyList.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                ) : (
                  <div style={{ color: "#aaa", fontSize: 12 }}>ما في شركات بعد</div>
                )}
              </div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>👔 Broker</label>
              {brokers.length > 0 ? (
                <select value={form.broker_code} onChange={(e) => setForm({ ...form, broker_code: e.target.value })} style={{ ...fieldStyle, background: "white" }}>
                  <option value="">— اختر الوسيط —</option>
                  {brokers.map((b) => <option key={b.code} value={b.code}>{b.name} — {b.code}</option>)}
                </select>
              ) : (
                <div style={{ color: "#aaa", fontSize: 12 }}>أضف الوسطاء من زر الإدارة</div>
              )}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              <div>
                <label style={labelStyle}>سعر الشراء ($)</label>
                <input type="number" value={form.buy_price} onChange={(e) => setForm({ ...form, buy_price: e.target.value })} placeholder="0.00" style={fieldStyle} />
              </div>
              <div>
                <label style={labelStyle}>سعر البيع ($)</label>
                <input type="number" value={form.sell_price} onChange={(e) => setForm({ ...form, sell_price: e.target.value })} placeholder="0.00" style={fieldStyle} />
              </div>
            </div>
            {form.buy_price && form.sell_price && (
              <div style={{ background: "#f0f9f0", borderRadius: 8, padding: "8px 12px", marginBottom: 14, textAlign: "center", fontWeight: "bold", color: "#4CAF50", fontSize: "0.9em" }}>
                الربح المتوقع: ${(parseFloat(form.sell_price || "0") - parseFloat(form.buy_price || "0")).toFixed(2)}
              </div>
            )}
            <div style={{ marginBottom: 14 }}>
              <label style={{ ...labelStyle, fontSize: "0.95em", color: "#333" }}>💳 طريقة دفع العميل</label>
              <div style={{ display: "flex", gap: 8 }}>
                {(["cash", "installment"] as const).map((t) => (
                  <button key={t} type="button" onClick={() => setForm((prev) => ({ ...prev, client_payment_type: t }))} style={{ flex: 1, padding: "10px", border: "none", borderRadius: 10, fontSize: 14, fontWeight: "bold", cursor: "pointer", fontFamily: "inherit", background: form.client_payment_type === t ? (t === "cash" ? "#4CAF50" : "#2196F3") : "#f0f0f0", color: form.client_payment_type === t ? "white" : "#555" }}>
                    {t === "cash" ? "💵 نقدي" : "📅 تقسيط"}
                  </button>
                ))}
              </div>
            </div>
            {form.client_payment_type === "cash" && (
              <div style={{ background: "#f8fffe", border: "1px solid #c8e6c9", borderRadius: 12, padding: 14, marginBottom: 14 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                  <div>
                    <label style={labelStyle}>📅 تاريخ الدفع</label>
                    <DatePicker
                      selected={form.cash_date ? new Date(form.cash_date + "T00:00:00") : null}
                      onChange={(date: Date | null) => {
                        if (date) {
                          const y = date.getFullYear();
                          const m = String(date.getMonth() + 1).padStart(2, "0");
                          const d = String(date.getDate()).padStart(2, "0");
                          setForm({ ...form, cash_date: `${y}-${m}-${d}` });
                        }
                      }}
                      dateFormat="dd-MM-yyyy"
                      customInput={<input style={{ ...fieldStyle, padding: "11px 16px", fontSize: 14 }} />}
                      placeholderText="dd-mm-yyyy"
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>🏦 طريقة الدفع</label>
                    <input type="text" value={form.cash_method} onChange={(e) => setForm({ ...form, cash_method: e.target.value })} placeholder="مثال: كاش، شيك، حوالة..." style={fieldStyle} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>🧾 رقم الواصل</label>
                  <input type="text" value={form.cash_receipt_num} onChange={(e) => setForm({ ...form, cash_receipt_num: e.target.value })} placeholder="رقم الواصل أو الإيصال" style={fieldStyle} />
                </div>
              </div>
            )}
            {form.client_payment_type === "installment" && (
              <div style={{ background: "#f8f9ff", border: "1px solid #bbdefb", borderRadius: 12, padding: 14, marginBottom: 14 }}>
                <div style={{ marginBottom: 12 }}>
                  <label style={labelStyle}>عدد الأقساط</label>
                  <input type="number" min="1" max="60" value={form.installments_count} onChange={(e) => updateInstallmentsCount(e.target.value)} style={{ ...fieldStyle, width: "120px" }} />
                </div>
                <div style={{ maxHeight: 280, overflowY: "auto" }}>
                  {formInstallments.map((ins, i) => (
                    <div key={i} style={{ marginBottom: 10, background: "white", borderRadius: 10, padding: "10px 12px", border: "1px solid #e0e0e0" }}>
                      <div style={{ fontWeight: "bold", color: "#2196F3", fontSize: "0.83em", marginBottom: 6 }}>قسط {i + 1}</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
                        <DatePicker
                          selected={ins.date ? new Date(ins.date) : null}
                          onChange={(date: Date | null) => {
                            if (date) {
                              const y = date.getFullYear();
                              const m = String(date.getMonth() + 1).padStart(2, "0");
                              const d = String(date.getDate()).padStart(2, "0");
                              const next = [...formInstallments];
                              next[i] = { ...next[i], date: `${y}-${m}-${d}` };
                              setFormInstallments(next);
                            }
                          }}
                          dateFormat="dd-MM-yyyy"
                          placeholderText="dd-mm-yyyy"
                          customInput={<input style={{ ...fieldStyle, padding: "7px 8px", fontSize: 11 }} />}
                        />
                        <input type="number" value={ins.amount || ""} onChange={(e) => { const next = [...formInstallments]; next[i] = { ...next[i], amount: e.target.value }; setFormInstallments(next); }} placeholder="المبلغ $" style={{ ...fieldStyle, padding: "7px 8px", fontSize: 11 }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button onClick={addPolicy} style={{ padding: "13px", background: "linear-gradient(45deg,#4CAF50,#45a049)", color: "white", border: "none", borderRadius: 12, fontSize: 15, fontWeight: "bold", cursor: "pointer" }}>✅ حفظ</button>
              <button onClick={() => setShowDialog(false)} style={{ padding: "13px", background: "linear-gradient(45deg,#607D8B,#455A64)", color: "white", border: "none", borderRadius: 12, fontSize: 15, fontWeight: "bold", cursor: "pointer" }}>❌ إلغاء</button>
            </div>
          </div>
        </div>
      )}
      {/* ===================== EDIT MODAL ===================== */}
      {editModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3000 }}
          onClick={(e) => { if (e.target === e.currentTarget) setEditModal(null); }}>
          <div dir="rtl" style={{ background: "white", borderRadius: 15, padding: 20, width: "100%", maxWidth: 420, maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={{ textAlign: "center", marginBottom: 15 }}>✏️ تعديل البوليصة</h3>
            <label style={labelStyle}>👤 اسم العميل</label>
            <input type="text" value={editModal.client_name} onChange={(e) => setEditModal({ ...editModal, client_name: e.target.value })} style={inputStyle} />
            <label style={labelStyle}>📄 رقم البوليصة</label>
            <input type="text" value={editModal.policy_num} onChange={(e) => setEditModal({ ...editModal, policy_num: e.target.value })} style={inputStyle} />
            <label style={labelStyle}>📋 نوع البوليصة</label>
            <input type="text" value={editModal.policy_type || ""} onChange={(e) => setEditModal({ ...editModal, policy_type: e.target.value })} style={inputStyle} />
            <label style={labelStyle}>🏦 شركة التأمين</label>
            <input type="text" value={editModal.insurance_company || ""} onChange={(e) => setEditModal({ ...editModal, insurance_company: e.target.value })} style={inputStyle} />
            <label style={labelStyle}>👔 Broker</label>
            <select value={editModal.broker_code || ""} onChange={(e) => { const b = brokers.find((b) => b.code === e.target.value); setEditModal({ ...editModal, broker_code: b?.code || "", broker_name: b?.name || "" }); }} style={inputStyle}>
              <option value="">— اختر الوسيط —</option>
              {brokers.map((b) => <option key={b.code} value={b.code}>{b.name} — {b.code}</option>)}
            </select>
            <label style={labelStyle}>💰 سعر الشراء</label>
            <input type="number" value={editModal.buy_price} onChange={(e) => setEditModal({ ...editModal, buy_price: parseFloat(e.target.value) || 0, profit: editModal.sell_price - (parseFloat(e.target.value) || 0) })} style={inputStyle} />
            <label style={labelStyle}>💵 سعر البيع</label>
            <input type="number" value={editModal.sell_price} onChange={(e) => setEditModal({ ...editModal, sell_price: parseFloat(e.target.value) || 0, profit: (parseFloat(e.target.value) || 0) - editModal.buy_price })} style={inputStyle} />
            <div style={{ margin: "10px 0", padding: 10, background: "#f0f9f0", borderRadius: 8, textAlign: "center", fontWeight: "bold", color: "#4CAF50" }}>
              الربح: ${(editModal.profit || 0).toFixed(2)}
            </div>
            {editModal.installments && editModal.installments.length > 0 && (
              <div style={{ marginTop: 15, padding: 10, background: "#f8f9ff", borderRadius: 10, border: "1px solid #ddd" }}>
                <div style={{ fontWeight: "bold", marginBottom: 8 }}>📅 تعديل الأقساط</div>
                <div style={{ maxHeight: 200, overflowY: "auto" }}>
                  {editModal.installments.map((ins, i) => (
                    <div key={i} style={{ marginBottom: 8, padding: 8, background: "white", borderRadius: 8, border: "1px solid #eee" }}>
                      <div style={{ fontSize: "0.8em", marginBottom: 5 }}>قسط {ins.index}</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                        <input type="date" value={ins.payment_date || ""} onChange={(e) => {
                          const updated = [...(editModal.installments || [])];
                          updated[i] = { ...updated[i], payment_date: e.target.value };
                          setEditModal({ ...editModal, installments: updated });
                        }} />
                        <input type="number" value={ins.amount || ""} onChange={(e) => {
                          const updated = [...(editModal.installments || [])];
                          updated[i] = { ...updated[i], amount: e.target.value };
                          setEditModal({ ...editModal, installments: updated });
                        }} placeholder="المبلغ" />
                        <input type="text" value={ins.method || ""} onChange={(e) => {
                          const updated = [...(editModal.installments || [])];
                          updated[i] = { ...updated[i], method: e.target.value };
                          setEditModal({ ...editModal, installments: updated });
                        }} placeholder="طريقة الدفع" />
                        <input type="text" value={ins.receipt_num || ""} onChange={(e) => {
                          const updated = [...(editModal.installments || [])];
                          updated[i] = { ...updated[i], receipt_num: e.target.value };
                          setEditModal({ ...editModal, installments: updated });
                        }} placeholder="رقم الواصل" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div style={{ display: "flex", gap: 10, marginTop: 15 }}>
              <button onClick={async () => {
                const updated = policies.map((p) => p.id === editModal.id ? editModal : p);
                await saveData(updated);
                const trimmedClientName = editModal.client_name.trim();
                if (trimmedClientName && !allClientNames.includes(trimmedClientName)) {
                  await saveClientNames([...allClientNames, trimmedClientName]);
                }
                setEditModal(null);
                showMessage("✅ تم حفظ التعديلات", "success");
              }} style={{ flex: 1, padding: 10, background: "#4CAF50", color: "white", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: "bold" }}>💾 حفظ</button>
              <button onClick={() => setEditModal(null)} style={{ flex: 1, padding: 10, background: "#777", color: "white", border: "none", borderRadius: 10, cursor: "pointer" }}>❌ إلغاء</button>
            </div>
          </div>
        </div>
      )}
      {/* ===================== PAYMENT MODAL ===================== */}
      {paymentModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1001, padding: 20, overflowY: "auto" }}
          onClick={(e) => { if (e.target === e.currentTarget) setPaymentModal(null); }}>
          <div dir="rtl" style={{ background: "white", borderRadius: 20, padding: 28, width: "100%", maxWidth: 480, boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }}>
            <h2 style={{ textAlign: "center", marginBottom: 5, color: "#333", fontSize: "1.15em" }}>📅 أقساط — {paymentModal.client_name}</h2>
            <p style={{ textAlign: "center", color: "#888", fontSize: "0.88em", marginBottom: 18 }}>
              {paymentModal.installments_count} أقساط | مدفوع {(paymentModal.installments || []).filter((i) => i.paid).length} | باقي {remainingInstallments(paymentModal)}
            </p>
            {(() => {
              const insts = paymentModal.installments || [];
              const paidInsts = insts.filter((i) => i.paid);
              const totalPaid = paidInsts.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
              const totalAll = insts.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
              const remaining = remainingInstallments(paymentModal);
              return (
                <div style={{ background: "#f5f5f5", borderRadius: 10, padding: "10px 14px", marginBottom: 16, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", fontSize: "0.82em", fontWeight: "bold" }}>
                  <span style={{ color: "#4CAF50" }}>✅ مدفوع: {paidInsts.length} قسط</span>
                  <span style={{ color: "#f44336" }}>⏳ باقي: {remaining} قسط</span>
                  {totalPaid > 0 && <span style={{ color: "#2196F3" }}>💰 مجموع المدفوع: ${totalPaid.toFixed(2)}</span>}
                  {totalAll > 0 && totalAll !== totalPaid && <span style={{ color: "#9C27B0" }}>📊 مجموع الكل: ${totalAll.toFixed(2)}</span>}
                </div>
              );
            })()}
            <div style={{ maxHeight: 380, overflowY: "auto" }}>
              {(paymentModal.installments || []).map((ins) => (
                <div key={ins.index} style={{ marginBottom: 10, background: ins.paid ? "#f0fff0" : "#fff8f8", borderRadius: 12, border: `1px solid ${ins.paid ? "#c8e6c9" : "#ffcdd2"}`, padding: "10px 12px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontWeight: "bold", color: "#2196F3", fontSize: "0.88em" }}>قسط {ins.index}</span>
                    <button onClick={() => toggleInstallment(paymentModal.id, ins.index)} style={{ padding: "5px 14px", border: "none", borderRadius: 8, cursor: "pointer", fontSize: "0.8em", fontWeight: "bold", fontFamily: "inherit", background: ins.paid ? "#FF9800" : "#4CAF50", color: "white" }}>
                      {ins.paid ? "↩ إلغاء" : "✅ مدفوع"}
                    </button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6 }}>
                    <div>
                      <div style={{ fontSize: "0.7em", color: "#888", marginBottom: 3 }}>📅 التاريخ</div>
                      <input type="date" value={ins.payment_date || ""} onChange={(e) => updateInstallmentField(paymentModal.id, ins.index, "payment_date", e.target.value)} style={{ width: "100%", padding: "6px", border: "1px solid #ddd", borderRadius: 7, fontSize: 11, boxSizing: "border-box" }} />
                    </div>
                    <div>
                      <div style={{ fontSize: "0.7em", color: "#888", marginBottom: 3 }}>🏦 الطريقة</div>
                      <input type="text" value={ins.method || ""} onChange={(e) => updateInstallmentField(paymentModal.id, ins.index, "method", e.target.value)} placeholder="كاش، شيك..." style={{ width: "100%", padding: "6px", border: "1px solid #ddd", borderRadius: 7, fontSize: 11, boxSizing: "border-box" }} />
                    </div>
                    <div>
                      <div style={{ fontSize: "0.7em", color: "#888", marginBottom: 3 }}>🧾 رقم الواصل</div>
                      <input type="text" value={ins.receipt_num || ""} onChange={(e) => updateInstallmentField(paymentModal.id, ins.index, "receipt_num", e.target.value)} placeholder="رقم الواصل" style={{ width: "100%", padding: "6px", border: "1px solid #ddd", borderRadius: 7, fontSize: 11, boxSizing: "border-box" }} />
                    </div>
                    <div>
                      <div style={{ fontSize: "0.7em", color: "#888", marginBottom: 3 }}>💵 المبلغ</div>
                      <input type="number" value={ins.amount || ""} onChange={(e) => updateInstallmentField(paymentModal.id, ins.index, "amount", e.target.value)} placeholder="0.00" style={{ width: "100%", padding: "6px", border: "1px solid #ddd", borderRadius: 7, fontSize: 11, boxSizing: "border-box" }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setPaymentModal(null)} style={{ width: "100%", marginTop: 16, padding: "12px", background: "linear-gradient(45deg,#607D8B,#455A64)", color: "white", border: "none", borderRadius: 12, fontSize: 15, fontWeight: "bold", cursor: "pointer" }}>إغلاق</button>
          </div>
        </div>
      )}
      {/* ===================== COMPANY MANAGER ===================== */}
      {showCompanyManager && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1002, padding: 20 }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowCompanyManager(false); }}>
          <div dir="rtl" style={{ background: "white", borderRadius: 20, padding: 28, width: "100%", maxWidth: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }}>
            <h2 style={{ textAlign: "center", marginBottom: 18, color: "#0f3460", fontSize: "1.1em" }}>🏦 إدارة شركات التأمين</h2>
            <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
              <input type="text" value={newCompanyName} onChange={(e) => setNewCompanyName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addCompanyToList()} placeholder="اسم الشركة الجديدة..." style={{ flex: 1, padding: "10px 14px", border: "2px solid #e0e0e0", borderRadius: 10, fontSize: 14, direction: "rtl", outline: "none", fontFamily: "inherit" }} />
              <button onClick={addCompanyToList} style={{ padding: "10px 18px", background: "linear-gradient(45deg,#0288D1,#0f3460)", color: "white", border: "none", borderRadius: 10, fontSize: 14, fontWeight: "bold", cursor: "pointer", fontFamily: "inherit" }}>➕</button>
            </div>
            <div style={{ maxHeight: 300, overflowY: "auto" }}>
              {companyList.length === 0 ? (
                <div style={{ textAlign: "center", color: "#bbb", padding: 20 }}>لا توجد شركات بعد</div>
              ) : (
                companyList.map((name) => (
                  <div key={name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", marginBottom: 7, background: "#f0f7ff", borderRadius: 10, border: "1px solid #bbdefb" }}>
                    <span style={{ fontWeight: "bold", color: "#0f3460", fontSize: "0.93em" }}>🏦 {name}</span>
                    <button onClick={() => deleteCompanyFromList(name)} style={{ background: "#FFEBEE", color: "#C62828", border: "none", borderRadius: 7, padding: "4px 10px", cursor: "pointer", fontSize: 13 }}>🗑️</button>
                  </div>
                ))
              )}
            </div>
            <button onClick={() => setShowCompanyManager(false)} style={{ width: "100%", marginTop: 16, padding: "12px", background: "linear-gradient(45deg,#607D8B,#455A64)", color: "white", border: "none", borderRadius: 12, fontSize: 15, fontWeight: "bold", cursor: "pointer" }}>إغلاق</button>
          </div>
        </div>
      )}
      {/* ===================== POLICY TYPE MANAGER ===================== */}
      {showPolicyTypeManager && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, padding: 20 }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowPolicyTypeManager(false); }}>
          <div dir="rtl" style={{ background: "white", borderRadius: 20, padding: 28, width: "100%", maxWidth: 420 }}>
            <h2 style={{ textAlign: "center", marginBottom: 18 }}>📋 إدارة أنواع البوالص</h2>
            <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
              <input type="text" value={newPolicyType} onChange={(e) => setNewPolicyType(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addPolicyType()} placeholder="نوع البوليصة..." style={{ flex: 1, padding: "10px 14px", border: "2px solid #e0e0e0", borderRadius: 10, fontSize: 14, direction: "rtl", outline: "none", fontFamily: "inherit" }} />
              <button onClick={addPolicyType} style={{ padding: "10px 18px", background: "linear-gradient(45deg,#8E24AA,#6A1B9A)", color: "white", border: "none", borderRadius: 10, fontSize: 14, fontWeight: "bold", cursor: "pointer" }}>➕</button>
            </div>
            <div style={{ maxHeight: 300, overflowY: "auto" }}>
              {policyTypes.map((t) => (
                <div key={t} style={{ display: "flex", justifyContent: "space-between", padding: 10, marginBottom: 6, background: "#f3e5f5", borderRadius: 10 }}>
                  <span>{t}</span>
                  <button onClick={() => deletePolicyType(t)} style={{ background: "#FFEBEE", color: "#C62828", border: "none", borderRadius: 7, padding: "4px 10px", cursor: "pointer" }}>🗑️</button>
                </div>
              ))}
            </div>
            <button onClick={() => setShowPolicyTypeManager(false)} style={{ width: "100%", marginTop: 15, padding: "12px", background: "linear-gradient(45deg,#607D8B,#455A64)", color: "white", border: "none", borderRadius: 12, fontSize: 15, fontWeight: "bold", cursor: "pointer" }}>إغلاق</button>
          </div>
        </div>
      )}
      {/* ===================== BROKER MANAGER ===================== */}
      {showBrokerManager && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, padding: 20 }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowBrokerManager(false); }}>
          <div dir="rtl" style={{ background: "white", borderRadius: 20, padding: 28, width: "100%", maxWidth: 450 }}>
            <h2 style={{ textAlign: "center", marginBottom: 18 }}>👔 إدارة الوسطاء</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, marginBottom: 18 }}>
              <input type="text" value={newBrokerName} onChange={(e) => setNewBrokerName(e.target.value)} placeholder="اسم الوسيط..." style={{ padding: "10px 14px", border: "2px solid #e0e0e0", borderRadius: 10, fontSize: 14, direction: "rtl", outline: "none", fontFamily: "inherit" }} />
              <input type="text" value={newBrokerCode} onChange={(e) => setNewBrokerCode(e.target.value)} placeholder="الكود..." style={{ padding: "10px 14px", border: "2px solid #e0e0e0", borderRadius: 10, fontSize: 14, direction: "rtl", outline: "none", fontFamily: "inherit" }} />
              <button onClick={addBroker} style={{ padding: "10px 14px", background: "linear-gradient(45deg,#FB8C00,#EF6C00)", color: "white", border: "none", borderRadius: 10, fontSize: 14, fontWeight: "bold", cursor: "pointer" }}>➕</button>
            </div>
            <div style={{ maxHeight: 400, overflowY: "auto" }}>
              {brokers.length === 0 ? (
                <div style={{ textAlign: "center", color: "#bbb", padding: 20 }}>لا يوجد وسطاء بعد</div>
              ) : (
                brokers.map((b) => (
                  <div key={b.code} style={{ display: "flex", justifyContent: "space-between", padding: 10, marginBottom: 6, background: "#FFF3E0", borderRadius: 10 }}>
                    <span>{b.name} — {b.code}</span>
                    <button onClick={() => deleteBroker(b.code)} style={{ background: "#FFEBEE", color: "#C62828", border: "none", borderRadius: 7, padding: "4px 10px", cursor: "pointer" }}>🗑️</button>
                  </div>
                ))
              )}
            </div>
            <button onClick={() => setShowBrokerManager(false)} style={{ width: "100%", marginTop: 15, padding: "12px", background: "linear-gradient(45deg,#607D8B,#455A64)", color: "white", border: "none", borderRadius: 12, fontSize: 15, fontWeight: "bold", cursor: "pointer" }}>إغلاق</button>
          </div>
        </div>
      )}
      {/* ===================== PRINT STYLES ===================== */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #print-table, #print-table * { visibility: visible !important; }
          #print-table {
            position: fixed;
            inset: 0;
            width: 100%;
            padding: 7px;
            background: white;
            direction: rtl;
            font-family: system-ui, sans-serif;
          }
          #print-table table {
            width: auto;
            margin: 0 auto;
            border-collapse: collapse;
            font-size: 12px;
            transform: scale(0.80);
            transform-origin: right;
          }
          #print-table th {
            background: #2196F3 !important;
            color: white !important;
            padding: 8px 6px;
            font-weight: bold;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          #print-table td {
            padding: 7px 6px;
            border-bottom: 1px solid #ddd;
            text-align: center;
          }
          #print-table tr:nth-child(even) td {
            background: #f9f9f9;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          #print-table .no-print { display: none !important; }
          #print-title { display: none !important; }
          #print-summary {
            display: block !important;
            font-size: 14px;
            text-align: center;
            margin-bottom: 15px;
            color: #333;
            font-weight: bold;
            background: #f0f0f0;
            padding: 8px;
            border-radius: 8px;
            border: 1px solid #ddd;
          }
          #print-summary .print-meta-line { margin: 5px 0; color: #444; }
          .clients-print th:nth-child(5),
          .clients-print th:nth-child(6),
          .clients-print td:nth-child(5),
          .clients-print td:nth-child(6) { display: none !important; }
          .clients-print .normal-total-row { display: none !important; }
          .clients-print .print-only-total-row { display: table-row !important; }
          .clients-print .total-installments { display: table-cell !important; font-weight: bold; }
          #print-table th:nth-child(14),
          #print-table td:nth-child(14) { display: none !important; }
        }
      `}</style>
    </div>
  );
}
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 15px",
  margin: "8px 0",
  border: "none",
  borderRadius: 12,
  fontSize: 14,
  background: "rgba(255,255,255,0.9)",
  boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
  direction: "rtl",
  boxSizing: "border-box",
};
const tdStyle: React.CSSProperties = {
  padding: "10px 7px",
  borderBottom: "1px solid #eee",
  textAlign: "center",
  fontSize: "0.85em",
};
function Btn({ onClick, children, color }: { onClick: () => void; children: React.ReactNode; color: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ width: "100%", padding: "14px", margin: "5px 0", background: color, color: "white", border: "none", borderRadius: 15, fontSize: 15, fontWeight: "bold", cursor: "pointer", transition: "all 0.3s", transform: hovered ? "translateY(-2px)" : "none", boxShadow: hovered ? "0 8px 25px rgba(0,0,0,0.3)" : "none" }}
    >
      {children}
    </button>
  );
}
