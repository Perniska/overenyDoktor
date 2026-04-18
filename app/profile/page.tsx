import ProtectedRoute from "@/components/auth/ProtectedRoute";

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Profil používateľa</h1>
        <p className="text-slate-600">
          Táto stránka bude slúžiť na správu profilu a používateľských údajov.
        </p>
      </div>
    </ProtectedRoute>
  );
}