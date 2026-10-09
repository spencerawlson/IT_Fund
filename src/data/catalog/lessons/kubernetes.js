// Reading content for the Kubernetes track. Keyed by deck id; wired into LESSON_CONTENT
// by src/data/catalog/lessonContent.js. Voice: professional, narrative, precise.

export default {
  'k8s-basics': {
    overview: [
      'Docker taught the world to package applications as containers; Kubernetes answers the next question \u2014 who runs them when there are hundreds, across dozens of machines, and they must never go down? It is a platform that schedules containers, heals them when they fail, scales them with demand, and networks them together, all driven by declarations of what you want rather than commands describing how.',
      'This lesson introduces the cluster\u2019s two halves, the control-plane components, the pod as the atomic unit, and the declarative model that makes it all work.',
    ],
    learn: [
      {
        heading: 'Two halves: brains and muscle',
        body: [
          'Every cluster has a control plane and worker nodes. The control plane is the brain: the API server every command talks to, the scheduler that assigns pods to nodes, the controller-manager running the reconciliation loops, and etcd \u2014 the key-value store holding the entire desired state of the cluster, its single source of truth. Back it up; lose etcd and you lose the cluster\u2019s memory.',
          'Worker nodes are the muscle. Each runs a kubelet \u2014 the agent that takes pod assignments from the control plane and runs them via the container runtime \u2014 plus the networking pieces that wire pods together. Your applications never run on the control plane in a sane setup; they run on nodes, and the control plane\u2019s only job is deciding where and keeping it so.',
        ],
      },
      {
        heading: 'Declare the desired state; let controllers reconcile',
        body: [
          'Kubernetes is declarative by design, and that word carries the whole philosophy: you describe what should exist \u2014 three replicas of this app, this config, this port \u2014 and controllers continuously compare reality to your declaration, fixing drift forever. A crashed pod is not an incident to triage; it is drift, and the controller recreates it as a matter of routine.',
          'kubectl is how you speak to the API server: apply to declare, get to observe, describe to investigate, logs to read. The pod \u2014 one or a few tightly-coupled containers sharing network and storage \u2014 is the smallest thing you can deploy. You will rarely create pods directly, though; controllers like Deployments do that for you, which is where the next lesson begins.',
        ],
      },
    ],
    cheatSheet: [
      ['Control plane', 'API server, scheduler, controller-manager, etcd \u2014 the brains'],
      ['Worker node', 'Runs workloads via the kubelet and container runtime'],
      ['etcd', 'Key-value store of all cluster state; back it up'],
      ['Pod', 'Smallest deployable unit; one+ containers sharing net and storage'],
      ['kubectl', 'CLI for the API server: apply / get / describe / logs'],
      ['kubelet', 'Node agent that runs assigned pods'],
      ['Declarative', 'Describe desired state; controllers reconcile reality to it'],
      ['Reconciliation', 'Controllers continuously fix drift \u2014 crashed pods get recreated'],
    ],
  },
  'k8s-workloads': {
    overview: [
      'Pods are the atoms of Kubernetes, but atoms alone do not make a system. In production you never manage pods one by one \u2014 you declare a Deployment, and it keeps the right number of identical pods alive, updates them gracefully, and rolls back when an update goes wrong.',
      'This lesson covers the pod, why bare pods are a bad idea, and the Deployment/ReplicaSet machinery \u2014 plus the labels and selectors that quietly hold the whole model together.',
    ],
    learn: [
      {
        heading: 'The pod: small, shared, ephemeral',
        body: [
          'A pod wraps one or more containers that belong together \u2014 containers sharing the same network namespace (one IP, localhost between them) and optionally the same storage volumes. The classic multi-container pod is a main app plus a helper: a logging sidecar, a proxy. But pods are mortal by design: IPs change, nodes die, pods get rescheduled. Never build anything that assumes a pod will live long.',
          'That mortality is exactly why you do not create bare pods in production. A bare pod has no controller watching it \u2014 if its node dies, nobody reschedules it, and your app simply stops. Controllers exist to make promises about the future, and the Deployment is the one you will use most.',
        ],
      },
      {
        heading: 'Deployments: pods with a future',
        body: [
          'A Deployment declares \u201CI want N identical pods of this spec,\u201D and a ReplicaSet underneath does the counting \u2014 adding pods when there are too few, removing them when there are too many. Scale with `kubectl scale deploy/name --replicas=5` or by editing the manifest; either way the ReplicaSet converges reality to the number.',
          'The glue is labels and selectors: pods carry labels, and the Deployment\u2019s selector matches them. This indirection \u2014 controllers finding their pods by label rather than by name \u2014 is how Kubernetes stays flexible, and it is also how Services will find them in the networking lesson. Self-healing falls out for free: a dead pod means the count is wrong, so a replacement is scheduled on a healthy node without anyone being paged.',
        ],
      },
    ],
    cheatSheet: [
      ['Pod', 'Atom of K8s: containers sharing IP and storage, scheduled together'],
      ['Bare pod', 'No controller \u2014 not rescheduled on node failure; avoid in prod'],
      ['Deployment', 'Desired replica count + rolling updates and rollbacks'],
      ['ReplicaSet', 'Ensures N pod replicas run; managed by Deployments'],
      ['Labels / selectors', 'How controllers and Services find their pods'],
      ['kubectl apply -f', 'Declarative create/update from a manifest'],
      ['kubectl scale', 'Change replica count: scale deploy/name --replicas=5'],
      ['Self-healing', 'Dead pods are replaced automatically to restore the count'],
    ],
  },
  'k8s-config': {
    overview: [
      'Everything in Kubernetes is an object described in YAML \u2014 and the shape of that YAML is the same everywhere, from a two-line namespace to a hundred-line Deployment. Learn the shape once and you can read any manifest ever written.',
      'This lesson covers the four fields of every manifest, namespaces for organization, and the ConfigMap/Secret pair for getting configuration into pods without baking it into images.',
    ],
    learn: [
      {
        heading: 'The manifest: apiVersion, kind, metadata, spec',
        body: [
          'Four top-level fields, always. apiVersion and kind say what the object is (\u201Cthis is a Deployment, v1 apps API\u201D). metadata carries its name, namespace, and labels. And spec is the heart: the desired state you are declaring \u2014 the image, the replica count, the ports. Controllers read spec and make it real; status, which you will see in describe output, is read-only and reports what actually exists.',
          'Apply a single file or a whole directory with `kubectl apply -f` \u2014 re-applying the same manifest converges rather than duplicates, which is why GitOps workflows can treat the repository as the source of truth. Namespaces then partition the cluster logically: dev, staging, team-a \u2014 scoping names, quotas, and access without needing more clusters.',
        ],
      },
      {
        heading: 'ConfigMaps, Secrets, and the config/image boundary',
        body: [
          'A ConfigMap holds non-sensitive configuration as key-value pairs; a Secret holds sensitive data, base64-encoded and access-controlled. Both reach pods the same ways: injected as environment variables (via valueFrom) or mounted as files. The principle never changes: the same image must run in every environment, with environment-specific config injected at deploy time. A config change should never require a rebuild.',
          'One warning the cards stress for good reason: a Kubernetes Secret is base64-encoded, not encrypted, in etcd by default. Treat it accordingly \u2014 enable encryption at rest, lock it down with RBAC, and for the truly crown-jewel secrets, reach for an external secrets manager. Labels, meanwhile, do the quiet organizational work: metadata.labels is how Services select pods, how Deployments find theirs, how you query and group everything. In Kubernetes, labels are the glue.',
        ],
      },
    ],
    cheatSheet: [
      ['apiVersion/kind/metadata/spec', 'The four fields of every manifest; spec is desired state'],
      ['Namespace', 'Logical partition: dev, staging, team-a; scopes names and quotas'],
      ['ConfigMap', 'Non-secret config as key-value; inject as env or files'],
      ['Secret', 'Sensitive data, base64-encoded; enable encryption at rest + RBAC'],
      ['valueFrom', 'Injects ConfigMap/Secret values as environment variables'],
      ['Labels', 'Grouping/selection glue: Services and Deployments find pods by label'],
      ['kubectl apply -f ./dir/', 'Applies every manifest in a directory'],
      ['Config/image boundary', 'Same image everywhere; config injected per environment'],
    ],
  },
  'k8s-networking': {
    overview: [
      'Pods are born with IP addresses and die without ceremony \u2014 so nothing inside a cluster should ever hardcode a pod IP. Services solve this by standing in front of pods with a stable virtual IP and name, load-balancing across whatever pods currently match. Networking in Kubernetes is the art of stable endpoints over an ephemeral substrate.',
      'This lesson covers Service types, how Services find pods, cluster DNS, and Ingress for HTTP traffic from the outside world.',
    ],
    learn: [
      {
        heading: 'Services: the stable front door',
        body: [
          'A Service selects pods by label and presents them behind one stable virtual IP. ClusterIP \u2014 the default \u2014 is reachable only inside the cluster, which is all most internal traffic needs. NodePort opens a static port on every node\u2019s IP for simple external access. LoadBalancer asks the cloud provider to provision a real external load balancer in front of the Service \u2014 the standard answer for production traffic on managed clusters.',
          'Behind the virtual IP are endpoints: the actual pod IPs and ports currently backing the Service, updated automatically as pods come and go. Clients never track this churn; they target the Service name and let kube-proxy and the endpoints do the rest. And because names are scoped per namespace, two teams can each have a Service called \u201Capi\u201D without collision.',
        ],
      },
      {
        heading: 'DNS, Ingress, and the outside world',
        body: [
          'Service discovery runs on cluster DNS: inside its namespace a Service is reachable by bare name (\u201Cdb\u201D), and fully qualified as db.mynamespace.svc.cluster.local from anywhere. CoreDNS serves it all, which is why the earlier lesson\u2019s advice \u2014 services reach each other by name \u2014 works without any manual wiring.',
          'For HTTP traffic from outside, Ingress is the front door: one entry point routing by host and path to the right Services, with TLS termination along the way. The critical detail beginners miss: an Ingress object alone does nothing \u2014 an Ingress controller (nginx, Traefik, or your cloud\u2019s) must be running in the cluster to implement the rules. No controller, no routing.',
        ],
      },
    ],
    cheatSheet: [
      ['Service', 'Stable virtual IP/name in front of ephemeral pods; selects by label'],
      ['ClusterIP', 'Internal-only virtual IP; the default Service type'],
      ['NodePort', 'Exposes the Service on a static port of every node'],
      ['LoadBalancer', 'Provisions a cloud load balancer; standard for prod traffic'],
      ['Endpoints', 'The live pod IPs/ports behind a Service; updated automatically'],
      ['Cluster DNS', 'db \u2192 db.ns.svc.cluster.local; CoreDNS serves it'],
      ['Ingress', 'HTTP(S) host/path routing into Services; needs a controller'],
      ['Ingress controller', 'Implements Ingress rules (nginx, Traefik); without it, nothing routes'],
    ],
  },
  'k8s-storage': {
    overview: [
      'Containers are ephemeral and pods are mortal \u2014 a combination that is fatal to data unless you plan for it. Kubernetes answers with a storage model built on the same declarative philosophy as everything else: describe the storage you want, and let the cluster provision and bind it.',
      'This lesson covers why container filesystems are not enough, the PersistentVolume/PersistentVolumeClaim dance, StorageClasses, access modes, and which volume to reach for when.',
    ],
    learn: [
      {
        heading: 'PVs, PVCs, and the claim model',
        body: [
          'A PersistentVolume is a piece of cluster storage \u2014 provisioned by an admin or dynamically \u2014 sitting in the cluster waiting to be used. A PersistentVolumeClaim is a pod\u2019s request: \u201CI need 10Gi, read-write, SSD class.\u201D Kubernetes binds a matching PV to the claim, and the pod mounts the PVC, never the PV directly. The indirection is deliberate: developers ask for what they need, and the platform decides how to provide it.',
          'StorageClasses make the magic dynamic. Define a class describing a storage type \u2014 fast SSD, cheap spinning disk \u2014 and new PVCs trigger automatic PV provisioning on demand, no admin ticket required. It is the same self-service philosophy as the rest of Kubernetes, applied to disks.',
        ],
      },
      {
        heading: 'Choosing the right volume',
        body: [
          'Not everything needs persistence. An emptyDir volume lives exactly as long as its pod \u2014 perfect for scratch space and caches, gone when the pod dies. Anything that must survive rescheduling gets a PVC: databases, file uploads, anything you would back up.',
          'Two more distinctions matter. Access modes describe mountability: ReadWriteOnce means one node mounts it read-write; ReadWriteMany allows many nodes, but only if the storage backend supports it. And workload type follows the data: stateless apps run as Deployments with interchangeable pods, while databases and queues \u2014 anything needing stable identity plus its own storage \u2014 belong in a StatefulSet with per-pod PVCs. Never store database files in the image; images are read-only, shared, and the wrong place for anything writable or durable.',
        ],
      },
    ],
    cheatSheet: [
      ['Ephemeral storage', 'Container/pod filesystems die with the pod \u2014 plan for it'],
      ['PersistentVolume (PV)', 'Cluster storage resource, provisioned statically or dynamically'],
      ['PersistentVolumeClaim (PVC)', 'A pod\u2019s storage request; binds to a matching PV'],
      ['StorageClass', 'Enables dynamic PV provisioning per PVC; defines storage tiers'],
      ['emptyDir', 'Pod-lifetime scratch space; deleted with the pod'],
      ['ReadWriteOnce', 'Mounted read-write by a single node (RWM needs backend support)'],
      ['StatefulSet', 'Stable identity + per-pod storage for databases and queues'],
      ['Never in the image', 'Database files need writable, durable PVCs \u2014 not image layers'],
    ],
  },
  'k8s-deployments': {
    overview: [
      'Shipping software used to mean downtime windows and crossed fingers. Kubernetes turns deployment into a routine: new pods roll out gradually while old ones keep serving, health probes decide what is really ready, and a bad release rolls back with a single command.',
      'This lesson covers rolling updates, the three probes, autoscaling, and the resource requests and limits that keep a cluster fair and stable.',
    ],
    learn: [
      {
        heading: 'Rolling updates: ship without stopping',
        body: [
          'A Deployment\u2019s default strategy replaces pods gradually: new ones come up, old ones drain, and the Service keeps routing to healthy pods throughout. Users notice nothing. If the new version misbehaves, `kubectl rollout undo` rewinds to the previous revision \u2014 Deployments keep that history precisely so a bad Friday deploy is a one-command recovery, not an incident.',
          '`kubectl rollout status` tells you whether the rollout actually finished, which makes it the natural gate in a CI/CD pipeline: do not declare victory until every new pod is ready. Rolling updates are the default because they encode the right tradeoff \u2014 progress with a safety net \u2014 but the machinery only works if the cluster can tell healthy from unhealthy, which is what probes are for.',
        ],
      },
      {
        heading: 'Probes, autoscaling, and fair shares',
        body: [
          'Three probes, three questions. Liveness: \u201Cis this container still alive?\u201D \u2014 a failure restarts it. Readiness: \u201Cshould it receive traffic yet?\u201D \u2014 a not-ready pod is quietly removed from Service endpoints until it is. Startup: \u201Chas this slow starter finished booting?\u201D \u2014 it holds the liveness probe off during long initializations so healthy-but-slow containers are not killed for being deliberate.',
          'Scaling and fairness complete the picture. The Horizontal Pod Autoscaler adjusts replica counts from metrics like CPU \u2014 but it needs metrics-server running to see anything. And resource requests versus limits is the fairness contract: requests guide the scheduler\u2019s placement, limits cap what a pod may consume. A container that exceeds its memory limit is OOM-killed; CPU overuse is throttled instead. Set both, always \u2014 unbounded pods let one workload starve the node and everyone on it.',
        ],
      },
    ],
    cheatSheet: [
      ['Rolling update', 'Gradual pod replacement; app stays available throughout'],
      ['kubectl rollout undo', 'One-command rollback to the previous revision'],
      ['kubectl rollout status', 'Has the rollout finished? Gate CD pipelines on it'],
      ['Liveness probe', 'Unhealthy \u2192 container is restarted'],
      ['Readiness probe', 'Not ready \u2192 removed from Service endpoints (no traffic)'],
      ['Startup probe', 'Delays liveness checks for slow-starting containers'],
      ['HPA', 'Autoscales replicas on metrics (needs metrics-server)'],
      ['Requests / limits', 'Requests guide scheduling; limits cap use (OOM-kill on memory breach)'],
    ],
  },
  'k8s-operations': {
    overview: [
      'Deployments cover the common case, but real clusters run stranger workloads: databases that need stable names, agents that must run on every node, batch jobs that should run once and stop. Operating Kubernetes well means knowing the full workload zoo \u2014 and having a calm debugging routine for when things go wrong, because they will.',
      'This lesson covers StatefulSets, DaemonSets and Jobs, the debugging playbook, node maintenance, and the controller loop that ties the whole system together.',
    ],
    learn: [
      {
        heading: 'Beyond Deployments: the workload zoo',
        body: [
          'Reach for a StatefulSet when pods need identity: databases, queues, anything where \u201Creplica 3\u201D must be the same replica 3 after a restart, each with its own stable name (app-0, app-1) and its own PVC. A DaemonSet solves the opposite problem \u2014 one copy of a pod on every node (or a selected subset) \u2014 which is exactly what node agents want: log collectors, monitoring daemons, CNI plugins. And a Job runs pods to completion for batch work, exiting when done; a CronJob schedules Jobs the way cron schedules scripts.',
          'Choosing correctly matters because each controller encodes different promises. Deployments promise interchangeable replicas; StatefulSets promise stable identity; DaemonSets promise per-node coverage; Jobs promise completion. Match the promise to the workload and the cluster does the rest.',
        ],
      },
      {
        heading: 'Debugging like an operator',
        body: [
          'When a pod misbehaves, work the routine in order. `kubectl logs` first \u2014 what did the application say before it died? `kubectl describe pod` second \u2014 the events section reveals scheduling failures, image pull errors, and probe failures that logs never show. `kubectl exec -it` gets you inside a running pod to inspect from within, and `kubectl get events` gives the cluster-wide view: evictions, failed scheduling, the weather report of the whole system.',
          'Learn to recognize CrashLoopBackOff: a pod crashing and restarting with growing delays between attempts \u2014 almost always an application problem (bad config, missing dependency), diagnosed via logs and describe. For node maintenance, cordon marks a node unschedulable and drain evicts its pods so they reschedule elsewhere \u2014 the graceful way to take a machine down. Underneath it all runs the same loop every controller follows: observe actual state, compare to desired, act to reconcile, forever. That loop is Kubernetes.',
        ],
      },
    ],
    cheatSheet: [
      ['StatefulSet', 'Stable identity + per-pod PVCs for databases and queues'],
      ['DaemonSet', 'One pod per node; for agents: logging, monitoring, CNI'],
      ['Job / CronJob', 'Run-to-completion batch work; CronJob schedules it'],
      ['kubectl logs / describe', 'App errors first, then events: scheduling, pulls, probes'],
      ['kubectl exec -it', 'Shell inside a running pod for live inspection'],
      ['CrashLoopBackOff', 'Repeated crash-restart with backoff; check logs/describe'],
      ['cordon / drain', 'Mark unschedulable / evict pods; graceful node maintenance'],
      ['Controller loop', 'Observe \u2192 compare \u2192 reconcile, forever; how K8s self-heals'],
    ],
  },
  'k8s-security': {
    overview: [
      'A default Kubernetes cluster is permissive: any pod can talk to any pod, the default service account often has more rights than it needs, and Secrets are merely encoded, not encrypted. Production security is not a feature you enable \u2014 it is a series of deliberate choices, each closing a door the defaults left open.',
      'This lesson covers RBAC, service accounts, network policy, pod hardening, and supply-chain security: the five doors, and how to close them.',
    ],
    learn: [
      {
        heading: 'RBAC: who can do what',
        body: [
          'Role-Based Access Control answers the cluster\u2019s most important question: which identities may perform which actions on which resources. Roles (namespaced) and ClusterRoles (cluster-wide) grant verbs \u2014 get, list, create, delete \u2014 and RoleBindings attach them to users, groups, or service accounts. Every pod gets a ServiceAccount identity for talking to the API server, and the discipline is always least privilege: each workload gets its own minimal service account, because a compromised pod with cluster-admin is a compromised cluster.',
          'The default service account deserves suspicion, not trust. It exists in every namespace, and in many setups it carries broader rights than any single workload needs. Replace it per-workload, scope it tightly, and audit bindings the way you would audit firewall rules \u2014 because that is what they are.',
        ],
      },
      {
        heading: 'Hardening pods, networks, and the supply chain',
        body: [
          'Start with the pod. Run as non-root (runAsNonRoot with a non-zero runAsUser), never set privileged: true \u2014 it grants near-host access and the Pod Security Standards forbid it in restricted profiles \u2014 and drop unneeded Linux capabilities. Apply those standards per namespace through admission control so the hardening is enforced, not suggested. Then segment the network: a NetworkPolicy can restrict which pods and namespaces may talk to each other, but remember the default is allow-all until a policy selects a pod \u2014 the first policy you write is the one that starts enforcing.',
          'Finally, guard the supply chain. Scan images for CVEs, pin digests so \u201Cthe same tag\u201D cannot silently become different software, and require admission policies that block unsigned or unscanned images. Secrets reach pods through the Secret object \u2014 with etcd encryption at rest and RBAC guarding access \u2014 or better, from an external secrets manager; they are never baked into images or committed to repositories. Quotas and LimitRanges per namespace cap what any tenant can consume, because availability is a security property too.',
        ],
      },
    ],
    cheatSheet: [
      ['RBAC', 'Roles/ClusterRoles grant verbs; bindings attach them to identities'],
      ['ServiceAccount', 'Pod identity for the API server; scope each workload minimally'],
      ['NetworkPolicy', 'Restricts pod-to-pod/namespace traffic; default is allow-all'],
      ['runAsNonRoot', 'securityContext hardening; never run as root without reason'],
      ['privileged: true', 'Near-host access; forbidden by restricted Pod Security Standards'],
      ['Pod Security Standards', 'Enforced admission defaults: non-root, no escalation, dropped caps'],
      ['Image scanning + digests', 'Block vulnerable/tampered images; admission policies enforce it'],
      ['Secrets', 'Via Secret objects (etcd encryption + RBAC) or external managers; never in images'],
    ],
  },
};
