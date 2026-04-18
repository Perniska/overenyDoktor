import Link from "next/link";
import RegisterForm from "@/components/auth/RegisterForm";

export default function RegisterPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Registrácia</h1>
      <RegisterForm />

      <p className="text-sm text-slate-600">
        Už máš účet?{" "}
        <Link href="/auth/login" className="font-medium text-sky-600 hover:underline">
          Prihlás sa
        </Link>
      </p>
    </div>
  );
}


