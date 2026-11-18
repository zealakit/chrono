/** Cell key of a resource cell (plan 10 IG4): `<base>@<encoded resource id>`. */
export const resourceCellKey = (base: string, resourceKey: string): string =>
  `${base}@${encodeURIComponent(resourceKey)}`;
