import { useEffect, useState } from 'react';
import {
  addAction,
  addCategory,
  deleteAction,
  deleteCategory,
  editAction,
  editCategory,
  getDB,
  updateDB,
} from './api/actions';
import Calculator from './components/Calculator';
import Loading from './components/Loading';
import PopupCategories from './components/PopupCategories';
import PopupIncomeExpenseForm from './components/PopupIncomeExpenseForm';
import PopupIncomesExpenses from './components/PopupIncomesExpenses';
import {
  GAPI_API_KEY,
  GAPI_CLIENT_ID,
  GAPI_DB_PATH,
  GAPI_SCOPE,
} from './config';
import {
  Action,
  ActionCategory,
  ActionType,
  DB,
  initialDB,
} from './helpers/DBValidator';
import {
  getGoogleDriveElementInfo,
  loadGapiClient,
  loadGISClient,
  requestGapiAccessToken,
} from './helpers/GoogleApi';
import {
  getGDFileId as LSGetGDFileId,
  setGDFileId as LSSetGDFileId,
} from './helpers/localStorage';

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [value, setValue] = useState<string>();
  const [popup, setPopup] = useState<{
    action: 'add' | 'show' | 'showCategories';
    actionType: ActionType;
  }>();
  const [accessToken, setAccessToken] = useState<string>();
  const [gdFileId, setGDFileId] = useState<Optional<string>>(LSGetGDFileId());
  const [db, setDB] = useState<DB>();

  // Perform a database operation, sync it and update it locally
  const asyncDBTask = async function (
    fn: (attrs: { accessToken: string; gdFileId: string }) => Promise<DB>
  ) {
    try {
      if (!accessToken) throw new Error('Missing accessToken');
      if (!gdFileId) throw new Error('Missing Google Drive FileId');

      setIsLoading(true);
      const db = await fn({ accessToken, gdFileId });
      setDB(db);

      return db;
    } catch (err: any) {
      alert(err?.message || 'Ocurrió un error.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddActionFormSubmit = async (values: Action) => {
    await asyncDBTask(async (attrs) => {
      const db = await addAction({
        ...attrs,
        newAction: {
          incomeCategory: values.incomeCategory,
          expenseCategory: values.expenseCategory,
          type: values.type,
          description: values.description,
          value: values.value,
        },
      });

      setValue(undefined);
      setPopup(undefined);

      return db;
    });
  };

  const handleActionDelete = async (actionId: string) => {
    await asyncDBTask(async (attrs) => deleteAction({ ...attrs, actionId }));
  };

  const handleEditActionSubmit = async (action: Action) => {
    await asyncDBTask(async (attrs) => editAction({ ...attrs, action }));
  };

  const handleCategoryDelete = async (categoryId: string) => {
    await asyncDBTask(async (attrs) =>
      deleteCategory({ ...attrs, categoryId })
    );
  };

  const handleAddCategorySubmit = async (
    category: ActionCategory,
    type: ActionType
  ) => {
    await asyncDBTask(async (attrs) =>
      addCategory({ ...attrs, category, type })
    );
  };

  const handleEditCategorySubmit = async (category: ActionCategory) => {
    await asyncDBTask(async (attrs) => editCategory({ ...attrs, category }));
  };

  const handleActionClick = (actionType: ActionType) => {
    if (!value) return;
    setPopup({ action: 'add', actionType });
  };

  useEffect(() => {
    // TODO: To avoid the duplicated call due to React Strict, you should
    // return from useEffect "cleaning up/canceling" the ongoing one
    // This is considered the correct behavior
    const loadDBGapiGISClientsD = async () => {
      try {
        const [gapiClient, googleClient] = await Promise.all([
          loadGapiClient({ apiKey: GAPI_API_KEY }),
          loadGISClient(),
        ]);

        // token valid for 1 hour, after that refresh the page
        const gapiAccessToken = await requestGapiAccessToken({
          gapiClient,
          googleClient,
          clientId: GAPI_CLIENT_ID,
          scope: GAPI_SCOPE,
          skipConsentOnNoToken: true,
        });

        const accessToken = gapiAccessToken.access_token;
        let newGdFileId = gdFileId;

        // Get the gdFileId if not already saved in LocalStorage
        if (!newGdFileId) {
          const dbElInfo = await getGoogleDriveElementInfo({
            path: GAPI_DB_PATH,
            accessToken,
          });

          newGdFileId = dbElInfo?.id;
          if (!newGdFileId) throw new Error('No Google Drive FileID Found');
        }

        const db = await getDB({ accessToken, gdFileId: newGdFileId });

        LSSetGDFileId(newGdFileId);
        setGDFileId(newGdFileId);
        setDB(db);
        setAccessToken(accessToken);
      } catch (err: any) {
        console.log(err);
        alert(err?.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadDBGapiGISClientsD().catch((el) => {
      console.log(el);
      alert(el.message);
    });
  }, []);

  return (
    <div>
      {isLoading && <Loading />}
      <Calculator value={value} onButtonClick={setValue} />
      <div className="flex gap-2 p-4 ch:grow ch:text-xl">
        <button
          className="bg-green-700"
          onClick={handleActionClick.bind(null, 'income')}
        >
          Ingreso
        </button>
        <button
          className="bg-red-800"
          onClick={handleActionClick.bind(null, 'expense')}
        >
          Gasto
        </button>
      </div>

      <div className="flex flex-wrap gap-2 justify-center p-2 ch:flex-grow ch:flex-shrink ch:basis-0">
        <button onClick={() => setValue(undefined)}>Limpiar</button>
        <button
          onClick={() => setPopup({ action: 'show', actionType: 'expense' })}
        >
          Gastos
        </button>
        <button
          onClick={() => setPopup({ action: 'show', actionType: 'income' })}
        >
          Ingresos
        </button>
        <button
          onClick={() =>
            setPopup({ action: 'showCategories', actionType: 'expense' })
          }
        >
          Categorías de gastos
        </button>
        <button
          onClick={() =>
            setPopup({ action: 'showCategories', actionType: 'income' })
          }
        >
          Categorías de ingresos
        </button>
        <button
          onClick={async () => {
            if (!window.confirm('Reiniciar la base de datos?')) return;

            await asyncDBTask((attrs) => updateDB({ ...attrs, db: initialDB }));
          }}
        >
          Reiniciar DB
        </button>
        <button onClick={() => window.location.reload()}>Recargar</button>
      </div>

      {db && popup?.action === 'show' && (
        <PopupIncomesExpenses
          db={db}
          actionType={popup.actionType}
          onClose={() => setPopup(undefined)}
          onItemDelete={handleActionDelete}
          onEditItemSubmit={handleEditActionSubmit}
        />
      )}

      {db && popup?.action === 'showCategories' && (
        <PopupCategories
          db={db}
          actionType={popup.actionType}
          onClose={() => setPopup(undefined)}
          onItemDelete={handleCategoryDelete}
          onEditItemSubmit={handleEditCategorySubmit}
          onNewItemSubmit={handleAddCategorySubmit}
        />
      )}

      {db && popup?.action === 'add' && (
        <PopupIncomeExpenseForm
          db={db}
          value={value}
          actionType={popup.actionType}
          onSubmit={handleAddActionFormSubmit}
          onClose={() => setPopup(undefined)}
        />
      )}
    </div>
  );
}
