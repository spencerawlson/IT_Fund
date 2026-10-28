// Attribution for the 3D device models used in NetworkScene3D.
// Source of record: public/models/PROVENANCE.json. The switch/router/server
// models are CC-BY 3.0, which REQUIRES visible credit; the CC0 ones don't, but
// are listed for completeness. Keep this in sync if models are re-fetched
// (scripts/fetch-device-models.mjs).
export const MODEL_CREDITS = [
  { title: 'Switch', author: 'sugamo', licence: 'CC-BY 3.0' },
  { title: 'Modern Router', author: 'J-Toastie', licence: 'CC-BY 3.0' },
  { title: 'server rack', author: 'Jeremy Eyring', licence: 'CC-BY 3.0' },
  { title: 'Cloud', author: 'Quaternius', licence: 'CC0' },
  { title: 'Computer', author: 'CreativeTrio', licence: 'CC0' },
];

// A single compact attribution line to show wherever the 3D models are rendered.
export const MODEL_CREDIT_LINE =
  '3D models via Poly Pizza — Switch (sugamo), Modern Router (J-Toastie), server rack (Jeremy Eyring), CC-BY 3.0; Cloud (Quaternius), Computer (CreativeTrio), CC0.';
