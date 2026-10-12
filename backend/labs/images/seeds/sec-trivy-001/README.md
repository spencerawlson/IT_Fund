# sec-trivy-001 seeds

A minimal, deliberately stale Ubuntu 20.04 (focal) rootfs used by the Trivy
lab. `Dockerfile.trivy` bakes it into the image as
`/home/analyst/vuln-rootfs.tar.gz`.

## Layout

- `rootfs/etc/os-release` — identifies the distro as Ubuntu 20.04 (focal),
  so Trivy maps packages to the right Ubuntu CVE feed.
- `rootfs/var/lib/dpkg/status` — the package inventory Trivy actually scans.
  Versions are the original focal releases (never patched), so the DB reports
  real, well-known CVEs: CVE-2022-37434 in zlib1g (CRITICAL), CVE-2020-1971 /
  CVE-2021-3449 / CVE-2021-3450 in openssl 1.1.1f (HIGH), CVE-2019-18276 in
  bash 5.0 (HIGH).

## Regenerate

```bash
cd backend/labs/images/seeds/sec-trivy-001
rm -f vuln-rootfs.tar.gz
tar -czf vuln-rootfs.tar.gz -C rootfs etc var
```

Then rebuild the image (`./build.sh trivy`).

## Why a tarball, not an image scan

`trivy image` needs the Docker socket (or a registry pull), both of which the
hardened lab provider forbids. `trivy rootfs` against a tarball exercises the
same scanner and the same vulnerability DB — the honest compromise, documented
in the lab definition.
