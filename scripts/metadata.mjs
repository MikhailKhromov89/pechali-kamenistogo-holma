const METADATA = {
  moduleName: 'pechali-kamenistogo-holma', // Ваш ID модуля
  adventureUuid: 'Compendium.pechali-kamenistogo-holma.adventure.Adventure.5EtpvyguuGHCf2rk', // Ваш UUID
  adventuresPackId: 'pechali-kamenistogo-holma.adventure', // Ваш пак
  adventureId: '5EtpvyguuGHCf2rk', // Ваш ID приключения

  changelogId: '', // У вас нет журнала изменений, оставляем пустым
  guideId: 'HbEUketMcs1rosmY', // Ваш ID журнала
  landingId: '5Xj9EPljVCoeSXgX', // Ваш ID сцены

  cssClass: 'pechali-kamenistogo-holma',
  partyImgSrc: 'icons/svg/mystery-man.svg', // Поставил стандартную иконку
  worldBackgroundSrc: 'modules/pechali-kamenistogo-holma/assets/art/adventure-cover.png',
};

METADATA.importOptions = {
  activateScene: {
    label: 'Активировать начальную сцену', // Заменил ключи локализации на русский текст
    default: true,
    handler: 'activateScene',
    lifecycle: 'post',
    documentId: METADATA.landingId,
  },
  displayJournal: {
    label: 'Открыть текст приключения', // Заменил ключи локализации на русский текст
    default: true,
    handler: 'displayJournal',
    lifecycle: 'post',
    documentId: METADATA.guideId,
  },
}

export { METADATA };