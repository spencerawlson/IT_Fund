import GltfSubject, { labModelUrl } from './GltfSubject';

// 3D 24-port patch panel — Spencer's own Meshy model, slimmed for the web
// (see GltfSubject.jsx). Two rows of 12 numbered RJ45 ports (01–24),
// punched down to T568B, patched to the switch — the reference is the
// 'Networking with Khalid' patch-panel install Reel. No blueprint sheet
// exists for a patch panel, so there is no fallbackImage (ModelViewer
// defaults it to null and the fallback is the plain text notice).
export default function PatchPanel3D() {
  return (
    <GltfSubject
      modelUrl={labModelUrl('lab-patch-panel.glb')}
      cameraPos={[13, 8, 15]}
      target={[0, 1, 0]}
      label="24-Port Patch Panel"
      desc="A 24-port patch panel organizes the structured cabling in a rack: every wall jack in the building terminates here, punched down to T568B, and short patch cords connect each numbered port to the switch — so any run can be traced by its number."
      annotations={[
        { text: '24× RJ45 Ports', at: [0, 0.6, 1.08] },
        { text: 'Rack Mount Ears', at: [0.47, 0.5, 1.08] },
      ]}
    />
  );
}
