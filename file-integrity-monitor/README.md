# File Integrity Monitor

A Python-based file integrity monitoring tool that detects modified, deleted, and newly added files using SHA-256 cryptographic hashes.

> Portfolio project combining cybersecurity concepts with practical software engineering.

## Features

- SHA-256 file hashing
- Baseline creation
- Integrity scanning
- Modified-file detection
- Deleted-file detection
- New-file detection
- JSON baseline storage
- Clear terminal reports
- Standard-library implementation
- Unit-test ready architecture

## How it works

```text
Target directory
      │
      ▼
SHA-256 hashing
      │
      ▼
Baseline JSON
      │
      │ later scan
      ▼
Hash comparison
      │
 ┌────┼─────────┐
 ▼    ▼         ▼
NEW  MODIFIED  DELETED
```

## Requirements

- Python 3.9+
- No third-party dependencies

## Usage

Create a baseline:

```bash
python3 fim.py baseline ./monitored
```

Scan against the baseline:

```bash
python3 fim.py scan ./monitored
```

Run tests:

```bash
python3 -m unittest discover -v
```

## Example output

```text
FILE INTEGRITY SCAN
────────────────────────────────

[!] MODIFIED  report.pdf
[+] NEW       suspicious.txt
[-] DELETED   old_report.pdf

────────────────────────────────
Files scanned: 127
Unchanged:     124
Modified:        1
Added:           1
Deleted:         1
```

The scan returns exit code `1` when an integrity change is detected, which makes it usable in scripts and automation.

## Security considerations

SHA-256 provides a cryptographic fingerprint of file contents, but the baseline must itself be protected. If an attacker can modify both the monitored files and the baseline, the tool cannot independently establish trust.

This project is intended for learning and local monitoring, not as a replacement for enterprise FIM solutions.

## Project structure

```text
file-integrity-monitor/
├── fim.py
├── test_fim.py
└── README.md
```

## Roadmap

- Configurable ignore patterns
- CSV/JSON reports
- File metadata monitoring
- Scheduled monitoring mode
- Signed baselines
- Notifications
- GitHub Actions CI

## Disclaimer

Use this project only on systems and files you are authorized to monitor.
