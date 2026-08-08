export type Role = "USER" | "ADMIN";

export type PublicUser = {
  id: number;
  username: string;
  role: Role;
  createdAt: string;
};

export type StoredUser = PublicUser & {
  passwordHash: string;
};

export type AuthResponse = {
  data: PublicUser;
};

export type RegisterRequest = {
  username?: unknown;
  password?: unknown;
};

export type LoginRequest = {
  username?: unknown;
  password?: unknown;
};
