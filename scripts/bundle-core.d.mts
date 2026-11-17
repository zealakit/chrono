export const CORE_NAME: string;
export const VENDOR_DIR: string;

export type CoreExportsMap = Record<string, unknown>;

export function resolveCoreExport(
  exportsMap: CoreExportsMap | undefined,
  key: string,
): string;

export function rewriteCoreSpecifiers(
  source: string,
  fromFile: string,
  vendorDir: string,
  exportsMap: CoreExportsMap | undefined,
): string;

export function bundleCoreIntoTarball(tarball: string): string;
