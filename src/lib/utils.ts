export function calculateAge(birthDateStr?: string | null): number | null {
  if (!birthDateStr) return null;
  const birthDate = new Date(birthDateStr);
  if (isNaN(birthDate.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
}

export function formatDateBE(birthDateStr?: string | null): string | null {
  if (!birthDateStr) return null;
  const date = new Date(birthDateStr);
  if (isNaN(date.getTime())) return null;

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const yearBE = date.getFullYear() + 543;
  return `${day}/${month}/${yearBE}`;
}
