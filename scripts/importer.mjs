import { METADATA } from './metadata.mjs';

const LOG = '[Печали Каменистого холма]';

/* -------------------------------------------- */
/*  Окно импорта: добавляем свои опции          */
/* -------------------------------------------- */

/**
 * @param {AdventureImporterV2} app  Приложение импорта
 * @param {HTMLElement} html         Корневой элемент окна
 */
export function renderAdventureImporter(app, html) {
  if (app.adventure?.pack !== METADATA.adventuresPackId) return;

  const root = html instanceof HTMLElement ? html : html?.[0];
  const controls = root?.querySelector('.import-controls');
  if (!controls) return;

  // Защита от повторной вставки при перерисовке окна
  if (controls.querySelector('[data-module-options]')) return;

  const importOptions = game.settings.get(METADATA.moduleName, 'importOptions') ?? {};

  controls.insertAdjacentHTML(
    'beforeend',
    `<h2 data-module-options>Опции модуля</h2>`,
  );
  controls.append(...formatOptions(importOptions));
}

function formatOptions(importOptions = {}) {
  return Object.entries(METADATA.importOptions).map(([name, config]) => {
    const initial = importOptions[name] ?? config.default;
    const field = new foundry.data.fields.BooleanField({ initial, label: config.label });
    const element = field.toFormGroup({ localize: true }, { name });
    const input = element.querySelector('input');
    const label = element.querySelector('label');

    if (label && input) {
      label.classList.add('checkbox');
      label.insertAdjacentElement('afterbegin', input);
    }

    element.querySelector('.form-fields')?.remove();
    return element;
  });
}

/* -------------------------------------------- */
/*  Обработчики опций                           */
/* -------------------------------------------- */

const HANDLERS = { activateScene, displayJournal };

/**
 * Выполняется после импорта приключения.
 * @param {Adventure} adventure  Документ приключения
 * @param {object} formData      Значения формы импорта
 */
export async function onImport(adventure, formData) {
  console.log(`${LOG} importAdventure сработал`, adventure?.pack, formData);
  if (adventure?.pack !== METADATA.adventuresPackId) return;

  // formData может быть и обычным объектом, и FormDataExtended
  const data = formData?.object ?? formData ?? {};

  const importOptions = {};
  for (const [name] of Object.entries(METADATA.importOptions)) {
    if (name in data) importOptions[name] = data[name];
  }

  // Если обработчики уже отработали через postImport-колбэк, runPostHandlers сам пропустит повторный запуск
  await runPostHandlers(adventure, data);

  try {
    await game.settings.set(METADATA.moduleName, 'importOptions', importOptions);
  } catch (e) {
    console.warn(`${LOG} Не удалось сохранить параметры импорта:`, e);
  }

  try {
    await initParty();
  } catch (e) {
    console.warn(`${LOG} Не удалось создать актёра «Группа»:`, e);
  }
}

/**
 * Запускает все «post»-опции, включённые в форме (или по умолчанию).
 */
async function runPostHandlers(adventure, data = {}) {
  if (postHandlersDone) return; // уже запускали в рамках этого импорта
  postHandlersDone = true;
  for (const [name, config] of Object.entries(METADATA.importOptions)) {
    let { handler, lifecycle } = config;
    if (lifecycle !== 'post') continue;
    if (typeof handler === 'string') handler = HANDLERS[handler];
    if (typeof handler !== 'function') continue;

    // Если чекбокса в форме нет (например, быстрый старт), берём значение по умолчанию
    const enabled = name in data ? data[name] : config.default;
    console.log(`${LOG} опция ${name}:`, enabled);
    if (!enabled) continue;

    try {
      await handler(adventure, config);
    } catch (e) {
      console.error(`${LOG} Ошибка при выполнении ${name}:`, e);
    }
  }
}

let postHandlersDone = false;

/**
 * Выполняется перед импортом: регистрируем колбэки core (preImport / postImport).
 * Для быстрого старта (quickstart.postImport = true) Foundry ждёт именно postImport-колбэки.
 */
export function preImport(adventure, importOptions) {
  if (adventure?.pack !== METADATA.adventuresPackId) return;
  console.log(`${LOG} preImportAdventure сработал`, importOptions);
  postHandlersDone = false;

  for (const [name, config] of Object.entries(METADATA.importOptions)) {
    let { handler, lifecycle } = config;
    if (lifecycle !== 'pre') continue;
    if (typeof handler === 'string') handler = HANDLERS[handler];
    if (typeof handler !== 'function') continue;

    if (importOptions?.[name]) {
      importOptions.preImport?.push(handler);
      importOptions[METADATA.moduleName] ??= {};
      importOptions[METADATA.moduleName][name] = config;
    }
  }

  if (Array.isArray(importOptions?.postImport)) {
    importOptions.postImport.push(async () => {
      console.log(`${LOG} postImport-колбэк вызван`);
      await runPostHandlers(adventure, importOptions);
    });
  }
}

/* -------------------------------------------- */

/**
 * Ищем документ в мире по ID. Если не нашли, пробуем найти по имени
 * (имя берём из документа внутри приключения).
 */
function findInWorld(collection, adventureCollection, documentId) {
  let doc = collection.get(documentId);
  if (doc) return doc;

  const name = adventureCollection?.get(documentId)?.name;
  if (name) doc = collection.getName(name);
  return doc ?? null;
}

/**
 * Активировать начальную сцену
 */
export async function activateScene(adventure, { documentId } = {}) {
  if (!documentId) return;
  const scene = findInWorld(game.scenes, adventure?.scenes, documentId);
  if (!scene) {
    console.warn(`${LOG} Сцена ${documentId} не найдена. Проверьте landingId в metadata.mjs`);
    return;
  }
  console.log(`${LOG} Активирую сцену:`, scene.name);
  return scene.activate();
}

/**
 * Показать стартовый журнал
 */
export async function displayJournal(adventure, { documentId } = {}) {
  if (!documentId) return;
  const journal = findInWorld(game.journal, adventure?.journal, documentId);
  if (!journal) {
    console.warn(`${LOG} Журнал ${documentId} не найден. Проверьте guideId в metadata.mjs`);
    return;
  }
  console.log(`${LOG} Открываю журнал:`, journal.name);
  return journal.sheet.render({ force: true });
}

/* -------------------------------------------- */

/**
 * Актёр группы (только для dnd5e)
 */
async function initParty() {
  if (game.system.id !== 'dnd5e') return;

  let party = game.settings.get('dnd5e', 'primaryParty')?.actor;
  if (party) return;

  party = await Actor.create({
    type: 'group',
    name: 'Группа',
    img: METADATA.partyImgSrc,
  });
  await party.update({
    'prototypeToken.ring.enabled': true,
    'prototypeToken.ring.effects': 1,
    'prototypeToken.lockRotation': true,
  });
  await game.settings.set('dnd5e', 'primaryParty', { actor: party.id });
}
