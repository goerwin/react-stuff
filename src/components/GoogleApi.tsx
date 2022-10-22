const GOOGLE_DRIVE_API_URL = 'https://www.googleapis.com/upload/drive/v3';
const CLIENT_ID =
  '922815291850-m6cji61b4197qdutd14o8mt8s7cpp9e8.apps.googleusercontent.com';
const API_KEY = 'AIzaSyB1FQT_u4E_LC4XDUK8944aWnARxyPfwE0';

// Authorization scopes required by the API; multiple scopes can be
// included, separated by spaces.
// const SCOPES = 'https://www.googleapis.com/auth/drive.metadata.readonly';
const SCOPE = 'https://www.googleapis.com/auth/drive.file';

/** Loads any script via Promises */
async function loadScript(scriptId: string, scriptUrl: string) {
  // if script already added to the body, omit it
  if (document.getElementById(scriptId)) return;

  // add script to the body

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = scriptId;
    document.body.appendChild(script);
    script.src = scriptUrl;

    script.onload = resolve;
    script.onerror = reject;
  });
}

/**
 * Callback after the API client is loaded. Loads the
 * discovery doc to initialize the API.
 */
async function loadGapi(attrs: { apiKey: string }) {
  return new Promise((res, rej) => {
    gapi.load('client', async () => {
      try {
        await gapi.client.init({
          apiKey: attrs.apiKey,
          discoveryDocs: [
            'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
          ],
        });

        res(true);
      } catch (error) {
        rej(error);
      }
    });
  });
}

/**
 * Callback after Google Identity Services are loaded.
 */
async function requestGapiAccessToken(attrs: {
  clientId: string;
  scope: string;
}): Promise<google.accounts.oauth2.TokenResponse> {
  return new Promise((res, rej) => {
    const tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: attrs.clientId,
      scope: attrs.scope,
      callback: async (resp) => {
        if (resp.error !== undefined) return rej(resp);
        res(resp);
      },
    });

    if (gapi.client.getToken() === null) {
      // Prompt the user to select a Google Account and ask for consent to share their data
      // when establishing a new session.
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
      // Skip display of account chooser and consent dialog for an existing session.
      tokenClient.requestAccessToken({ prompt: '' });
    }
  });
}

/**
 * You need to recursively navigate using the query syntax
 * provided by google drive api.
 *
 * For eg. If you want to search for path1/path2/file.json
 *
 * 'root' in parents and name = 'path1' and mimeType = 'application/vnd.google-apps.folder'
 *
 * and pick the first result, then get the folderId and
 *
 * '<id of path1>' in parents and name = 'path2' and mimeType = 'application/vnd.google-apps.folder'
 *
 * and finally, get the file
 *
 * '<id of path2>' in parents and name = 'file.json' and mimeType != 'application/vnd.google-apps.folder'
 *
 * https://stackoverflow.com/a/17276092/1623282
 *
 */
async function getGoogleDriveElementInfo(path?: string) {
  if (!path) return { id: 'root' };

  const dirs = path.split('/');
  const newDirs = ['root', ...dirs];
  const dirIds = new Array(newDirs.length).fill({ id: 'root' });

  for (let i = 0; i < newDirs.length - 1; i++) {
    const parentDirId = dirIds?.[i]?.id;
    if (!parentDirId) return null;
    const q = `'${parentDirId}' in parents and name = '${newDirs[i + 1]}'`;
    const response = await (gapi.client as any).drive.files.list({ q });
    dirIds[i + 1] = response.result.files[0];
  }

  return dirIds.at(-1);
}

/**
 * Note: File inherits from Blob, meaning File is a Blob!
 */
async function uploadGoogleDriveFile(
  accessToken: string,
  attrs: { parents?: string[]; blob: Blob; name: string; mimeType: string }
) {
  const { parents, blob, name, mimeType } = attrs;
  const metadata = JSON.stringify({
    name, // Filename at Google Drive
    mimeType, // mimeType at Google Drive
    parents, // Folder IDs at Google Drive
  });

  // NOTE: order is important (Metadata first then media)
  const form = new FormData();
  form.append('Metadata', new Blob([metadata], { type: 'application/json' }));
  form.append('Media', blob);

  return await fetch(`${GOOGLE_DRIVE_API_URL}/files?uploadType=multipart`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + accessToken },
    body: form,
  });
}

async function updateGoogleDriveFile(
  accessToken: string,
  fileId: string,
  attrs: { blob: Blob; metadata?: Record<string, string> }
) {
  const { metadata, blob } = attrs;
  let body: RequestInit['body'] = blob;
  const url = `${GOOGLE_DRIVE_API_URL}/files/${fileId}?uploadType=${
    metadata ? 'multipart' : 'media'
  }`;

  if (metadata) {
    // NOTE: order is important (Metadata first then media)
    const form = new FormData();
    form.append(
      'Metadata',
      new Blob([JSON.stringify(metadata)], { type: 'application/json' })
    );
    form.append('Media', blob);
    body = form;
  }

  return fetch(url, {
    method: 'PATCH',
    headers: { Authorization: 'Bearer ' + accessToken },
    body,
  });
}

export async function initGapi() {
  await Promise.all([
    await loadScript('gapiScript', 'https://apis.google.com/js/api.js'),
    await loadScript('gisScript', 'https://accounts.google.com/gsi/client'),
  ]);

  // load gapi
  await loadGapi({ apiKey: API_KEY });

  // request accessToken (show google login popup)
  const gapiAccessToken = await requestGapiAccessToken({
    clientId: CLIENT_ID,
    scope: SCOPE,
  });

  // get databases folder info
  const googleDriveElInfo = await getGoogleDriveElementInfo('Databases');

  const res = await uploadGoogleDriveFile(gapiAccessToken.access_token, {
    parents: googleDriveElInfo?.id ? [googleDriveElInfo.id] : undefined,
    name: 'ohmygod testing this bad by.json',
    mimeType: 'application/json',
    blob: new Blob([JSON.stringify({ a: { c: 'erwin' }, b: 4 })]),
  });

  console.log(await res.json());

  // https://www.googleapis.com/drive/v3/files/fileId

  const res2 = await updateGoogleDriveFile(
    gapiAccessToken.access_token,
    '1hgbB52AQijz9p6dJU3ewXAmOD9a_TQ7L',
    {
      blob: new Blob([JSON.stringify({ a: 3, b: 'ganganygangon' })]),
      metadata: { name: 'expensesIncomes.json' },
    }
  );

  console.log(await res2.json());
}
