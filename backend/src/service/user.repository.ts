import { Provide } from "@midwayjs/core";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { PasswordService } from "./password.service";
import { Role, StoredUser } from "../types/auth";

type StoreFile = {
  nextUserId: number;
  users: StoredUser[];
};

const DEFAULT_ADMIN_USERNAME = "admin";
const DEFAULT_ADMIN_PASSWORD = "Admin12345";

@Provide()
export class UserRepository {
  private readonly storePath: string;
  private readonly passwordService: PasswordService;
  private store?: StoreFile;

  constructor(storePath?: string, passwordService = new PasswordService()) {
    this.storePath =
      storePath ??
      process.env.AUTH_STORE_PATH ??
      join(process.cwd(), "data", "auth-store.json");
    this.passwordService = passwordService;
  }

  findByUsername(username: string): StoredUser | undefined {
    return this.readStore().users.find(
      (user) => user.username.toLowerCase() === username.toLowerCase(),
    );
  }

  findById(id: number): StoredUser | undefined {
    return this.readStore().users.find((user) => user.id === id);
  }

  createUser(username: string, password: string, role: Role): StoredUser {
    const store = this.readStore();
    const now = new Date().toISOString();
    const user: StoredUser = {
      id: store.nextUserId,
      username,
      role,
      createdAt: now,
      passwordHash: this.passwordService.hashPassword(password),
    };

    store.nextUserId += 1;
    store.users.push(user);
    this.writeStore(store);

    return user;
  }

  private readStore(): StoreFile {
    if (this.store) {
      return this.store;
    }

    try {
      const parsed = JSON.parse(readFileSync(this.storePath, "utf8")) as
        StoreFile | undefined;
      this.store = this.ensureAdmin(parsed);
    } catch {
      this.store = this.ensureAdmin({ nextUserId: 1, users: [] });
    }

    this.writeStore(this.store);
    return this.store;
  }

  private ensureAdmin(store?: StoreFile): StoreFile {
    const safeStore = {
      nextUserId: store?.nextUserId ?? 1,
      users: Array.isArray(store?.users) ? store.users : [],
    };

    if (!safeStore.users.some((user) => user.role === "ADMIN")) {
      safeStore.users.push({
        id: safeStore.nextUserId,
        username: DEFAULT_ADMIN_USERNAME,
        role: "ADMIN",
        createdAt: new Date().toISOString(),
        passwordHash: this.passwordService.hashPassword(DEFAULT_ADMIN_PASSWORD),
      });
      safeStore.nextUserId += 1;
    }

    return safeStore;
  }

  private writeStore(store: StoreFile): void {
    mkdirSync(dirname(this.storePath), { recursive: true });
    writeFileSync(this.storePath, JSON.stringify(store, null, 2));
  }
}
