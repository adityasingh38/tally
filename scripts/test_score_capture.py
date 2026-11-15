"""Verify category results and unresolved cases in the release worksheet."""

import csv
import io
import unittest

from score_capture import score


class ScoreCaptureTests(unittest.TestCase):
    def test_category_accuracy_counts_pending_and_review(self):
        data = io.StringIO(
            "case_id,source,bank_or_app,eligible,event_at,expected_type,expected_amount,expected_merchant,expected_category,observed_count,visible_at,observed_type,observed_amount,observed_merchant,observed_category,category_status,category_resolved_at,notes\n"
            "1,sms,HDFC,yes,,debit,100,Cafe,food,1,,debit,100,Cafe,food,done,,\n"
            "2,sms,HDFC,yes,,debit,200,Acme,shopping,1,,debit,200,Acme,other,pending,,\n"
            "3,sms,HDFC,yes,,debit,300,Store,shopping,1,,debit,300,Store,other,review,,\n"
        )
        groups, _ = score(csv.DictReader(data))
        result = groups["sms / HDFC"]
        self.assertEqual(result["category_scored"], 3)
        self.assertEqual(result["category_correct"], 1)
        self.assertEqual(result["category_pending"], 1)
        self.assertEqual(result["category_review"], 1)


if __name__ == "__main__":
    unittest.main()
