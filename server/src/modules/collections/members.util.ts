import { prisma } from "../../utils/prisma";

/** Récupère l'id user depuis req (déposé par authGuard) */
export function getUserId(req: any): string {
  if (!req.user?.sub) throw new Error("No user in request");
  return req.user.sub as string;
}

/** 403 si l'utilisateur n'est pas membre de la collection */
export async function assertMember(collectionId: string, userId: string) {
  const m = await prisma.collectionMember.findUnique({
    where: { collectionId_userId: { collectionId, userId } },
  });
  if (!m) {
    const err: any = new Error("Forbidden (not a member)");
    err.status = 403;
    throw err;
  }
}
