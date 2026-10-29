import { onImport, preImport, renderAdventureImporter } from './importer.mjs';
import { METADATA } from './metadata.mjs';

Hooks.once('init', async () => {
  game.settings.register(METADATA.moduleName, 'importOptions', {
    scope: 'world',
    config: false,
    type: Object,
    default: {},
  });
});

Hooks.on('ready', async () => {
  const imported = !!game.settings.get('core', 'adventureImports')?.[METADATA.adventureUuid];

  if (!imported && game.user.isGM) {
    const pack = game.packs.get(METADATA.adventuresPackId);
    if (!pack) return; // Защита от ошибки, если пака нет
    const adventure = await pack.getDocument(METADATA.adventureId);
    if (adventure) adventure.sheet.render(true);
  }
});

Hooks.on('renderAdventureImporterV2', renderAdventureImporter);
Hooks.on('importAdventure', onImport);
Hooks.on('preImportAdventure', preImport);