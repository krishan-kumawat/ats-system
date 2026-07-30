import { getSession } from "@/lib/auth";
import { UserRole } from "@/lib/enums";
import { fetchSetupUserDetailsAction } from "@/app/actions/setup-actions";
import UserSetupWorkspace from "./UserSetupWorkspace";
import Link from "next/link";
import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function UserSetupPage({ params }: PageProps) {
  const resolvedParams = await params;
  const userId = resolvedParams.id;

  const session = await getSession();
  if (!session || session.role !== UserRole.ADMIN) {
    redirect("/login");
  }

  try {
    const data = await fetchSetupUserDetailsAction(userId);
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 p-6 text-slate-800 dark:text-slate-200">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Link href="/" className="hover:text-indigo-600 transition-colors">
              Console Home
            </Link>
            <span>/</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">Setup</span>
            <span>/</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">Users</span>
            <span>/</span>
            <span>{data.user.email}</span>
          </div>

          <UserSetupWorkspace
            userId={userId}
            initialData={data}
          />
        </div>
      </div>
    );
  } catch (error: any) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950 p-6 text-slate-800 dark:text-slate-200">
        <div className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-950 p-6 rounded-lg max-w-md w-full shadow-md text-center">
          <i className="fa-solid fa-triangle-exclamation text-red-500 text-3xl mb-4" />
          <h2 className="text-lg font-bold text-red-600 dark:text-red-400 mb-2">Error Loading Setup Console</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{error.message || "Failed to load details"}</p>
          <Link href="/" className="px-4 py-2 bg-indigo-600 text-white rounded text-xs hover:bg-indigo-700 transition-colors font-medium">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }
}
