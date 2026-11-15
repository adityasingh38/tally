"""Summarize a private capture-validation worksheet without reading raw alerts."""

import csv
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from statistics import median


def parse_time(value):
    if not value:
        return None
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def score(rows):
    groups = defaultdict(lambda: defaultdict(int))
    latencies = defaultdict(list)
    seen_ids = set()
    for line, row in enumerate(rows, start=2):
        case_id = row["case_id"].strip()
        if not case_id or case_id in seen_ids:
            raise ValueError(f"line {line}: case_id must be nonempty and unique")
        seen_ids.add(case_id)
        source = row["source"].strip() or "unknown"
        bank_or_app = row["bank_or_app"].strip() or "unknown"
        source = f"{source} / {bank_or_app}"
        stats = groups[source]
        count = int(row["observed_count"] or 0)
        if count < 0:
            raise ValueError(f"line {line}: observed_count cannot be negative")
        expected = row["expected_type"].strip().lower()
        if not expected:
            stats["unexpected_entries"] += count
            continue
        if expected not in {"debit", "credit"}:
            raise ValueError(f"line {line}: expected_type must be debit or credit")
        eligible = row["eligible"].strip().lower()
        if eligible not in {"yes", "no"}:
            raise ValueError(f"line {line}: eligible must be yes or no")
        if eligible == "no":
            stats["no_alert"] += 1
            continue
        stats["eligible"] += 1
        if count == 0:
            stats["missed"] += 1
            continue
        stats["captured"] += 1
        stats["duplicates"] += max(0, count - 1)
        if row["observed_type"].strip().lower() != expected:
            stats["wrong_type"] += 1
        try:
            amount_matches = abs(float(row["observed_amount"]) - float(row["expected_amount"])) < 0.01
        except ValueError:
            amount_matches = False
        if not amount_matches:
            stats["wrong_amount"] += 1
        if row["observed_merchant"].strip().casefold() != row["expected_merchant"].strip().casefold():
            stats["wrong_merchant"] += 1
        expected_category = row.get("expected_category", "").strip().lower()
        if expected_category:
            stats["category_scored"] += 1
            status = row.get("category_status", "").strip().lower()
            observed_category = row.get("observed_category", "").strip().lower()
            if status == "pending":
                stats["category_pending"] += 1
            elif status == "review":
                stats["category_review"] += 1
            elif status == "done" and observed_category == expected_category:
                stats["category_correct"] += 1
            else:
                stats["category_wrong"] += 1
        event_at = parse_time(row["event_at"].strip())
        visible_at = parse_time(row["visible_at"].strip())
        if event_at and visible_at:
            seconds = (visible_at - event_at).total_seconds()
            if seconds >= 0:
                latencies[source].append(seconds)
    return groups, latencies


def main(path):
    with Path(path).open(newline="", encoding="utf-8-sig") as file:
        groups, latencies = score(csv.DictReader(file))
    for source in sorted(groups):
        s = groups[source]
        total = s["eligible"]
        recall = f"{s['captured'] / total:.1%}" if total else "n/a"
        times = latencies[source]
        median_delay = f"{median(times):.0f}s" if times else "n/a"
        print(f"{source}: {s['captured']}/{total} captured ({recall}); median visible delay {median_delay}")
        print(
            f"  missed={s['missed']} duplicates={s['duplicates']} "
            f"wrong_amount={s['wrong_amount']} wrong_type={s['wrong_type']} "
            f"wrong_merchant={s['wrong_merchant']} unexpected_entries={s['unexpected_entries']} "
            f"no_alert={s['no_alert']}"
        )
        scored = s["category_scored"]
        accuracy = f"{s['category_correct'] / scored:.1%}" if scored else "n/a"
        print(
            f"  categories={s['category_correct']}/{scored} correct ({accuracy}); "
            f"wrong={s['category_wrong']} pending={s['category_pending']} "
            f"review={s['category_review']}"
        )


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python scripts/score_capture.py path/to/filled.csv")
    main(sys.argv[1])
