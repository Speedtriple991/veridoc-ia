export const tenants = {
  gonzalezlara: {
    nombre:        'González Lara Alimentación',
    iniciales:     'GL',
    logo:          '/logos/gonzalezlara/logo.svg',
    color:         '#1E3A2F',
    erp:           'albaibs',
    exportFormats: ['xmlAlbaIbs', 'excel'],
  },
  solvinco: {
    nombre:        'Solvinco',
    iniciales:     'SC',
    logo:          '/logos/solvinco.png',
    color:         '#1E3A2F',
    erp:           'mygestion',
    exportFormats: ['excelMyGestion'],
  },
  viavac: {
    nombre:        'Viavac',
    iniciales:     'VV',
    logo:          '/logos/viavac/logo.svg',
    color:         '#1E3A2F',
    erp:           'mygestion',
    exportFormats: ['excelMyGestion'],
  },
};

/** Lee el tenant desde sessionStorage (establecido al hacer login) */
export function getTenant() {
  try {
    const s = JSON.parse(sessionStorage.getItem('vd_session') ?? '{}');
    if (s.tenant && tenants[s.tenant]) return tenants[s.tenant];
  } catch {}

  return tenants.gonzalezlara;
}

/** Lee la sesión demo o devuelve null */
export function getSession() {
  try {
    return JSON.parse(sessionStorage.getItem('vd_session') ?? 'null');
  } catch {
    return null;
  }
}

/** Guarda sesión demo */
export function saveSession(email, tenantKey) {
  sessionStorage.setItem('vd_session', JSON.stringify({
    email,
    tenant: tenantKey,
    nombre: tenants[tenantKey]?.nombre ?? '',
  }));
}

/** Borra sesión demo */
export function clearSession() {
  sessionStorage.removeItem('vd_session');
}
