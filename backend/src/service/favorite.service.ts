import { Inject, Provide } from "@midwayjs/core";
import { PublicUser } from "../types/auth";
import {
  Favorite,
  FavoriteListResponse,
  FavoriteResponse,
} from "../types/football";
import { NotFoundError, ValidationError } from "../utils/http-errors";
import { FootballRepository } from "./football.repository";

type StoredFavorite = {
  id: number;
  userId: number;
  matchId: number;
  createdAt: string;
};

const favorites: StoredFavorite[] = [];
let nextFavoriteId = 1;

@Provide()
export class FavoriteService {
  @Inject()
  footballRepository: FootballRepository = new FootballRepository();

  favoriteMatch(user: PublicUser, matchId: unknown): FavoriteResponse {
    const id = parsePositiveInteger(matchId, "matchId");
    this.requireMatch(id);

    const existing = this.findFavorite(user.id, id);

    if (existing) {
      return { data: this.toFavorite(existing) };
    }

    const favorite: StoredFavorite = {
      id: nextFavoriteId,
      userId: user.id,
      matchId: id,
      createdAt: new Date().toISOString(),
    };

    nextFavoriteId += 1;
    favorites.push(favorite);

    return { data: this.toFavorite(favorite) };
  }

  unfavoriteMatch(user: PublicUser, matchId: unknown): void {
    const id = parsePositiveInteger(matchId, "matchId");
    this.requireMatch(id);

    const index = favorites.findIndex(
      (favorite) => favorite.userId === user.id && favorite.matchId === id,
    );

    if (index >= 0) {
      favorites.splice(index, 1);
    }
  }

  listMyFavorites(user: PublicUser): FavoriteListResponse {
    return {
      data: favorites
        .filter((favorite) => favorite.userId === user.id)
        .sort(
          (left, right) =>
            Date.parse(right.createdAt) - Date.parse(left.createdAt) ||
            right.id - left.id,
        )
        .map((favorite) => this.toFavorite(favorite)),
    };
  }

  countFavorites(userId: number, matchId: number): number {
    return favorites.filter(
      (favorite) => favorite.userId === userId && favorite.matchId === matchId,
    ).length;
  }

  deleteByMatchIds(matchIds: number[]): void {
    const matchIdSet = new Set(matchIds);

    for (let index = favorites.length - 1; index >= 0; index -= 1) {
      if (matchIdSet.has(favorites[index].matchId)) {
        favorites.splice(index, 1);
      }
    }
  }

  private findFavorite(
    userId: number,
    matchId: number,
  ): StoredFavorite | undefined {
    return favorites.find(
      (favorite) => favorite.userId === userId && favorite.matchId === matchId,
    );
  }

  private toFavorite(favorite: StoredFavorite): Favorite {
    return {
      id: favorite.id,
      match: this.requireMatch(favorite.matchId),
      createdAt: favorite.createdAt,
    };
  }

  private requireMatch(matchId: number) {
    const match = this.footballRepository.findMatch(matchId);

    if (!match) {
      throw new NotFoundError("比赛不存在");
    }

    return match;
  }
}

function parsePositiveInteger(value: unknown, field: string): number {
  const normalized = typeof value === "string" ? value.trim() : value;
  const parsed =
    typeof normalized === "number" ? normalized : Number(normalized);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new ValidationError("请求参数不合法", [
      { field, reason: "positiveInteger" },
    ]);
  }

  return parsed;
}
