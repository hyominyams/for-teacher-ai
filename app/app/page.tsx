import { redirect } from "next/navigation";
import DashboardHome from "@/components/dashboard/DashboardHome";
import { isWorkCategory } from "@/lib/work-logs";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

// 예전 한 페이지 주소(/app?category=…, /app?log=…)를 영역별 작업 화면으로 넘긴다.
export default async function AppHome({ searchParams }: { searchParams: SearchParams }) {
    const { category, log } = await searchParams;
    const legacyCategory = typeof category === "string" && isWorkCategory(category) ? category : null;
    if (typeof log === "string" && log) redirect(`/app/workspace/${legacyCategory ?? "behavior"}?log=${encodeURIComponent(log)}`);
    if (legacyCategory) redirect(`/app/workspace/${legacyCategory}`);
    return <DashboardHome />;
}
