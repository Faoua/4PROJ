import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../utils/prisma";
import { authGuard } from "../../auth/jwt";
import type { Prisma } from "@prisma/client";
import { Role } from "@prisma/client";

const router = Router();

/* ------------------------- Validation ------------------------- */
const CreateCollectionSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  isShared: z.boolean().optional(),
});

/* -------------------- Helpers ---------------------- */
function getUserId(req: any): string {
  if (!req.user?.sub) throw new Error("No user in request");
  return req.user.sub as string;
}

/* ------------------------- Routes ----------------------------- */

/** POST /collections */
router.post("/", authGuard, async (req, res) => {
  const parse = CreateCollectionSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: "Invalid body", details: parse.error.flatten() });
  }

  const { name, description, isShared } = parse.data;
  const userId = getUserId(req);

 const created = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
  const collection = await tx.collection.create({
    data: {
      name,
      description: description ?? null,
      isShared: isShared ?? false,
      createdBy: userId,
    },
  });

 await tx.collectionMember.create({
  data: {
    collectionId: collection.id,
    userId,
    role: Role.OWNER,   // ✅ c’est l’enum généré automatiquement
  },
});

  return collection;
});

  return res.status(201).json({ collection: created });
});

/** GET /collections */
router.get("/", authGuard, async (req, res) => {
  const userId = getUserId(req);

  const memberships = await prisma.collectionMember.findMany({
  where: { userId },
  include: {
    collection: {
      include: {
        members: { select: { userId: true, role: true } },
      },
    },
  },
  orderBy: { collectionId: "asc" },
});

// ✅ type sûr pour 'm'
const data = memberships.map((m: (typeof memberships)[number]) => ({
  id: m.collectionId,
  name: m.collection.name,
  description: m.collection.description,
  isShared: m.collection.isShared,
  createdBy: m.collection.createdBy,
  createdAt: m.collection.createdAt,
  myRole: m.role,
  membersCount: m.collection.members.length,
}));


  return res.json({ collections: data });
});

/** GET /collections/:id */
router.get("/:id", authGuard, async (req, res) => {
  const userId = getUserId(req);
  const { id } = req.params;

  const member = await prisma.collectionMember.findUnique({
    where: { collectionId_userId: { collectionId: id, userId } },
    include: { collection: true },
  });

  if (!member) return res.status(403).json({ error: "Forbidden (not a member)" });

  const c = member.collection;
  return res.json({
    collection: {
      id: c.id,
      name: c.name,
      description: c.description,
      isShared: c.isShared,
      createdBy: c.createdBy,
      createdAt: c.createdAt,
      myRole: member.role,
    },
  });
});

export default router;
