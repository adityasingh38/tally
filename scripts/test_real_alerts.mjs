import { parseSMS, ruleBasedCategory } from '../src/services/smsParser.js';

const testCases = [
  // 1. HDFC Bank Debit SMS
  {
    sms: "HDFC Bank: Rs 450.00 debited from a/c **1234 on 15-11-26 to SWIGGY. Avl bal: Rs 15,230.50.",
    sender: "HDFCBK",
    expectedAmount: 450.00,
    expectedType: "debit",
    expectedCategory: "food"
  },
  // 2. ICICI Bank UPI Debit
  {
    sms: "Dear Customer, your Acct XX5678 is debited for INR 1,299.00 on 15-Nov-26 by UPI/332145678901/Zomato. Avail Bal: INR 42,100.00",
    sender: "ICICIB",
    expectedAmount: 1299.00,
    expectedType: "debit",
    expectedCategory: "food"
  },
  // 3. SBI Debit Card POS
  {
    sms: "Your SBI Card ending 4321 was used for a purchase of Rs. 2,499.00 at AMAZON INDIA on 15/11/2026. Avl Lmt: Rs. 85,000.",
    sender: "SBICRD",
    expectedAmount: 2499.00,
    expectedType: "debit",
    expectedCategory: "shopping"
  },
  // 4. Axis Bank Uber
  {
    sms: "Spent Rs 342.00 on your Axis Bank Credit Card ending 9876 at UBER TRIP on 15-11-26. Total Avail Limit: INR 1,20,000.",
    sender: "AXISBK",
    expectedAmount: 342.00,
    expectedType: "debit",
    expectedCategory: "transport"
  },
  // 5. Kotak Quick Commerce Blinkit
  {
    sms: "Sent Rs. 684.50 from Kotak Bank AC *9012 to BLINKIT via UPI on 15-11-26. Ref no 432187654321.",
    sender: "KOTAKB",
    expectedAmount: 684.50,
    expectedType: "debit",
    expectedCategory: "shopping"
  },
  // 6. Google Pay Notification (Zepto)
  {
    sms: "Paid ₹389 to Zepto using HDFC Bank account **1234",
    sender: "com.google.android.apps.nbu.paisa.user",
    expectedAmount: 389.00,
    expectedType: "debit",
    expectedCategory: "shopping"
  },
  // 7. PhonePe Notification (Chai Point)
  {
    sms: "Paid ₹120 to Chai Point successfully via UPI",
    sender: "com.phonepe.app",
    expectedAmount: 120.00,
    expectedType: "debit",
    expectedCategory: "food"
  },
  // 8. Paytm Notification (Metro Recharge)
  {
    sms: "Paid ₹200 to Delhi Metro Rail Corp on Paytm",
    sender: "net.one97.paytm",
    expectedAmount: 200.00,
    expectedType: "debit",
    expectedCategory: "transport"
  },
  // 9. CRED Credit Card Payment (Utilities / Bill)
  {
    sms: "Bill payment of Rs. 3,450 to Airtel Postpaid debited from your account.",
    sender: "CREDPAY",
    expectedAmount: 3450.00,
    expectedType: "debit",
    expectedCategory: "utilities"
  },
  // 10. Salary Credit SMS
  {
    sms: "Your A/c *1234 is credited by Rs 1,25,000.00 on 01-11-26 by NEFT-ACME TECH PVT LTD. Avail Bal: Rs 1,45,000.",
    sender: "HDFCBK",
    expectedAmount: 125000.00,
    expectedType: "credit",
    expectedCategory: "transfer"
  },
  // 11. OTP - Must be ignored
  {
    sms: "123456 is your OTP for purchase of Rs. 999.00 at Flipkart. Do not share it with anyone.",
    sender: "SBICRD",
    expectedAmount: null
  },
  // 12. Failed Transaction - Must be ignored
  {
    sms: "Payment of Rs. 500 at Starbucks was declined due to insufficient funds.",
    sender: "HDFCBK",
    expectedAmount: null
  }
];

let passed = 0;
for (const tc of testCases) {
  const parsed = parseSMS(tc.sms, tc.sender);
  if (tc.expectedAmount === null) {
    if (parsed === null) {
      console.log(`✓ IGNORE OK: "${tc.sms.slice(0, 40)}..."`);
      passed++;
    } else {
      console.error(`✗ FAILED TO IGNORE:`, parsed);
    }
  } else {
    if (!parsed) {
      console.error(`✗ FAILED TO PARSE: "${tc.sms}"`);
      continue;
    }
    const cat = ruleBasedCategory(parsed.merchant, tc.sms);
    const amountOk = Math.abs(parsed.amount - tc.expectedAmount) < 0.01;
    const typeOk = parsed.type === tc.expectedType;
    const catOk = cat === tc.expectedCategory;
    if (amountOk && typeOk && catOk) {
      console.log(`✓ PARSED & CATEGORISED OK [${cat}]: ₹${parsed.amount} at ${parsed.merchant}`);
      passed++;
    } else {
      console.error(`✗ MISMATCH:`, { parsed, cat, expected: tc });
    }
  }
}
console.log(`\nTotal: ${passed}/${testCases.length} test cases passed.`);
