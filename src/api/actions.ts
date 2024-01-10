import { z, ZodSchema } from 'zod';
import { Action, DB, dbSchema } from '../helpers/schemas';

// https://github.com/uuidjs/uuid/pull/654
import { v4 as uuidv4 } from 'uuid';

import {
  getGoogleDriveFileContent,
  updateGoogleDriveFile,
} from '../helpers/GoogleApi';

export type NewAction = Omit<Action, 'date' | 'id'>;

type DBApiRequiredAttrs = {
  gdFileId: string;
};

export const TokenInfoSchema = z.object({
  cid: z.string(),
  rt: z.string(),
  cs: z.string(),
});

export type TokenInfo = z.infer<typeof TokenInfoSchema>;

export async function getDB(tokenInfo: TokenInfo, attrs: DBApiRequiredAttrs) {
  const fileContent = await getGoogleDriveFileContent(tokenInfo, attrs);

  return dbSchema.parse(fileContent.data);
}

export async function updateDB(
  tokenInfo: TokenInfo,
  attrs: DBApiRequiredAttrs & { db: DB }
) {
  const newDB: DB = dbSchema.parse({
    ...attrs.db,
    updatedAt: new Date().toISOString(),
  });

  void (await updateGoogleDriveFile(tokenInfo, {
    gdFileId: attrs.gdFileId,
    blob: new Blob([JSON.stringify(newDB, undefined, 2)]),
  }));

  return newDB;
}

export async function addItem<T>(
  tokenInfo: TokenInfo,
  attrs: DBApiRequiredAttrs & {
    schema: ZodSchema<T>;
    // todo: put this in dbapirequiredattrs
    type: 'categories' | 'tags' | 'wallets' | 'actions';
    data: unknown;
  }
) {
  const db = await getDB(tokenInfo, attrs);
  const date = new Date().toISOString();
  const id = uuidv4();
  const { type, data, schema } = attrs;
  const parsedData = schema.parse(data);

  return updateDB(tokenInfo, {
    ...attrs,
    db: {
      ...db,
      updatedAt: date,
      [type]: [{ ...parsedData, id }, ...db[type]],
    },
  });
}

export async function editItem<T extends { id: string }>(
  tokenInfo: TokenInfo,
  attrs: DBApiRequiredAttrs & {
    schema: ZodSchema<T>;
    type: 'categories' | 'tags' | 'wallets' | 'actions';
    data: unknown;
  }
) {
  const db = await getDB(tokenInfo, attrs);
  const date = new Date().toISOString();
  const { type, data, schema } = attrs;
  const parsedData = schema.parse(data);

  return updateDB(tokenInfo, {
    ...attrs,
    db: {
      ...db,
      updatedAt: date,
      [type]: db[type].map((it) =>
        it.id === parsedData.id ? { ...parsedData } : it
      ),
    },
  });
}

export async function deleteItem(
  tokenInfo: TokenInfo,
  attrs: DBApiRequiredAttrs & {
    type: 'categories' | 'tags' | 'wallets' | 'actions';
    id: string;
  }
) {
  const db = await getDB(tokenInfo, attrs);
  const date = new Date().toISOString();
  const { type, id } = attrs;

  return updateDB(tokenInfo, {
    ...attrs,
    db: {
      ...db,
      updatedAt: date,
      // @ts-ignore todo: its throwing because of actions in type
      // but this is safe
      [type]: db[type].filter((it) => it.id !== id),
    },
  });
}

export async function updateInitialBalance(
  tokenInfo: TokenInfo,
  attrs: DBApiRequiredAttrs & {
    initialBalance?: number;
  }
) {
  const db = await getDB(tokenInfo, attrs);
  return updateDB(tokenInfo, {
    ...attrs,
    db: { ...db, initialBalance: attrs.initialBalance },
  });
}
