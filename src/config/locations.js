/* Coverage areas — values must match the backend LocationArea enum. */
export const LOCATION_GROUPS = [
  {
    group: 'Abuja',
    options: [
      ['ABUJA_MUNICIPAL', 'Abuja Municipal'],
      ['ABAJI', 'Abaji'],
      ['BWARI', 'Bwari'],
      ['GWAGWALADA', 'Gwagwalada'],
      ['KUJE', 'Kuje'],
      ['KWALI', 'Kwali'],
    ],
  },
  {
    group: 'Lagos',
    options: [
      ['AGEGE', 'Agege'],
      ['AJEROMI_IFELODUN', 'Ajeromi-Ifelodun'],
      ['ALIMOSHO', 'Alimosho'],
      ['AMUWO_OTUN', 'Amuwo-Otun'],
      ['APAPA', 'Apapa'],
      ['BADAGRY', 'Badagry'],
      ['EPE', 'Epe'],
      ['ETI_OSA', 'Eti-Osa'],
      ['IBIJU_LEKKI', 'Ibeju-Lekki'],
      ['IFAKO_IJAIYE', 'Ifako-Ijaiye'],
      ['IKEJA', 'Ikeja'],
      ['IKORODU', 'Ikorodu'],
      ['KOSOFE', 'Kosofe'],
      ['LAGOS_ISLAND', 'Lagos Island'],
      ['LAGOS_MAINLAND', 'Lagos Mainland'],
      ['MUSHIN', 'Mushin'],
      ['OJO', 'Ojo'],
      ['OSHODI_ISOLO', 'Oshodi-Isolo'],
      ['SHOMOLU', 'Shomolu'],
      ['SURULERE', 'Surulere'],
    ],
  },
];

const LABELS = Object.fromEntries(
  LOCATION_GROUPS.flatMap((g) => g.options)
);

export function locationLabel(value) {
  if (!value) return '—';
  return LABELS[value] || value;
}
