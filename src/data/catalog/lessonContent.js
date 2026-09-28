// Optional rich reading content for lessons, keyed by lesson id (= the deck id in
// src/data/academy). Lessons without an entry still show their summary, the interactive
// lesson and their resources. See the LessonContent typedef in ./schema.js.

/** @type {Record<string, import('./schema').LessonContent>} */
export const LESSON_CONTENT = {
  'net-switch-route': {
    overview: [
      'Switches move frames inside a network; routers move packets between networks. Almost every connectivity problem you will ever troubleshoot comes down to one of those two decisions going wrong.',
      'This lesson covers how a switch learns where devices are, how VLANs split one switch into several isolated networks, how trunks carry those VLANs between switches, and how routers choose a path using their routing table.',
    ],
    learn: [
      {
        heading: 'How a switch forwards frames',
        body: [
          'A switch reads the source MAC address of every frame it receives and records which port it arrived on in its MAC address table (the CAM table).',
          'To forward, it looks up the destination MAC. Known address: send out that one port. Unknown address or broadcast (`ff:ff:ff:ff:ff:ff`): flood out every port in the same VLAN except the one it came in on.',
        ],
      },
      {
        heading: 'VLANs and trunks',
        body: [
          'A VLAN is a separate broadcast domain on shared hardware. Hosts in VLAN 10 cannot reach hosts in VLAN 20 without a router or layer 3 switch, which is what makes VLANs a segmentation control.',
          'An access port belongs to one VLAN and carries untagged frames. A trunk port carries many VLANs between switches, adding an 802.1Q tag to each frame so the far side knows which VLAN it belongs to. Frames on the native VLAN cross the trunk untagged.',
        ],
      },
      {
        heading: 'Spanning Tree Protocol',
        body: [
          'Redundant links between switches create loops, and Ethernet has no TTL to kill a looping frame, so a single broadcast can multiply until the network melts down (a broadcast storm).',
          'STP (802.1D; RSTP is 802.1w) elects a root bridge and blocks just enough ports to leave one loop-free path, unblocking them automatically if the active path fails.',
        ],
      },
      {
        heading: 'How a router chooses a path',
        body: [
          'A router matches each packet’s destination against its routing table and uses the longest prefix match: a `/24` route beats a `/16`, which beats the default route `0.0.0.0/0`.',
          'Routes come from directly connected networks, static routes you configure, or dynamic routing protocols. When several sources offer the same prefix, the lowest administrative distance wins (connected 0, static 1, OSPF 110, RIP 120).',
          'OSPF is a link-state protocol: each router floods its links, builds a full map of the area and runs Dijkstra’s shortest-path algorithm, using cost (based on bandwidth) as the metric. BGP is the path-vector protocol that routes between organisations on the internet.',
        ],
      },
    ],
    architecture: {
      caption: 'Two VLANs on two switches, joined by an 802.1Q trunk, with a router providing inter-VLAN routing.',
      diagram: [
        '                 [ Router R1 ]',
        '         Gi0/0.10 |       | Gi0/0.20      (router-on-a-stick sub-interfaces)',
        '                  +---+---+',
        '                      | 802.1Q trunk (VLANs 10, 20)',
        '                 [ Switch SW1 ] ======= trunk ======= [ Switch SW2 ]',
        '                   |        |                            |        |',
        '              VLAN 10   VLAN 20                     VLAN 10   VLAN 20',
        '              PC-A      PC-B                        PC-C      PC-D',
        '',
        '  PC-A <-> PC-C : same VLAN, switched across the trunk (no router needed)',
        '  PC-A <-> PC-D : different VLANs, must be routed by R1',
      ].join('\n'),
    },
    examples: [
      {
        title: 'Create a VLAN and an access port (Cisco IOS)',
        code: ['vlan 10', ' name USERS', 'interface GigabitEthernet0/5', ' switchport mode access', ' switchport access vlan 10'].join('\n'),
        explanation: 'The port now carries untagged frames for VLAN 10 only.',
      },
      {
        title: 'Configure a trunk (Cisco IOS)',
        code: ['interface GigabitEthernet0/1', ' switchport mode trunk', ' switchport trunk allowed vlan 10,20'].join('\n'),
        explanation: 'Restricting allowed VLANs keeps unneeded broadcast traffic (and attack surface) off the link.',
      },
      {
        title: 'A static and a default route (Cisco IOS)',
        code: ['ip route 10.20.0.0 255.255.0.0 192.168.1.2', 'ip route 0.0.0.0 0.0.0.0 203.0.113.1'].join('\n'),
        explanation: 'Traffic for 10.20.0.0/16 goes to 192.168.1.2; anything with no more specific match follows the default route.',
      },
      {
        title: 'Verify what you built',
        code: ['show vlan brief', 'show interfaces trunk', 'show ip route', 'show ip ospf neighbor'].join('\n'),
        explanation: 'Check VLAN membership, which VLANs each trunk carries, the routing table, and OSPF adjacencies.',
      },
    ],
    cheatSheet: [
      ['CAM / MAC table', 'Switch map of MAC address → port, learned from source addresses'],
      ['Access port', 'One VLAN, untagged frames'],
      ['Trunk port', 'Many VLANs, 802.1Q-tagged frames (native VLAN untagged)'],
      ['STP / RSTP', '802.1D / 802.1w: blocks redundant links to prevent loops'],
      ['Longest prefix match', 'The most specific matching route wins'],
      ['Administrative distance', 'Trust in a route source: connected 0, static 1, OSPF 110, RIP 120'],
      ['OSPF', 'Link-state IGP, cost metric, Dijkstra SPF, AD 110'],
      ['BGP', 'Path-vector EGP that routes between autonomous systems'],
      ['Default route', '0.0.0.0/0, used when nothing more specific matches'],
    ],
  },
};
