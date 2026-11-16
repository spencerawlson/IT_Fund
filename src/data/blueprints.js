// Equipment blueprint reference sheets — Spencer's own R2C art — mapped to
// lessons by topic. Imagery only: no lesson text is changed, and a blueprint
// attached to a lesson inherits that lesson's existing free/Pro gate from the
// lesson page itself (LessonView renders these inside the gated page).
//
// Assets live flat under public/ (same convention as cypher-mascot-*.jpg).
// The sheets are full-page technical drawings; LessonBlueprint loads them
// lazily. The nine equipment sheets were replaced 2026-11-16 with Spencer's
// standalone R2C-BP set (1536 px wide, ~380–420 KB each, quality 80); the
// cloud sheet and the poster are the earlier 1206 px versions.

/** Lesson id -> the blueprint sheet(s) that belong in its Architecture section. */
export const BLUEPRINTS_FOR_LESSON = {
  'it-hardware': [
    {
      src: '/blueprint-rack-server-2u.jpg',
      alt: 'R2C technical blueprint of a 2U rack server (R2C-SRV-02): perspective, labeled front and rear panels, top and side views, internal layout, hot-swap drive bay and specifications',
      caption: 'Rack Server (2U) — full technical blueprint. Labeled front and rear panels, internal components, hot-swap drive bays, dimensions and specifications.',
    },
  ],
  'it-storage-memory': [
    {
      src: '/blueprint-nas-storage.jpg',
      alt: 'R2C technical blueprint of an enterprise NAS storage appliance (R2C-NAS-01): 8 hot-swap drive bays, front, rear and side views, internal cutaway, RAID levels and specifications',
      caption: 'Enterprise NAS Storage Appliance — full technical blueprint. 8 hot-swap drive bays, front and rear panels, internal cutaway, RAID configurations and specifications.',
    },
  ],
  'net-devices-media': [
    {
      src: '/blueprint-network-rack-42u.jpg',
      alt: 'R2C technical blueprint of a 42U server rack cabinet (R2C-RACK-42U): front, rear and side views, rack-unit reference, exploded structure, cooling and PDU options',
      caption: '42U Server Rack Cabinet — full technical blueprint. Front, rear and side views, the rack-unit reference, exploded structure, cooling and power distribution.',
    },
    {
      src: '/blueprint-patch-panel-48-port.jpg',
      alt: 'R2C technical blueprint of a 48-port Cat6 patch panel (R2C-PP-48): labeled front ports 1–48, rear 110 punch-down termination, T568A/T568B wiring and specifications',
      caption: 'Patch Panel (48-Port, Cat6) — full technical blueprint. Numbered front ports, rear 110 punch-down termination, T568A/T568B wiring standards and dimensions.',
    },
  ],
  'net-switch-route': [
    {
      src: '/blueprint-network-switch-48-port.jpg',
      alt: 'R2C technical blueprint of a managed 48-port network switch (R2C-SW-48): front, rear, side and top views, internal cutaway, port and LED detail and specifications',
      caption: 'Managed Network Switch (48-Port) — full technical blueprint. Front, rear, side and top views, internal cutaway, port and LED detail, and specifications.',
    },
    {
      src: '/blueprint-network-router.jpg',
      alt: 'R2C technical blueprint of an enterprise network router (R2C-RTR-01): labeled front and rear panels, side and top views, internal cutaway and specifications',
      caption: 'Enterprise Network Router (R2C-RTR-01) — full technical blueprint. Labeled front and rear panels, internal cutaway, dimensions and specifications.',
    },
  ],
  'rt-fundamentals': [
    {
      src: '/blueprint-network-router.jpg',
      alt: 'R2C technical blueprint of an enterprise network router (R2C-RTR-01): labeled front and rear panels, side and top views, internal cutaway and specifications',
      caption: 'Enterprise Network Router (R2C-RTR-01) — full technical blueprint. Labeled front and rear panels, internal cutaway, dimensions and specifications.',
    },
  ],
  'net-services-wireless': [
    {
      src: '/blueprint-wireless-access-point.jpg',
      alt: 'R2C technical blueprint of an enterprise wireless access point (R2C-AP-01): top, front, rear and bottom views, internal and exploded views, MIMO antenna layout and status LEDs',
      caption: 'Enterprise Wireless Access Point (R2C-AP-01) — full technical blueprint. Orthographic, internal and exploded views, 4×4 MIMO antenna layout, status LEDs and specifications.',
    },
  ],
  'net-security': [
    {
      src: '/blueprint-firewall-ngfw.jpg',
      alt: 'R2C technical blueprint of a next-generation firewall (R2C-FW-01): perspective, labeled front and rear views, top and side views, internal cutaway and specifications',
      caption: 'Next-Generation Firewall (R2C-FW-01) — full technical blueprint. Labeled front and rear panels, internal cutaway, dimensions, specifications and use cases.',
    },
  ],
  'net-ops': [
    {
      src: '/blueprint-ups-rackmount-2u.jpg',
      alt: 'R2C technical blueprint of a rack-mount UPS (R2C-UPS-02): labeled front and rear panels, internal cutaway, battery module, LCD display and specifications',
      caption: 'Rack-Mount UPS (2U) — full technical blueprint. Labeled front and rear panels, internal cutaway, battery module, LCD display and specifications.',
    },
  ],
  'cl-architecture': [
    {
      src: '/blueprint-cloud-architecture.jpg',
      alt: 'R2C technical character sheet of a cloud computing architecture: virtual network, subnets, load balancer, firewall and object storage',
      caption: 'Cloud Computing Architecture — full technical character sheet. Virtual network and subnets, firewall, load balancer, and the key component views.',
    },
  ],
};

/**
 * The full equipment poster — the networking-track reference. It renders in
 * the Resources section of this one lesson (which has resource links, so the
 * section exists); it is not attached to every lesson.
 */
export const BLUEPRINT_POSTER = {
  lessonId: 'net-devices-media',
  src: '/blueprint-equipment-poster.jpg',
  alt: 'R2C equipment and infrastructure blueprints poster: server, router, switch, firewall, access point, NAS, UPS, patch panel, KVM, load balancer, IDS/IPS, VPN gateway, 42U rack layout, data center floor plan, network topology, cloud architecture and defense-in-depth stack',
  caption: 'Equipment & Infrastructure Blueprints — the full R2C poster: every device in this track, the 42U rack layout, the data center floor plan, the network topology, cloud architecture and the defense-in-depth stack.',
};

/**
 * Visual Lab subject id -> the blueprint shown when its 3D scene cannot load.
 * Since 2026-11-16 the equipment subjects and OSI render these sheets as the
 * subject itself (BlueprintSubject) rather than as a 3D fallback.
 */
export const FALLBACK_BLUEPRINT_FOR_SUBJECT = {
  switch: '/blueprint-network-switch-48-port.jpg',
  'server-rack': '/blueprint-network-rack-42u.jpg',
  router: '/blueprint-network-router.jpg',
  'firewall-3d': '/blueprint-firewall-ngfw.jpg',
  'access-point': '/blueprint-wireless-access-point.jpg',
  nas: '/blueprint-nas-storage.jpg',
  ups: '/blueprint-ups-rackmount-2u.jpg',
  'rack-server': '/blueprint-rack-server-2u.jpg',
  'patch-panel': '/blueprint-patch-panel-48-port.jpg',
  osi: '/blueprint-osi-model.jpg',
  cloud: '/blueprint-cloud-architecture.jpg',
};
