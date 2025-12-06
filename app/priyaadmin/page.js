import { fetchDashboardStats } from "./actions";
import DashboardContent from "@/components/admin/DashboardContent";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const res = await fetchDashboardStats();
  const stats = res.success ? res.data : null;

  return <DashboardContent stats={stats} />;
}
