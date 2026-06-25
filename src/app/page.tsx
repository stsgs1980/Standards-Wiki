import { redirect } from 'next/navigation';
import { getAllPageIds } from '@/lib/mdx-utils';

export default function HomePage() {
  const allIds = getAllPageIds();
  const firstPage = allIds[0];
  if (!firstPage) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-foreground text-[16px] mb-4">No documentation pages found.</p>
          <a href="/docs/new/" className="text-[14px] text-[oklch(0.45_0.15_250)] hover:underline">Create the first page</a>
        </div>
      </div>
    );
  }
  redirect(`/docs/${firstPage}/`);
}
