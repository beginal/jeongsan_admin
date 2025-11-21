import { redirect } from "next/navigation";

interface LoanDetailPageProps {
  params: Promise<{ loanId: string }>;
}

export default async function LoanDetailRedirectPage({ params }: LoanDetailPageProps) {
  const { loanId } = await params;
  redirect(`/loan-management/${encodeURIComponent(loanId)}/edit`);
}
