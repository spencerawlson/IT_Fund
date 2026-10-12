# Services & Networking: Stable Endpoints and Ingress — Avatar Tutor Script

**Lesson ID:** k8s-networking
**Track:** Kubernetes Orchestration
**Estimated runtime:** ~4 minutes (~621 words)

## Spoken script

**[HOOK — 0:00]**
Pods are born with IP addresses and die without ceremony — so nothing inside a
cluster should ever hardcode a pod IP. Services solve this by standing in front
of pods with a stable virtual IP and name, load-balancing across whatever pods
currently match. Networking in Kubernetes is the art of stable endpoints over
an ephemeral substrate.

**[WHY IT MATTERS — 0:25]**
Every connection between your services depends on this layer. If you don't
understand how a Service finds its pods, how DNS names resolve, and how
external traffic gets in, you'll be the person hardcoding IPs and wondering
why everything breaks at 2am when pods reschedule. Think of this layer as the cluster's postal system — names, addresses, and a front door for visitors.

**[SECTION — Services: the stable front door — 0:50]**
A Service selects pods by label and presents them behind one stable virtual
IP. ClusterIP — the default — is reachable only inside the cluster, which is
all most internal traffic needs. NodePort opens a static port on every node's
IP for simple external access. LoadBalancer asks the cloud provider to
provision a real external load balancer in front of the Service — the standard
answer for production traffic on managed clusters.

Behind the virtual IP are endpoints: the actual pod IPs and ports currently
backing the Service, updated automatically as pods come and go. Clients never track this churn. The virtual IP never changes even as the pods behind it churn — that's the whole trick. They target the Service name and let kube-proxy and the
endpoints do the rest. And because names are scoped per namespace, two teams
can each have a Service called "api" without collision.

**[SECTION — DNS, Ingress, and the outside world — 2:20]**
Service discovery runs on cluster DNS. Inside its namespace a Service is
reachable by bare name — "db" — and fully qualified as db dot mynamespace dot
svc dot cluster dot local from anywhere. CoreDNS serves it all, and the fully qualified name is the escape hatch for reaching a service in another namespace, which is why
the earlier advice — services reach each other by name — works without any
manual wiring.

For HTTP traffic from outside, Ingress is the front door: one entry point
routing by host and path to the right Services, with TLS termination along the
way. The critical detail beginners miss: an Ingress object alone does nothing.
An Ingress controller — nginx, Traefik, or your cloud's — must be running in
the cluster to implement the rules. No controller, no routing.

**[COMMON MISTAKES — 3:50]**
Three traps. First, hardcoding pod IPs anywhere. They're ephemeral; Services
and DNS exist so you never have to. Second, creating an Ingress and expecting
traffic to flow. Without a controller running in the cluster, an Ingress object
is just a wish. Third, reaching for LoadBalancer for every internal service.
Most traffic stays inside the cluster, and ClusterIP is the default for a reason — cheaper and simpler. Exposing every service through a load balancer is how you end up paying for and securing traffic that never needed to leave the cluster.

**[RECAP — 4:25]**
So here's the skeleton. A Service gives ephemeral pods a stable front door —
one virtual IP and name, pods found by label selector, real pod IPs tracked as
endpoints that update automatically. ClusterIP is internal and the default;
NodePort opens a static port on every node; LoadBalancer provisions a cloud
load balancer for production traffic. CoreDNS resolves service names, bare
inside the namespace and fully qualified beyond it. And Ingress routes external
HTTP by host and path — but only when a controller is actually running to
enforce the rules.

## On-screen visuals

- HOOK: pods appearing and dying with shifting IPs, a Service standing steady
  in front of them.
- WHY IT MATTERS: a hardcoded IP going stale at 2am vs a stable Service name.
- Services: the stable front door: label selector matching pods, endpoints
  updating live behind the virtual IP; the three types on a spectrum from
  internal to external.
- DNS, Ingress, and the outside world: CoreDNS resolving "db" to a full
  cluster address; Ingress as a front door routing by host and path, with a
  controller box labelled "required".
- COMMON MISTAKES: three warning cards — "never hardcode pod IPs", "Ingress
  needs a controller", "ClusterIP is the default".
- RECAP: the cheat-sheet terms as a clean summary card.
