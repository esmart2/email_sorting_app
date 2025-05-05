import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

interface EmailDashboardProps {
  selectedCategory: string | null;
}

export default function EmailDashboard({ selectedCategory }: EmailDashboardProps) {
  return (
    <div className="flex flex-1 flex-col bg-white">
      <header className="flex justify-end items-center h-16 px-8 border-b bg-white">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input type="search" placeholder="Search emails..." className="pl-10 pr-4 py-2 w-56 rounded-lg border border-gray-300 bg-gray-50 focus:ring-2 focus:ring-blue-200" />
          </div>
          <Button className="ml-2 px-5 py-2 rounded-lg bg-black text-white font-semibold border-2 border-black hover:bg-gray-900">Refresh</Button>
        </div>
      </header>
      <main className="flex-1 flex flex-row gap-8 p-8">
        <div className="flex-1 flex flex-col gap-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-gray-200 bg-gray-50 p-4 h-24 flex flex-col justify-center shadow-sm">
                <div className="h-4 w-2/3 rounded bg-gray-200 mb-2"></div>
                <div className="h-3 w-full rounded bg-gray-100 mb-1"></div>
                <div className="h-3 w-4/5 rounded bg-gray-100"></div>
              </div>
            ))}
          </div>
        </div>
        <div className="w-80">
          <div className="rounded-xl border border-gray-200 bg-white shadow-md p-6">
            <h2 className="text-xl font-bold mb-2">Welcome to EmailSort</h2>
            <p className="text-gray-500 mb-3">This is your email sorting dashboard. To get started:</p>
            <ol className="list-decimal pl-5 space-y-1 text-gray-700">
              <li>Connect your email accounts</li>
              <li>Create categories for sorting</li>
              <li>View your categorized emails</li>
            </ol>
          </div>
        </div>
      </main>
    </div>
  )
}
