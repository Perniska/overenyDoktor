import ProtectedRoute from "@/components/auth/ProtectedRoute";

export default function MyReviewsPage() {
  return (
    <ProtectedRoute>
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Moje recenzie</h1>
        <p className="text-slate-600">
          Táto stránka bude obsahovať zoznam recenzií vytvorených prihláseným používateľom.
        </p>
      </div>
    </ProtectedRoute>
  );
}