"""Data-driven log datasets for the blue-team log-analysis labs.

A generic log shell (shells/logfile.py) reads these: each lab supplies its files (name -> lines),
the default file, the prompt/banner, and a list of detections. A detection fires a finding when the
learner greps for one of its triggers and gets a match, so working the investigation completes the
objectives. Nothing executes; grep/cat/wc run for real over the fixed in-memory text. Logs are
original synthetic samples modelled on common detections (not copied from any course).
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class Detection:
    key: str               # finding recorded (validator checks presence)
    triggers: tuple[str, ...]  # grep pattern (lowercased) containing any of these + a match -> fires


@dataclass(frozen=True)
class LogLab:
    prompt: str
    banner: list[str]
    files: dict[str, list[str]]
    default_file: str
    detections: list[Detection] = field(default_factory=list)

    def is_file(self, name: str) -> bool:
        name = (name or '').split('/')[-1]
        return name in self.files


# ---------------- C2 Beacon Hunt ----------------
_C2_CONN = [
    'ts                   src         dst              service  duration  bytes',
    '2026-05-20 09:00:03  10.0.0.23   185.220.101.47   https    0.42      512',
    '2026-05-20 09:00:10  10.0.0.50   93.184.216.34    https    2.10      48213',
    '2026-05-20 09:01:03  10.0.0.23   185.220.101.47   https    0.41      512',
    '2026-05-20 09:02:03  10.0.0.23   185.220.101.47   https    0.40      512',
    '2026-05-20 09:02:44  10.0.0.51   142.250.80.14    https    5.60      91002',
    '2026-05-20 09:03:03  10.0.0.23   185.220.101.47   https    0.43      512',
    '2026-05-20 09:04:03  10.0.0.23   185.220.101.47   https    0.39      512',
    '2026-05-20 09:05:03  10.0.0.23   185.220.101.47   https    0.42      512',
    '2026-05-20 09:05:21  10.0.0.50   151.101.1.69     https    1.90      30211',
    '2026-05-20 09:06:03  10.0.0.23   185.220.101.47   https    0.41      512',
]
_C2_HTTP = [
    'ts                   src         host             method  uri              user_agent        status',
    '2026-05-20 09:00:03  10.0.0.23   185.220.101.47   GET     /api/v1/beacon   Go-http-client/1.1 200',
    '2026-05-20 09:00:10  10.0.0.50   www.example.com  GET     /index.html      Mozilla/5.0        200',
    '2026-05-20 09:01:03  10.0.0.23   185.220.101.47   GET     /api/v1/beacon   Go-http-client/1.1 200',
    '2026-05-20 09:03:03  10.0.0.23   185.220.101.47   POST    /api/v1/beacon   Go-http-client/1.1 200',
    '2026-05-20 09:05:21  10.0.0.50   cdn.fastly.net   GET     /app.js          Mozilla/5.0        200',
]

# ---------------- DNS anomalies ----------------
_DNS = [
    'ts         src         query                       qtype  answer',
    '09:00:01   10.0.0.50   globocorp.com               A      203.0.113.10',
    '09:00:05   10.0.0.51   www.globocorp.com           A      203.0.113.10',
    '09:00:40   10.0.0.52   mail.globocorp.com          A      203.0.113.12',
    '09:01:00   10.0.0.77   g1obocorp.com               A      185.220.101.9',
    '09:02:00   10.0.0.88   aGVsbG8taGVsbG8.dnsexfil.xyz TXT   "v=1;seg=1"',
    '09:02:02   10.0.0.88   d29ybGQtZGF0YQ.dnsexfil.xyz  TXT   "v=1;seg=2"',
    '09:02:05   10.0.0.88   c2VjcmV0LWtleQ.dnsexfil.xyz  TXT   "v=1;seg=3"',
    '09:02:09   10.0.0.88   bW9yZS1kYXRh.dnsexfil.xyz    TXT   "v=1;seg=4"',
    '09:03:00   10.0.0.50   update.globocorp.com         A     203.0.113.14',
]

# ---------------- Ransomware over SMB ----------------
_SMB = [
    'ts         host|ip|share|operation|file',
    '09:10:00   win10-alice|10.0.0.20|HR|read|policy.pdf',
    '09:14:50   win10-victim|10.0.0.33|Finance|read|budget.xlsx',
    '09:15:02   win10-victim|10.0.0.33|Finance|write|budget.xlsx.locked',
    '09:15:03   win10-victim|10.0.0.33|Finance|write|report.docx.locked',
    '09:15:04   win10-victim|10.0.0.33|Finance|write|forecast.xlsx.locked',
    '09:15:05   win10-victim|10.0.0.33|Finance|write|contract.pdf.encrypted',
    '09:15:06   win10-victim|10.0.0.33|Finance|write|payroll.csv.encrypted',
    '09:15:30   win10-victim|10.0.0.33|Finance|write|DECRYPT_INSTRUCTIONS.txt',
    '09:16:00   win10-bob|10.0.0.21|Eng|read|design.docx',
]


LOGSETS: dict[str, LogLab] = {
    'sec-c2beacon-001': LogLab(
        prompt='analyst@soc:~$ ',
        banner=[
            'Road to CISSP - simulated log shell   (safe: nothing is really executed)',
            'A host may be beaconing to a command-and-control server. Hunt it in conn.log and http.log.',
            'Try: cat conn.log · grep 185.220.101.47 conn.log · wc -l conn.log · grep /api/v1/beacon http.log',
        ],
        files={'conn.log': _C2_CONN, 'http.log': _C2_HTTP},
        default_file='conn.log',
        detections=[
            Detection('beacon_dst', ('185.220.101.47',)),
            Detection('beacon_host', ('10.0.0.23',)),
            Detection('c2_http', ('/api/v1/beacon', 'beacon')),
            Detection('c2_ua', ('go-http-client', 'go-http')),
        ],
    ),
    'sec-dns-typo-001': LogLab(
        prompt='analyst@soc:~$ ',
        banner=[
            'Road to CISSP - simulated log shell   (safe: nothing is really executed)',
            'The corporate domain is globocorp.com. Find the DNS abuse hiding in dns.log.',
            'Try: cat dns.log · grep TXT dns.log · grep dnsexfil dns.log · grep g1obocorp dns.log',
        ],
        files={'dns.log': _DNS},
        default_file='dns.log',
        detections=[
            Detection('dns_txt', ('txt',)),
            Detection('dns_typo', ('g1obocorp', 'g1obocorp.com')),
            Detection('dns_tunnel', ('dnsexfil', 'dnsexfil.xyz')),
            Detection('dns_client', ('10.0.0.88',)),
        ],
    ),
    'sec-ransomware-001': LogLab(
        prompt='analyst@soc:~$ ',
        banner=[
            'Road to CISSP - simulated log shell   (safe: nothing is really executed)',
            'A file server is misbehaving. Investigate smb.log for signs of ransomware.',
            'Try: cat smb.log · grep .locked smb.log · grep win10-victim smb.log · grep DECRYPT smb.log',
        ],
        files={'smb.log': _SMB},
        default_file='smb.log',
        detections=[
            Detection('rw_ext', ('.locked', '.encrypted', '.wncry')),
            Detection('rw_host', ('win10-victim', '10.0.0.33')),
            Detection('rw_note', ('decrypt', 'decrypt_instructions', 'ransom', 'readme')),
            Detection('rw_scope', ('write',)),
        ],
    ),
}


def logset_for(lab_id: str) -> LogLab | None:
    return LOGSETS.get(lab_id)
