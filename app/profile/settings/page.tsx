import ProtectedRoute from "@/components/auth/ProtectedRoute";
import ProfileNavigation from "@/components/profile/ProfileNavigation";
import ProfileEditForm from "@/components/profile/ProfileEditForm";
import ChangePasswordForm from "@/components/profile/ChangePasswordForm";
import ChangeEmailForm from "@/components/profile/ChangeEmailForm";

export default function ProfileSettingsPage() {
  return (
    <ProtectedRoute>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Nastavenia profilu</h1>
          <p className="mt-2 text-slate-600">
            Správa používateľského mena, popisu, avatara, e-mailu a hesla.
          </p>
        </div>

        <ProfileNavigation />

        <ProfileEditForm />
        <ChangeEmailForm />
        <ChangePasswordForm />
      </div>
    </ProtectedRoute>
  );
}