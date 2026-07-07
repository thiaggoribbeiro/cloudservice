import type { UserRole } from "../types/domain";

export const ROLE_LABEL: Record<UserRole, string> = {
  admin: "Administrador",
  manager: "Gestor",
  user: "Usuario",
  guest: "Convidado",
};
