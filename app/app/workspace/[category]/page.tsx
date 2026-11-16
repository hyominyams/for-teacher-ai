import { notFound } from "next/navigation";
import RecordWorkspace from "@/components/workspace/RecordWorkspace";
import { isWorkCategory } from "@/lib/work-logs";

export default async function WorkspacePage({ params }: { params: Promise<{ category: string }> }) {
    const { category } = await params;
    if (!isWorkCategory(category)) notFound();
    return <RecordWorkspace key={category} category={category} />;
}
