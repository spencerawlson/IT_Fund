// Equipment blueprint reference sheets — Spencer's own R2C art — mapped to
// lessons by topic. Imagery only: no lesson text is changed, and a blueprint
// attached to a lesson inherits that lesson's existing free/Pro gate from the
// lesson page itself (LessonView renders these inside the gated page).
//
// Assets live flat under public/ (same convention as cipher-mascot-*.jpg).
// The sheets are full-page technical drawings (1206 px wide, ~200–270 KB
// each, quality 82); LessonBlueprint loads them lazily.

/** Lesson id -> the blueprint sheet(s) that belong in its Architecture section. */
export const BLUEPRINTS_FOR_LESSON = {
  'it-hardware': [
    {
      src: '/blueprint-rack-server-2u.jpg',
      alt: 'R2C technical blueprint of a 2U rack server: three-quarter, front, rear, side and top views with specifications and key components',
      caption: 'Rack Server (2U) — full technical blueprint. Front, rear, side and top views, dimensions, specifications and key components.',
    },
  ],
  'it-storage-memory': [
    {
      src: '/blueprint-nas-storage.jpg',
      alt: 'R2C technical blueprint of a NAS storage appliance: 8 hot-swap drive bays, front, rear, side and top views with specifications',
      caption: 'NAS Storage Appliance — full technical blueprint. 8 hot-swap drive bays, front, rear, side and top views, specifications and use cases.',
    },
  ],
  'net-devices-media': [
    {
      src: '/blueprint-network-rack-42u.jpg',
      alt: 'R2C technical character sheet of a 42U server rack: front, rear, side and top views with the rack-unit plan',
      caption: 'Network Rack (42U) — full technical character sheet. Front, rear, side and top views, the rack-unit plan, and key features.',
    },
  ],
  'net-switch-route': [
    {
      src: '/blueprint-network-switch-48-port.jpg',
      alt: 'R2C technical blueprint of a managed 48-port network switch: front, rear, side and top views with specifications',
      caption: 'Managed Network Switch (48-Port) — full technical blueprint. Front, rear, side and top views, port layout and specifications.',
    },
    {
      src: '/blueprint-network-router.jpg',
      alt: 'R2C technical blueprint of an enterprise router (R2C-ER1000): front, rear, side and top views with port detail',
      caption: 'Enterprise Router (R2C-ER1000) — full technical blueprint. Front, rear, side and top views, port detail and network role.',
    },
  ],
  'rt-fundamentals': [
    {
      src: '/blueprint-network-router.jpg',
      alt: 'R2C technical blueprint of an enterprise router (R2C-ER1000): front, rear, side and top views with port detail',
      caption: 'Enterprise Router (R2C-ER1000) — full technical blueprint. Front, rear, side and top views, port detail and network role.',
    },
  ],
  'net-services-wireless': [
    {
      src: '/blueprint-wireless-access-point.jpg',
      alt: 'R2C technical blueprint of a wireless access point (R2C-AP6000): top, bottom, front, rear and side views with coverage pattern',
      caption: 'Wireless Access Point (R2C-AP6000) — full technical blueprint. Top, bottom, front, rear and side views, LED status ring and coverage pattern.',
    },
  ],
  'net-security': [
    {
      src: '/blueprint-firewall-ngfw.jpg',
      alt: 'R2C technical blueprint of a next-generation firewall: front, rear, side and top views with port detail and specifications',
      caption: 'Next-Gen Firewall (NGFW) — full technical blueprint. Front, rear, side and top views, port detail and specifications.',
    },
  ],
  'net-ops': [
    {
      src: '/blueprint-ups-rackmount-2u.jpg',
      alt: 'R2C technical character sheet of a rack-mounted UPS: front, rear, side and top views with status display and internal layout',
      caption: 'Rack-Mounted UPS (2U) — full technical character sheet. Front, rear, side and top views, status display, specifications and internal layout.',
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

/** Visual Lab subject id -> the blueprint shown when its 3D scene cannot load. */
export const FALLBACK_BLUEPRINT_FOR_SUBJECT = {
  switch: '/blueprint-network-switch-48-port.jpg',
  'server-rack': '/blueprint-network-rack-42u.jpg',
};
