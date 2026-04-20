import ProtectedRoute from "@/components/auth/ProtectedRoute";
import ProfileDetails from "@/components/profile/ProfileDetails";
import ProfileNavigation from "@/components/profile/ProfileNavigation";

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Profil používateľa</h1>
          <p className="mt-2 text-slate-600">
            Prehľad údajov používateľa a jeho aktivity v systéme.
          </p>
        </div>

        <ProfileNavigation />
        <ProfileDetails />

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold">Aktivita používateľa</h2>
          <p className="mt-2 text-sm text-slate-600">
            V tejto časti budú neskôr zobrazené príspevky vo fóre, recenzie a ďalšia aktivita používateľa.
          </p>
        </div>
      </div>
    </ProtectedRoute>
  );
}