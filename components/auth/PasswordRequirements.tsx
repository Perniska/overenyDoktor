type PasswordRequirementsProps = {
  password: string;
};

export function getPasswordChecks(password: string) {
  return {
    minLength: password.length >= 8,
    hasUppercase: /[A-ZÁČĎÉÍĽĹŇÓÔŔŠŤÚÝŽ]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: /[^A-Za-zÁČĎÉÍĽĹŇÓÔŔŠŤÚÝŽáčďéíľĺňóôŕšťúýž0-9]/.test(
      password
    ),
  };
}

export function isPasswordValid(password: string) {
  const checks = getPasswordChecks(password);

  return (
    checks.minLength &&
    checks.hasUppercase &&
    checks.hasNumber &&
    checks.hasSpecialChar
  );
}

export function PasswordRequirements({ password }: PasswordRequirementsProps) {
  const checks = getPasswordChecks(password);

  const requirements = [
    {
      label: "aspoň 8 znakov",
      isValid: checks.minLength,
    },
    {
      label: "aspoň jedno veľké písmeno",
      isValid: checks.hasUppercase,
    },
    {
      label: "aspoň jedno číslo",
      isValid: checks.hasNumber,
    },
    {
      label: "aspoň jeden špeciálny znak",
      isValid: checks.hasSpecialChar,
    },
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
      <p className="mb-2 font-medium text-slate-800">
        Heslo musí spĺňať:
      </p>

      <ul className="space-y-1">
        {requirements.map((requirement) => (
          <li
            key={requirement.label}
            className={
              requirement.isValid
                ? "font-medium text-emerald-700"
                : "text-slate-500"
            }
          >
            {requirement.isValid ? "✓" : "○"} {requirement.label}
          </li>
        ))}
      </ul>
    </div>
  );
}