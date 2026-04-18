import Link from "next/link";
import LoginForm from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Prihlásenie</h1>
      <LoginForm />

      <p className="text-sm text-slate-600">
        Nemáš účet?{" "}
        <Link href="/auth/register" className="font-medium text-sky-600 hover:underline">
          Zaregistruj sa
        </Link>
      </p>
    </div>
  );
}